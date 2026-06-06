package com.cloudvault.share;

public class PasswordRequiredException extends RuntimeException {
    public PasswordRequiredException(String message) {
        super(message);
    }
}
