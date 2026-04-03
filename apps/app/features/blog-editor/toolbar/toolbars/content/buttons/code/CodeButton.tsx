'use client';
import { Code } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type CodeButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function CodeButton(props: CodeButtonProps) {
  return <BlogEditorToolbarButton icon={<Code size={16} />} title="Inline code" {...props} />;
}
