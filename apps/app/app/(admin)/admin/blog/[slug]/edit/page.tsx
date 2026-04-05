import { use } from 'react';
import BlogEditorPage from '@/features/blog-editor/pages';

export default function EditBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <BlogEditorPage blogId={slug} />;
}
