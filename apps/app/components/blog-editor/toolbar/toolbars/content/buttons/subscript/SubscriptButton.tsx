'use client';
import { Subscript } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type SubscriptButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function SubscriptButton(props: SubscriptButtonProps) {
  return <BlogEditorToolbarButton icon={<Subscript size={14} />} title="Subscript" {...props} />;
}
