'use client';
import { List } from 'lucide-react';
import { BlogEditorToolbarButton, type BlogEditorToolbarButtonProps } from '@/components/blog-editor/toolbar/buttons/BlogEditorToolbarButton';

type BulletListButtonProps = Omit<BlogEditorToolbarButtonProps, 'icon' | 'title'>;

export function BulletListButton(props: BulletListButtonProps) {
  return <BlogEditorToolbarButton icon={<List size={16} />} title="Bullet list" {...props} />;
}
