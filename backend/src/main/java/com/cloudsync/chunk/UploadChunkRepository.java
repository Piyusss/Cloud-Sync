package com.cloudsync.chunk;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UploadChunkRepository extends JpaRepository<UploadChunkEntity, UUID> {

    long countByUploadId(UUID uploadId);

    List<UploadChunkEntity> findByUploadIdOrderByChunkIndexAsc(UUID uploadId);

    boolean existsByUploadIdAndChunkIndex(UUID uploadId, int chunkIndex);

    @Query("SELECT c.chunkIndex FROM UploadChunkEntity c WHERE c.uploadId = :uploadId ORDER BY c.chunkIndex ASC")
    List<Integer> findUploadedChunkIndexes(UUID uploadId);
}
