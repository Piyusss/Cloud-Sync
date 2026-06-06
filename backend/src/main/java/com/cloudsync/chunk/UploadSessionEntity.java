package com.cloudsync.chunk;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "upload_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "total_chunks", nullable = false)
    private Integer totalChunks;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(name = "folder_id")
    private UUID folderId;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    /** Storage-side multipart upload id (from CreateMultipartUpload). */
    @Column(name = "s3_upload_id")
    private String s3UploadId;

    @Column(length = 64)
    private String hash;

    @Column(nullable = false)
    @Builder.Default
    private String status = "in_progress";

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
