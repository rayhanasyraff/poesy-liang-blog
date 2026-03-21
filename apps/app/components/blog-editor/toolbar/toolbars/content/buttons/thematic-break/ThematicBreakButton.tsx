'use client';
import { Minus } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type ThematicBreakButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function ThematicBreakButton(props: ThematicBreakButtonProps) {
  return <BlogEditorToolbarButton icon={<Minus size={16} />} title="Thematic break" {...props} />;
}
