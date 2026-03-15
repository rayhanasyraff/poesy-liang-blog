import type { Request, Response } from "express";
import { getLikesCount, addLike, removeLike } from "../services/likeService";

export async function getLikes(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: "Blog ID is required" });
      return;
    }

    const likes = getLikesCount(id);
    res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error("Error in getLikes:", error);
    res.status(500).json({ success: false, error: "Failed to get likes" });
  }
}

export async function postLike(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: "Blog ID is required" });
      return;
    }

    const likes = addLike(id);
    res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error("Error in postLike:", error);
    res.status(500).json({ success: false, error: "Failed to add like" });
  }
}

export async function deleteLike(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: "Blog ID is required" });
      return;
    }

    const likes = removeLike(id);
    res.status(200).json({ success: true, likes });
  } catch (error) {
    console.error("Error in deleteLike:", error);
    res.status(500).json({ success: false, error: "Failed to remove like" });
  }
}
