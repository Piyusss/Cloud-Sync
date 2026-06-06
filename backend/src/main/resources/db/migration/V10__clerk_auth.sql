-- Clerk user ID — the bridge between Clerk's auth and our UUID-based system
ALTER TABLE users ADD COLUMN clerk_id VARCHAR(100) UNIQUE;

-- Clerk manages passwords; our column is no longer required
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Refresh tokens are now managed entirely by Clerk
DROP TABLE IF EXISTS refresh_tokens;
