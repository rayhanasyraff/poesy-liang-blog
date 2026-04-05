'use client';
import { Link } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type LinkButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function LinkButton(props: LinkButtonProps) {
  return <BlogEditorToolbarButton icon={<Link size={16} />} title="Link" {...props} />;
}
