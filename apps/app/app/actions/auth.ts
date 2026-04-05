'use server';

import { redirect } from 'next/navigation';
import { setSession, clearSession } from '@/lib/session';

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return { error: 'API URL is not configured on the server.' };
  }

  const apiToken = process.env.API_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiToken) {
    headers['Authorization'] = `Bearer ${apiToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: 'Could not reach the authentication server.' };
  }

  let body: any = {};
  try { body = await res.json(); } catch {}

  if (!res.ok) {
    console.error('Login failed:', {
      status: res.status,
      statusText: res.statusText,
      body,
      email,
      apiUrl: `${apiUrl}/auth/login`
    });
    return { error: body?.error ?? 'Invalid email or password.' };
  }

  const jwt = body?.token ?? null;
  await setSession(email, jwt);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/admin/login');
}
