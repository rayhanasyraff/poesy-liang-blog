'use client';
import { Superscript } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type SuperscriptButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function SuperscriptButton(props: SuperscriptButtonProps) {
  return <BlogEditorToolbarButton icon={<Superscript size={14} />} title="Superscript" {...props} />;
}
