package com.cloudsync.share;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.notification.NotificationService;
import com.cloudsync.file.FileEntity;
import com.cloudsync.file.FileRepository;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SharedLinkService {

    private final SharedLinkRepository sharedLinkRepository;
    private final FileRepository fileRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${app.share-base-url:http://localhost:5173}")
    private String shareBaseUrl;

    private static final SecureRandom RANDOM = new SecureRandom();

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public SharedLinkDto create(UUID fileId, UUID userId, CreateShareLinkRequest req) {
        fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        String passwordHash = (req.getPassword() != null && !req.getPassword().isBlank())
                ? passwordEncoder.encode(req.getPassword()) : null;

        LocalDateTime expiresAt = req.getExpiresInHours() != null
                ? LocalDateTime.now().plusHours(req.getExpiresInHours()) : null;

        SharedLinkEntity link = sharedLinkRepository.save(SharedLinkEntity.builder()
                .fileId(fileId).userId(userId).token(token)
                .passwordHash(passwordHash).expiresAt(expiresAt)
                .build());

        SharedLinkDto dto = toDto(link);
        fileRepository.findById(fileId).ifPresent(f -> {
            activityService.log(userId, ActivityService.SHARE_CREATE, f.getName(), null);
            notificationService.send(userId, NotificationService.FILE_SHARED,
                    "Share link created",
                    "A public link for \"" + f.getName() + "\" is now active.",
                    fileId.toString(), f.getName());
        });
        return dto;
    }

    // ── List ──────────────────────────────────────────────────────────────────

    public List<SharedLinkDto> list(UUID fileId, UUID userId) {
        return sharedLinkRepository.findByFileIdAndUserIdOrderByCreatedAtDesc(fileId, userId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    /** Every active share link the user has created, enriched with file info.
     *  Links pointing at a deleted/missing file are skipped (they're effectively dead). */
    public List<SharedLinkDto> listAllForUser(UUID userId) {
        List<SharedLinkEntity> links = sharedLinkRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (links.isEmpty()) return List.of();

        Set<UUID> fileIds = links.stream()
                .map(SharedLinkEntity::getFileId).collect(Collectors.toSet());
        Map<UUID, FileEntity> files = new HashMap<>();
        fileRepository.findAllById(fileIds).forEach(f -> files.put(f.getId(), f));

        List<SharedLinkDto> result = new ArrayList<>();
        for (SharedLinkEntity link : links) {
            FileEntity f = files.get(link.getFileId());
            if (f == null || Boolean.TRUE.equals(f.getIsDeleted())) continue;
            SharedLinkDto dto = toDto(link);
            dto.setFileName(f.getName());
            dto.setFileSize(f.getSize());
            dto.setContentType(f.getContentType());
            result.add(dto);
        }
        return result;
    }

    // ── Public: file info (no password required to view metadata) ────────────

    public PublicFileInfoDto getPublicInfo(String token) {
        SharedLinkEntity link = findLinkOrThrow(token);
        FileEntity file = fileRepository.findById(link.getFileId())
                .filter(f -> !f.getIsDeleted())
                .orElseThrow(() -> new RuntimeException("File not found"));
        return PublicFileInfoDto.builder()
                .fileName(file.getName())
                .size(file.getSize())
                .contentType(file.getContentType())
                .passwordProtected(link.getPasswordHash() != null)
                .build();
    }

    // ── Public: validate + open download stream ───────────────────────────────

    @Transactional
    public FileEntity validateDownload(String token, String password) {
        SharedLinkEntity link = findLinkOrThrow(token);

        if (link.getPasswordHash() != null) {
            if (password == null || !passwordEncoder.matches(password, link.getPasswordHash())) {
                throw new PasswordRequiredException("Password required or incorrect");
            }
        }

        FileEntity file = fileRepository.findById(link.getFileId())
                .filter(f -> !f.getIsDeleted())
                .orElseThrow(() -> new RuntimeException("File not found"));

        link.setDownloadCount(link.getDownloadCount() + 1);
        sharedLinkRepository.save(link);

        return file;
    }

    public InputStream openStream(FileEntity file) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder().bucket(bucket).object(file.getStorageKey()).build());
        } catch (Exception e) {
            log.error("MinIO download failed for shared file {}: {}", file.getId(), e.getMessage());
            throw new RuntimeException("Failed to download file");
        }
    }

    // ── Revoke ────────────────────────────────────────────────────────────────

    @Transactional
    public void delete(String token, UUID userId) {
        SharedLinkEntity link = sharedLinkRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Link not found"));
        if (!link.getUserId().equals(userId)) {
            throw new RuntimeException("Not authorized");
        }
        sharedLinkRepository.delete(link);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private SharedLinkEntity findLinkOrThrow(String token) {
        SharedLinkEntity link = sharedLinkRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Link not found or expired"));
        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("This link has expired");
        }
        return link;
    }

    SharedLinkDto toDto(SharedLinkEntity e) {
        return SharedLinkDto.builder()
                .id(e.getId())
                .fileId(e.getFileId())
                .token(e.getToken())
                .hasPassword(e.getPasswordHash() != null)
                .expiresAt(e.getExpiresAt())
                .downloadCount(e.getDownloadCount())
                .createdAt(e.getCreatedAt())
                .url(shareBaseUrl + "/share/" + e.getToken())
                .build();
    }
}
