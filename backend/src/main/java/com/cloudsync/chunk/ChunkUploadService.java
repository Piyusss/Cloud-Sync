package com.cloudsync.chunk;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.notification.NotificationService;
import com.cloudsync.file.FileDto;
import com.cloudsync.file.FileRepository;
import com.cloudsync.file.FileService;
import com.cloudsync.file.PhysicalFileEntity;
import com.cloudsync.file.PhysicalFileRepository;
import com.cloudsync.user.User;
import com.cloudsync.user.UserService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChunkUploadService {

    private final UploadSessionRepository sessionRepository;
    private final UploadChunkRepository chunkRepository;
    private final FileRepository fileRepository;
    private final FileService fileService;
    private final PhysicalFileRepository physicalFileRepository;
    private final UserService userService;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    // ── Init ─────────────────────────────────────────────────────────────────

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

                return InitUploadResponse.builder()
                        .duplicate(true)
                        .fileItem(fileItem)
                        .uploadedChunks(List.of())
                        .build();
            }
        }

        // ── Normal path ──────────────────────────────────────────────────────
        User user = userService.findById(userId);
        if (user.getStorageUsed() + req.getFileSize() > user.getStorageLimit()) {
            throw new RuntimeException("Storage limit exceeded. Available: "
                    + (user.getStorageLimit() - user.getStorageUsed()) + " bytes");
        }

        String storageKey = userId + "/" + UUID.randomUUID();

        UploadSessionEntity session = UploadSessionEntity.builder()
                .userId(userId).fileName(req.getFileName()).fileSize(req.getFileSize())
                .totalChunks(req.getTotalChunks()).contentType(req.getContentType())
                .folderId(req.getFolderId()).storageKey(storageKey)
                .hash(req.getHash())
                .build();

        session = sessionRepository.save(session);

        return InitUploadResponse.builder()
                .uploadId(session.getId().toString())
                .uploadedChunks(List.of())
                .duplicate(false)
                .build();
    }

    // ── Upload single chunk ───────────────────────────────────────────────────

    public void uploadChunk(UUID uploadId, int chunkIndex, MultipartFile chunkData, UUID userId) {
        UploadSessionEntity session = sessionRepository
                .findByIdAndUserIdAndStatus(uploadId, userId, "in_progress")
                .orElseThrow(() -> new RuntimeException("Upload session not found or already completed"));

        if (chunkIndex < 0 || chunkIndex >= session.getTotalChunks()) {
            throw new RuntimeException("Invalid chunk index: " + chunkIndex);
        }

        // Idempotent: skip if already received (supports retry)
        if (chunkRepository.existsByUploadIdAndChunkIndex(uploadId, chunkIndex)) {
            return;
        }

        String chunkKey = "uploads/" + uploadId + "/chunk_" + chunkIndex;

        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(chunkKey)
                    .stream(chunkData.getInputStream(), chunkData.getSize(), -1)
                    .contentType("application/octet-stream")
                    .build());
        } catch (Exception e) {
            log.error("Failed to store chunk {}/{}: {}", uploadId, chunkIndex, e.getMessage());
            throw new RuntimeException("Failed to store chunk: " + e.getMessage());
        }

        chunkRepository.save(UploadChunkEntity.builder()
                .uploadId(uploadId)
                .chunkIndex(chunkIndex)
                .size(chunkData.getSize())
                .storageKey(chunkKey)
                .build());
    }

    // ── Status (for resume) ──────────────────────────────────────────────────

    public UploadStatusDto status(UUID uploadId, UUID userId) {
        UploadSessionEntity session = sessionRepository.findByIdAndUserId(uploadId, userId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));

        List<Integer> uploaded = chunkRepository.findUploadedChunkIndexes(uploadId);

        return UploadStatusDto.builder()
                .uploadId(session.getId().toString())
                .fileName(session.getFileName())
                .fileSize(session.getFileSize())
                .totalChunks(session.getTotalChunks())
                .uploadedChunks(uploaded)
                .status(session.getStatus())
                .build();
    }

    // ── Complete: merge chunks → single MinIO object → create FileEntity ─────

    @Transactional
    public FileDto complete(UUID uploadId, UUID userId) {
        UploadSessionEntity session = sessionRepository
                .findByIdAndUserIdAndStatus(uploadId, userId, "in_progress")
                .orElseThrow(() -> new RuntimeException("Upload session not found or already completed"));

        long received = chunkRepository.countByUploadId(uploadId);
        if (received != session.getTotalChunks()) {
            throw new RuntimeException(
                    "Incomplete upload: received " + received + "/" + session.getTotalChunks() + " chunks");
        }

        // Merge all chunks into the final storage key
        mergeChunks(uploadId, session.getStorageKey(), session.getFileSize(),
                session.getContentType(), session.getTotalChunks());

        // Register physical file record (enables future deduplication for same content)
        UUID physicalFileId = null;
        if (session.getHash() != null) {
            PhysicalFileEntity pf = physicalFileRepository.save(PhysicalFileEntity.builder()
                    .hash(session.getHash()).size(session.getFileSize())
                    .storageKey(session.getStorageKey()).build());
            physicalFileId = pf.getId();
        }

        // Persist file metadata (handles versioning via FileService)
        FileDto result = fileService.createOrUpdateFile(
                session.getFileName(), session.getFileSize(),
                session.getContentType(), session.getFolderId(),
                userId, session.getStorageKey(), physicalFileId, false);

        session.setStatus("completed");
        sessionRepository.save(session);

        activityService.log(userId, ActivityService.UPLOAD, session.getFileName(), session.getFileSize());
        fileService.evictFileCaches(userId, session.getFolderId());
        notificationService.send(userId, NotificationService.UPLOAD_COMPLETE,
                "Upload complete", session.getFileName() + " has been uploaded successfully.",
                result.getId().toString(), session.getFileName());
        return result;
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    @Transactional
    public void cancel(UUID uploadId, UUID userId) {
        UploadSessionEntity session = sessionRepository.findByIdAndUserId(uploadId, userId)
                .orElseThrow(() -> new RuntimeException("Upload session not found"));

        if ("completed".equals(session.getStatus())) {
            throw new RuntimeException("Cannot cancel a completed upload");
        }

        List<UploadChunkEntity> chunks = chunkRepository.findByUploadIdOrderByChunkIndexAsc(uploadId);
        for (UploadChunkEntity chunk : chunks) {
            try {
                minioClient.removeObject(RemoveObjectArgs.builder()
                        .bucket(bucket).object(chunk.getStorageKey()).build());
            } catch (Exception e) {
                log.warn("Failed to delete temp chunk {}: {}", chunk.getStorageKey(), e.getMessage());
            }
        }

        sessionRepository.deleteById(uploadId);
    }

    // ── Merge ─────────────────────────────────────────────────────────────────

    private void mergeChunks(UUID uploadId, String storageKey, long totalSize,
                              String contentType, int totalChunks) {
        List<InputStream> streams = new ArrayList<>();
        try {
            for (int i = 0; i < totalChunks; i++) {
                String chunkKey = "uploads/" + uploadId + "/chunk_" + i;
                streams.add(minioClient.getObject(
                        GetObjectArgs.builder().bucket(bucket).object(chunkKey).build()));
            }

            InputStream merged = new SequenceInputStream(Collections.enumeration(streams));

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(storageKey)
                    .stream(merged, totalSize, 10 * 1024 * 1024)
                    .contentType(contentType)
                    .build());

        } catch (Exception e) {
            streams.forEach(s -> { try { s.close(); } catch (IOException ignored) {} });
            log.error("Chunk merge failed for session {}: {}", uploadId, e.getMessage());
            throw new RuntimeException("Failed to merge chunks: " + e.getMessage());
        }

        // Delete temp chunk objects (best-effort)
        for (int i = 0; i < totalChunks; i++) {
            String chunkKey = "uploads/" + uploadId + "/chunk_" + i;
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder().bucket(bucket).object(chunkKey).build());
            } catch (Exception e) {
                log.warn("Failed to delete temp chunk {}: {}", chunkKey, e.getMessage());
            }
        }
    }
}
