package com.cloudsync.file;

import com.cloudsync.common.RenameRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @GetMapping
    public ResponseEntity<List<FileDto>> list(
            @RequestParam(required = false) UUID folderId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(fileService.list(userId, folderId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<FileDto>> listAll(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(fileService.listAll(userId));
    }

    /** Returns a short-lived presigned URL; the browser downloads directly from storage. */
    @GetMapping("/{fileId}/download")
    public ResponseEntity<Map<String, String>> download(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(Map.of("url", fileService.download(fileId, userId)));
    }

    @PatchMapping("/{fileId}")
    public ResponseEntity<FileDto> rename(
            @PathVariable UUID fileId,
            @Valid @RequestBody RenameRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(fileService.rename(fileId, userId, request.getName()));
    }

    @PatchMapping("/{fileId}/move")
    public ResponseEntity<FileDto> move(
            @PathVariable UUID fileId,
            @RequestBody MoveFileRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(fileService.move(fileId, userId, request.getFolderId()));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        fileService.delete(fileId, userId);
        return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
    }
}
