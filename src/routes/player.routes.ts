import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { searchPlayers, getPlayerById } from '../controllers/player.controller';

const router = Router();

router.get('/profile/:id', authMiddleware, getPlayerById);
router.get('/search', authMiddleware, searchPlayers);

export default router;