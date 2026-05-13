import { Request, Response } from 'express';
import { UserModel } from '../models/User.model';
import { KeyModel } from '../models/Key.model';
import bcrypt from 'bcrypt';

export async function register(req: Request, res: Response) {
    try {
        const { email, password, key } = req.body;

        if (!email || !password || !key) {
            return res.status(400).json({
                message: 'Email, password or key is missing',
            });
        }

        const existingKey = await KeyModel.findOne({ code: key, });

        if (!existingKey) {
            return res.status(400).json({
                message: 'Invalid invite key',
            })
        }

        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: 'User with this email already exists',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const generatedName = `User${Math.floor(Math.random() * 100000)}`;

        const user = await UserModel.create({
            name: generatedName,
            email,
            password: hashedPassword,
        });

        await KeyModel.deleteOne({
            _id: existingKey._id,
        });

        return res.status(201).json({
            message: 'User created',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                elo: user.elo,
                role: user.role,
                avatarURL: user.avatarURL,
                avatarFrameURL: user.avatarFrameURL,
                profileSong: user.profileSong,
                description: user.description,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
        });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            if (!email) {
                return res.status(400).json({
                    message: 'Email is missing',
                });
            }
            else {
                return res.status(400).json({
                    message: 'Password is missing',
                });
            }
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid password',
            });
        }

        return res.status(200).json({
            message: 'Login success',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                elo: user.elo,
                role: user.role,
                avatarURL: user.avatarURL,
                avatarFrameURL: user.avatarFrameURL,
                profileSong: user.profileSong,
                description: user.description,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
        });
    }
}