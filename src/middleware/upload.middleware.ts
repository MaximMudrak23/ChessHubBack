import multer from 'multer';
import type { RequestHandler } from 'express';

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const parseBotAvatar = upload.single('avatar');

export const uploadBotAvatar: RequestHandler = (req, res, next) => {
    parseBotAvatar(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Avatar must not exceed 5 MB' });
        }

        if (error) {
            return res.status(400).json({ message: 'Invalid avatar upload' });
        }

        if (req.file && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(req.file.mimetype)) {
            return res.status(400).json({ message: 'Avatar must be a JPEG, PNG, WebP or GIF image' });
        }

        next();
    });
};
