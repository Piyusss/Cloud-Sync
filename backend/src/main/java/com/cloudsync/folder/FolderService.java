package com.cloudsync.folder;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.file.FileEntity;
import com.cloudsync.file.FileRepository;
import com.cloudsync.user.UserService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;
    private final UserService userService;
    private final ActivityService activityService;

    @Transactional
    @CacheEvict(value = "folders", key = "#userId + ':' + (#request.parentFolderId ?: 'root')")
    public FolderDto create(CreateFolderRequest request, UUID userId) {
        if (request.getParentFolderId() != null) {
            folderRepository.findByIdAndUserId(request.getParentFolderId(), userId)
                    .orElseThrow(() -> new RuntimeException("Parent folder not found"));
        }

        FolderEntity folder = FolderEntity.builder()
                .userId(userId)
                .name(request.getName().trim())
                .parentFolderId(request.getParentFolderId())
                .build();

        FolderDto created = toDto(folderRepository.save(folder));
        activityService.log(userId, ActivityService.FOLDER_CREATE, request.getName().trim(), null);
        return created;
    }

    @Cacheable(value = "folders", key = "#userId + ':' + (#parentFolderId ?: 'root')")
    public List<FolderDto> list(UUID parentFolderId, UUID userId) {
        List<FolderEntity> folders = parentFolderId != null
                ? folderRepository.findByUserIdAndParentFolderIdOrderByNameAsc(userId, parentFolderId)
                : folderRepository.findByUserIdAndParentFolderIdIsNullOrderByNameAsc(userId);

        return folders.stream()
                .map(f -> toDtoWithCount(f))
                .collect(Collectors.toList());
    }

    public long countAll(UUID userId) {
        return folderRepository.countByUserId(userId);
    }

    public List<FolderDto> getBreadcrumb(UUID folderId, UUID userId) {
        List<FolderDto> path = new ArrayList<>();
        UUID current = folderId;

        while (current != null) {
            FolderEntity folder = folderRepository.findByIdAndUserId(current, userId)
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            path.add(0, toDto(folder));
            current = folder.getParentFolderId();
        }

        return path;
    }

    @Transactional
    public void delete(UUID folderId, UUID userId) {
        FolderEntity root = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
        activityService.log(userId, ActivityService.FOLDER_DELETE, root.getName(), null);
        evictFolderCache(userId, root.getParentFolderId());

        // Collect all nested folder IDs (BFS)
        List<UUID> allFolderIds = new ArrayList<>();
        collectFolderIds(folderId, userId, allFolderIds);

        // Soft-delete all files in those folders and compute freed storage
        long totalFreed = 0;
        LocalDateTime now = LocalDateTime.now();

        for (UUID id : allFolderIds) {
            List<FileEntity> files = fileRepository.findByFolderIdAndIsDeletedFalse(id);
            for (FileEntity f : files) {
                f.setIsDeleted(true);
                f.setDeletedAt(now);
                totalFreed += f.getSize();
            }
            if (!files.isEmpty()) {
                fileRepository.saveAll(files);
            }
        }

        // Update user storage once
        if (totalFreed > 0) {
            userService.updateStorageUsed(userId, -totalFreed);
        }

        // Hard-delete the root folder (DB cascade removes sub-folders)
        folderRepository.deleteById(folderId);
    }

    @CacheEvict(value = "folders", key = "#userId + ':' + (#parentFolderId ?: 'root')")
    public void evictFolderCache(UUID userId, UUID parentFolderId) {
        // eviction only
    }

    private void collectFolderIds(UUID folderId, UUID userId, List<UUID> ids) {
        ids.add(folderId);
        List<FolderEntity> children =
                folderRepository.findByUserIdAndParentFolderIdOrderByNameAsc(userId, folderId);
        for (FolderEntity child : children) {
            collectFolderIds(child.getId(), userId, ids);
        }
    }

    private FolderDto toDto(FolderEntity e) {
        return FolderDto.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .name(e.getName())
                .parentFolderId(e.getParentFolderId())
                .createdAt(e.getCreatedAt())
                .build();
    }

    private FolderDto toDtoWithCount(FolderEntity e) {
        long count = fileRepository.countByFolderIdAndIsDeletedFalse(e.getId());
        return FolderDto.builder()
                .id(e.getId())
                .userId(e.getUserId())
                .name(e.getName())
                .parentFolderId(e.getParentFolderId())
                .itemCount(count)
                .createdAt(e.getCreatedAt())
                .build();
    }
}
