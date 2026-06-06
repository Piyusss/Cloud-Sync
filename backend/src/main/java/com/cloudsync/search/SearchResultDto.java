package com.cloudsync.search;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchResultDto {
    private UUID id;
    private String name;
    private Long size;
    private String contentType;
    private UUID folderId;
    private String folderName;   // null means root
    private LocalDateTime createdAt;
}
