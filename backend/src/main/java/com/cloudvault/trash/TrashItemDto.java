package com.cloudvault.trash;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrashItemDto {
    private UUID id;
    private String name;
    private Long size;
    private String contentType;
    private UUID folderId;
    private String folderName;
    private LocalDateTime deletedAt;
}
