import { UserModel } from "../models/User.model";
import { getSelfUserDTO } from "../dtos/user.dto";
import cloudinary from "../config/cloudinary";

class UserService {
    async getUserService(userID: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');
        return getSelfUserDTO(existingUser);
    }

    private uploadAvatarToCloudinary(userID: string, buffer: Buffer): Promise<string> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'chesshub/avatars',
                    public_id: userID,
                    overwrite: true,
                    resource_type: 'image',
                },
                (error, result) => {
                    if (error || !result) return reject(error);
                    resolve(result.secure_url);
                }
            );

            uploadStream.end(buffer);
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

    async updateAvatar(userID: string, fileBuffer?: Buffer, avatarFrameURL?: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        if (fileBuffer) {
            const avatarURL = await this.uploadAvatarToCloudinary(userID, fileBuffer);
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