-- Direct-to-storage uploads use S3 multipart. Track the storage-side multipart
-- upload id on the session so complete()/cancel() can assemble or abort it.
-- The legacy upload_chunks table is no longer written to (parts live in storage),
-- but is left in place to avoid a destructive migration.
ALTER TABLE upload_sessions ADD COLUMN s3_upload_id VARCHAR(255);
