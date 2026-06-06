package com.cloudsync.folder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FolderRepository extends JpaRepository<FolderEntity, UUID> {

    List<FolderEntity> findByUserIdAndParentFolderIdIsNullOrderByNameAsc(UUID userId);

    List<FolderEntity> findByUserIdAndParentFolderIdOrderByNameAsc(UUID userId, UUID parentFolderId);

    Optional<FolderEntity> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndParentFolderIdIsNull(UUID userId);

    long countByUserId(UUID userId);
}
