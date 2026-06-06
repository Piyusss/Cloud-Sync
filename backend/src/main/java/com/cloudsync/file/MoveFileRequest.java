package com.cloudsync.file;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor
public class MoveFileRequest {
    private UUID folderId; // null = move to root
}
