import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return Response.json({ url: null }, { status: 400 });

  try {
    // Use Facebook's own crawler UA — this gets the real post HTML instead of a login redirect
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });

    const html = await res.text();

    // Extract og:url — the canonical post URL Facebook puts in its own meta tags
    const match =
      html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i) ??
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:url"/i);

    if (match?.[1]) return Response.json({ url: match[1] });

    // Fallback: use wherever the redirect landed
    return Response.json({ url: res.url });
  } catch {
    return Response.json({ url });
  }
}
