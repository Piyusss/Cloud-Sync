-- GIN index for full-text search on file names
CREATE INDEX idx_files_name_fts ON files USING GIN (to_tsvector('english', name));

-- Partial indexes for common filtered queries (type + date)
CREATE INDEX idx_files_user_content_type ON files(user_id, content_type) WHERE is_deleted = false;
CREATE INDEX idx_files_user_created_at ON files(user_id, created_at DESC) WHERE is_deleted = false;
