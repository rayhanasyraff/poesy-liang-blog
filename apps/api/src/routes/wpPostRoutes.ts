import { Router } from "express";
import {
  getHealthCheck,
  getPoesyliangComWpPosts,
  getPoesyliangNetWpPosts
} from "../controllers/wpPostController";

const router = Router();

// Health check
router.get("/", getHealthCheck);

// Data source specific wp_posts routes
router.get("/poesyliang.com/wp-posts", getPoesyliangComWpPosts);
router.get("/poesyliang.net/wp-posts", getPoesyliangNetWpPosts);

export default router;
