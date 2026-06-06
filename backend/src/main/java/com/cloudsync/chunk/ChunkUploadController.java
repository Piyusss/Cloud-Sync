package com.cloudsync.chunk;

import com.cloudsync.file.FileDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;


@RestController
@RequestMapping("/api/chunks")
@RequiredArgsConstructor
public class ChunkUploadController {

    private final ChunkUploadService chunkUploadService;

    /**
     * Start an upload. If the file is a duplicate, returns { duplicate:true, fileItem }.
     * Otherwise returns { uploadId, key, parts:[{partNumber,url}] } — the client PUTs
     * each part directly to storage using the presigned URLs.
     */
    @PostMapping("/init")
    public ResponseEntity<InitUploadResponse> init(
            @Valid @RequestBody InitUploadRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(chunkUploadService.init(request, userId));
    }

    /** Returns which parts storage has received — use this to resume an interrupted upload. */
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
