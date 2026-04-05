import { type NextRequest, NextResponse } from 'next/server';
import { getJwt } from '@/lib/session';

const EXPRESS_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes under bearer middleware (plain API token) — never use JWT for these
const BEARER_ONLY_PATTERN = /^blogs\/\d+\/(likes|views)$/;

async function buildHeaders(method: string, path: string): Promise<Headers> {
  const headers = new Headers();
  const apiToken = process.env.API_TOKEN;
  const useJwt = WRITE_METHODS.has(method) && !BEARER_ONLY_PATTERN.test(path);

  if (useJwt) {
    const jwt = await getJwt();
    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
      return headers;
    }
  }

  if (apiToken) headers.set('Authorization', `Bearer ${apiToken}`);
  return headers;
}

async function fetchUpstream(targetUrl: string, fetchOptions: RequestInit): Promise<Response> {
  const upstream = await fetch(targetUrl, fetchOptions);
  if (upstream.status === 429) {
    await new Promise(res => setTimeout(res, 1000));
    return fetch(targetUrl, fetchOptions);
  }
  return upstream;
}

function buildResponseHeaders(method: string, status: number, contentType: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': contentType ?? 'application/json',
  };
  if (method === 'GET' && status === 200) {
    headers['cache-control'] = 'public, s-maxage=30, stale-while-revalidate=60';
  }
  return headers;
}

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const searchParams = request.nextUrl.searchParams.toString();
  const query = searchParams ? '?' + searchParams : '';
  const targetUrl = `${EXPRESS_API}/${path.join('/')}${query}`;

  const headers = await buildHeaders(request.method, path.join('/'));
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const fingerprint = request.headers.get('x-device-fingerprint');
  if (fingerprint) headers.set('x-device-fingerprint', fingerprint);

  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body;
  const fetchOptions = { method: request.method, headers, body, duplex: body ? 'half' : undefined };

  let upstream: Response;
  try {
    upstream = await fetchUpstream(targetUrl, fetchOptions);
  } catch (err) {
    console.error(`[proxy] fetch failed for ${targetUrl}:`, err);
    const cause = err instanceof Error
      ? (err.cause instanceof Error ? err.cause.message : String(err.cause ?? err.message))
      : String(err);
    return NextResponse.json({ success: false, error: 'API unreachable', cause, url: targetUrl }, { status: 502 });
  }

  const data = await upstream.arrayBuffer();
  const resHeaders = buildResponseHeaders(request.method, upstream.status, upstream.headers.get('content-type'));
  return new NextResponse(data, { status: upstream.status, headers: resHeaders });
}

export const GET    = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const POST   = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const PUT    = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const PATCH  = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxyRequest(req, ctx.params);
