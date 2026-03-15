import type { Request, Response } from 'express';
import { listVersions, getVersionById as fetchVersionById } from '../services/blogVersionService';
import {
  saveDraft,
  publishDraft,
  publishSpecificVersion,
  revertToVersion,
  updateSettings,
  unpublishBlog,
} from '../services/versioningService';

export async function getVersions(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const limit = parseInt((req.query.limit as string) || '100');
    const offset = parseInt((req.query.offset as string) || '0');
    const data = await listVersions(String(id), limit, offset);
    res.json({ success: true, data });
  } catch (err) {
    console.error('getVersions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch versions' });
  }
}

export async function getVersionById(req: Request, res: Response): Promise<void> {
  try {
    const { id, verId } = req.params;
    const version = await fetchVersionById(String(id), String(verId));
    if (!version) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }
    res.json({ success: true, data: version });
  } catch (err) {
    console.error('getVersionById error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch version' });
  }
}

// POST /blogs/:id/versions — Save Draft
export async function saveDraftHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body;
    if (!body.blog_title && !body.blog_content) {
      res.status(400).json({ success: false, error: 'blog_title or blog_content is required' });
      return;
    }
    const result = await saveDraft(id, {
      blog_title: body.blog_title ?? 'Untitled',
      blog_content: body.blog_content ?? '',
      blog_excerpt: body.blog_excerpt,
      tags: body.tags,
      blog_visibility: body.blog_visibility,
      comment_status: body.comment_status,
      like_visibility: body.like_visibility,
      view_visibility: body.view_visibility,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('saveDraftHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to save draft' });
  }
}

// POST /blogs/:id/publish — Publish current draft (with current content)
export async function publishBlogHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body;
    const result = await publishDraft(id, {
      blog_title: body.blog_title ?? 'Untitled',
      blog_content: body.blog_content ?? '',
      blog_excerpt: body.blog_excerpt,
      tags: body.tags,
      blog_visibility: body.blog_visibility,
      comment_status: body.comment_status,
      like_visibility: body.like_visibility,
      view_visibility: body.view_visibility,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('publishBlogHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to publish blog' });
  }
}

// POST /blogs/:id/publish/:verId — Publish a specific version
export async function publishVersionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id, verId } = req.params;
    await publishSpecificVersion(id, parseInt(verId));
    res.json({ success: true });
  } catch (err) {
    console.error('publishVersionHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to publish version' });
  }
}

// POST /blogs/:id/revert/:verId — Restore a past version as new draft
export async function revertVersionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id, verId } = req.params;
    const result = await revertToVersion(id, parseInt(verId));
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('revertVersionHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to revert version' });
  }
}

// PATCH /blogs/:id/settings — Update blog settings only
export async function updateSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const settings = req.body as Record<string, string>;
    await updateSettings(id, settings);
    res.json({ success: true });
  } catch (err) {
    console.error('updateSettingsHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
}

// POST /blogs/:id/unpublish — Unpublish blog (remove published version pointer)
export async function unpublishBlogHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await unpublishBlog(id);
    res.json({ success: true });
  } catch (err) {
    console.error('unpublishBlogHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to unpublish blog' });
  }
}
