package com.cloudsync.share;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SharedLinkDto {
    private UUID id;
    private UUID fileId;
    private String token;
    private boolean hasPassword;
    private LocalDateTime expiresAt;
    private int downloadCount;
    private LocalDateTime createdAt;
    private String url;

    // Populated only by the "all my links" view
    private String fileName;
    private Long fileSize;
    private String contentType;
}
