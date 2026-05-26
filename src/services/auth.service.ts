import bcrypt from 'bcrypt'
import { UserModel } from '../models/User.model'
import { KeyModel } from '../models/Key.model'
import { createToken } from '../utils/createToken'
import { getSelfUserDTO } from '../dtos/user.dto'

class AuthService {
    async register(email: string, password: string, key: string) {
        const existingKey = await KeyModel.findOne({code: key});
        if (!existingKey) throw new Error('INVALID KEY');

        const existingUser = await UserModel.findOne({email: email});
        if (existingUser) throw new Error('USER EXISTS');

        const generatedName = `User${Math.floor(Math.random()*100_000)}`;
        const hashedPassword = await bcrypt.hash(password,10);
        const newUser = await UserModel.create({
            name: generatedName,
            email,
            password: hashedPassword,
        });

        await KeyModel.deleteOne({_id: existingKey._id});

        const token = createToken(newUser._id.toString());

        return {
            token,
            user: getSelfUserDTO(newUser),
        };
    }

    async login(email: string, password: string) {
        const existingUser = await UserModel.findOne({email});
        if (!existingUser) throw new Error('USER NOT FOUND');

        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) throw new Error('INVALID PASSWORD');

        const token = createToken(existingUser._id.toString());

        return {
            token,
            user: getSelfUserDTO(existingUser),
        }
    }
}

export const authService = new AuthService();