import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { getPublicUser } from '../utils/getPublicUser';

export async function updateProfile(req: AuthRequest, res: Response) {
    try {
        const { name, description } = req.body;

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (description !== undefined) {
            user.description = description;
        }

        await user.save();

        return res.status(200).json({
            message: 'Profile updated',
            user: getPublicUser(user),
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function updateAvatar(req: AuthRequest, res: Response) {
    try {
        const {
            avatarURL,
            avatarFrameURL,
        } = req.body;

        const user = await UserModel.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (avatarURL !== undefined) {
            user.avatarURL = avatarURL;
        }

        if (avatarFrameURL !== undefined) {
            user.avatarFrameURL = avatarFrameURL;
        }

        await user.save();

        return res.status(200).json({
            message: 'Avatar updated',
            user: getPublicUser(user),
        });
    } catch {
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