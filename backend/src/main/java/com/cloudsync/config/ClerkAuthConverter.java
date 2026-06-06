package com.cloudsync.config;

import com.cloudsync.user.User;
import com.cloudsync.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
@RequiredArgsConstructor
public class ClerkAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserService userService;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String clerkId  = jwt.getSubject();
        String email    = jwt.getClaimAsString("email");
        String fullName = jwt.getClaimAsString("fullName");

        // Auto-provision user on first sign-in; subsequent calls hit Redis cache.
        User user = userService.findOrCreateByClerkId(clerkId, email, fullName);

        // Return our UUID as the principal — all existing controllers stay unchanged.
        return new UsernamePasswordAuthenticationToken(
                user.getId(), null, Collections.emptyList());
    }
}
