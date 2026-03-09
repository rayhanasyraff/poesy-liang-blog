import { Router } from "express";
import {
  getAllBlogsFromApi,
  getBlogByIdFromApi,
  createBlog,
  deleteBlog,
} from "../controllers/blogController";
import {
  getVersions,
  getVersionById,
  saveDraftHandler,
  publishBlogHandler,
  publishVersionHandler,
  revertVersionHandler,
  updateSettingsHandler,
  unpublishBlogHandler,
} from "../controllers/blogVersionController";
import { getLikes, postLike, deleteLike } from "../controllers/likeController";

const router = Router();

// Blog endpoints
router.get("/blogs", getAllBlogsFromApi);
router.get("/blogs/:id", getBlogByIdFromApi);
router.post("/blogs", createBlog);
router.delete("/blogs/:id", deleteBlog);

// Like endpoints (in-memory store)
router.get("/blogs/:id/likes", getLikes);
router.post("/blogs/:id/likes", postLike);
router.delete("/blogs/:id/likes", deleteLike);

// Version read endpoints
router.get("/blogs/:id/versions", getVersions);
router.get("/blogs/:id/versions/:verId", getVersionById);

// Versioning write endpoints (business logic in Express, data via api.php)
router.post("/blogs/:id/versions", saveDraftHandler);
router.post("/blogs/:id/publish", publishBlogHandler);
router.post("/blogs/:id/publish/:verId", publishVersionHandler);
router.post("/blogs/:id/revert/:verId", revertVersionHandler);
router.patch("/blogs/:id/settings", updateSettingsHandler);
router.post("/blogs/:id/unpublish", unpublishBlogHandler);

export default router;
