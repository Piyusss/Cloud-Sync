package com.cloudvault.file;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "file_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileVersionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "file_id", nullable = false)
    private UUID fileId;

    @Column(nullable = false)
    private Integer version;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(nullable = false)
    private Long size;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
