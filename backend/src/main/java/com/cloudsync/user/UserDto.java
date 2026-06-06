package com.cloudsync.user;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private UUID id;
    private String email;
    private String fullName;
    private Long storageUsed;
    private Long storageLimit;
    private LocalDateTime createdAt;
}
