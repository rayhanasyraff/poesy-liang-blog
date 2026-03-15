"use client";

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { Blog, ApiBlog, ApiBlogWithVersion } from "@/types/blog";
import { BlogCard } from './blog-card';
import { usePathname, useRouter } from 'next/navigation';
import Separator from "./shared/separator";
import { convertApiBlogToBlog } from '@/lib/blog-utils';
import { useBlogStore } from '@/stores/useBlogStore';
import { fetchBlogsWithVersions } from '@/api/api';

// Swipeable list for admin
import {
  LeadingActions,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { Edit3, Trash2, RotateCcw } from 'lucide-react';
import { VersionHistoryModal } from './admin/VersionHistoryModal';

import { fetchAdminPage, fetchPublicPage } from '@/api/blog';

// ── Data fetchers are provided by apps/app/api/blog.ts — see those implementations


// ── Component ─────────────────────────────────────────────────────────────────

function SwipeableListWrapper(props: any) {
  // react-swipeable-list clones its direct child and injects swipe-related props.
  // If the child is a DOM element those props become unknown DOM attributes and
  // trigger React warnings. This wrapper accepts/clobbers any injected props and
  // simply renders its children without forwarding them to the DOM.
  return <>{props.children}</>;
}

interface RowItemProps {
  blog: Blog;
  isLast: boolean;
  index: number;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: (blog: Blog) => void;
  onHistory?: (blogId: number) => void;
  animationDelay?: number;
}

function RowItem({ blog, isLast, index, isAdmin, onEdit, onDelete, onHistory, animationDelay = 0 }: RowItemProps) {
  const api = (blog.apiData as any) ?? {};

  if (isAdmin) {
    return (
      <SwipeableListItem
        listType={Type.IOS}
        fullSwipe
        threshold={0.3}
        leadingActions={
          <LeadingActions>
            <SwipeAction onClick={() => { console.debug('RowItem: edit click', api.id ?? blog.slug); onEdit(); }}>
              <div onClick={(e) => { e.stopPropagation(); console.debug('RowItem: inner edit click', api.id ?? blog.slug); onEdit(); }} className="h-full flex items-center px-4 bg-sky-600 text-white rounded-l-md" role="button" tabIndex={0}>
                <Edit3 className="w-5 h-5" />
                <span className="ml-2 text-sm font-medium">Edit</span>
              </div>
            </SwipeAction>
          </LeadingActions>
        }
        trailingActions={
          <TrailingActions>
            <SwipeAction destructive={true} onClick={() => { console.debug('RowItem: delete click', api.id ?? blog.slug); onDelete(blog); }}>
              <div onClick={(e) => { e.stopPropagation(); console.debug('RowItem: inner delete click', api.id ?? blog.slug); onDelete(blog); }} className="h-full flex items-center justify-end px-4 bg-red-600 text-white rounded-r-md" role="button" tabIndex={0}>
                <span className="mr-2 text-sm font-medium">Delete</span>
                <Trash2 className="w-5 h-5" />
              </div>
            </SwipeAction>
          </TrailingActions>
        }
      >
        <div
          className="animate-fade-in"
          style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
        >
          <BlogCard blog={blog} onHistory={onHistory} />
          {!isLast && <Separator />}
        </div>
      </SwipeableListItem>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
    >
      <BlogCard blog={blog} />
      {!isLast && <Separator />}
    </div>
  );
}

const MemoRowItem = React.memo(RowItem, (prev, next) => {
  const prevId = (prev.blog.apiData as any)?.id ?? prev.blog.slug;
  const nextId = (next.blog.apiData as any)?.id ?? next.blog.slug;
  return prevId === nextId && prev.isLast === next.isLast;
});

export default function InfiniteScrollBlogList() {
  const pathname = usePathname();
  const isAdmin = typeof pathname === 'string' && pathname.startsWith('/admin');
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    adminScrollY, publicScrollY,
    setAdminScrollY, setPublicScrollY,
    removedIds, addRemovedId, restoreId,
  } = useBlogStore();

  // ── Infinite query ──────────────────────────────────────────────────────────

  const {
    status,
    data,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: [isAdmin ? 'admin-blog-posts' : 'blog-posts'],
    queryFn: (ctx) =>
      isAdmin ? fetchAdminPage(ctx.pageParam) : fetchPublicPage(ctx.pageParam),
    getNextPageParam: (lastGroup) => lastGroup.nextOffset,
    initialPageParam: 0,
    staleTime: isAdmin ? 0 : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ── Admin filter ────────────────────────────────────────────────────────────

  type AdminFilter = 'all' | 'draft-ahead' | 'published' | 'draft-only';
  const [adminFilter, setAdminFilter] = React.useState<AdminFilter>('all');

  function getBlogStatus(apiData: any): 'draft-ahead' | 'published' | 'draft-only' {
    const draftV = apiData?.latest_draft_version_number;
    const pubV = apiData?.latest_committed_version_number;
    if (!pubV) return 'draft-only';
    if (draftV && draftV > pubV) return 'draft-ahead';
    return 'published';
  }

  // ── Version history modal ────────────────────────────────────────────────────

  const [historyBlogId, setHistoryBlogId] = React.useState<number | null>(null);
  const [historyBlogTitle, setHistoryBlogTitle] = React.useState<string | undefined>(undefined);

  const handleOpenHistory = React.useCallback((blogId: number, title?: string) => {
    setHistoryBlogId(blogId);
    setHistoryBlogTitle(title);
  }, []);

  const allRows = data ? data.pages.flatMap((d) => d.rows) : [];
  const removedFiltered = allRows.filter(
    (b) => !((b.apiData as any)?.id && removedIds.includes((b.apiData as any).id))
  );
  const displayRows = isAdmin && adminFilter !== 'all'
    ? removedFiltered.filter((b) => getBlogStatus(b.apiData) === adminFilter)
    : removedFiltered;

  // ── Virtualizer ─────────────────────────────────────────────────────────────

  const sentinelCount = hasNextPage ? 1 : 0;
  const rowVirtualizer = useWindowVirtualizer({
    count: displayRows.length + sentinelCount,
    estimateSize: () => 130,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  // Trigger next page when last virtual item is visible
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= displayRows.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualItems, displayRows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Scroll position save/restore ────────────────────────────────────────────

  useEffect(() => {
    const saved = isAdmin ? adminScrollY : publicScrollY;
    if (saved > 0) window.scrollTo(0, saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleScroll = () => {
      if (isAdmin) setAdminScrollY(window.scrollY);
      else setPublicScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAdmin, setAdminScrollY, setPublicScrollY]);

  // ── Delete UX ───────────────────────────────────────────────────────────────

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [candidateBlog, setCandidateBlog] = React.useState<Blog | null>(null);
  const [undoVisible, setUndoVisible] = React.useState(false);
  const [undoBlogId, setUndoBlogId] = React.useState<number | null>(null);
  const pendingTimeoutsRef = useRef<Record<number, number>>({});

  const scheduleDelete = React.useCallback((blog: Blog) => {
    const id = (blog.apiData as any)?.id;
    if (!id) { alert('Cannot delete this blog (missing id)'); return; }

    addRemovedId(id);
    setUndoVisible(true);
    setUndoBlogId(id);

    const timer = window.setTimeout(async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (process.env.NEXT_PUBLIC_API_TOKEN) headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`;
        const res = await fetch(`${API_BASE_URL}/blogs/${id}`, { method: 'DELETE', headers });
        const json = await res.json().catch(() => ({ success: res.ok }));
        if (!res.ok || !json.success) {
          console.error('Failed to delete on server', json);
          restoreId(id);
        } else {
          await queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
        }
      } catch (err) {
        console.error('Delete failed', err);
        restoreId(id);
      } finally {
        delete pendingTimeoutsRef.current[id];
        setUndoVisible(false);
        setUndoBlogId(null);
      }
    }, 500);

    pendingTimeoutsRef.current[id] = timer;
  }, [addRemovedId, queryClient, restoreId]);

  const handleDeleteClick = React.useCallback((blog: Blog) => { setCandidateBlog(blog); setConfirmOpen(true); }, []);
  const confirmDelete = React.useCallback(() => {
    if (!candidateBlog) return;
    setConfirmOpen(false);
    scheduleDelete(candidateBlog);
    setCandidateBlog(null);
  }, [candidateBlog, scheduleDelete]);
  const cancelDelete = React.useCallback(() => { setConfirmOpen(false); setCandidateBlog(null); }, []);
  const undoDelete = React.useCallback(() => {
    if (!undoBlogId) return;
    const timer = pendingTimeoutsRef.current[undoBlogId];
    if (timer) { clearTimeout(timer); delete pendingTimeoutsRef.current[undoBlogId]; }
    restoreId(undoBlogId);
    setUndoVisible(false);
    setUndoBlogId(null);
  }, [undoBlogId, restoreId]);



  // ── Swipe actions ───────────────────────────────────────────────────────────

  const leadingActions = (blog: Blog) => {
    const api = (blog.apiData as any) ?? {};
    const slug = api.id ?? (api.blog_name ?? blog.slug);
    return (
      <LeadingActions>
        <SwipeAction onClick={() => router.push(`/admin/blog/${slug}/edit`)}>
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
      <SwipeAction destructive={true} onClick={() => handleDeleteClick(blog)}>
        <div className="h-full flex items-center justify-end px-4 bg-red-600 text-white rounded-r-md">
          <span className="mr-2 text-sm font-medium">Delete</span>
          <Trash2 className="w-5 h-5" />
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (status === 'pending') {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  if (status === 'error') {
    return <div className="p-8 text-center text-red-600">Error: {(error as Error).message}</div>;
  }

  const totalSize = rowVirtualizer.getTotalSize();
  const items = virtualItems;

  const renderRow = (index: number) => {
    const isSentinel = index >= displayRows.length;
    if (isSentinel) {
      return isFetchingNextPage ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
        </div>
      ) : null;
    }

    const blog = displayRows[index];
    const isLast = index === displayRows.length - 1;
    const key = blog.apiData ? `api-${(blog.apiData as any).id}` : blog.slug;

    if (isAdmin) {
      const api = (blog.apiData as any) ?? {};
      const slug = api.id ?? (api.blog_name ?? blog.slug);
      return (
        <MemoRowItem
          key={key}
          blog={blog}
          isLast={isLast}
          index={index}
          isAdmin={isAdmin}
          onEdit={() => router.push(`/admin/blog/${slug}/edit`)}
          onDelete={handleDeleteClick}
          onHistory={api.id ? (blogId) => handleOpenHistory(blogId, blog.metadata.title) : undefined}
          animationDelay={(index % 5) * 60}
        />
      );
    }

    return (
      <div
        key={key}
        className="animate-fade-in"
        style={{ animationDelay: `${(index % 5) * 60}ms`, animationFillMode: 'backwards' }}
      >
        <BlogCard blog={blog} />
        {!isLast && <Separator />}
      </div>
    );
  };

  const listContent = (
    <div style={{ height: totalSize, position: 'relative' }}>
      {items.map((virtualRow) => (
        <div
          key={virtualRow.key}
          ref={rowVirtualizer.measureElement}
          data-index={virtualRow.index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          {renderRow(virtualRow.index)}
        </div>
      ))}
    </div>
  );

  const FILTER_TABS: { value: AdminFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft-ahead', label: '🟡 Draft Ahead' },
    { value: 'published', label: '🟢 Published' },
    { value: 'draft-only', label: '⚪ Draft Only' },
  ];

  return (
    <div className="w-full">
      {/* Admin filter tabs */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-1 pb-3 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setAdminFilter(tab.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                adminFilter === tab.value
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                  : 'bg-transparent text-neutral-600 border-neutral-300 dark:text-neutral-400 dark:border-neutral-600 hover:border-neutral-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh list"
            className="ml-auto h-7 w-7 flex items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {isAdmin ? <SwipeableList><SwipeableListWrapper>{listContent}</SwipeableListWrapper></SwipeableList> : listContent}

      {!hasNextPage && allRows.length > 0 && (
        <div className="p-8 text-center text-gray-500">That&rsquo;s all! No more blogs to load.</div>
      )}

      {/* Version history modal */}
      {isAdmin && (
        <VersionHistoryModal
          blogId={historyBlogId}
          blogTitle={historyBlogTitle}
          onClose={() => { setHistoryBlogId(null); setHistoryBlogTitle(undefined); }}
          onEdited={() => queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })}
        />
      )}

      {/* Confirm delete modal */}
      {confirmOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelDelete} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
            <h2 className="text-sm font-semibold mb-2">Confirm delete</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to delete &ldquo;{candidateBlog?.metadata?.title ?? ''}&rdquo;? This action can be undone briefly via undo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Undo toast */}
      {undoVisible && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center space-x-3 bg-neutral-900 text-white px-4 py-2 rounded shadow-lg">
            <div>Deleted</div>
            <button onClick={undoDelete} className="underline text-sm">Undo</button>
          </div>
        </div>
      )}
    </div>
  );
}
