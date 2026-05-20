import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { getPublicUser } from '../utils/getPublicUser';
import { KeyModel } from '../models/Key.model';
import { BotModel } from '../models/Bot.model';
import { scheduleBotSearch } from '../services/botMatchmaking.service';
import crypto from 'node:crypto';

export async function getAdminUsers(req: AuthRequest, res: Response) {
    try {
        const users = await UserModel.find().sort({ createdAt: -1 });

        return res.status(200).json({
            users: users.map(getPublicUser),
        });
    } catch (error) {
        console.log('Get admin users error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function deleteAdminUser(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        if (id === req.userId) {
            return res.status(400).json({
                message: 'You cannot delete yourself',
            });
        }

        const user = await UserModel.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            message: 'User deleted',
        });
    } catch (error) {
        console.log('Delete admin user error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

function generateKey() {
    return crypto
        .randomBytes(8)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,4}/g)
        ?.join('-');
}

export async function getAdminKeys(_: AuthRequest, res: Response) {
    try {
        const keys = await KeyModel.find().sort({ createdAt: -1 });

        return res.status(200).json({ keys });
    } catch (error) {
        console.log('Get admin keys error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function createAdminKey(_: AuthRequest, res: Response) {
    try {
        const code = generateKey();

        const key = await KeyModel.create({ code });

        return res.status(201).json({ key });
    } catch (error) {
        console.log('Create admin key error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function deleteAdminKey(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        const key = await KeyModel.findByIdAndDelete(id);

        if (!key) {
            return res.status(404).json({
                message: 'Key not found',
            });
        }

        return res.status(200).json({
            message: 'Key deleted',
        });
    } catch (error) {
        console.log('Delete admin key error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function createAdminBot(req: AuthRequest, res: Response) {
    try {
        const { name, botType, skillLevel } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                message: 'Bot name is required',
            });
        }

        if (botType !== 'stockfish') {
            return res.status(400).json({
                message: 'Only stockfish bot is available now',
            });
        }

        const skill = Number(skillLevel);

        if (Number.isNaN(skill) || skill < 0 || skill > 20) {
            return res.status(400).json({
                message: 'Skill level must be between 0 and 20',
            });
        }

        const bot = await BotModel.create({
            name: name.trim(),
            botType: 'stockfish',
            skillLevel: skill,
        });

        scheduleBotSearch(bot._id.toString());

        return res.status(201).json({
            message: 'Bot created',
            bot,
        });
    } catch (error) {
        console.log('Create admin bot error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

function getPublicBot(bot: any) {
    return {
        id: bot._id,
        isBot: true,
        botType: bot.botType,
        name: bot.name,
        description: bot.description,
        avatarURL: bot.avatarURL,
        avatarFrameURL: bot.avatarFrameURL,
        userIcons: bot.userIcons,
        profileBackground: bot.profileBackground,
        profileSong: bot.profileSong,
        elo: bot.elo,
        engine: bot.engine,
        skillLevel: bot.skillLevel,
        pgnFiles: bot.pgnFiles,
        status: bot.status,
    };
}

export async function getAdminBots(_: AuthRequest, res: Response) {
    try {
        const bots = await BotModel.find().sort({ createdAt: -1 });

        return res.status(200).json({
            bots: bots.map(getPublicBot),
        });
    } catch (error) {
        console.log('Get admin bots error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function deleteAdminBot(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        const bot = await BotModel.findByIdAndDelete(id);

        if (!bot) {
            return res.status(404).json({
                message: 'Bot not found',
            });
        }

        return res.status(200).json({
            message: 'Bot deleted',
        });
    } catch (error) {
        console.log('Delete admin bot error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}