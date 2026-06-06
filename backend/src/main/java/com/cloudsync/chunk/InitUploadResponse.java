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

    /** Object key the parts are being uploaded to. Null when duplicate=true. */
    private String key;

    /** Presigned URL per part — the browser PUTs directly to storage. Empty when duplicate=true. */
    private List<PartUrl> parts;

    /** True when the server already has this exact file — no upload needed. */
    private boolean duplicate;

    /** Populated only when duplicate=true. */
    private FileDto fileItem;
}
