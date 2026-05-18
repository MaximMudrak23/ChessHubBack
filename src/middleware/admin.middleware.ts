import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserModel } from '../models/User.model';

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const user = await UserModel.findById(req.userId);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                message: 'Admin access required',
            });
        }

        next();
    } catch (error) {
        console.log('Admin middleware error:', error);

        return res.status(500).json({
            message: 'Server error',
        });
    }
}