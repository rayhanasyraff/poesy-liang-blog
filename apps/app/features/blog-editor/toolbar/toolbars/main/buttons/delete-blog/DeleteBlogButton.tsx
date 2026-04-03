'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

function DeleteConfirmModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
        <h2 className="text-sm font-semibold mb-1">Delete this blog?</h2>
        <p className="text-xs text-muted-foreground mb-5">
          This will permanently delete the blog and all its versions. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DeleteBlogButton() {
  const blogId = useBlogStore((s) => s.blog?.id);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await useBlogStore.getState().deleteBlog();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <BlogEditorToolbarButton
        icon={<Trash2 size={18} />}
        title="Delete blog"
        disabled={!blogId}
        onClick={() => setOpen(true)}
      />
      {open && (
        <DeleteConfirmModal
          onConfirm={handleConfirm}
          onClose={() => setOpen(false)}
          loading={deleting}
        />
      )}
    </>
  );
}
