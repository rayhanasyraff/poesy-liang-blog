'use client';
import { Underline } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type UnderlineButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function UnderlineButton(props: UnderlineButtonProps) {
  return <BlogEditorToolbarButton icon={<Underline size={16} />} title="Underline" {...props} />;
}
