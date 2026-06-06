package com.cloudvault.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public static final String UPLOAD_COMPLETE  = "UPLOAD_COMPLETE";
    public static final String FILE_SHARED      = "FILE_SHARED";
    public static final String STORAGE_WARNING  = "STORAGE_WARNING";
    public static final String RESTORE          = "RESTORE";

    /**
     * Push a real-time notification to one user.
     * Delivered to /user/{userId}/queue/notifications on the STOMP broker.
     * Fire-and-forget: a delivery failure (e.g. user not connected) is logged, not thrown.
     */
    public void send(UUID userId, String type, String title, String message,
                     String fileId, String fileName) {
        try {
            NotificationDto dto = NotificationDto.builder()
                    .type(type).title(title).message(message)
                    .fileId(fileId).fileName(fileName)
                    .build();
            messagingTemplate.convertAndSendToUser(
                    userId.toString(), "/queue/notifications", dto);
        } catch (Exception e) {
            log.debug("WebSocket notification skipped (user not connected?): {}", e.getMessage());
        }
    }

    public void send(UUID userId, String type, String title, String message) {
        send(userId, type, title, message, null, null);
    }
}
