'use client';
import { Italic } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type ItalicButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function ItalicButton(props: ItalicButtonProps) {
  return <BlogEditorToolbarButton icon={<Italic size={16} />} title="Italic" {...props} />;
}
