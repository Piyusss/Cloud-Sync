package com.cloudvault.share;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateShareLinkRequest {
    private String password;       // null = public link
    private Integer expiresInHours; // null = never expires
}
