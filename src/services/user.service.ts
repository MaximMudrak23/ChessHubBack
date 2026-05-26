import fs from "node:fs"
import path from "node:path"
import { UserModel } from "../models/User.model";
import { getSelfUserDTO } from "../dtos/user.dto";

class UserService {
    async getUserService(userID: string) { // only for /me
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');
        return getSelfUserDTO(existingUser);
    }

    private deleteUploadedFile(fileURL: string) {
        const cleanURL = fileURL.split('?')[0];
        if (!cleanURL.startsWith('/uploads')) return;
        
        const filePath = path.join(process.cwd(), cleanURL);

        fs.unlink(filePath, error => {
            if (error && error.code !== 'ENOENT') console.log('DELETE FILE ERROR:', error);
        });
    }

    async updateProfile(userID: string, name: string, description?: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        if (name) existingUser.name = name;
        if (description || description === '') existingUser.description = description;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }

    async updateAvatar(userID: string, filename?: string, avatarFrameURL?: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        if (filename) {
            this.deleteUploadedFile(existingUser.avatarURL);
            existingUser.avatarURL = `/uploads/avatars/${filename}?v=${Date.now()}`;
        }

        if (avatarFrameURL) existingUser.avatarFrameURL = avatarFrameURL;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }

    async updateBackground(userID: string, profileBackground: any) { // temporarily any
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        existingUser.profileBackground = profileBackground ?? null;
        
        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }

    async updateSong(userID: string, profileSong: any) { // temporarily any
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        existingUser.profileSong = profileSong;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }
}

export const userService = new UserService();