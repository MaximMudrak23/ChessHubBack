import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

export async function register(req: Request, res: Response) {
    try {
        const { email, password, key } = req.body;

        if (!email || !password || !key) {
            return res.status(400).json({
                message: 'Email, password or key is missing',
            });
        }

        const result = await authService.register(email, password, key);

        return res.status(201).json({
            message: 'User created',
            token: result.token,
            user: result.user,
        });
    } catch (error: any) {
        console.log('REGISTER ERROR:', error);

        if (error.message === 'INVALID KEY') {
            return res.status(400).json({ message: 'Invalid invite key' });
        }
        if (error.message === 'USER EXISTS') {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email or password is missing',
            });
        }

        const result = await authService.login(email, password);

        return res.status(200).json({
            message: 'Login success',
            token: result.token,
            user: result.user,
        });
    } catch (error: any) {
        console.log('Login error:', error);

        if (error.message === 'USER NOT FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }
        if (error.message === 'INVALID PASSWORD') {
            return res.status(401).json({ message: 'Invalid password' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function me(req: AuthRequest, res: Response) {
    try {
        const existingUserID = req.userId;

        if (!existingUserID) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }

        const existingUser = await userService.getUserService(existingUserID);

        return res.status(200).json({
            user: existingUser,
        });
    } catch (error: any) {
        console.log('Me error:', error);

        if (error.message === 'USER NOT FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function startRegister(req: Request, res: Response) {
    try {
        const { email, password, key } = req.body;

        if (!email || !password || !key) {
            return res.status(400).json({
                message: 'Email, password or key is missing',
            });
        }

        await authService.startRegister(email, password, key);

        return res.status(200).json({
            message: 'Verification email sent',
        });
    } catch (error: any) {
        console.log('START REGISTER ERROR:', error);

        if (error.message === 'INVALID KEY') {
            return res.status(400).json({ message: 'Invalid invite key' });
        }

        if (error.message === 'USER EXISTS') {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function verifyRegister(req: Request, res: Response) {
    try {
        const token = String(req.params.token);

        if (!token) {
            return res.status(400).json({ message: 'Verification token is missing' });
        }

        const result = await authService.verifyRegister(token);

        return res.status(200).json({
            message: 'Registration verified',
            token: result.token,
            user: result.user,
        });
    } catch (error: any) {
        console.log('VERIFY REGISTER ERROR:', error);

        if (error.message === 'INVALID VERIFY TOKEN') {
            return res.status(400).json({ message: 'Invalid or expired verification link' });
        }

        if (error.message === 'USER EXISTS') {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        if (error.message === 'INVALID KEY') {
            return res.status(400).json({ message: 'Invalid invite key' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function getRegisterStatus(req: Request, res: Response) {
    try {
        const email = String(req.query.email);

        if (!email || email === 'undefined') {
            return res.status(400).json({ message: 'Email is missing' });
        }

        const result = await authService.getRegisterStatus(email);

        return res.status(200).json(result);
    } catch (error) {
        console.log('GET REGISTER STATUS ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function resendRegisterEmail(req: Request, res: Response) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is missing' });
        }

        await authService.resendRegisterEmail(email);

        return res.status(200).json({ message: 'Verification email resent' });
    } catch (error: any) {
        console.log('RESEND REGISTER EMAIL ERROR:', error);

        if (error.message === 'PENDING NOT FOUND') {
            return res.status(404).json({ message: 'Registration request not found' });
        }

        if (error.message === 'EMAIL COOLDOWN') {
            return res.status(429).json({ message: 'Please wait before sending again' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}