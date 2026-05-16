import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { updateProfile, updateAvatar, updateBackground, updateSong, } from '../controllers/user.controller';

const router = Router();

router.patch('/profile', authMiddleware, updateProfile);
router.patch('/avatar', authMiddleware, updateAvatar);
router.patch('/profile-background', authMiddleware, updateBackground);
router.patch('/song', authMiddleware, updateSong);

export default router;