import type { Request, Response } from "express";
import { fetchBlogs, fetchBlogById, insertBlog, checkBlogNameAvailable } from "../services/blogService";
import { fetchLatestVersionsForBlogIds } from "../services/adminBlogService";
import { config } from "../config/config";
import { saveDraft } from "../services/versioningService";

export async function getAllBlogsFromApi(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt((req.query.limit as string) || String(config.pagination.defaultLimit));
    const offset = parseInt((req.query.offset as string) || "0");

    const blog_status = typeof req.query.blog_status === 'string' ? req.query.blog_status : undefined;
    const blog_visibility = typeof req.query.blog_visibility === 'string' ? req.query.blog_visibility : undefined;
    const includeVersions = req.query.include_versions === 'true';

    const blogs = await fetchBlogs(limit, offset, blog_status, blog_visibility);

    // When include_versions=true, merge the latest saved version onto each blog
    // (used by the admin homepage to show current draft titles/content). If a
    // version_status query param is provided (e.g., 'committed'), forward it to
    // the version fetcher so the merged version can be filtered by status.
    if (includeVersions) {
      const versionStatus = typeof req.query.version_status === 'string' ? req.query.version_status : undefined;
      const ids = blogs.map(b => b.id).filter((id): id is number => id != null);

      // When a specific version_status is requested (e.g. public page uses 'committed'),
      // use the single-status fetch for backward compat. Otherwise fetch both draft and
      // committed in parallel so admin can see each side separately.
      let data: any[];
      if (versionStatus) {
        const versionMap = await fetchLatestVersionsForBlogIds(ids, versionStatus);
        data = blogs.map(blog => {
          const v = blog.id != null ? (versionMap.get(blog.id) ?? null) : null;
          return {
            ...blog,
            latest_version_id: v?.id ?? null,
            latest_version_number: v?.version_number ?? null,
            latest_version_status: v?.status ?? null,
            latest_blog_title: v?.blog_title ?? null,
            latest_blog_excerpt: v?.blog_excerpt ?? null,
            latest_blog_content: v?.blog_content ?? null,
            latest_tags: v?.tags ?? null,
            latest_draft_saved_at: (v as any)?.draft_saved_at ?? null,
            latest_published_at: (v as any)?.published_at ?? null,
          };
        });
      } else {
        // Admin path: fetch both draft and committed versions in parallel
        const [draftMap, committedMap] = await Promise.all([
          fetchLatestVersionsForBlogIds(ids, 'draft'),
          fetchLatestVersionsForBlogIds(ids, 'committed'),
        ]);
        data = blogs.map(blog => {
          const d = blog.id != null ? (draftMap.get(blog.id) ?? null) : null;
          const c = blog.id != null ? (committedMap.get(blog.id) ?? null) : null;
          return {
            ...blog,
            // Draft version fields
            latest_draft_version_id: d?.id ?? null,
            latest_draft_version_number: d?.version_number ?? null,
            latest_draft_blog_title: d?.blog_title ?? null,
            // Committed (published) version fields
            latest_committed_version_id: c?.id ?? null,
            latest_committed_version_number: c?.version_number ?? null,
            latest_committed_blog_title: c?.blog_title ?? null,
            latest_committed_published_at: (c as any)?.published_at ?? null,
            // Legacy compat fields (show draft info where possible)
            latest_version_id: d?.id ?? c?.id ?? null,
            latest_version_number: d?.version_number ?? c?.version_number ?? null,
            latest_version_status: d ? 'draft' : (c ? 'committed' : null),
            latest_blog_title: d?.blog_title ?? c?.blog_title ?? null,
            latest_blog_excerpt: d?.blog_excerpt ?? c?.blog_excerpt ?? null,
            latest_blog_content: d?.blog_content ?? c?.blog_content ?? null,
            latest_tags: d?.tags ?? c?.tags ?? null,
            latest_draft_saved_at: (d as any)?.draft_saved_at ?? null,
            latest_published_at: (c as any)?.published_at ?? null,
          };
        });
      }
      const nextOffset = blogs.length === limit ? offset + limit : null;
      res.status(200).json({ success: true, count: data.length, nextOffset, data });
      return;
    }

    const nextOffset = blogs.length === limit ? offset + limit : null;
    res.status(200).json({ success: true, count: blogs.length, nextOffset, data: blogs });
  } catch (error) {
    console.error("Error in getAllBlogsFromApi:", error);
    res.status(500).json({ success: false, error: "Failed to fetch blogs" });
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

    const blog = await fetchBlogById(String(id));

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

    const blogId = result.id;

    // Create v1 draft version automatically
    try {
      await saveDraft(blogId!, {
        blog_title: blogData.blog_title ?? 'Untitled',
        blog_content: blogData.blog_content ?? '',
        blog_excerpt: blogData.blog_excerpt ?? '',
        tags: blogData.tags ?? null,
        blog_visibility: blogData.blog_visibility ?? 'public',
        comment_status: blogData.comment_status ?? 'open',
        like_visibility: blogData.like_visibility ?? 'open',
        view_visibility: blogData.view_visibility ?? 'open',
      });
    } catch (err) {
      console.warn('Warning: blog created but failed to create v1 draft:', err);
    }

    res.status(201).json({
      success: true,
      message: result.message || "Blog created successfully",
      data: { id: blogId }
    });
  } catch (error) {
    console.error("Error in createBlog:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create blog"
    });
  }
}

export async function deleteBlog(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({ success: false, error: "Blog ID is required" });
      return;
    }

    // Call service to delete on upstream API
    const { deleteBlogById } = await import("../services/blogService");
    const response = await deleteBlogById(String(id));

    if (!response || response.success === false) {
      const status = response && (response.error === 'Blog not found' || response.error === 'Version not found') ? 404 : 500;
      res.status(status).json({ success: false, error: response?.error || 'Failed to delete blog' });
      return;
    }

    res.status(200).json({ success: true, deleted: true });
  } catch (error) {
    console.error("Error in deleteBlog:", error);
    res.status(500).json({ success: false, error: "Failed to delete blog" });
  }
}

export async function checkSlugAvailable(req: Request, res: Response): Promise<void> {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim().toLowerCase() : '';
  const excludeId = typeof req.query.exclude_id === 'string' ? req.query.exclude_id : undefined;
  if (!slug) {
    res.status(400).json({ success: false, error: 'slug is required' });
    return;
  }
  try {
    const available = await checkBlogNameAvailable(slug, excludeId);
    res.json({ success: true, available });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check slug availability' });
  }
}
