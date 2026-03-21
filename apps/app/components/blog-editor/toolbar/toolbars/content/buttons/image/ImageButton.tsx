'use client';
import { Image } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type ImageButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function ImageButton(props: ImageButtonProps) {
  return <BlogEditorToolbarButton icon={<Image size={16} />} title="Insert image" {...props} />;
}
