package com.cloudsync.file;

import com.cloudsync.analytics.ActivityService;
import com.cloudsync.common.StorageQuotaException;
import com.cloudsync.notification.NotificationService;
import com.cloudsync.user.User;
import com.cloudsync.user.UserService;
import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
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
class FileServiceIntegrationTest {

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
    @MockBean UserService userService;
    @MockBean ActivityService activityService;
    @MockBean NotificationService notificationService;

    @Autowired FileService fileService;
    @Autowired FileRepository fileRepository;
    @Autowired FileVersionRepository versionRepository;

    private static final UUID USER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        User user = mock(User.class);
        lenient().when(user.getStorageUsed()).thenReturn(0L);
        lenient().when(user.getStorageLimit()).thenReturn(5_368_709_120L);
        lenient().when(userService.findById(any())).thenReturn(user);
    }

    @Test
    void newFile_persistsAndCreatesVersionOne() {
        FileDto result = fileService.createOrUpdateFile(
            "report.txt", 1024L, "text/plain", null, USER_ID, "key/v1", null, false
        );

        assertNotNull(result.getId());
        assertEquals("report.txt", result.getName());
        assertEquals(1024L, result.getSize());

        FileEntity stored = fileRepository
            .findByIdAndUserIdAndIsDeletedFalse(result.getId(), USER_ID)
            .orElseThrow();
        assertEquals("report.txt", stored.getName());
        assertEquals(1L, versionRepository.countByFileId(result.getId()));
    }

    @Test
    void sameFilenameUploadedTwice_addsVersion() {
        UUID userId = UUID.randomUUID();

        FileDto v1 = fileService.createOrUpdateFile(
            "doc.txt", 512L, "text/plain", null, userId, "key/v1", null, false
        );
        FileDto v2 = fileService.createOrUpdateFile(
            "doc.txt", 1024L, "text/plain", null, userId, "key/v2", null, false
        );

        assertEquals(v1.getId(), v2.getId(), "Version upload keeps the same file ID");
        assertEquals(1024L, v2.getSize(), "File size updated to latest version");
        assertEquals(2L, versionRepository.countByFileId(v1.getId()), "Version count is 2");
    }

    @Test
    void deduplicated_doesNotUpdateStorage() {
        UUID userId = UUID.randomUUID();

        fileService.createOrUpdateFile(
            "dup.jpg", 2048L, "image/jpeg", null, userId, "key/shared", null, true
        );

        verify(userService, never()).updateStorageUsed(eq(userId), anyLong());
    }

    @Test
    void storageQuotaExceeded_throwsStorageQuotaException() {
        User fullUser = mock(User.class);
        when(fullUser.getStorageUsed()).thenReturn(5_368_709_120L);
        when(fullUser.getStorageLimit()).thenReturn(5_368_709_120L);
        UUID userId = UUID.randomUUID();
        when(userService.findById(userId)).thenReturn(fullUser);

        assertThrows(StorageQuotaException.class, () ->
            fileService.createOrUpdateFile(
                "big.zip", 1_000_000L, "application/zip", null, userId, "key/big", null, false
            )
        );
    }
}
