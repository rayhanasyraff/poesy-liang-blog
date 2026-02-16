import { Router } from "express";
import {
  getAllBlogsFromApi,
  getBlogByIdFromApi,
  createBlog,
  updateBlogFromApi,
  deleteBlogFromApi
} from "../controllers/blogController";

const router = Router();

// GET endpoints for blogs
router.get("/blogs", getAllBlogsFromApi);
router.get("/blogs/:id", getBlogByIdFromApi);

// POST endpoint to create blog
router.post("/blogs", createBlog);

// PUT endpoint to update a blog by id/slug
router.put("/blogs/:id", updateBlogFromApi);

// DELETE endpoint to remove a blog by id/slug
router.delete("/blogs/:id", deleteBlogFromApi);

export default router;
