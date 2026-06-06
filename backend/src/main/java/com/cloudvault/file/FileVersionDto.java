package com.cloudvault.file;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileVersionDto {
    private UUID id;
    private UUID fileId;
    private int version;
    private long size;
    private LocalDateTime createdAt;
    private boolean current;
}
