package com.cloudvault.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileVersionRepository extends JpaRepository<FileVersionEntity, UUID> {

    List<FileVersionEntity> findByFileIdOrderByVersionDesc(UUID fileId);

    Optional<FileVersionEntity> findByIdAndFileId(UUID id, UUID fileId);

    long countByFileId(UUID fileId);

    Optional<FileVersionEntity> findTopByFileIdOrderByVersionDesc(UUID fileId);
}
