-- Migration: add draft_saved_at to blog_versions
-- Adds a nullable DATETIME column used by autosave/versioning to record when a draft was saved.
-- Run this against your MySQL/MariaDB database backing the PHP API.

-- Preferred (MySQL 8+): idempotent
ALTER TABLE blog_versions ADD COLUMN IF NOT EXISTS draft_saved_at DATETIME NULL DEFAULT NULL;

-- Fallback (older MySQL/MariaDB): run the following if the above fails
-- ALTER TABLE blog_versions ADD COLUMN draft_saved_at DATETIME NULL DEFAULT NULL;

-- After applying this migration, the API will accept and persist draft_saved_at values from the frontend autosave flow.
