package com.cloudsync.chunk;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSessionEntity, UUID> {

    Optional<UploadSessionEntity> findByIdAndUserId(UUID id, UUID userId);

    Optional<UploadSessionEntity> findByIdAndUserIdAndStatus(UUID id, UUID userId, String status);
}
