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

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: 'Could not reach the authentication server.' };
  }

  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch {}
    return { error: body?.error ?? 'Invalid email or password.' };
  }

  await setSession(email);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/admin/login');
}
