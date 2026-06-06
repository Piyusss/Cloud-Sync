CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    total_chunks INT NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    storage_key VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_sessions_user ON upload_sessions(user_id, status);

CREATE TABLE upload_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    size BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (upload_id, chunk_index)
);

CREATE INDEX idx_upload_chunks_session ON upload_chunks(upload_id);
