package com.cloudsync.file;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.common.NotFoundException;
import com.cloudsync.folder.FolderRepository;
import com.cloudsync.notification.NotificationService;
import com.cloudsync.storage.StorageService;
import com.cloudsync.user.User;
import com.cloudsync.user.UserService;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final FileRepository fileRepository;
    private final FileVersionRepository versionRepository;
    private final PhysicalFileRepository physicalFileRepository;
    private final FolderRepository folderRepository;
    private final UserService userService;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final CacheManager cacheManager;
    private final StorageService storageService;

    // ── Finalise a direct (multipart) upload — register storage + metadata ────

    /**
     * Called by ChunkUploadService.complete() AFTER the object has been assembled
     * in storage. Registers the physical file (for dedup) and writes file/version
     * rows in a single short transaction. No storage I/O happens here.
     */
    @Transactional
    public FileDto finalizeUpload(String name, long size, String contentType, UUID folderId,
                                  UUID userId, String storageKey, String hash) {
        UUID physicalFileId = null;
        if (hash != null) {
            PhysicalFileEntity pf = physicalFileRepository.save(PhysicalFileEntity.builder()
                    .hash(hash).size(size).storageKey(storageKey).build());
            physicalFileId = pf.getId();
        }
        return createOrUpdateFile(name, size, contentType, folderId, userId,
                storageKey, physicalFileId, false);
    }

    @Transactional
    public FileDto createOrUpdateFile(String name, long size, String contentType,
                                      UUID folderId, UUID userId, String storageKey,
                                      UUID physicalFileId, boolean deduplicated) {
        Optional<FileEntity> existing = findExisting(userId, name, folderId);
        return createOrUpdateFile(name, size, contentType, folderId, userId,
                storageKey, physicalFileId, deduplicated, existing);
    }

    @Transactional
    public FileDto createOrUpdateFile(String name, long size, String contentType,
                                      UUID folderId, UUID userId, String storageKey,
                                      UUID physicalFileId, boolean deduplicated,
                                      Optional<FileEntity> existing) {
        if (existing.isPresent()) {
            FileEntity file = existing.get();
            long oldSize = file.getSize();

            // Retroactive v1 for files that predate versioning
            if (versionRepository.countByFileId(file.getId()) == 0) {
                versionRepository.save(FileVersionEntity.builder()
                        .fileId(file.getId()).version(1)
                        .storageKey(file.getStorageKey()).size(oldSize).build());
            }

            int nextVersion = (int) versionRepository.countByFileId(file.getId()) + 1;
            versionRepository.save(FileVersionEntity.builder()
                    .fileId(file.getId()).version(nextVersion)
                    .storageKey(storageKey).size(size).build());

            file.setStorageKey(storageKey);
            file.setSize(size);
            if (physicalFileId != null) file.setPhysicalFileId(physicalFileId);
            fileRepository.save(file);

            if (!deduplicated) {
                long delta = size - oldSize;
                if (delta != 0) userService.updateStorageUsed(userId, delta);
            }
            // deduplicated: no new storage consumed, quota unchanged

            return toDto(file);
        } else {
            FileEntity file = fileRepository.save(FileEntity.builder()
                    .userId(userId).folderId(folderId).name(name)
                    .size(size).contentType(contentType).storageKey(storageKey)
                    .physicalFileId(physicalFileId).build());

            versionRepository.save(FileVersionEntity.builder()
                    .fileId(file.getId()).version(1)
                    .storageKey(storageKey).size(size).build());

            if (!deduplicated) {
                userService.updateStorageUsed(userId, size);
            }

            return toDto(file);
        }
    }

    // ── Rename ───────────────────────────────────────────────────────────────

    @Transactional
    public FileDto rename(UUID fileId, UUID userId, String newName) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));
        clearFilesCacheEntry(userId, file.getFolderId());
        file.setName(newName.trim());
        activityService.log(userId, ActivityService.RENAME, newName.trim(), file.getSize());
        return toDto(fileRepository.save(file));
    }

    // ── Move ─────────────────────────────────────────────────────────────────

    @Transactional
    public FileDto move(UUID fileId, UUID userId, UUID targetFolderId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));

        if (targetFolderId != null) {
            folderRepository.findByIdAndUserId(targetFolderId, userId)
                    .orElseThrow(() -> new NotFoundException("Folder not found"));
        }

        UUID oldFolderId = file.getFolderId();
        clearFilesCacheEntry(userId, oldFolderId);
        file.setFolderId(targetFolderId);
        FileEntity saved = fileRepository.save(file);
        clearFilesCacheEntry(userId, targetFolderId);
        activityService.log(userId, ActivityService.MOVE, file.getName(), file.getSize());
        return toDto(saved);
    }

    // ── List / get ───────────────────────────────────────────────────────────

    @Cacheable(value = "files", key = "#userId + ':' + (#folderId ?: 'root')")
    public List<FileDto> list(UUID userId, UUID folderId) {
        List<FileEntity> files = folderId != null
                ? fileRepository.findByUserIdAndFolderIdAndIsDeletedFalseOrderByCreatedAtDesc(userId, folderId)
                : fileRepository.findByUserIdAndFolderIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(userId);
        return files.stream().map(this::toDto).toList();
    }

    @Cacheable(value = "files-all", key = "#userId")
    public List<FileDto> listAll(UUID userId) {
        return fileRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream().map(this::toDto).toList();
    }

    public FileDto getFile(UUID fileId, UUID userId) {
        return toDto(fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found")));
    }

    // ── Download — presigned GET URL (bytes go straight from storage) ─────────

    public String download(UUID fileId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));
        activityService.log(userId, ActivityService.DOWNLOAD, file.getName(), file.getSize());
        return storageService.presignGet(file.getStorageKey(), file.getName(), file.getContentType());
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID fileId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));

        // Decrement physical ref_count
        if (file.getPhysicalFileId() != null) {
            physicalFileRepository.findById(file.getPhysicalFileId()).ifPresent(pf -> {
                pf.setRefCount(Math.max(0, pf.getRefCount() - 1));
                physicalFileRepository.save(pf);
            });
        }

        activityService.log(userId, ActivityService.DELETE, file.getName(), file.getSize());
        UUID folderId = file.getFolderId();
        file.setIsDeleted(true);
        file.setDeletedAt(LocalDateTime.now());
        fileRepository.save(file);
        userService.updateStorageUsed(userId, -file.getSize());
        clearFilesCacheEntry(userId, folderId);
    }

    public long countFiles(UUID userId) {
        return fileRepository.countByUserIdAndIsDeletedFalse(userId);
    }

    // ── Cache invalidation ────────────────────────────────────────────────────

    /**
     * Called from OUTSIDE this bean (ChunkUploadService, TrashService) so
     * the AOP proxy fires and @CacheEvict annotations are honoured.
     */
    @Caching(evict = {
        @CacheEvict(value = "files",     key = "#userId + ':' + (#folderId ?: 'root')"),
        @CacheEvict(value = "files-all", key = "#userId")
    })
    public void evictFileCaches(UUID userId, UUID folderId) {
        // eviction only — body intentionally empty
    }

    /**
     * Programmatic eviction used inside this bean (self-calls bypass AOP proxy).
     * Spring Cache stores keys as the evaluated SpEL String, so we reproduce it.
     */
    public void checkStorageWarning(UUID userId) {
        try {
            User u = userService.findById(userId);
            if (u.getStorageLimit() > 0) {
                int pct = (int) ((u.getStorageUsed() * 100) / u.getStorageLimit());
                if (pct >= 80 && pct < 100) {
                    notificationService.send(userId, NotificationService.STORAGE_WARNING,
                            "Storage almost full",
                            "You've used " + pct + "% of your 5 GB. Consider freeing up space.");
                }
            }
        } catch (Exception ignored) {}
    }

    private void clearFilesCacheEntry(UUID userId, UUID folderId) {
        String folderKey = userId.toString() + ":" + (folderId != null ? folderId.toString() : "root");
        Cache c = cacheManager.getCache("files");
        if (c != null) c.evict(folderKey);
        Cache all = cacheManager.getCache("files-all");
        if (all != null) all.evict(userId.toString());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    Optional<FileEntity> findExisting(UUID userId, String name, UUID folderId) {
        return folderId != null
                ? fileRepository.findByUserIdAndNameAndFolderIdAndIsDeletedFalse(userId, name, folderId)
                : fileRepository.findByUserIdAndNameAndFolderIdIsNullAndIsDeletedFalse(userId, name);
    }

    public FileDto toDto(FileEntity e) {
        return FileDto.builder()
                .id(e.getId()).userId(e.getUserId()).folderId(e.getFolderId())
                .name(e.getName()).size(e.getSize()).contentType(e.getContentType())
                .isDeleted(e.getIsDeleted()).deletedAt(e.getDeletedAt())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
