package com.cloudvault.notification;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private String type;        // UPLOAD_COMPLETE | FILE_SHARED | STORAGE_WARNING | RESTORE
    private String title;
    private String message;
    private String fileId;      // nullable
    private String fileName;    // nullable
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
