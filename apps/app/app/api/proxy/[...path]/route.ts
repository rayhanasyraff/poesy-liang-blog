import { type NextRequest, NextResponse } from 'next/server';

const EXPRESS_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const targetPath = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${EXPRESS_API}/${targetPath}${searchParams ? `?${searchParams}` : ''}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : request.body;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // @ts-expect-error — Node fetch supports duplex for streaming bodies
      duplex: body ? 'half' : undefined,
    });
  } catch (err) {
    console.error(`[proxy] fetch failed for ${targetUrl}:`, err);
    return NextResponse.json({ success: false, error: 'API unreachable' }, { status: 502 });
  }

  const data = await upstream.arrayBuffer();
  return new NextResponse(data, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET    = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const POST   = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const PUT    = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const PATCH  = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
