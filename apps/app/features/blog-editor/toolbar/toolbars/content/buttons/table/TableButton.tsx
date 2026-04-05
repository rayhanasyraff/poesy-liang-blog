'use client';
import { Table } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type TableButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function TableButton(props: TableButtonProps) {
  return <BlogEditorToolbarButton icon={<Table size={16} />} title="Insert table" {...props} />;
}
