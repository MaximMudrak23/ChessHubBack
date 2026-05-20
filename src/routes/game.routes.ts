import { Router } from 'express';
import { getBotMove } from '../controllers/game.controller';

const router = Router();

router.post('/bot-move', getBotMove);

export default router;