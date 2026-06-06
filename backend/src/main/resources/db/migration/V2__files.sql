CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_user_not_deleted ON files(user_id, is_deleted);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
