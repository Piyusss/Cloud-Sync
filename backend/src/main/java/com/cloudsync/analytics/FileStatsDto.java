package com.cloudsync.analytics;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileStatsDto {
    private String id;
    private String name;
    private long size;
    private String contentType;
    private long downloadCount;
}
