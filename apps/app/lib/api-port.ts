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
  // If explicitly set via environment variable, use that
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Try to read the port info file
  try {
    const portFilePath = path.join(process.cwd(), '../../.api-port.json');

    if (fs.existsSync(portFilePath)) {
      const portInfo: PortInfo = JSON.parse(fs.readFileSync(portFilePath, 'utf-8'));
      console.log(`📡 Detected API running on port ${portInfo.port}`);
      return portInfo.url;
    }
  } catch (error) {
    console.warn('Could not read API port info file:', error);
  }

  // Fall back to default
  const defaultUrl = 'http://localhost:3001';
  console.log(`📡 Using default API URL: ${defaultUrl}`);
  return defaultUrl;
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
