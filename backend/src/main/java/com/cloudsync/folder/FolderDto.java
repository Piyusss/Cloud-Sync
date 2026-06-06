package com.cloudsync.folder;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FolderDto {
    private UUID id;
    private UUID userId;
    private String name;
    private UUID parentFolderId;
    private Long itemCount;
    private LocalDateTime createdAt;
}
