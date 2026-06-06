package com.cloudsync.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, UUID> {

    List<FileEntity> findByUserIdAndFolderIdIsNullAndIsDeletedFalseOrderByCreatedAtDesc(UUID userId);

    List<FileEntity> findByUserIdAndFolderIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID userId, UUID folderId);

    List<FileEntity> findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID userId);

    Optional<FileEntity> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);

    long countByUserIdAndIsDeletedFalse(UUID userId);

    long countByFolderIdAndIsDeletedFalse(UUID folderId);

    List<FileEntity> findByFolderIdAndIsDeletedFalse(UUID folderId);

    // For version detection: find existing file by name in same folder
    Optional<FileEntity> findByUserIdAndNameAndFolderIdIsNullAndIsDeletedFalse(UUID userId, String name);

    Optional<FileEntity> findByUserIdAndNameAndFolderIdAndIsDeletedFalse(UUID userId, String name, UUID folderId);

    // Trash
    List<FileEntity> findByUserIdAndIsDeletedTrueOrderByDeletedAtDesc(UUID userId);

    Optional<FileEntity> findByIdAndUserIdAndIsDeletedTrue(UUID id, UUID userId);

    List<FileEntity> findByIsDeletedTrueAndDeletedAtBefore(LocalDateTime cutoff);
}
