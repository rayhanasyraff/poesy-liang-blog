import { type NextRequest, NextResponse } from 'next/server';
import { getJwt } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const jwt = await getJwt();
  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'content-type': contentType,
      },
      body: request.body,
      // @ts-expect-error — Node fetch requires duplex for streaming request bodies
      duplex: 'half',
    });
  } catch {
    return NextResponse.json({ success: false, error: 'API unreachable' }, { status: 502 });
  }

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
