import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { getPublicUser } from '../utils/getPublicUser';
import crypto from 'node:crypto';
import { KeyModel } from '../models/Key.model';

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