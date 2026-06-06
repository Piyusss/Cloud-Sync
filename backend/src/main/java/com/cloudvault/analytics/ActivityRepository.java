package com.cloudvault.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ActivityRepository extends JpaRepository<ActivityEntity, UUID> {
    List<ActivityEntity> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
}
