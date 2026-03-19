'use client';

import { useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deleteBlogById } from '@/api/resources/blogApi';
import type { Blog } from '@/types/blog';

export function useSoftDeleteBlog(queryKey: string) {
  const queryClient = useQueryClient();
  const [undoVisible, setUndoVisible] = useState(false);
  const previousDataRef = useRef<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deleteBlog = useCallback((blog: Blog) => {
    const id = (blog.apiData as any)?.id;
    if (!id) {
      alert('Cannot delete this blog (missing id)');
      return;
    }

    // Snapshot current cache for rollback on failure or undo
    previousDataRef.current = queryClient.getQueryData([queryKey]);

    // Optimistically remove from cache immediately
    queryClient.setQueryData([queryKey], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          rows: page.rows.filter((b: Blog) => (b.apiData as any)?.id !== id),
        })),
      };
    });

    setUndoVisible(true);

    timerRef.current = setTimeout(async () => {
      try {
        const data = await deleteBlogById(id);
        if (!data.success) {
          console.error('Failed to delete on server', data);
          queryClient.setQueryData([queryKey], previousDataRef.current);
        } else {
          await queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      } catch (err) {
        console.error('Delete failed', err);
        queryClient.setQueryData([queryKey], previousDataRef.current);
      } finally {
        setUndoVisible(false);
        previousDataRef.current = null;
        timerRef.current = null;
      }
    }, 500);
  }, [queryClient, queryKey]);

  const undo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    queryClient.setQueryData([queryKey], previousDataRef.current);
    setUndoVisible(false);
    previousDataRef.current = null;
    timerRef.current = null;
  }, [queryClient, queryKey]);

  return { deleteBlog, undo, undoVisible };
}
