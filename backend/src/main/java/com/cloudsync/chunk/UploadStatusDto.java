package com.cloudsync.chunk;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadStatusDto {
    private String uploadId;
    private String fileName;
    private long fileSize;
    private int totalChunks;
    private List<Integer> uploadedChunks;
    private String status;
}
