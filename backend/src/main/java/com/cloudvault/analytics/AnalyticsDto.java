package com.cloudvault.analytics;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsDto {
    private long storageUsed;
    private long storageLimit;
    private long filesCount;
    private long foldersCount;
    private List<FileStatsDto> largestFiles;
    private List<FileStatsDto> mostDownloaded;
    private List<TypeBreakdownDto> storageByType;
    private List<ActivityDto> recentActivity;
}
