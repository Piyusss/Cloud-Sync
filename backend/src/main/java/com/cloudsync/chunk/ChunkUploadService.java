package com.cloudsync.chunk;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.common.BadRequestException;
import com.cloudsync.common.NotFoundException;
import com.cloudsync.common.StorageQuotaException;
import com.cloudsync.notification.NotificationService;
import com.cloudsync.file.FileDto;
import com.cloudsync.file.FileService;
import com.cloudsync.file.PhysicalFileEntity;
import com.cloudsync.file.PhysicalFileRepository;
import com.cloudsync.storage.StorageService;
import com.cloudsync.user.User;
import com.cloudsync.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.model.CompletedPart;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Coordinates direct-to-storage uploads via S3 multipart. The browser uploads
 * parts straight to object storage using presigned URLs; this service only
 * orchestrates (create / presign / assemble) and writes metadata. File bytes
 * never pass through the app, and the merge happens storage-side in complete().
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkUploadService {

    private final UploadSessionRepository sessionRepository;
    private final FileService fileService;
    private final PhysicalFileRepository physicalFileRepository;
    private final UserService userService;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final StorageService storageService;

    // ── Init: dedup check, else open a multipart upload and presign the parts ──

    @Transactional
    public InitUploadResponse init(InitUploadRequest req, UUID userId) {
        // ── Deduplication check ──────────────────────────────────────────────
        if (req.getHash() != null) {
            var existing = physicalFileRepository.findByHash(req.getHash());
            if (existing.isPresent()) {
                PhysicalFileEntity pf = existing.get();
                pf.setRefCount(pf.getRefCount() + 1);
                physicalFileRepository.save(pf);

                FileDto fileItem = fileService.createOrUpdateFile(
                        req.getFileName(), req.getFileSize(), req.getContentType(),
                        req.getFolderId(), userId, pf.getStorageKey(), pf.getId(), true);

                // Dedup still creates a new file row — evict the cached listing so
                // it shows up immediately (mirrors complete()).
                fileService.evictFileCaches(userId, req.getFolderId());

                return InitUploadResponse.builder()
                        .duplicate(true)
                        .fileItem(fileItem)
                        .parts(List.of())
                        .build();
            }
        }

        // ── Normal path ──────────────────────────────────────────────────────
        User user = userService.findById(userId);
        if (user.getStorageUsed() + req.getFileSize() > user.getStorageLimit()) {
            throw new StorageQuotaException("Storage limit exceeded. Available: "
                    + (user.getStorageLimit() - user.getStorageUsed()) + " bytes");
        }

        String storageKey = userId + "/" + UUID.randomUUID();
        String s3UploadId = storageService.createMultipartUpload(storageKey, req.getContentType());

        UploadSessionEntity session = sessionRepository.save(UploadSessionEntity.builder()
                .userId(userId).fileName(req.getFileName()).fileSize(req.getFileSize())
                .totalChunks(req.getTotalChunks()).contentType(req.getContentType())
                .folderId(req.getFolderId()).storageKey(storageKey)
                .s3UploadId(s3UploadId).hash(req.getHash())
                .build());

        List<PartUrl> parts = new ArrayList<>(req.getTotalChunks());
        for (int partNumber = 1; partNumber <= req.getTotalChunks(); partNumber++) {
            parts.add(new PartUrl(partNumber,
                    storageService.presignUploadPart(storageKey, s3UploadId, partNumber)));
        }

        return InitUploadResponse.builder()
                .uploadId(session.getId().toString())
                .key(storageKey)
                .parts(parts)
                .duplicate(false)
                .build();
    }

    // ── Status (for resume) — which parts has storage already received? ───────

    public UploadStatusDto status(UUID uploadId, UUID userId) {
        UploadSessionEntity session = sessionRepository.findByIdAndUserId(uploadId, userId)
                .orElseThrow(() -> new NotFoundException("Upload session not found"));

        List<Integer> uploaded = List.of();
        if ("in_progress".equals(session.getStatus()) && session.getS3UploadId() != null) {
            uploaded = storageService.listParts(session.getStorageKey(), session.getS3UploadId())
                    .stream().map(CompletedPart::partNumber).toList();
        }

        return UploadStatusDto.builder()
                .uploadId(session.getId().toString())
                .fileName(session.getFileName())
                .fileSize(session.getFileSize())
                .totalChunks(session.getTotalChunks())
                .uploadedChunks(uploaded)
                .status(session.getStatus())
                .build();
    }

    // ── Complete: assemble parts storage-side, then write metadata ────────────
    // NOT @Transactional: the storage assembly must not hold a DB connection.

    public FileDto complete(UUID uploadId, UUID userId) {
        UploadSessionEntity session = sessionRepository
                .findByIdAndUserIdAndStatus(uploadId, userId, "in_progress")
                .orElseThrow(() -> new NotFoundException("Upload session not found or already completed"));

        List<CompletedPart> parts = storageService.listParts(session.getStorageKey(), session.getS3UploadId());
        if (parts.isEmpty()) {
            throw new BadRequestException("No uploaded parts found for this session");
        }
        storageService.completeMultipartUpload(session.getStorageKey(), session.getS3UploadId(), parts);

        long actualSize = storageService.headObjectSize(session.getStorageKey());
        if (actualSize != session.getFileSize()) {
            storageService.deleteObject(session.getStorageKey());
            throw new BadRequestException("Uploaded file is incomplete (size mismatch)");
        }

        // Short metadata transaction (physical-file + file + version), out of the storage path.
        FileDto result = fileService.finalizeUpload(
                session.getFileName(), session.getFileSize(), session.getContentType(),
                session.getFolderId(), userId, session.getStorageKey(), session.getHash());

        session.setStatus("completed");
        sessionRepository.save(session);

        // Post-commit side effects.
        fileService.evictFileCaches(userId, session.getFolderId());
        activityService.log(userId, ActivityService.UPLOAD, session.getFileName(), session.getFileSize());
        notificationService.send(userId, NotificationService.UPLOAD_COMPLETE,
                "Upload complete", session.getFileName() + " has been uploaded successfully.",
                result.getId().toString(), session.getFileName());
        fileService.checkStorageWarning(userId);
        return result;
    }

    // ── Cancel: abort the multipart upload and drop the session ───────────────

    @Transactional
    public void cancel(UUID uploadId, UUID userId) {
        UploadSessionEntity session = sessionRepository.findByIdAndUserId(uploadId, userId)
                .orElseThrow(() -> new NotFoundException("Upload session not found"));

        if ("completed".equals(session.getStatus())) {
            throw new BadRequestException("Cannot cancel a completed upload");
        }

        if (session.getS3UploadId() != null) {
            try {
                storageService.abortMultipartUpload(session.getStorageKey(), session.getS3UploadId());
            } catch (Exception e) {
                log.warn("Abort multipart failed for {}: {}", uploadId, e.getMessage());
            }
        }

        sessionRepository.deleteById(uploadId);
    }
}
