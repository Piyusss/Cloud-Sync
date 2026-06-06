package com.cloudsync.scheduler;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobStatusDto {
    private String jobName;
    private String description;
    private String schedule;
    private LocalDateTime lastRun;    // null = never run since startup
    private int lastCount;            // items processed in the last run
    private String lastResult;        // e.g. "3 files deleted"
}
