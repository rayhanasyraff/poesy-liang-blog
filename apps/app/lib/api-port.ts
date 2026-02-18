import fs from 'fs';
import path from 'path';

interface PortInfo {
  port: number;
  url: string;
  timestamp: string;
}

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
 * Client-side version that uses the build-time resolved URL
 */
export function getClientApiUrl(): string {
  // In browser, we need to use the public env var that was set at build time
  // or fall back to same-origin if not set
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  return getApiUrl();
}
