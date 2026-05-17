import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
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

        if (!profileBackground || !profileBackground.type || !profileBackground.url) {
            return res.status(400).json({
                message: 'Profile background type and url are required',
            });
        }

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        user.profileBackground = {
            type: profileBackground.type,
            url: profileBackground.url,
        };

        await user.save();

        return res.status(200).json({
            message: 'Background updated',
            user: getPublicUser(user),
        });
    } catch {
        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function updateSong(req: AuthRequest, res: Response) {
    try {
        const { profileSong } = req.body;

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (profileSong !== undefined) {
            user.profileSong = profileSong;
        }

        await user.save();

        return res.status(200).json({
            message: 'Song updated',
            user: getPublicUser(user),
        });
    } catch {
        return res.status(500).json({
            message: 'Server error',
        });
    }
}