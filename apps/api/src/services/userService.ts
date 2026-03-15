import { config } from '../config/config';

const { apiBaseUrl, bearerToken } = config.poesyliangNet;

async function apiRequest<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let parsed: any;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }

  if (!res.ok) {
    const err = new Error(`API ${method} ${path} failed: ${res.status} ${res.statusText}`);
    (err as any).status = res.status;
    (err as any).body = parsed;
    throw err;
  }
  return parsed as T;
}

export interface WpUser {
  ID: number;
  user_login: string;
  user_nicename: string;
  user_email: string;
  user_url: string;
  user_registered: string;
  user_activation_key: string;
  user_status: number;
  display_name: string;
}

type ListResp = { success: boolean; total_rows: number; returned_rows: number; limit: number; offset: number; data: WpUser[] };
type SingleResp = { success: boolean; data: WpUser };
type MutateResp = { success: boolean; id?: number; affected?: number; deleted?: number };

export async function getUsers(
  limit: number,
  offset: number,
  filters: Record<string, string> = {}
): Promise<{ total_rows: number; data: WpUser[] }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), ...filters });
  const resp = await apiRequest<ListResp>(`/users?${params}`);
  return { total_rows: resp.total_rows, data: resp.data };
}

export async function getUserById(id: number): Promise<WpUser | null> {
  try {
    const resp = await apiRequest<SingleResp>(`/users/${id}`);
    return resp.data ?? null;
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export async function createUser(data: Partial<WpUser> & { user_login: string; user_email: string; user_pass?: string }): Promise<number> {
  const resp = await apiRequest<MutateResp>('/users', 'POST', data);
  return resp.id!;
}

export async function updateUser(id: number, data: Partial<WpUser> & { user_pass?: string }): Promise<number> {
  const resp = await apiRequest<MutateResp>(`/users/${id}`, 'PUT', data);
  return resp.affected ?? 0;
}

export async function deleteUser(id: number): Promise<number> {
  const resp = await apiRequest<MutateResp>(`/users/${id}`, 'DELETE');
  return resp.deleted ?? 0;
}
