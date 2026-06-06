package com.cloudsync.share;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.common.NotFoundException;
import com.cloudsync.file.FileEntity;
import com.cloudsync.file.FileRepository;
import com.cloudsync.notification.NotificationService;
import io.minio.MinioClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
        "minio.endpoint=http://localhost:9000",
        "minio.access-key=test-access",
        "minio.secret-key=test-secret",
        "minio.bucket=test-bucket",
        "app.share-base-url=http://localhost:5173"
    }
)
@Testcontainers
@Transactional
class SharedLinkServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @MockBean MinioClient minioClient;
    @MockBean RedisConnectionFactory redisConnectionFactory;
    @MockBean JwtDecoder jwtDecoder;
    @MockBean FileRepository fileRepository;
    @MockBean ActivityService activityService;
    @MockBean NotificationService notificationService;

    @Autowired SharedLinkService sharedLinkService;
    @Autowired SharedLinkRepository sharedLinkRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @Test
    void expiredLink_throwsNotFoundException() {
        SharedLinkEntity link = SharedLinkEntity.builder()
            .fileId(UUID.randomUUID())
            .userId(UUID.randomUUID())
            .token("expired-" + UUID.randomUUID())
            .expiresAt(LocalDateTime.now().minusHours(2))
            .build();
        sharedLinkRepository.save(link);

        assertThrows(NotFoundException.class, () ->
            sharedLinkService.getPublicInfo(link.getToken())
        );
    }

    @Test
    void wrongPassword_throwsPasswordRequiredException() {
        String hash = passwordEncoder.encode("correct");
        SharedLinkEntity link = SharedLinkEntity.builder()
            .fileId(UUID.randomUUID())
            .userId(UUID.randomUUID())
            .token("pw-" + UUID.randomUUID())
            .passwordHash(hash)
            .build();
        sharedLinkRepository.save(link);

        assertThrows(PasswordRequiredException.class, () ->
            sharedLinkService.validateDownload(link.getToken(), "wrongpassword")
        );
    }

    @Test
    void correctPassword_returnsFileEntity() {
        UUID fileId = UUID.randomUUID();
        String hash = passwordEncoder.encode("secret");
        SharedLinkEntity link = SharedLinkEntity.builder()
            .fileId(fileId)
            .userId(UUID.randomUUID())
            .token("ok-" + UUID.randomUUID())
            .passwordHash(hash)
            .build();
        sharedLinkRepository.save(link);

        FileEntity mockFile = mock(FileEntity.class);
        when(mockFile.getIsDeleted()).thenReturn(false);
        when(fileRepository.findById(fileId)).thenReturn(Optional.of(mockFile));

        FileEntity result = sharedLinkService.validateDownload(link.getToken(), "secret");
        assertNotNull(result);
    }

    @Test
    void missingLink_throwsNotFoundException() {
        assertThrows(NotFoundException.class, () ->
            sharedLinkService.getPublicInfo("does-not-exist")
        );
    }
}
