package com.cloudsync.trash;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/trash")
@RequiredArgsConstructor
public class TrashController {

    private final TrashService trashService;

    @GetMapping
    public ResponseEntity<List<TrashItemDto>> list(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(trashService.list(userId));
    }

    @PostMapping("/{fileId}/restore")
    public ResponseEntity<TrashItemDto> restore(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(trashService.restore(fileId, userId));
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Map<String, String>> hardDelete(
            @PathVariable UUID fileId,
            @AuthenticationPrincipal UUID userId) {
        trashService.hardDelete(fileId, userId);
        return ResponseEntity.ok(Map.of("message", "File permanently deleted"));
    }

    @DeleteMapping
    public ResponseEntity<Map<String, String>> emptyTrash(@AuthenticationPrincipal UUID userId) {
        trashService.emptyTrash(userId);
        return ResponseEntity.ok(Map.of("message", "Trash emptied"));
    }
}
