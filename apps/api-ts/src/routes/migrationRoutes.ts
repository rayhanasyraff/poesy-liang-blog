import { Router } from "express";
import { migrateWpPostsJournalsIntoBlogs, getMigrationSummary } from "../controllers/migrationController";
import { normalizePublishedVersions } from "../controllers/normalizePublishedController";

const router = Router();

// POST endpoint for migration
router.post("/migrate-wp-posts-journals-into-blogs", migrateWpPostsJournalsIntoBlogs);

// GET endpoint for migration summary
router.get("/migrate-wp-posts-journals-into-blogs/summary", getMigrationSummary);

// Normalize legacy status='published' versions → status='committed'
// Dry run (default): POST /migrate/normalize-published-versions
// Apply:            POST /migrate/normalize-published-versions?dry=false
router.post("/migrate/normalize-published-versions", normalizePublishedVersions);

export default router;
