package com.cloudsync.notification;

import com.cloudsync.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;
    private final UserService userService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    var jwt = jwtDecoder.decode(token);
                    var user = userService.findOrCreateByClerkId(
                            jwt.getSubject(),
                            jwt.getClaimAsString("email"),
                            jwt.getClaimAsString("fullName"));
                    // Set a Principal so SimpMessagingTemplate.convertAndSendToUser() can route by userId
                    accessor.setUser(new StompPrincipal(user.getId().toString()));
                } catch (Exception e) {
                    log.warn("WebSocket CONNECT rejected — invalid JWT: {}", e.getMessage());
                    throw new IllegalArgumentException("Invalid or expired token");
                }
            }
        }
        return message;
    }
}
