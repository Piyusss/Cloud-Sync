package com.cloudvault.share;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicFileInfoDto {
    private String fileName;
    private long size;
    private String contentType;
    private boolean passwordProtected;
}
