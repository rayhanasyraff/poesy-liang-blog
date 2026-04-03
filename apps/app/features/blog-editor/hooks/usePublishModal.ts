'use client';

import { useCallback, useState } from 'react';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

// ── usePublishModal ────────────────────────────────────────────────────────────
// All publish + unpublish modal state and actions. Extracted from BlogEditor.tsx.

export function usePublishModal() {
  const [publishOpen,  setPublishOpen]  = useState(false);
  const [publishStep,  setPublishStep]  = useState<'confirm' | 'done'>('confirm');
  const [isPublishing, setIsPublishing] = useState(false);

  const [unpublishOpen,  setUnpublishOpen]  = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  // ── Publish ─────────────────────────────────────────────────────────────────

  const openPublish = useCallback(() => {
    if (!useBlogStore.getState().blogTitle.trim()) return;
    setPublishStep('confirm');
    setPublishOpen(true);
  }, []);

  const handlePublishConfirm = useCallback(async () => {
    setIsPublishing(true);
    try {
      const result = await useBlogStore.getState().publishBlog();
      if (result.success) {
        setPublishStep('done');
      } else if (result.status === 401) {
        window.location.href = '/admin/login';
      } else {
        try { alert('Publish failed: ' + (result.error ?? 'Unknown error')); } catch {}
        setPublishOpen(false);
      }
    } finally {
      setIsPublishing(false);
    }
  }, []);

  const handlePublishClose = useCallback(() => {
    if (isPublishing) return;
    setPublishOpen(false);
    setPublishStep('confirm');
  }, [isPublishing]);

  // ── Unpublish ────────────────────────────────────────────────────────────────

  const openUnpublish = useCallback(() => { setUnpublishOpen(true); }, []);

  const handleUnpublishConfirm = useCallback(async () => {
    setIsUnpublishing(true);
    try {
      await useBlogStore.getState().unpublishBlog();
      setUnpublishOpen(false);
    } finally {
      setIsUnpublishing(false);
    }
  }, []);

  const handleUnpublishClose = useCallback(() => {
    if (isUnpublishing) return;
    setUnpublishOpen(false);
  }, [isUnpublishing]);

  return {
    publishOpen,
    publishStep,
    isPublishing,
    openPublish,
    handlePublishConfirm,
    handlePublishClose,
    unpublishOpen,
    isUnpublishing,
    openUnpublish,
    handleUnpublishConfirm,
    handleUnpublishClose,
  };
}
