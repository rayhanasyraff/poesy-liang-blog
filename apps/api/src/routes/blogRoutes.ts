import { Router } from "express";
import {
  getAllBlogsFromApi,
  getBlogByIdFromApi,
  createBlog
} from "../controllers/blogController";

const router = Router();

// GET endpoints for blogs
router.get("/blogs", getAllBlogsFromApi);
router.get("/blogs/:id", getBlogByIdFromApi);

// POST endpoint to create blog
router.post("/blogs", createBlog);

export default router;
