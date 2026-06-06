CREATE TABLE file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version INT NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (file_id, version)
);

CREATE INDEX idx_file_versions_file ON file_versions(file_id);
