-- listAllForUser() filters share links by user_id and orders by created_at DESC.
-- The existing idx_shared_links_file_user (file_id, user_id) leads with file_id,
-- so it cannot serve a user_id-only lookup. This index covers both the filter
-- and the ordering.
CREATE INDEX idx_shared_links_user_created ON shared_links(user_id, created_at DESC);
