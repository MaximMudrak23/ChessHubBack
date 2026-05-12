import { Router } from 'express';

const router = Router();

router.post('/login', (req, res) => {
    res.json({
        message: 'Login route works',
        body: req.body,
    });
});

router.post('/register', (req, res) => {
    res.json({
        message: 'Register route works',
        body: req.body,
    });
});

export default router;