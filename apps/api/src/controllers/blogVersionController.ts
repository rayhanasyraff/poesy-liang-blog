import type { Request, Response } from 'express';
import { listVersions, getVersionById as fetchVersionById } from '../services/blogVersionService';

export async function getVersions(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const limit = parseInt((req.query.limit as string) || '100');
    const offset = parseInt((req.query.offset as string) || '0');
    const data = await listVersions(String(id), limit, offset);
    res.json({ success: true, data });
  } catch (err) {
    console.error('getVersions error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch versions' });
  }
}

export async function getVersionById(req: Request, res: Response): Promise<void> {
  try {
    const { id, verId } = req.params;
    const version = await fetchVersionById(String(id), String(verId));
    if (!version) {
      res.status(404).json({ success: false, error: 'Version not found' });
      return;
    }
    res.json({ success: true, data: version });
  } catch (err) {
    console.error('getVersionById error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch version' });
  }
}
