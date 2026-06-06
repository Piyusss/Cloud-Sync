package com.cloudvault.search;

import com.cloudvault.file.FileEntity;
import com.cloudvault.folder.FolderRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    @PersistenceContext
    private EntityManager entityManager;

    private final FolderRepository folderRepository;

    @SuppressWarnings("unchecked")
    public List<SearchResultDto> search(UUID userId, String q, String type,
                                         LocalDate from, LocalDate to) {
        String trimmedQ = (q != null && !q.isBlank()) ? q.trim() : null;
        boolean hasQuery = trimmedQ != null;

        StringBuilder sql = new StringBuilder(
                "SELECT f.* FROM files f WHERE f.user_id = :userId AND f.is_deleted = false ");

        Map<String, Object> params = new HashMap<>();
        params.put("userId", userId);

        if (hasQuery) {
            sql.append("""
                     AND (f.name ILIKE :qLike
                          OR to_tsvector('english', f.name) @@ websearch_to_tsquery('english', :q))
                    """);
            params.put("q", trimmedQ);
            params.put("qLike", "%" + trimmedQ + "%");
        }

        if (type != null && !type.isBlank()) {
            sql.append(" AND f.content_type ILIKE :typePattern ");
            params.put("typePattern", typeToPattern(type));
        }

        if (from != null) {
            sql.append(" AND f.created_at >= :fromDate ");
            params.put("fromDate", from.atStartOfDay());
        }

        if (to != null) {
            sql.append(" AND f.created_at < :toDate ");
            params.put("toDate", to.plusDays(1).atStartOfDay());
        }

        if (hasQuery) {
            // Rank FTS matches higher, then fall back to recency
            sql.append("""
                     ORDER BY ts_rank(to_tsvector('english', f.name),
                                      websearch_to_tsquery('english', :q)) DESC,
                              f.created_at DESC
                    """);
        } else {
            sql.append(" ORDER BY f.created_at DESC ");
        }

        sql.append(" LIMIT 50");

        var query = entityManager.createNativeQuery(sql.toString(), FileEntity.class);
        params.forEach(query::setParameter);

        List<FileEntity> files = query.getResultList();

        // Batch-fetch folder names to show where each file lives
        Set<UUID> folderIds = files.stream()
                .map(FileEntity::getFolderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> folderNames = new HashMap<>();
        if (!folderIds.isEmpty()) {
            folderRepository.findAllById(folderIds)
                    .forEach(f -> folderNames.put(f.getId(), f.getName()));
        }

        return files.stream()
                .map(f -> SearchResultDto.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .size(f.getSize())
                        .contentType(f.getContentType())
                        .folderId(f.getFolderId())
                        .folderName(f.getFolderId() != null ? folderNames.get(f.getFolderId()) : null)
                        .createdAt(f.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private String typeToPattern(String type) {
        return switch (type.toLowerCase()) {
            case "image"    -> "image/%";
            case "video"    -> "video/%";
            case "audio"    -> "audio/%";
            case "pdf"      -> "application/pdf";
            case "document" -> "%word%";
            case "archive"  -> "%zip%";
            case "text"     -> "text/%";
            default         -> "%" + type + "%";
        };
    }
}
