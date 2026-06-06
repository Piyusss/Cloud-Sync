package com.cloudsync.notification;

import java.security.Principal;

/** Lightweight Principal backed by the user's UUID string — used inside STOMP sessions. */
public record StompPrincipal(String name) implements Principal {
    @Override
    public String getName() { return name; }
}
