package com.cloudsync.scheduler;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class SchedulerController {

    private final SchedulerService schedulerService;

    @GetMapping
    public ResponseEntity<List<JobStatusDto>> getStatus(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(schedulerService.getAllStatuses());
    }

    /** Manually trigger a job by name — useful for testing without waiting for cron. */
    @PostMapping("/{jobName}/run")
    public ResponseEntity<Map<String, String>> trigger(
            @PathVariable String jobName,
            @AuthenticationPrincipal UUID userId) {
        switch (jobName) {
            case "trash-cleanup"  -> schedulerService.runTrashCleanup();
            case "expired-links"  -> schedulerService.runExpiredLinksCleanup();
            case "version-cleanup"-> schedulerService.runVersionCleanup();
            default -> throw new RuntimeException("Unknown job: " + jobName);
        }
        return ResponseEntity.ok(Map.of("message", "Job '" + jobName + "' triggered"));
    }
}
