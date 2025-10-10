import { Router } from "express";
import { migrateWpPostsJournalsIntoBlogs, getMigrationSummary } from "../controllers/migrationController";

const router = Router();

// POST endpoint for migration
router.post("/migrate-wp-posts-journals-into-blogs", migrateWpPostsJournalsIntoBlogs);

// GET endpoint for migration summary
router.get("/migrate-wp-posts-journals-into-blogs/summary", getMigrationSummary);

export default router;
