import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { UserModel } from '../models/User.model'
import { KeyModel } from '../models/Key.model'
import { PendingRegistrationModel } from '../models/PendingRegistration.model'
import { createToken } from '../utils/createToken'
import { getSelfUserDTO } from '../dtos/user.dto'
import { emailService } from './email.service'

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

    async startRegister(email: string, password: string, key: string) {
        const existingKey = await KeyModel.findOne({ code: key });
        if (!existingKey) throw new Error('INVALID KEY');

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) throw new Error('USER EXISTS');

        if (!emailService.isEnabled()) {
            return await this.register(email, password, key);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verifyToken = crypto.randomBytes(32).toString('hex');

        await PendingRegistrationModel.findOneAndUpdate(
            { email },
            {
                email,
                password: hashedPassword,
                keyCode: existingKey.code,
                verifyToken,
                expiresAt: new Date(Date.now() + 1000 * 60 * 30),
            },
            { upsert: true, returnDocument: 'after' }
        );

        const serverURL = process.env.SERVER_URL;
        
        if (!serverURL) {
            throw new Error('SERVER_URL is missing');
        }

        const verifyLink = `${serverURL}/auth/register/verify/${verifyToken}`;

        emailService
            .sendVerificationEmail(email, verifyLink)
            .then(() => {
                return PendingRegistrationModel.updateOne(
                    { email },
                    { lastEmailSentAt: new Date() }
                );
            })
            .catch(error => {
                console.log('SEND VERIFICATION EMAIL ERROR:', error);
            });

        return true;
    }

    async verifyRegister(verifyToken: string) {
        const pending = await PendingRegistrationModel.findOne({ verifyToken });
        if (!pending) throw new Error('INVALID VERIFY TOKEN');

        const existingUser = await UserModel.findOne({ email: pending.email });
        if (existingUser) throw new Error('USER EXISTS');

        const existingKey = await KeyModel.findOne({ code: pending.keyCode });
        if (!existingKey) throw new Error('INVALID KEY');

        const generatedName = `User${Math.floor(Math.random() * 100_000)}`;

        const newUser = await UserModel.create({
            name: generatedName,
            email: pending.email,
            password: pending.password,
        });

        await KeyModel.deleteOne({ _id: existingKey._id });

        const token = createToken(newUser._id.toString());

        pending.verified = true;
        pending.authToken = token;
        pending.expiresAt = new Date(Date.now() + 1000 * 60 * 5);
        await pending.save();

        return {
            token,
            user: getSelfUserDTO(newUser),
        };
    }

    async getRegisterStatus(email: string) {
        const pending = await PendingRegistrationModel.findOne({ email });

        if (!pending) {
            return { verified: false };
        }

        if (!pending.verified || !pending.authToken) {
            return { verified: false };
        }

        const user = await UserModel.findOne({ email });
        if (!user) {
            return { verified: false };
        }

        const result = {
            verified: true,
            token: pending.authToken,
            user: getSelfUserDTO(user),
        };

        await PendingRegistrationModel.deleteOne({ _id: pending._id });

        return result;
    }

    async resendRegisterEmail(email: string) {
        const pending = await PendingRegistrationModel.findOne({ email });

        if (!pending) throw new Error('PENDING NOT FOUND');

        if (pending.verified) {
            return true;
        }

        const now = Date.now();

        if (
            pending.lastEmailSentAt &&
            now - pending.lastEmailSentAt.getTime() < 60_000
        ) {
            throw new Error('EMAIL COOLDOWN');
        }

        const serverURL = process.env.SERVER_URL;

        if (!serverURL) {
            throw new Error('SERVER_URL is missing');
        }

        const verifyLink = `${serverURL}/auth/register/verify/${pending.verifyToken}`;

        await emailService.sendVerificationEmail(email, verifyLink);

        pending.lastEmailSentAt = new Date();
        await pending.save();

        return true;
    }
}

export const authService = new AuthService();