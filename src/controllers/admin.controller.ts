import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/User.model';
import { getPublicUser } from '../utils/getPublicUser';

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