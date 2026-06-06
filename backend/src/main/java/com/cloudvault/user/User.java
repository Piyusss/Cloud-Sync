package com.cloudvault.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "clerk_id", unique = true, length = 100)
    private String clerkId;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "storage_used")
    @Builder.Default
    private Long storageUsed = 0L;

    @Column(name = "storage_limit")
    @Builder.Default
    private Long storageLimit = 5368709120L; // 5 GB

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
