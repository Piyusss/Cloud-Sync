package com.cloudsync.common;

public class ForbiddenException extends AppException {
    public ForbiddenException(String message) {
        super(message, 403);
    }
}
