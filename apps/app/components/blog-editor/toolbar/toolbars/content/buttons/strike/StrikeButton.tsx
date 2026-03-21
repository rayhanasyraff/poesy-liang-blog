'use client';
import { Strikethrough } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type StrikeButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function StrikeButton(props: StrikeButtonProps) {
  return <BlogEditorToolbarButton icon={<Strikethrough size={16} />} title="Strikethrough" {...props} />;
}
