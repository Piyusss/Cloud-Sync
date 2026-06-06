package com.cloudsync.folder;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @PostMapping
    public ResponseEntity<FolderDto> create(
            @Valid @RequestBody CreateFolderRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(folderService.create(request, userId));
    }

    @GetMapping
    public ResponseEntity<List<FolderDto>> list(
            @RequestParam(required = false) UUID parentFolderId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(folderService.list(parentFolderId, userId));
    }

    @GetMapping("/{folderId}/breadcrumb")
    public ResponseEntity<List<FolderDto>> breadcrumb(
            @PathVariable UUID folderId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(folderService.getBreadcrumb(folderId, userId));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> count(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(Map.of("count", folderService.countAll(userId)));
    }

    @DeleteMapping("/{folderId}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable UUID folderId,
            @AuthenticationPrincipal UUID userId) {
        folderService.delete(folderId, userId);
        return ResponseEntity.ok(Map.of("message", "Folder deleted successfully"));
    }
}
