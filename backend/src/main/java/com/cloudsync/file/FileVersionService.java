package com.cloudsync.file;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.common.BadRequestException;
import com.cloudsync.common.NotFoundException;
import com.cloudsync.user.UserService;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileVersionService {

    private final FileRepository fileRepository;
    private final FileVersionRepository versionRepository;
    private final FileService fileService;
    private final UserService userService;
    private final ActivityService activityService;
    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    public List<FileVersionDto> getVersions(UUID fileId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));

        return versionRepository.findByFileIdOrderByVersionDesc(fileId).stream()
                .map(v -> toDto(v, v.getStorageKey().equals(file.getStorageKey())))
                .collect(Collectors.toList());
    }

    @Transactional
    public FileDto restore(UUID fileId, UUID versionId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));

        FileVersionEntity target = versionRepository.findByIdAndFileId(versionId, fileId)
                .orElseThrow(() -> new NotFoundException("Version not found"));

        if (target.getStorageKey().equals(file.getStorageKey())) {
            return fileService.toDto(file); // already current
        }

        long delta = target.getSize() - file.getSize();
        file.setStorageKey(target.getStorageKey());
        file.setSize(target.getSize());
        fileRepository.save(file);

        if (delta != 0) userService.updateStorageUsed(userId, delta);
        activityService.log(userId, ActivityService.VERSION_RESTORE, file.getName(), target.getSize());
        return fileService.toDto(file);
    }

    @Transactional
    public void deleteVersion(UUID fileId, UUID versionId, UUID userId) {
        FileEntity file = fileRepository.findByIdAndUserIdAndIsDeletedFalse(fileId, userId)
                .orElseThrow(() -> new NotFoundException("File not found"));

        FileVersionEntity version = versionRepository.findByIdAndFileId(versionId, fileId)
                .orElseThrow(() -> new NotFoundException("Version not found"));

        if (version.getStorageKey().equals(file.getStorageKey())) {
            throw new BadRequestException("Cannot delete the current version");
        }

        if (versionRepository.countByFileId(fileId) <= 1) {
            throw new BadRequestException("Cannot delete the only version");
        }

        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket).object(version.getStorageKey()).build());
        } catch (Exception e) {
            log.warn("Failed to delete version from MinIO: {}", e.getMessage());
        }

        versionRepository.delete(version);
    }

    private FileVersionDto toDto(FileVersionEntity v, boolean current) {
        return FileVersionDto.builder()
                .id(v.getId()).fileId(v.getFileId())
                .version(v.getVersion()).size(v.getSize())
                .createdAt(v.getCreatedAt()).current(current)
                .build();
    }
}
