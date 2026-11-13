import { UserModel } from "../models/User.model";
import { getSelfUserDTO } from "../dtos/user.dto";
import { uploadAvatarToCloudinary } from '../utils/uploadAvatar';

class UserService {
    async getUserService(userID: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');
        return getSelfUserDTO(existingUser);
    }

    async updateProfile(userID: string, name: string, description?: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        if (name) existingUser.name = name;
        if (description || description === '') existingUser.description = description;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }

    async updateAvatar(userID: string, fileBuffer?: Buffer, avatarFrameURL?: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        if (fileBuffer) {
            const avatarURL = await uploadAvatarToCloudinary(userID, fileBuffer);
            existingUser.avatarURL = avatarURL;
        }

        if (avatarFrameURL) existingUser.avatarFrameURL = avatarFrameURL;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }

    async updateBackground(userID: string, profileBackground: any) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        existingUser.profileBackground = profileBackground ?? null;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }

    async updateSong(userID: string, profileSong: any) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        existingUser.profileSong = profileSong;

        await existingUser.save();
        return getSelfUserDTO(existingUser);
    }
}

export const userService = new UserService();
