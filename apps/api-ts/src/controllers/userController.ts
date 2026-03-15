import type { Request, Response } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser } from '../services/userService';

// GET /users
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = parseInt((req.query.offset as string) || '0');

    const filterKeys = ['ID', 'user_login', 'user_nicename', 'user_email', 'user_url', 'user_status', 'display_name'];
    const filters: Record<string, string> = {};
    for (const key of filterKeys) {
      if (typeof req.query[key] === 'string' && (req.query[key] as string) !== '') {
        filters[key] = req.query[key] as string;
      }
    }

    const { total_rows, data } = await getUsers(limit, offset, filters);
    res.json({ success: true, total_rows, returned_rows: data.length, limit, offset, data });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
}

// GET /users/:id
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserById(parseInt(req.params.id));
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('getUser error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
}

// POST /users
export async function createUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const { user_login, user_email } = req.body ?? {};
    if (!user_login || !user_email) {
      res.status(400).json({ success: false, error: 'user_login and user_email are required' });
      return;
    }
    const id = await createUser(req.body);
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('createUserHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
}

// PUT /users/:id
export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const affected = await updateUser(parseInt(req.params.id), req.body);
    res.json({ success: true, affected });
  } catch (err) {
    console.error('updateUserHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
}

// DELETE /users/:id
export async function deleteUserHandler(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await deleteUser(parseInt(req.params.id));
    res.json({ success: true, deleted });
  } catch (err) {
    console.error('deleteUserHandler error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
}
