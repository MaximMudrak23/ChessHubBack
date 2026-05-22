import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs'
import type { AuthRequest } from './auth.middleware';

const avatarUploadPath = 'uploads/avatars';

if (!fs.existsSync(avatarUploadPath)) {
    fs.mkdirSync(avatarUploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_, __, cb) => {
        cb(null, avatarUploadPath);
    },

    filename: (req: AuthRequest, file, cb) => {
        const ext = path.extname(file.originalname);

        cb(null, `avatar-${req.userId}-${Date.now()}${ext}`);
    },
});

export const upload = multer({
    storage,
});