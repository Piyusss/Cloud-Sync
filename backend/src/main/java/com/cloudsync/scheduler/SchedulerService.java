package com.cloudsync.scheduler;

import com.cloudsync.file.FileVersionEntity;
import com.cloudsync.file.PhysicalFileRepository;
import com.cloudsync.share.SharedLinkRepository;
import com.cloudsync.trash.TrashService;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {

    private final TrashService trashService;
    private final SharedLinkRepository sharedLinkRepository;
    private final PhysicalFileRepository physicalFileRepository;
    private final MinioClient minioClient;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${app.version-retention:10}")
    private int maxVersions;

    private final Map<String, JobStatusDto> statuses = new ConcurrentHashMap<>();

    // ── Job 1 — Expired trash (2 AM daily) ───────────────────────────────────

    @Scheduled(cron = "0 0 2 * * *")
    public void runTrashCleanup() {
        log.info("[Job] trash-cleanup starting");
        int count = trashService.cleanupExpiredTrash();
        updateStatus("trash-cleanup",
                "Permanently delete files trashed more than 30 days ago",
                "0 0 2 * * * (2 AM daily)",
                count,
                count + " file(s) permanently deleted");
        log.info("[Job] trash-cleanup done — {} file(s) deleted", count);
    }

    // ── Job 2 — Expired share links (3 AM daily) ─────────────────────────────

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void runExpiredLinksCleanup() {
        log.info("[Job] expired-links starting");
        int count = sharedLinkRepository.deleteExpiredLinks(LocalDateTime.now());
        updateStatus("expired-links",
                "Remove share links whose expiry date has passed",
                "0 0 3 * * * (3 AM daily)",
                count,
                count + " expired link(s) removed");
        log.info("[Job] expired-links done — {} link(s) removed", count);
    }

    // ── Job 3 — Old version cleanup (4 AM daily) ─────────────────────────────

    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void runVersionCleanup() {
        log.info("[Job] version-cleanup starting (keep last {})", maxVersions);
        int count = pruneOldVersions();
        updateStatus("version-cleanup",
                "Keep only the " + maxVersions + " most recent versions per file",
                "0 0 4 * * * (4 AM daily)",
                count,
                count + " old version(s) pruned");
        log.info("[Job] version-cleanup done — {} version(s) pruned", count);
    }

    // ── Version pruning logic ─────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private int pruneOldVersions() {
        // Find excess versions: for each file, the (maxVersions+1)th-oldest and beyond.
        // Never delete the current version (fv.storage_key = f.storage_key).
        List<Object[]> rows = entityManager.createNativeQuery("""
                SELECT fv.id::text, fv.storage_key
                FROM file_versions fv
                JOIN files f ON f.id = fv.file_id AND f.is_deleted = false
                WHERE (
                    SELECT COUNT(*) FROM file_versions fv2
                    WHERE fv2.file_id = fv.file_id AND fv2.version >= fv.version
                ) > :maxV
                AND fv.storage_key != f.storage_key
                """)
                .setParameter("maxV", maxVersions)
                .getResultList();

        if (rows.isEmpty()) return 0;

        List<UUID> toDeleteIds = new ArrayList<>();
        for (Object[] row : rows) {
            UUID versionId = UUID.fromString((String) row[0]);
            String storageKey = (String) row[1];
            toDeleteIds.add(versionId);
            cleanupVersionStorage(storageKey);
        }

        entityManager.createQuery("DELETE FROM FileVersionEntity fv WHERE fv.id IN :ids")
                .setParameter("ids", toDeleteIds)
                .executeUpdate();

        return toDeleteIds.size();
    }

    private void cleanupVersionStorage(String storageKey) {
        // If storage is managed by physical_files, decrement ref_count
        var physOpt = physicalFileRepository.findByStorageKey(storageKey);
        if (physOpt.isPresent()) {
            var pf = physOpt.get();
            pf.setRefCount(Math.max(0, pf.getRefCount() - 1));
            if (pf.getRefCount() <= 0) {
                deleteFromMinio(storageKey);
                physicalFileRepository.delete(pf);
            } else {
                physicalFileRepository.save(pf);
            }
        } else {
            // Legacy storage key not tracked by physical_files — delete directly
            deleteFromMinio(storageKey);
        }
    }

    private void deleteFromMinio(String storageKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder().bucket(bucket).object(storageKey).build());
        } catch (Exception e) {
            log.warn("MinIO delete failed for {}: {}", storageKey, e.getMessage());
        }
    }

    // ── Status tracking ───────────────────────────────────────────────────────

    private void updateStatus(String key, String description, String schedule,
                               int count, String result) {
        statuses.put(key, JobStatusDto.builder()
                .jobName(key).description(description).schedule(schedule)
                .lastRun(LocalDateTime.now()).lastCount(count).lastResult(result)
                .build());
    }

    public List<JobStatusDto> getAllStatuses() {
        // Return all 3 jobs, filling in defaults for ones not yet run
        List<String> jobs = List.of("trash-cleanup", "expired-links", "version-cleanup");
        List<String[]> meta = List.of(
                new String[]{"trash-cleanup",
                        "Permanently delete files trashed more than 30 days ago",
                        "0 0 2 * * * (2 AM daily)"},
                new String[]{"expired-links",
                        "Remove share links whose expiry date has passed",
                        "0 0 3 * * * (3 AM daily)"},
                new String[]{"version-cleanup",
                        "Keep only the " + maxVersions + " most recent versions per file",
                        "0 0 4 * * * (4 AM daily)"}
        );

        List<JobStatusDto> result = new ArrayList<>();
        for (int i = 0; i < jobs.size(); i++) {
            String key = jobs.get(i);
            result.add(statuses.getOrDefault(key, JobStatusDto.builder()
                    .jobName(key).description(meta.get(i)[1]).schedule(meta.get(i)[2])
                    .lastRun(null).lastCount(0).lastResult("Not run since startup")
                    .build()));
        }
        return result;
    }
}
