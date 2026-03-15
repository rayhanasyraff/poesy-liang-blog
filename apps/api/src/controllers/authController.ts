import type { Request, Response } from 'express';
import { config } from '../config/config';

// POST /auth/login — proxy to api.php without bearer token
export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'email and password are required' });
      return;
    }

    const url = `${config.poesyliangNet.apiBaseUrl}/auth/login`;
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await apiRes.text();
    let body: any;
    try { body = text ? JSON.parse(text) : {}; } catch { body = { error: text }; }

    res.status(apiRes.status).json(body);
  } catch (err) {
    console.error('loginHandler error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}
