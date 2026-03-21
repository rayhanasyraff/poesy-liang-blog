'use client';

import { Trash2 } from 'lucide-react';
import { BlogEditorToolbarButton } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';
import { useBlogStore } from '@/stores/blogs/useBlogStore';

export function DeleteBlogButton() {
  const blogId = useBlogStore((s) => s.blog?.id);

  return (
    <BlogEditorToolbarButton
      icon={<Trash2 size={18} />}
      title="Delete blog"
      disabled={!blogId}
      onClick={() => useBlogStore.getState().deleteBlog()}
    />
  );
}
