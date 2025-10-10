import type { Request, Response } from "express";
import { fetchPoesyliangComWpPosts } from "../services/poesyliangComService";
import { fetchPoesyliangNetWpPosts } from "../services/poesyliangNetService";
import { config } from "../config/config";

export function getHealthCheck(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    message: "Poesy Liang Blog API",
    version: "1.0.0",
    endpoints: {
      "GET /poesyliang.com/wp-posts": "Get wp_posts from poesyliang.com",
      "GET /poesyliang.net/wp-posts": "Get wp_posts from poesyliang.net",
      "GET /blogs": "Get all blogs",
      "GET /blogs/:id": "Get blog by ID",
      "POST /blogs": "Create a new blog",
      "POST /migrate-wp-posts-journals-into-blogs": "Migrate wp_posts to blogs"
    }
  });
}

export async function getPoesyliangComWpPosts(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string || String(config.pagination.defaultLimit));
    const offset = parseInt(req.query.offset as string || "0");

    const wpPosts = await fetchPoesyliangComWpPosts(limit, offset);

    res.status(200).json({
      success: true,
      count: wpPosts.length,
      data: wpPosts
    });
  } catch (error) {
    console.error("Error in getPoesyliangComWpPosts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch poesyliangCom wp_posts"
    });
  }
}

export async function getPoesyliangNetWpPosts(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string || String(config.pagination.defaultLimit));
    const offset = parseInt(req.query.offset as string || "0");

    const wpPosts = await fetchPoesyliangNetWpPosts(limit, offset);

    res.status(200).json({
      success: true,
      count: wpPosts.length,
      data: wpPosts
    });
  } catch (error) {
    console.error("Error in getPoesyliangNetWpPosts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch poesyliangNet wp_posts"
    });
  }
}
