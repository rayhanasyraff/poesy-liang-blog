import { redirect } from 'next/navigation';
import { getSession } from './session';

export async function getAuthUser() {
  return getSession();
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) redirect('/admin/login');
  return user;
}
