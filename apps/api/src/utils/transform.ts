import type { WpPost } from "../types/wpPost";
import type { BlogPost } from "../types/blogPost";

export interface BlogPostWithSource extends BlogPost {
  _source: "poesyliang.com" | "poesyliang.net";
  _original_id: string;
  _original_data: WpPost;
}

export function transformWpPostToBlogPost(wpPost: WpPost, source: "poesyliang.com" | "poesyliang.net"): BlogPostWithSource {
  // Normalize post_status to "publish" or keep original
  const normalizeStatus = (status: string): string => {
    const normalized = status.toLowerCase().trim();
    if (normalized === "draft" || normalized === "publish" || normalized === "published") {
      return normalized === "published" ? "publish" : normalized;
    }
    return "publish"; // Default to publish
  };

  // Normalize comment_status to "open" or "close"
  const normalizeCommentStatus = (status: string): string => {
    const normalized = status.toLowerCase().trim();
    return normalized === "open" ? "open" : "close";
  };

  // Normalize ping_status to notification_status ("all" or "none")
  const normalizeNotificationStatus = (status: string): string => {
    const normalized = status.toLowerCase().trim();
    return normalized === "open" || normalized === "all" ? "all" : "none";
  };

  return {
    blog_name: wpPost.post_name || "",
    blog_title: wpPost.post_title || "",
    blog_excerpt: wpPost.post_excerpt || "",
    blog_date: wpPost.post_date || "",
    blog_date_gmt: wpPost.post_date_gmt || "",
    blog_content: wpPost.post_content || "",
    blog_status: normalizeStatus(wpPost.post_status),
    comment_status: normalizeCommentStatus(wpPost.comment_status),
    notification_status: normalizeNotificationStatus(wpPost.ping_status),
    blog_modified: wpPost.post_modified || "",
    blog_modified_gmt: wpPost.post_modified_gmt || "",
    tags: wpPost.term_slug || "",
    blog_visibility: "private", // Default to private
    like_count: 0, // Default to 0
    _source: source,
    _original_id: wpPost.ID || "",
    _original_data: wpPost,
  };
}

export function combineAndSortBlogs(poesyliangComWpPosts: WpPost[], poesyliangNetWpPosts: WpPost[]): BlogPostWithSource[] {
  // Transform all wp_posts to blog posts with source tracking
  const poesyliangComBlogs = poesyliangComWpPosts.map(wp => transformWpPostToBlogPost(wp, "poesyliang.com"));
  const poesyliangNetBlogs = poesyliangNetWpPosts.map(wp => transformWpPostToBlogPost(wp, "poesyliang.net"));

  // Combine both arrays
  const combinedBlogs = [...poesyliangComBlogs, ...poesyliangNetBlogs];

  // Sort by blog_date from oldest to latest
  combinedBlogs.sort((a, b) => {
    const dateA = new Date(a.blog_date).getTime();
    const dateB = new Date(b.blog_date).getTime();
    return dateA - dateB; // Ascending order (oldest first)
  });

  return combinedBlogs;
}
