'use client';
import { ListOrdered } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type OrderedListButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function OrderedListButton(props: OrderedListButtonProps) {
  return <BlogEditorToolbarButton icon={<ListOrdered size={16} />} title="Ordered list" {...props} />;
}
