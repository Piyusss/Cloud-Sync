package com.cloudsync.chunk;

import com.cloudsync.file.FileDto;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InitUploadResponse {

    /** Null when the file was deduplicated (no upload needed). */
    private String uploadId;

    private List<Integer> uploadedChunks;

    /** True when the server already has this exact file — no chunks needed. */
    private boolean duplicate;

    /** Populated only when duplicate=true. */
    private FileDto fileItem;
}
