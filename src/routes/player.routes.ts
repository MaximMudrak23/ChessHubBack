import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { searchPlayers, getPlayerById, getPlayerActiveGame } from '../controllers/player.controller';

const router = Router();

router.get('/profile/:id', authMiddleware, getPlayerById);
router.get('/search', authMiddleware, searchPlayers);
router.get('/active-game/:id', authMiddleware, getPlayerActiveGame);

export default router;