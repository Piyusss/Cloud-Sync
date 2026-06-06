package com.cloudsync.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhysicalFileRepository extends JpaRepository<PhysicalFileEntity, UUID> {

    Optional<PhysicalFileEntity> findByHash(String hash);
    Optional<PhysicalFileEntity> findByStorageKey(String storageKey);
}
