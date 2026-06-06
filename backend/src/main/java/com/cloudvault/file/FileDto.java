package com.cloudvault.file;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileDto {
    private UUID id;
    private UUID userId;
    private UUID folderId;
    private String name;
    private Long size;
    private String contentType;
    private Boolean isDeleted;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
}
