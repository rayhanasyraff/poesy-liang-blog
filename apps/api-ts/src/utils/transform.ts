import type { WpPost } from "../types/wpPost";
import type { BlogPost } from "../types/blogPost";

export interface BlogPostWithSource extends BlogPost {
  _source: "poesyliang.com" | "poesyliang.net";
  _original_id: string;
  _original_data: WpPost;
}

export function transformWpPostToBlogPost(wpPost: WpPost, source: "poesyliang.com" | "poesyliang.net"): BlogPostWithSource {
  const normalizeStatus = (status: string): 'draft' | 'published' => {
    const normalized = status.toLowerCase().trim();
    return normalized === 'draft' ? 'draft' : 'published';
  };

  const normalizeCommentStatus = (status: string): 'open' | 'close' => {
    return status.toLowerCase().trim() === 'open' ? 'open' : 'close';
  };

  const normalizeNotificationStatus = (status: string): 'all' | 'none' => {
    const normalized = status.toLowerCase().trim();
    return normalized === 'open' || normalized === 'all' ? 'all' : 'none';
  };

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const nowGmt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  return {
    blog_name: wpPost.post_name || "",
    blog_title: wpPost.post_title || "",
    blog_excerpt: wpPost.post_excerpt || "",
    blog_date_published: wpPost.post_date || now,
    blog_date_published_gmt: wpPost.post_date_gmt || nowGmt,
    blog_content: wpPost.post_content || "",
    blog_status: normalizeStatus(wpPost.post_status),
    comment_status: normalizeCommentStatus(wpPost.comment_status),
    notification_status: normalizeNotificationStatus(wpPost.ping_status),
    blog_date_modified: wpPost.post_modified || now,
    blog_date_modified_gmt: wpPost.post_modified_gmt || nowGmt,
    blog_date_created: wpPost.post_date || now,
    blog_date_created_gmt: wpPost.post_date_gmt || nowGmt,
    tags: wpPost.term_slug || "",
    blog_visibility: "private",
    like_count: 0,
    like_visibility: "close",
    view_count: 0,
    view_visibility: "open",
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
    const dateA = new Date(a.blog_date_published).getTime();
    const dateB = new Date(b.blog_date_published).getTime();
    return dateA - dateB; // Ascending order (oldest first)
  });

  return combinedBlogs;
}
