import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { getAdminUsers, deleteAdminUser } from '../controllers/admin.controller';
import { getAdminKeys, createAdminKey, deleteAdminKey } from '../controllers/admin.controller';
import { getAdminBots, createAdminBot, disableAdminBot, deleteAdminBot, activateAdminBot } from '../controllers/admin.controller';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', getAdminUsers);
router.delete('/users/:id', deleteAdminUser);

router.get('/bots', getAdminBots);
router.post('/bots', createAdminBot);
router.patch('/bots/:id/disable', disableAdminBot);
router.patch('/bots/:id/activate', activateAdminBot);
router.delete('/bots/:id', deleteAdminBot);

router.get('/keys', getAdminKeys);
router.post('/keys', createAdminKey);
router.delete('/keys/:id', deleteAdminKey);

export default router;