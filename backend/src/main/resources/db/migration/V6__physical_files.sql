-- Content-addressed physical storage
CREATE TABLE physical_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash VARCHAR(64) NOT NULL UNIQUE,
    size BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    ref_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_physical_files_hash ON physical_files(hash);

-- Link files to their physical storage (nullable: pre-Phase-6 files have no physical record)
ALTER TABLE files ADD COLUMN physical_file_id UUID REFERENCES physical_files(id) ON DELETE SET NULL;

-- Multiple files can now share the same storage_key (deduplication)
ALTER TABLE files DROP CONSTRAINT files_storage_key_key;

-- Store hash on upload sessions so complete() can register the physical file
ALTER TABLE upload_sessions ADD COLUMN hash VARCHAR(64);
