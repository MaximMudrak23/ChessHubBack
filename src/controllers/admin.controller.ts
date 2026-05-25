import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { adminService } from '../services/admin.service';

// USERS
export async function getAdminUsers(req: AuthRequest, res: Response) {
    try {
        const existingUsers = await adminService.getAllUsers();
        return res.status(200).json({
            message: 'Users received',
            users: existingUsers,
        });
    } catch (error) {
        console.log('GET ADMIN USERS ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function deleteAdminUser(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        if (id === req.userId) return res.status(400).json({ message: 'You cannot delete yourself' });

        await adminService.deleteUser(id);

        return res.status(200).json({ message: 'User deleted' });
    } catch (error: any) {
        console.log('DELETE ADMIN USER ERROR:', error);
        if (error.message === 'USER NOT FOUND') return res.status(404).json({ message: 'User not found' });
        return res.status(500).json({ message: 'Server error' });
    }
}

// KEYS
export async function getAdminKeys(_: AuthRequest, res: Response) {
    try {
        const existingKeys = await adminService.getAllKeys();
        return res.status(200).json({
            message: 'Keys received',
            keys: existingKeys,
        });
    } catch (error) {
        console.log('GET ADMIN KEYS ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function createAdminKey(_: AuthRequest, res: Response) {
    try {
        const existingKey = await adminService.createKey();
        return res.status(201).json({ key: existingKey });
    } catch (error) {
        console.log('CREATE ADMIN KEY ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function deleteAdminKey(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        await adminService.deleteKey(id);

        return res.status(200).json({ message: 'Key deleted' });
    } catch (error: any) {
        console.log('DELETE ADMIN KEY ERROR:', error);
        if (error.message === 'KEY NOT FOUND') return res.status(404).json({ message: 'Key not found' });
        return res.status(500).json({ message: 'Server error' });
    }
}

// BOTS
export async function getAdminBots(_: AuthRequest, res: Response) {
    try {
        const existingBots = await adminService.getAllBots();
        return res.status(200).json({
            message: 'Bots received',
            bots: existingBots
        });
    } catch (error) {
        console.log('GET ADMIN BOTS ERROR:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function createAdminBot(req: AuthRequest, res: Response) {
    try {
        const { name, botType, skillLevel } = req.body;

        if (typeof name !== 'string') return res.status(400).json({ message: 'Bot name must be a string' });
        
        const trimmedName = name.trim();
        if (!trimmedName) return res.status(400).json({ message: 'Bot name is required' });

        // ONLY STOCKFISH ENABLE FOR NOW
        if (botType !== 'stockfish') return res.status(400).json({ message: 'Only stockfish bot is available now' });

        const skill = Number(skillLevel);
        if (Number.isNaN(skill) || skill < 0 || skill > 20) return res.status(400).json({ message: 'Skill level must be between 0 and 20' });

        const newBot = await adminService.createBot(trimmedName, skill);

        return res.status(201).json({
            message: 'Bot created',
            bot: newBot,
        });
    } catch (error) {
        console.log('CREATE ADMIN BOT ERROR:', error);
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function deleteAdminBot(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        await adminService.deleteBot(id);

        return res.status(200).json({ message: 'Bot deleted' });
    } catch (error: any) {
        console.log('DELETE ADMIN BOT ERROR:', error);
        
        if (error.message === 'BOT NOT FOUND') {
            return res.status(404).json({ message: 'Bot not found' });
        }
        if (error.message === 'BOT IS PLAYING') {
            return res.status(400).json({ message: 'Cannot delete bot while playing' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function disableAdminBot(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        const existingBot = await adminService.disableBot(id);

        return res.status(200).json({
            message: existingBot.status === 'disabled' ? 'Bot disabled' : 'Bot will be disabled after game',
            bot: existingBot,
        });
    } catch (error: any) {
        console.log('DISABLE BOT ERROR:', error);

        if (error.message === 'BOT NOT FOUND') {
            return res.status(404).json({ message: 'Bot not found' });
        }
        if (error.message === 'BOT ALREADY DISABLED') {
            return res.status(400).json({ message: 'Bot already disabled' });
        }
        
        return res.status(500).json({ message: 'Server error' });
    }
}

export async function activateAdminBot(req: AuthRequest, res: Response) {
    try {
        const id = String(req.params.id);

        const existingBot = await adminService.activateBot(id);

        return res.status(200).json({
            message: 'Bot activated',
            bot: existingBot,
        });
    } catch (error: any) {
        console.log('ACTIVATE BOT ERROR:', error);
        
        if (error.message === 'BOT NOT FOUND') {
            return res.status(404).json({ message: 'Bot not found' });
        }
        if (error.message === 'BOT NOT DISABLED') {
            return res.status(400).json({ message: 'Bot is not disabled' });
        }
        
        return res.status(500).json({ message: 'Server error' });
    }
}