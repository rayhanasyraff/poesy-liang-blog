-- Migration: add published_at to blog_versions
-- Adds a nullable DATETIME column used to record when a version was published.
-- Run this against your MySQL/MariaDB database backing the PHP API.

-- Preferred (MySQL 8+): idempotent
ALTER TABLE blog_versions ADD COLUMN IF NOT EXISTS published_at DATETIME NULL DEFAULT NULL;

-- Fallback (older MySQL/MariaDB): run the following if the above fails
-- ALTER TABLE blog_versions ADD COLUMN published_at DATETIME NULL DEFAULT NULL;

-- After applying this migration, the API will accept and persist published_at values when marking versions published.
