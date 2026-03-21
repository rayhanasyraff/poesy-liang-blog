'use client';
import { Redo2 } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type RedoButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function RedoButton(props: RedoButtonProps) {
  return <BlogEditorToolbarButton icon={<Redo2 size={16} />} title="Redo" {...props} />;
}
