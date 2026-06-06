package com.cloudsync.share;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.common.NotFoundException;
import com.cloudsync.file.FileEntity;
import com.cloudsync.file.FileRepository;
import com.cloudsync.notification.NotificationService;
import com.cloudsync.user.User;
import com.cloudsync.user.UserRepository;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
        "minio.endpoint=http://localhost:9000",
        "minio.access-key=test-access",
        "minio.secret-key=test-secret",
        "minio.bucket=test-bucket",
        "app.share-base-url=http://localhost:5173",
        "cors.allowed-origins=http://localhost:5173",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration"
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
    @MockBean ActivityService activityService;
    @MockBean NotificationService notificationService;

    @Autowired SharedLinkService sharedLinkService;
    @Autowired SharedLinkRepository sharedLinkRepository;
    @Autowired FileRepository fileRepository;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private UUID sharedUserId;
    private UUID sharedFileId;

    @BeforeEach
    void setUp() {
        // Let DB generate the UUID (em.persist not em.merge)
        User user = userRepository.saveAndFlush(User.builder()
            .email("test-" + UUID.randomUUID() + "@example.com")
            .build());
        sharedUserId = user.getId();

        FileEntity file = fileRepository.saveAndFlush(FileEntity.builder()
            .userId(sharedUserId)
            .name("test-file.txt")
            .size(1024L)
            .contentType("text/plain")
            .storageKey("key/" + UUID.randomUUID())
            .build());
        sharedFileId = file.getId();
    }

    @Test
    void expiredLink_throwsNotFoundException() {
        SharedLinkEntity link = sharedLinkRepository.saveAndFlush(SharedLinkEntity.builder()
            .fileId(sharedFileId)
            .userId(sharedUserId)
            .token("expired-" + UUID.randomUUID())
            .expiresAt(LocalDateTime.now().minusHours(2))
            .build());

        assertThrows(NotFoundException.class, () ->
            sharedLinkService.getPublicInfo(link.getToken())
        );
    }

    @Test
    void wrongPassword_throwsPasswordRequiredException() {
        String hash = passwordEncoder.encode("correct");
        SharedLinkEntity link = sharedLinkRepository.saveAndFlush(SharedLinkEntity.builder()
            .fileId(sharedFileId)
            .userId(sharedUserId)
            .token("pw-" + UUID.randomUUID())
            .passwordHash(hash)
            .build());

        assertThrows(PasswordRequiredException.class, () ->
            sharedLinkService.validateDownload(link.getToken(), "wrongpassword")
        );
    }

    @Test
    void correctPassword_returnsFileEntity() {
        String hash = passwordEncoder.encode("secret");
        SharedLinkEntity link = sharedLinkRepository.saveAndFlush(SharedLinkEntity.builder()
            .fileId(sharedFileId)
            .userId(sharedUserId)
            .token("ok-" + UUID.randomUUID())
            .passwordHash(hash)
            .build());

        FileEntity result = sharedLinkService.validateDownload(link.getToken(), "secret");
        assertNotNull(result);
        assertEquals(sharedFileId, result.getId());
    }

    @Test
    void missingLink_throwsNotFoundException() {
        assertThrows(NotFoundException.class, () ->
            sharedLinkService.getPublicInfo("does-not-exist")
        );
    }
}
