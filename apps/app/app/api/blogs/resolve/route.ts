import { NextResponse } from 'next/server';
import { getBlogBySlug } from "@/services/blogService";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') ?? '';
    if (!slug) return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });

    const blog = await getBlogBySlug(slug);
    if (!blog) return NextResponse.json({ success: false, error: 'Blog not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: blog });
  } catch (err) {
    console.error('Error resolving blog slug:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}