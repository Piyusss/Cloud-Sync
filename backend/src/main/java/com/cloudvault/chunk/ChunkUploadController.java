package com.cloudvault.chunk;

import com.cloudvault.file.FileDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/api/chunks")
@RequiredArgsConstructor
public class ChunkUploadController {

    private final ChunkUploadService chunkUploadService;

    /** Start a new upload session. If the file is a duplicate, returns { duplicate:true, fileItem } immediately. */
    @PostMapping("/init")
    public ResponseEntity<InitUploadResponse> init(
            @Valid @RequestBody InitUploadRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(chunkUploadService.init(request, userId));
    }

    /** Upload one chunk. Idempotent — re-uploading the same chunkIndex is safe. */
    @PostMapping("/{uploadId}/chunk")
    public ResponseEntity<Map<String, Object>> uploadChunk(
            @PathVariable UUID uploadId,
            @RequestParam("chunkIndex") int chunkIndex,
            @RequestParam("chunk") MultipartFile chunk,
            @AuthenticationPrincipal UUID userId) {
        chunkUploadService.uploadChunk(uploadId, chunkIndex, chunk, userId);
        return ResponseEntity.ok(Map.of("chunkIndex", chunkIndex, "received", true));
    }

    /** Returns which chunks have been received — use this to resume an interrupted upload. */
    @GetMapping("/{uploadId}/status")
    public ResponseEntity<UploadStatusDto> status(
            @PathVariable UUID uploadId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(chunkUploadService.status(uploadId, userId));
    }

    /** Merge all received chunks into a permanent file. Returns the FileDto. */
    @PostMapping("/{uploadId}/complete")
    public ResponseEntity<FileDto> complete(
            @PathVariable UUID uploadId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(chunkUploadService.complete(uploadId, userId));
    }

    /** Cancel an in-progress upload and delete all temp chunks. */
    @DeleteMapping("/{uploadId}")
    public ResponseEntity<Map<String, String>> cancel(
            @PathVariable UUID uploadId,
            @AuthenticationPrincipal UUID userId) {
        chunkUploadService.cancel(uploadId, userId);
        return ResponseEntity.ok(Map.of("message", "Upload cancelled"));
    }
}
