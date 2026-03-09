"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Blog, ApiBlog, BlogVersionSummary } from "@/types/blog";
import { BlogCard } from './blog-card';
import { usePathname, useRouter } from 'next/navigation';
import Separator from "./shared/separator";
import { convertApiBlogToBlog } from '@/lib/blog-utils';
import { Modal } from '@lobehub/ui';

// Swipeable list for admin
import {
  LeadingActions,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { useQueryClient } from '@tanstack/react-query';
import { Edit3, Trash2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Fetch ALL blogs once and cache them
let allBlogsCache: Blog[] | null = null;

async function fetchAllBlogs(): Promise<Blog[]> {
  if (allBlogsCache) {
    return allBlogsCache;
  }

  try {
    const allBlogs: Blog[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    // Keep fetching until we get all blogs
    while (hasMore) {
      const response = await fetch(`${API_BASE_URL}/blogs?limit=${limit}&offset=${offset}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blogs: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('API returned unsuccessful response');
      }

      const apiBlogs: ApiBlog[] = Array.isArray(data.data) ? data.data : [data.data];

      if (apiBlogs.length === 0) {
        hasMore = false;
        break;
      }

      // Convert all API blogs without filtering so admin can view everything
      const blogs = apiBlogs.map(convertApiBlogToBlog);
      allBlogs.push(...blogs);

      // If we got fewer blogs than requested, we've reached the end
      if (apiBlogs.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    allBlogsCache = allBlogs;
    return allBlogs;
  } catch (error) {
    console.error('Error fetching blogs from API:', error);
    return [];
  }
}

async function fetchServerPage(
  limit: number,
  offset: number
): Promise<{ rows: Blog[]; nextOffset: number | undefined }> {
  const allBlogs = await fetchAllBlogs();

  // Add artificial delay to show loading state
  await new Promise(resolve => setTimeout(resolve, 500));

  const start = offset;
  const end = start + limit;
  const rows = allBlogs.slice(start, end);
  const nextOffset = end < allBlogs.length ? end : undefined;

  return { rows, nextOffset };
}

// Admin version: overlays the latest saved version (draft or published) onto each blog card
async function fetchAdminServerPage(
  limit: number,
  offset: number
): Promise<{ rows: Blog[]; nextOffset: number | undefined }> {
  const allBlogs = await fetchAllBlogs();

  await new Promise(resolve => setTimeout(resolve, 500));

  const start = offset;
  const end = start + limit;
  const pageBlogs = allBlogs.slice(start, end);
  const nextOffset = end < allBlogs.length ? end : undefined;

  const rows = await Promise.all(
    pageBlogs.map(async (blog) => {
      const apiId = (blog.apiData as any)?.id;
      if (!apiId) return blog;
      try {
        const res = await fetch(
          `${API_BASE_URL}/blogs/${apiId}/versions?limit=1&offset=0`,
          { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' }
        );
        if (!res.ok) return blog;
        const data = await res.json();
        const versions: BlogVersionSummary[] = data.data ?? [];
        if (versions.length === 0) return blog;
        const latest = versions[0]; // ordered DESC by version_number
        const latestContent = latest.blog_content ?? blog.content;
        const wordCount = latestContent.trim()
          ? latestContent.split(/\s+/).filter(Boolean).length
          : 0;
        return {
          ...blog,
          content: latestContent,
          readingTime: Math.max(1, Math.ceil(wordCount / 200)),
          tags: latest.tags ?? blog.tags,
          metadata: {
            ...blog.metadata,
            title: latest.blog_title || blog.metadata.title,
            summary: latest.blog_excerpt || blog.metadata.summary,
          },
          apiData: blog.apiData
            ? { ...blog.apiData, blog_version: latest.version_number }
            : blog.apiData,
        };
      } catch {
        return blog;
      }
    })
  );

  return { rows, nextOffset };
}

export default function InfiniteScrollBlogList() {

  const pathname = usePathname();
  const isAdmin = typeof pathname === 'string' && pathname.startsWith('/admin');

  const {
    status,
    data,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [isAdmin ? 'admin-blog-posts' : 'blog-posts'],
    queryFn: (ctx) =>
      isAdmin
        ? fetchAdminServerPage(5, ctx.pageParam)
        : fetchServerPage(5, ctx.pageParam),
    getNextPageParam: (lastGroup) => lastGroup.nextOffset,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const allRows = data ? data.pages.flatMap((d) => d.rows) : [];
  const displayRows = isAdmin ? allRows : allRows.filter((b) => b.apiData && (b.apiData.blog_status === 'publish') && (b.apiData.blog_visibility === 'public'));
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Deletion UX with confirm modal + undo window
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [candidateBlog, setCandidateBlog] = useState<Blog | null>(null);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const pendingTimeoutsRef = useRef<Record<number, number>>({});
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoBlogId, setUndoBlogId] = useState<number | null>(null);

  const scheduleDelete = (blog: Blog) => {
    const id = (blog.apiData as any)?.id;
    if (!id) {
      alert('Cannot delete this blog (missing id)');
      return;
    }

    // Optimistically remove from UI
    setRemovedIds((prev) => Array.from(new Set([...prev, id])));
    setUndoVisible(true);
    setUndoBlogId(id);

    // Schedule final delete after 500ms
    const timer = window.setTimeout(async () => {
      try {
        const headers: Record<string,string> = { 'Content-Type': 'application/json' };
        if (process.env.NEXT_PUBLIC_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`;
        const res = await fetch(`${API_BASE_URL}/blogs/${id}`, { method: 'DELETE', headers });
        const json = await res.json().catch(()=>({success: res.ok}));
        if (!res.ok || !json.success) {
          console.error('Failed to delete on server', json);
          // On failure, restore item
          setRemovedIds((prev) => prev.filter(x => x !== id));
        } else {
          await queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
        }
      } catch (err) {
        console.error('Delete failed', err);
        setRemovedIds((prev) => prev.filter(x => x !== id));
      } finally {
        // clear pending timeout
        delete pendingTimeoutsRef.current[id];
        setUndoVisible(false);
        setUndoBlogId(null);
      }
    }, 500);

    pendingTimeoutsRef.current[id] = timer;
  };

  const handleDeleteClick = (blog: Blog) => {
    setCandidateBlog(blog);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!candidateBlog) return;
    setConfirmOpen(false);
    scheduleDelete(candidateBlog);
    setCandidateBlog(null);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setCandidateBlog(null);
  };

  const undoDelete = () => {
    if (!undoBlogId) return;
    const timer = pendingTimeoutsRef.current[undoBlogId];
    if (timer) {
      clearTimeout(timer);
      delete pendingTimeoutsRef.current[undoBlogId];
    }
    setRemovedIds((prev) => prev.filter(x => x !== undoBlogId));
    setUndoVisible(false);
    setUndoBlogId(null);
  };

  const leadingActions = (blog: Blog) => {
    const api = (blog.apiData as any) ?? {};
    const slug = api.id ? `blog-${api.id}` : (api.blog_name ?? blog.slug);

    return (
      <LeadingActions>
        <SwipeAction
          onClick={() => router.push(`/admin/blog/${slug}/edit`)}
        >
          <div className="h-full flex items-center px-4 bg-sky-600 text-white rounded-l-md">
            <Edit3 className="w-5 h-5" />
            <span className="ml-2 text-sm font-medium">Edit</span>
          </div>
        </SwipeAction>
      </LeadingActions>
    );
  };

  const trailingActions = (blog: Blog) => (
    <TrailingActions>
      <SwipeAction
        destructive={true}
        onClick={() => handleDeleteClick(blog)}
      >
        <div className="h-full flex items-center justify-end px-4 bg-red-600 text-white rounded-r-md">
          <span className="mr-2 text-sm font-medium">Delete</span>
          <Trash2 className="w-5 h-5" />
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Load more when 100px away from the element
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  if (status === 'pending') {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  if (status === 'error') {
    return <div className="p-8 text-center text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="w-full">
      {/* Blog list */}
      <div className="space-y-0">
        {isAdmin ? (
          <SwipeableList>
            {displayRows.filter(b => !((b.apiData as any)?.id && removedIds.includes((b.apiData as any).id))).map((blog, index, array) => (
              <SwipeableListItem
                key={blog.apiData ? `api-${(blog.apiData as any).id}` : blog.slug}
                leadingActions={leadingActions(blog)}
                trailingActions={trailingActions(blog)}
              >
                <div
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${(index % 5) * 100}ms`,
                    animationFillMode: 'backwards'
                  }}
                >
                  <BlogCard blog={blog} />
                  {index !== array.length - 1 && <Separator />}
                </div>
              </SwipeableListItem>
            ))}
          </SwipeableList>
        ) : (
          displayRows.filter(b => !((b.apiData as any)?.id && removedIds.includes((b.apiData as any).id))).map((blog, index, array) => (
            <div
              key={blog.apiData ? `api-${(blog.apiData as any).id}` : blog.slug}
              className="animate-fade-in"
              style={{
                animationDelay: `${(index % 5) * 100}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <BlogCard blog={blog} />
              {index !== array.length - 1 && <Separator />}
            </div>
          ))
        )}
      </div>

      {/* Confirm delete modal */}
      <Modal 
      open={confirmOpen} 
      onOk={confirmDelete} 
      onCancel={cancelDelete} 
      title="Confirm delete"
      okText="Delete"
      okButtonProps={{ danger: true }}
      cancelText="Cancel"
      mask={{ closable: true }}
      >
        <div className="py-4">
          <p>Are you sure you want to delete "{candidateBlog?.metadata?.title ?? ''}"? This action can be undone briefly via undo.</p>
        </div>
      </Modal>

      {/* Undo popup (shows for 500ms) */}
      {undoVisible && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center space-x-3 bg-neutral-900 text-white px-4 py-2 rounded shadow-lg">
            <div>Deleted</div>
            <button onClick={undoDelete} className="underline text-sm">Undo</button>
          </div>
        </div>
      )}

      {/* Load more trigger */}
      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="p-8 text-center"
        >
          {isFetchingNextPage && (
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          )}
        </div>
      )}

      {/* End of content */}
      {!hasNextPage && allRows.length > 0 && (
        <div className="p-8 text-center text-gray-500">
          That's all! No more blogs to load.
        </div>
      )}
    </div>
  );
}
