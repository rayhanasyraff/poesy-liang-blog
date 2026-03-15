import { Router } from 'express';
import { listUsers, getUser, createUserHandler, updateUserHandler, deleteUserHandler } from '../controllers/userController';

const router = Router();

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.post('/users', createUserHandler);
router.put('/users/:id', updateUserHandler);
router.patch('/users/:id', updateUserHandler);
router.delete('/users/:id', deleteUserHandler);

export default router;
