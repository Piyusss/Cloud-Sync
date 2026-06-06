package com.cloudsync.file;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files/{fileId}/versions")
@RequiredArgsConstructor
public class FileVersionController {

    private final FileVersionService versionService;

    @GetMapping
    public ResponseEntity<List<FileVersionDto>> list(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(versionService.getVersions(fileId, userId));
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<FileDto> restore(
            @PathVariable UUID fileId,
            @PathVariable UUID versionId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(versionService.restore(fileId, versionId, userId));
    }

    @DeleteMapping("/{versionId}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable UUID fileId,
            @PathVariable UUID versionId,
            @AuthenticationPrincipal UUID userId) {
        versionService.deleteVersion(fileId, versionId, userId);
        return ResponseEntity.ok(Map.of("message", "Version deleted"));
    }
}
