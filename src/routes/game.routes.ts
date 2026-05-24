import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getBotMove, findGame, cancelSearch, finishGame, getGameById, getActiveGame, saveGameState } from '../controllers/game.controller';

const router = Router();

router.get('/by-id/:id', getGameById);
router.get('/active-game', authMiddleware, getActiveGame);
router.post('/save-state', authMiddleware, saveGameState);

router.post('/bot-move', getBotMove);
router.post('/find', authMiddleware, findGame);
router.post('/cancel-search', authMiddleware, cancelSearch);
router.post('/finish', authMiddleware, finishGame);

export default router;