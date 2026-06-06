package com.cloudsync.analytics;

import com.cloudsync.file.FileRepository;
import com.cloudsync.folder.FolderRepository;
import com.cloudsync.user.UserService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    @PersistenceContext
    private EntityManager em;

    private final ActivityRepository activityRepository;
    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserService userService;

    @SuppressWarnings("unchecked")
    public AnalyticsDto getAnalytics(UUID userId) {
        var user = userService.findById(userId);

        // ── Counts ────────────────────────────────────────────────────────────
        long filesCount   = fileRepository.countByUserIdAndIsDeletedFalse(userId);
        long foldersCount = folderRepository.countByUserId(userId);

        // ── Largest files (top 5) ─────────────────────────────────────────────
        List<Object[]> largestRaw = em.createNativeQuery("""
                    SELECT id::text, name, size, content_type
                    FROM files
                    WHERE user_id = :uid AND is_deleted = false
                    ORDER BY size DESC
                    LIMIT 5
                    """)
                .setParameter("uid", userId)
                .getResultList();

        List<FileStatsDto> largestFiles = largestRaw.stream()
                .map(r -> new FileStatsDto(
                        (String) r[0],
                        (String) r[1],
                        toLong(r[2]),
                        (String) r[3],
                        0L))
                .collect(Collectors.toList());

        // ── Most downloaded (top 5, files with at least 1 download) ──────────
        List<Object[]> dlRaw = em.createNativeQuery("""
                    SELECT f.id::text, f.name, f.size, f.content_type,
                           COALESCE(SUM(sl.download_count), 0) AS total_downloads
                    FROM files f
                    LEFT JOIN shared_links sl ON sl.file_id = f.id
                    WHERE f.user_id = :uid AND f.is_deleted = false
                    GROUP BY f.id, f.name, f.size, f.content_type
                    HAVING COALESCE(SUM(sl.download_count), 0) > 0
                    ORDER BY total_downloads DESC
                    LIMIT 5
                    """)
                .setParameter("uid", userId)
                .getResultList();

        List<FileStatsDto> mostDownloaded = dlRaw.stream()
                .map(r -> new FileStatsDto(
                        (String) r[0],
                        (String) r[1],
                        toLong(r[2]),
                        (String) r[3],
                        toLong(r[4])))
                .collect(Collectors.toList());

        // ── Storage by type ───────────────────────────────────────────────────
        List<Object[]> typeRaw = em.createNativeQuery("""
                    SELECT
                      CASE
                        WHEN content_type LIKE 'image/%' THEN 'Images'
                        WHEN content_type LIKE 'video/%' THEN 'Videos'
                        WHEN content_type LIKE 'audio/%' THEN 'Audio'
                        WHEN content_type = 'application/pdf' THEN 'PDFs'
                        WHEN content_type LIKE 'text/%'  THEN 'Text'
                        ELSE 'Other'
                      END AS type_label,
                      COUNT(*)   AS cnt,
                      SUM(size)  AS total_size
                    FROM files
                    WHERE user_id = :uid AND is_deleted = false
                    GROUP BY type_label
                    ORDER BY total_size DESC
                    """)
                .setParameter("uid", userId)
                .getResultList();

        List<TypeBreakdownDto> storageByType = typeRaw.stream()
                .map(r -> new TypeBreakdownDto(
                        (String) r[0],
                        toLong(r[1]),
                        toLong(r[2])))
                .collect(Collectors.toList());

        // ── Recent activity (last 20) ─────────────────────────────────────────
        List<ActivityDto> recentActivity = activityRepository
                .findTop20ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(a -> ActivityDto.builder()
                        .id(a.getId()).action(a.getAction())
                        .fileName(a.getFileName()).fileSize(a.getFileSize())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return AnalyticsDto.builder()
                .storageUsed(user.getStorageUsed())
                .storageLimit(user.getStorageLimit())
                .filesCount(filesCount)
                .foldersCount(foldersCount)
                .largestFiles(largestFiles)
                .mostDownloaded(mostDownloaded)
                .storageByType(storageByType)
                .recentActivity(recentActivity)
                .build();
    }

    private long toLong(Object val) {
        if (val == null) return 0L;
        if (val instanceof Long l) return l;
        if (val instanceof Integer i) return i.longValue();
        if (val instanceof BigInteger bi) return bi.longValue();
        if (val instanceof BigDecimal bd) return bd.longValue();
        return ((Number) val).longValue();
    }
}
