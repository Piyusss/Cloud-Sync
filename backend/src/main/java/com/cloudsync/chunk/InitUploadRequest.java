package com.cloudsync.chunk;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InitUploadRequest {

    @NotBlank(message = "File name is required")
    private String fileName;

    @Positive(message = "File size must be positive")
    private long fileSize;

    @Positive(message = "Total chunks must be positive")
    private int totalChunks;

    @NotBlank(message = "Content type is required")
    private String contentType;

    private UUID folderId;

    /** SHA-256 hex hash of the full file — enables server-side deduplication. Optional. */
    private String hash;
}
