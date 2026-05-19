import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { BotModel } from '../models/Bot.model';
import { getPublicUser } from '../utils/getPublicUser';

export async function updateProfile(req: AuthRequest, res: Response) {
    try {
        const { name, description } = req.body;

        if (name === undefined && description === undefined) {
            return res.status(400).json({
                message: 'Profile data is missing',
            });
        }

        if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({
                message: 'Name must be a string',
            })
        }

        if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({
                message: 'Description must be a string',
            })
        }
        
        const trimmedName = name?.trim();
        const trimmedDescription = description?.trim();

        if (name !== undefined && !trimmedName) {
            return res.status(400).json({
                message: 'Name is required',
            });
        }

        if (name !== undefined && (trimmedName.length < 1 || trimmedName.length > 24)) {
            return res.status(400).json({
                message: 'Name must be between 1 and 24 characters',
            });
        }

        if (description !== undefined && trimmedDescription.length > 300) {
            return res.status(400).json({
                message: 'Description max length is 300 characters',
            });
        }

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (name !== undefined) {
            user.name = trimmedName;
        }

        if (description !== undefined) {
            user.description = trimmedDescription;
        }

        await user.save();

        return res.status(200).json({
            message: 'Profile updated',
            user: getPublicUser(user),
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function updateAvatar(req: AuthRequest, res: Response) {
    try {
        const { avatarFrameURL } = req.body;

        if (!req.file && avatarFrameURL === undefined) {
            return res.status(400).json({
                message: 'Avatar data is missing',
            });
        }

        if (avatarFrameURL !== undefined && typeof avatarFrameURL !== 'string') {
            return res.status(400).json({
                message: 'Avatar frame must be a string',
            });
        }

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (req.file) {
            user.avatarURL = `/uploads/avatars/${req.file.filename}?v=${Date.now()}`;
        }

        if (avatarFrameURL !== undefined) {
            user.avatarFrameURL = avatarFrameURL;
        }

        await user.save();

        return res.status(200).json({
            message: 'Avatar updated',
            user: getPublicUser(user),
        });
    } catch (error) {
        console.log('Update avatar error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function updateBackground(req: AuthRequest, res: Response) {
    try {
        const { profileBackground } = req.body;

        if (profileBackground !== null && profileBackground !== undefined) {
            if (
                typeof profileBackground !== 'object' ||
                !profileBackground.type ||
                !profileBackground.url
            ) {
                return res.status(400).json({
                    message: 'Profile background type and url are required',
                });
            }

            if (!['image', 'video'].includes(profileBackground.type)) {
                return res.status(400).json({
                    message: 'Invalid background type',
                });
            }
        }

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        user.profileBackground = profileBackground ?? null;

        await user.save();

        return res.status(200).json({
            message: 'Background updated',
            user: getPublicUser(user),
        });
    } catch (error) {
        console.log('Update background error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function updateSong(req: AuthRequest, res: Response) {
    try {
        const { profileSong } = req.body;

        if (profileSong === undefined) {
            return res.status(400).json({
                message: 'Song data is missing',
            });
        }

        if (profileSong !== null) {
            if (
                typeof profileSong !== 'object' ||
                !profileSong.songName ||
                !profileSong.songAuthor ||
                !profileSong.songURL ||
                !profileSong.songAvatarURL
            ) {
                return res.status(400).json({
                    message: 'Song name, author, url and avatar are required',
                });
            }
        }

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        user.profileSong = profileSong;

        await user.save();

        return res.status(200).json({
            message: 'Song updated',
            user: getPublicUser(user),
        });
    } catch (error) {
        console.log('Update song error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}

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