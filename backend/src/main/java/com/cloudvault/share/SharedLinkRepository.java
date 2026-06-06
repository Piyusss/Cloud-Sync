package com.cloudvault.share;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SharedLinkRepository extends JpaRepository<SharedLinkEntity, UUID> {
    Optional<SharedLinkEntity> findByToken(String token);
    List<SharedLinkEntity> findByFileIdAndUserIdOrderByCreatedAtDesc(UUID fileId, UUID userId);
    List<SharedLinkEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM SharedLinkEntity s WHERE s.expiresAt IS NOT NULL AND s.expiresAt < :now")
    int deleteExpiredLinks(@Param("now") LocalDateTime now);
}
