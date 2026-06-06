package com.cloudsync.analytics;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityDto {
    private UUID id;
    private String action;
    private String fileName;
    private Long fileSize;
    private LocalDateTime createdAt;
}
