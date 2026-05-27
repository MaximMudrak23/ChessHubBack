import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { findGame, cancelSearch, finishGame, getGameById, getActiveGame, makeMove } from '../controllers/game.controller';

const router = Router();

router.get('/by-id/:id', getGameById);
router.get('/active-game', authMiddleware, getActiveGame);

router.post('/move', authMiddleware, makeMove);
router.post('/find', authMiddleware, findGame);
router.post('/cancel-search', authMiddleware, cancelSearch);
router.post('/finish', authMiddleware, finishGame);

export default router;