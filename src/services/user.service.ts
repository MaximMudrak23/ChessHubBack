import { UserModel } from "../models/User.model";
import { getPublicUser } from "../utils/getPublicUser"; // temporarily

class UserService {
    async getUserService(userID: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');
        return getPublicUser(existingUser);
    }
}

export const userService = new UserService();