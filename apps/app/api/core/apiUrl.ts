/**
 * Get the API URL dynamically by reading the port info file
 * Falls back to environment variable or default port
 */
export function getApiUrl(): string {
  // Only use the environment variable; do not read .api-port.json
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }

  // Fall back to default
  return 'http://localhost:3001';
}

/**
 * Client-side version — always routes through the Next.js proxy so the
 * Express API URL is resolved server-side at request time (avoids stale
 * build-time baked-in NEXT_PUBLIC_API_URL in the browser bundle).
 */
export function getClientApiUrl(): string {
  if (globalThis.window !== undefined) {
    return '/api/proxy';
  }

  return getApiUrl();
}
