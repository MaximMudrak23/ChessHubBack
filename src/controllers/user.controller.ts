import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { BotModel } from '../models/Bot.model';
import { getPublicUser } from '../utils/getPublicUser';
import { userService } from '../services/user.service';

export async function updateProfile(req: AuthRequest, res: Response) {
    try {
        const { name, description } = req.body;
        const existingUserID = req.userId;

        if (!existingUserID) return res.status(401).json({ message: 'Unauthorized' });

        if (typeof name !== 'string') return res.status(400).json({ message: 'Name must be a string' });
        if (typeof description !== 'string') return res.status(400).json({ message: 'Description must be a string' });
        
        const trimmedName = name?.trim();
        const trimmedDescription = description?.trim();
        
        if (!trimmedName) return res.status(400).json({ message: 'Name is required' });

        if (trimmedName.length < 1 || trimmedName.length > 24) return res.status(400).json({ message: 'Name must be between 1 and 24 characters' });
        if (trimmedDescription.length > 300) return res.status(400).json({ message: 'Description max length is 300 characters' });

        const updatedUser = await userService.updateProfile(existingUserID, trimmedName, trimmedDescription);

        return res.status(200).json({
            message: 'Profile updated',
            user: updatedUser,
        });
    } catch (error: any) {
        console.log('UPDATE PROFILE ERROR:', error);

        if (error.message === 'USER NOT FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function updateAvatar(req: AuthRequest, res: Response) {
    try {
        const { avatarFrameURL } = req.body;
        const existingUserID = req.userId;

        if (!existingUserID) return res.status(401).json({ message: 'Unauthorized' });

        if(!req.file && avatarFrameURL === undefined) return res.status(400).json({ message: 'Avatar data is missing' });

        if (avatarFrameURL !== undefined && typeof avatarFrameURL !== 'string') return res.status(400).json({ message: 'Avatar frame must be a string' });

        const filename = req.file?.filename;
        const updatedUser = await userService.updateAvatar(existingUserID, filename, avatarFrameURL);

        return res.status(200).json({
            message: 'Avatar updated',
            user: updatedUser,
        });
    } catch (error: any) {
        console.log('UPDATE AVATAR ERROR:', error);

        if (error.message === 'USER NOT FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function updateBackground(req: AuthRequest, res: Response) {
    try {
        const { profileBackground } = req.body;
        const existingUserID = req.userId;

        if (!existingUserID) return res.status(401).json({ message: 'Unauthorized' });

        if (profileBackground !== null && profileBackground !== undefined) {
            if (typeof profileBackground !== 'object' || !profileBackground.type || !profileBackground.url) {
                return res.status(400).json({ message: 'Profile background type and url are required' });
            }

            if (!['image', 'video'].includes(profileBackground.type)) {
                return res.status(400).json({ message: 'Invalid background type' });
            }
        }

        const updatedUser = await userService.updateBackground(existingUserID, profileBackground);

        return res.status(200).json({
            message: 'Background updated',
            user: updatedUser,
        });
    } catch (error: any) {
        console.log('UPDATE BACKGROUND ERROR:', error);

        if (error.message === 'USER NOT FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

export async function updateSong(req: AuthRequest, res: Response) {
    try {
        const { profileSong } = req.body;
        const existingUserID = req.userId;

        if (!existingUserID) return res.status(401).json({ message: 'Unauthorized' });

        if (profileSong === undefined) return res.status(400).json({ message: 'Song data is missing' });

        if (profileSong !== null) {
            if (typeof profileSong !== 'object' || !profileSong.songName || !profileSong.songAuthor || !profileSong.songURL || !profileSong.songAvatarURL) {
                return res.status(400).json({ message: 'Song name, author, url and avatar are required' });
            }
        }

        const updatedUser = await userService.updateSong(existingUserID, profileSong);

        return res.status(200).json({
            message: 'Song updated',
            user: updatedUser,
        });
    } catch (error: any) {
        console.log('UPDATE SONG ERROR:', error);

        if (error.message === 'USER NOT FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(500).json({ message: 'Server error' });
    }
}

// это не трогалось
export async function searchUsers(req: AuthRequest, res: Response) {
    try {
        const q = String(req.query.q || '').trim();
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        if (!q) {
            return res.status(200).json({
                users: [],
                totalPages: 0,
            });
        }

        const skip = (page - 1) * limit;

        const filter = {
            name: { $regex: q, $options: 'i' },
        };

        const [users, bots] = await Promise.all([
            UserModel.find(filter),
            BotModel.find(filter),
        ]);

        const normalizedUsers = users.map(user => ({
            ...getPublicUser(user),
            isBot: false,
        }));

        const normalizedBots = bots.map(bot => ({
            id: bot._id,
            name: bot.name,
            email: '',
            elo: bot.elo,
            role: 'user',
            userIcons: bot.userIcons,
            description: bot.description,
            avatarURL: bot.avatarURL,
            avatarFrameURL: bot.avatarFrameURL,
            profileBackground: bot.profileBackground,
            profileSong: bot.profileSong,
            boardTheme: 'water',
            menuBackground: 'default',
            isBot: true,
        }));

        const results = [...normalizedUsers, ...normalizedBots];
        const paginatedResults = results.slice(skip, skip + limit);

        return res.status(200).json({
            users: paginatedResults,
            totalPages: Math.ceil(results.length / limit),
        });
    } catch (error) {
        console.log('Search users error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function getUserById(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        const user = await UserModel.findById(id);

        if (user) {
            return res.status(200).json({
                user: {
                    ...getPublicUser(user),
                    isBot: false,
                },
            });
        }

        const bot = await BotModel.findById(id);

        if (!bot) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        return res.status(200).json({
            user: {
                id: bot._id,
                name: bot.name,
                email: '',
                elo: bot.elo,
                role: 'user',
                userIcons: bot.userIcons,
                description: bot.description,
                avatarURL: bot.avatarURL,
                avatarFrameURL: bot.avatarFrameURL,
                profileBackground: bot.profileBackground,
                profileSong: bot.profileSong,
                boardTheme: 'water',
                menuBackground: 'default',
                isBot: true,
            },
        });
    } catch (error) {
        console.log('Get user by id error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}