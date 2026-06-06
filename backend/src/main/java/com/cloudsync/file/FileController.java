package com.cloudsync.file;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<FileDto> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) UUID folderId,
            @RequestParam(value = "hash", required = false) String hash,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(fileService.upload(file, userId, folderId, hash));
    }

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

    @GetMapping("/{fileId}/download")
    public ResponseEntity<InputStreamResource> download(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        FileDto dto = fileService.getFile(fileId, userId);
        InputStream stream = fileService.download(fileId, userId);

        String encodedName = URLEncoder.encode(dto.getName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(dto.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + encodedName)
                .header(HttpHeaders.CONTENT_LENGTH, dto.getSize().toString())
                .body(new InputStreamResource(stream));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        fileService.delete(fileId, userId);
        return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
    }
}
