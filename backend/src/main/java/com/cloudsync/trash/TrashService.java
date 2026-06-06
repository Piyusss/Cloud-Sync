package com.cloudsync.trash;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.file.FileEntity;
import com.cloudsync.file.FileRepository;
import com.cloudsync.file.FileService;
import com.cloudsync.file.PhysicalFileRepository;
import com.cloudsync.folder.FolderRepository;
import com.cloudsync.user.UserService;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrashService {

    private final FileRepository fileRepository;
    private final PhysicalFileRepository physicalFileRepository;
    private final FolderRepository folderRepository;
    private final UserService userService;
    private final ActivityService activityService;
    private final FileService fileService;
    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    private static final int RETENTION_DAYS = 30;

    // ── List trash ────────────────────────────────────────────────────────────

    public List<TrashItemDto> list(UUID userId) {
        List<FileEntity> files =
                fileRepository.findByUserIdAndIsDeletedTrueOrderByDeletedAtDesc(userId);

        // Batch-load folder names
        Set<UUID> folderIds = files.stream()
                .map(FileEntity::getFolderId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> folderNames = new HashMap<>();
        if (!folderIds.isEmpty()) {
            folderRepository.findAllById(folderIds)
                    .forEach(f -> folderNames.put(f.getId(), f.getName()));
        }

        return files.stream().map(f -> TrashItemDto.builder()
                .id(f.getId())
                .name(f.getName())
                .size(f.getSize())
                .contentType(f.getContentType())
                .folderId(f.getFolderId())
                .folderName(f.getFolderId() != null ? folderNames.get(f.getFolderId()) : null)
                .deletedAt(f.getDeletedAt())
                .build()).collect(Collectors.toList());
    }

    // ── Restore ───────────────────────────────────────────────────────────────

    @Transactional
    public TrashItemDto restore(UUID fileId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedTrue(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found in trash"));

        // Check storage limit
        var user = userService.findById(userId);
        if (user.getStorageUsed() + file.getSize() > user.getStorageLimit()) {
            throw new RuntimeException("Storage limit exceeded — cannot restore file");
        }

        // Re-increment physical ref_count (was decremented on soft-delete)
        if (file.getPhysicalFileId() != null) {
            physicalFileRepository.findById(file.getPhysicalFileId()).ifPresent(pf -> {
                pf.setRefCount(pf.getRefCount() + 1);
                physicalFileRepository.save(pf);
            });
        }

        file.setIsDeleted(false);
        file.setDeletedAt(null);
        fileRepository.save(file);
        userService.updateStorageUsed(userId, file.getSize());
        activityService.log(userId, ActivityService.RESTORE, file.getName(), file.getSize());
        fileService.evictFileCaches(userId, file.getFolderId());

        return TrashItemDto.builder()
                .id(file.getId()).name(file.getName()).size(file.getSize())
                .contentType(file.getContentType()).folderId(file.getFolderId())
                .deletedAt(null).build();
    }

    // ── Permanently delete one file ───────────────────────────────────────────

    @Transactional
    public void hardDelete(UUID fileId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedTrue(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found in trash"));
        activityService.log(userId, ActivityService.PERMANENT_DELETE, file.getName(), file.getSize());
        hardDeleteInternal(file);
    }

    // ── Empty trash ───────────────────────────────────────────────────────────

    @Transactional
    public void emptyTrash(UUID userId) {
        List<FileEntity> files =
                fileRepository.findByUserIdAndIsDeletedTrueOrderByDeletedAtDesc(userId);
        for (FileEntity file : files) {
            activityService.log(userId, ActivityService.PERMANENT_DELETE, file.getName(), file.getSize());
            hardDeleteInternal(file);
        }
    }

    // ── Scheduled cleanup: permanently delete files older than 30 days ────────
    // Called by SchedulerService — returns count of deleted files.

    @Transactional
    public int cleanupExpiredTrash() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        List<FileEntity> expired = fileRepository.findByIsDeletedTrueAndDeletedAtBefore(cutoff);
        for (FileEntity file : expired) {
            hardDeleteInternal(file);
        }
        return expired.size();
    }

    // ── Internal hard-delete (no auth check, no extra activity log) ───────────

    private void hardDeleteInternal(FileEntity file) {
        if (file.getPhysicalFileId() != null) {
            // ref_count was already decremented on soft-delete;
            // only wipe MinIO if no other file references this physical object
            physicalFileRepository.findById(file.getPhysicalFileId()).ifPresent(pf -> {
                if (pf.getRefCount() <= 0) {
                    deleteFromMinio(pf.getStorageKey());
                    physicalFileRepository.delete(pf);
                }
            });
        } else {
            // Pre-Phase-6 file: no physical record, delete MinIO directly
            deleteFromMinio(file.getStorageKey());
        }
        fileRepository.delete(file);
    }

    private void deleteFromMinio(String storageKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder().bucket(bucket).object(storageKey).build());
        } catch (Exception e) {
            log.warn("MinIO delete failed for {}: {}", storageKey, e.getMessage());
        }
    }
}
