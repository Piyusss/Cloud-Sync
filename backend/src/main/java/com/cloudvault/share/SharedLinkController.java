package com.cloudvault.share;

import com.cloudvault.file.FileEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SharedLinkController {

    private final SharedLinkService sharedLinkService;

    // ── Auth required ─────────────────────────────────────────────────────────

    @PostMapping("/api/files/{fileId}/share")
    public ResponseEntity<SharedLinkDto> create(
            @PathVariable UUID fileId,
            @RequestBody CreateShareLinkRequest request,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(sharedLinkService.create(fileId, userId, request));
    }

    @GetMapping("/api/files/{fileId}/shares")
    public ResponseEntity<List<SharedLinkDto>> list(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(sharedLinkService.list(fileId, userId));
    }

    /** All share links the current user has created (for the "Shared" tab). */
    @GetMapping("/api/shares")
    public ResponseEntity<List<SharedLinkDto>> listAll(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(sharedLinkService.listAllForUser(userId));
    }

    @DeleteMapping("/api/share/{token}")
    public ResponseEntity<Map<String, String>> revoke(
            @PathVariable String token,
            @AuthenticationPrincipal UUID userId) {
        sharedLinkService.delete(token, userId);
        return ResponseEntity.ok(Map.of("message", "Link revoked"));
    }

    // ── Public ────────────────────────────────────────────────────────────────

    @GetMapping("/api/share/{token}")
    public ResponseEntity<PublicFileInfoDto> info(@PathVariable String token) {
        return ResponseEntity.ok(sharedLinkService.getPublicInfo(token));
    }

    @GetMapping("/api/share/{token}/download")
    public ResponseEntity<InputStreamResource> download(
            @PathVariable String token,
            @RequestParam(required = false) String password) {
        FileEntity file = sharedLinkService.validateDownload(token, password);

        String encodedName = URLEncoder.encode(file.getName(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + encodedName)
                .header(HttpHeaders.CONTENT_LENGTH, file.getSize().toString())
                .body(new InputStreamResource(sharedLinkService.openStream(file)));
    }
}
