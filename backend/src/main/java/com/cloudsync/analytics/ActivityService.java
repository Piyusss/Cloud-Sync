package com.cloudsync.analytics;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    private final ActivityRepository activityRepository;

    public static final String UPLOAD            = "UPLOAD";
    public static final String DOWNLOAD          = "DOWNLOAD";
    public static final String DELETE            = "DELETE";
    public static final String FOLDER_CREATE     = "FOLDER_CREATE";
    public static final String FOLDER_DELETE     = "FOLDER_DELETE";
    public static final String SHARE_CREATE      = "SHARE_CREATE";
    public static final String VERSION_RESTORE   = "VERSION_RESTORE";
    public static final String RESTORE           = "RESTORE";
    public static final String PERMANENT_DELETE  = "PERMANENT_DELETE";

    /** Fire-and-forget activity log — never throws, never blocks the caller. */
    public void log(UUID userId, String action, String fileName, Long fileSize) {
        try {
            activityRepository.save(ActivityEntity.builder()
                    .userId(userId).action(action)
                    .fileName(fileName).fileSize(fileSize)
                    .build());
        } catch (Exception e) {
            log.warn("Activity log failed [{} / {}]: {}", action, fileName, e.getMessage());
        }
    }
}
