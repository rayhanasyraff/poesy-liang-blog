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
} from "../controllers/blogVersionController";
import { getLikes, postLike, deleteLike } from "../controllers/likeController";

const router = Router();

// Blog endpoints — mirrors api.php capabilities
router.get("/blogs", getAllBlogsFromApi);
router.get("/blogs/:id", getBlogByIdFromApi);
router.post("/blogs", createBlog);
// Support delete to mirror php api
router.delete("/blogs/:id", deleteBlog);

// Like endpoints (in-memory store)
router.get("/blogs/:id/likes", getLikes);
router.post("/blogs/:id/likes", postLike);
router.delete("/blogs/:id/likes", deleteLike);

// Version endpoints — mirrors api.php capabilities
router.get("/blogs/:id/versions", getVersions);
router.get("/blogs/:id/versions/:verId", getVersionById);

export default router;
