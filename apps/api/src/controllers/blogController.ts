import type { Request, Response } from "express";
import { fetchBlogs, fetchBlogById, insertBlog } from "../services/blogService";
import { config } from "../config/config";

export async function getAllBlogsFromApi(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string || String(config.pagination.defaultLimit));
    const offset = parseInt(req.query.offset as string || "0");

    const blogs = await fetchBlogs(limit, offset);

    res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs
    });
  } catch (error) {
    console.error("Error in getAllBlogsFromApi:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch blogs"
    });
  }
}

export async function getBlogByIdFromApi(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({
        success: false,
        error: "Blog ID is required"
      });
      return;
    }

    const blog = await fetchBlogById(id);

    if (!blog) {
      res.status(404).json({
        success: false,
        error: "Blog not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error("Error in getBlogByIdFromApi:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch blog"
    });
  }
}

export async function createBlog(req: Request, res: Response): Promise<void> {
  try {
    const blogData = req.body;

    if (!blogData) {
      res.status(400).json({
        success: false,
        error: "Blog data is required"
      });
      return;
    }

    const result = await insertBlog(blogData);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.message || "Failed to create blog"
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: result.message || "Blog created successfully",
      data: { id: result.id }
    });
  } catch (error) {
    console.error("Error in createBlog:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create blog"
    });
  }
}
