"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Blog } from "@/types/blog";
import { Eye, Heart, MessageSquare, Lock, Globe, X } from 'lucide-react';

interface BlogCardProps {
  blog: Blog;
}

export const BlogCard = ({ blog }: BlogCardProps) => {
  const pathname = usePathname();
  const isAdmin = typeof pathname === 'string' && pathname.startsWith('/admin');

  // Format date properly based on source with better error handling
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        return "No date";
      }

      // Handle various date formats
      let processedDate = dateString;

      // If it's a WordPress/MySQL format (YYYY-MM-DD HH:MM:SS), convert to ISO
      if (processedDate.includes(' ') && !processedDate.includes('T')) {
        processedDate = processedDate.replace(' ', 'T');
        // Add Z if no timezone info
        if (!processedDate.includes('+') && !processedDate.includes('Z')) {
          processedDate += 'Z';
        }
      }

      const date = new Date(processedDate);
      if (isNaN(date.getTime())) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not parse date:', dateString, 'processed:', processedDate);
        }
        return "Invalid date";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error formatting date:', dateString, error);
      }
      return "Date error";
    }
  };

  const href = isAdmin ? `/admin/blog/${(blog.apiData as any)?.blog_name ?? blog.slug}` : `/blog/${blog.slug}`;

  // API-exposed properties (apiData may be undefined for local MDX files)
  const api = (blog.apiData || {}) as any;
  const visibility = api.blog_visibility || 'public';
  const status = api.blog_status || (blog.metadata.publishedAt ? 'publish' : 'draft');
  const version = api.blog_version ?? api.version_number;
  const commentOpen = (api.comment_status ?? 'open') === 'open';
  const likeOpen = (api.like_visibility ?? 'open') === 'open';
  const viewOpen = (api.view_visibility ?? 'open') === 'open';
  const likes = blog.like_count ?? api.like_count ?? 0;
  const views = api.view_count ?? 0;
  const comments = blog.comment_count ?? api.comment_count ?? 0;

  return (
    <article className="py-4 sm:py-8 dark:border-b-zinc-800 transition-opacity duration-200 hover:opacity-90">
      <header>
        <h3 className="font-semibold underline underline-offset-4 decoration-1 decoration-zinc-300 transition-colors duration-200 hover:decoration-zinc-500">
          <Link href={href}>{blog.metadata.title}</Link>
        </h3>
        {blog.metadata.summary && (
          <p className="mt-1 opacity-70 dark:opacity-60">
            {blog.metadata.summary}
          </p>
        )}
      </header>
      <footer className="mt-1 flex items-center justify-between font-mono text-sm uppercase tracking-wider opacity-50 dark:opacity-40">
        <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
          <div title={visibility === 'private' ? 'Private' : 'Public'} aria-label={`visibility-${visibility}`}>
            {visibility === 'private' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          </div>

          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {status === 'draft' ? 'Draft' : 'Published'}
            </span>
            {version && <span className="text-xs text-neutral-600 dark:text-neutral-400">v{version}</span>}
          </div>

          <div className="flex items-center space-x-3 ml-2">
            <div title={commentOpen ? `${comments} comments` : 'Comments disabled'} className="flex items-center space-x-1">
              {commentOpen ? <MessageSquare className="w-4 h-4" /> : <MessageSquare className="w-4 h-4 opacity-40" />}
              <span className="text-xs">{commentOpen ? comments : 'off'}</span>
            </div>

            <div title={likeOpen ? `${likes} likes` : 'Likes disabled'} className="flex items-center space-x-1">
              {likeOpen ? <Heart className="w-4 h-4 text-pink-600" /> : <Heart className="w-4 h-4 opacity-40" />}
              <span className="text-xs">{likeOpen ? likes : 'off'}</span>
            </div>

            <div title={viewOpen ? `${views} views` : 'Views disabled'} className="flex items-center space-x-1">
              {viewOpen ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-40" />}
              <span className="text-xs">{viewOpen ? views : 'off'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <time dateTime={blog.metadata.publishedAt} className="text-xs text-neutral-600 dark:text-neutral-400">
            {formatDate(blog.metadata.publishedAt)}
          </time>
          <span>·</span>
          <span className="text-xs">{blog.readingTime} MIN READ</span>
        </div>
      </footer>
    </article>
  );
};
