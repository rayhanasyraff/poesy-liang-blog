'use client';
import { Bold } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type BoldButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function BoldButton(props: BoldButtonProps) {
  return <BlogEditorToolbarButton icon={<Bold size={16} />} title="Bold" {...props} />;
}
