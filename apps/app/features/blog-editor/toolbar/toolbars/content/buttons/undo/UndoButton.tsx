'use client';
import { Undo2 } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type UndoButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function UndoButton(props: UndoButtonProps) {
  return <BlogEditorToolbarButton icon={<Undo2 size={16} />} title="Undo" {...props} />;
}
