import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const SECRET = process.env.ADMIN_SESSION_SECRET || 'poesy-admin-secret-change-me';
const COOKIE_NAME = 'admin_session';
const JWT_COOKIE_NAME = 'admin_jwt';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
}

export function createSessionToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, iat: Date.now() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): { email: string } | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    if (sign(payload) !== sig) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.email) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getJwt(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(JWT_COOKIE_NAME)?.value ?? null;
}

export async function setSession(email: string, jwt: string | null): Promise<void> {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: MAX_AGE,
    path: '/',
  };
  cookieStore.set(COOKIE_NAME, createSessionToken(email), cookieOptions);
  if (jwt) {
    cookieStore.set(JWT_COOKIE_NAME, jwt, cookieOptions);
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(JWT_COOKIE_NAME);
}
