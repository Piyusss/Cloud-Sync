package com.cloudsync.chunk;

/** A presigned URL the client PUTs one multipart part to. */
public record PartUrl(int partNumber, String url) {
}
