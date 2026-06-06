CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(user_id, parent_folder_id);

-- Add FK from files to folders so deleting a folder NULLs the file's folder_id
ALTER TABLE files
    ADD CONSTRAINT fk_files_folder
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
