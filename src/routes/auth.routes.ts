import { Router } from 'express';
import { register, login, me, startRegister, verifyRegister, getRegisterStatus, resendRegisterEmail, } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, me);
router.get('/register/verify/:token', verifyRegister);
router.get('/register/status', getRegisterStatus);

router.post('/login', login);
router.post('/register', register);
router.post('/register/start', startRegister);
router.post('/register/resend', resendRegisterEmail);

export default router;