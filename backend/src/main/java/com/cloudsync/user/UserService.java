package com.cloudsync.user;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /** Cached user profile — served from Redis for up to 5 minutes. */
    @Cacheable(value = "user-dto", key = "#userId")
    public UserDto getUserDto(UUID userId) {
        return toDto(findById(userId));
    }

    /**
     * Called on every authenticated request.
     * Looks up the user by Clerk ID; creates the record on first sign-in.
     */
    @Transactional
    public User findOrCreateByClerkId(String clerkId, String email, String fullName) {
        // 1. Already linked to this Clerk account
        var byClerk = userRepository.findByClerkId(clerkId);
        if (byClerk.isPresent()) return byClerk.get();

        String resolvedEmail = (email != null && !email.isBlank())
                ? email.toLowerCase().trim()
                : clerkId + "@cloudsync.user";

        // 2. Pre-existing account with this email (e.g. from old custom-auth) → link it
        if (email != null && !email.isBlank()) {
            var byEmail = userRepository.findByEmail(resolvedEmail);
            if (byEmail.isPresent()) {
                User existing = byEmail.get();
                existing.setClerkId(clerkId);
                if (fullName != null && existing.getFullName() == null) existing.setFullName(fullName);
                return userRepository.save(existing);
            }
        }

        // 3. Brand-new user
        User user = User.builder()
                .clerkId(clerkId)
                .email(resolvedEmail)
                .fullName(fullName)
                .build();
        return userRepository.save(user);
    }

    /**
     * Every file operation (upload, delete, restore) calls this to adjust quota.
     * Evict the user-dto cache so the next /me request reflects the true usage.
     */
    @Transactional
    @CacheEvict(value = "user-dto", key = "#userId")
    public void updateStorageUsed(UUID userId, long delta) {
        User user = findById(userId);
        long newUsage = Math.max(0, user.getStorageUsed() + delta);
        user.setStorageUsed(newUsage);
        userRepository.save(user);
    }

    public UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .storageUsed(user.getStorageUsed())
                .storageLimit(user.getStorageLimit())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
