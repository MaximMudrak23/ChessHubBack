import crypto from 'node:crypto'
import { UserModel } from '../models/User.model'
import { BotModel } from '../models/Bot.model'
import { KeyModel } from '../models/Key.model';
import { MatchTicketModel } from '../models/MatchTicket.model';
import { getPublicUser } from '../utils/getPublicUser';
import { getPublicBot } from '../utils/getPublicBot';
import { scheduleBotSearch } from './botMatchmaking.service';

class AdminService {
    // Users Tools
    async getAllUsers() {
        const existingUsers = await UserModel.find().sort({ createdAt: -1 });
        return existingUsers.map(getPublicUser);
    }

    async deleteUser(userID: string) {
        const existingUser = await UserModel.findByIdAndDelete(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');
        return true;
    }

    // Bots tools
    async getAllBots() {
        const existingBots = await BotModel.find().sort({ createdAt: -1 });
        return existingBots.map(bot => getPublicBot(bot));
    }

    async createBot(name: string, skillLevel: number) {
        const newBot = await BotModel.create({
            name: name.trim(),
            botType: 'stockfish',
            skillLevel,
        });

        scheduleBotSearch(newBot._id.toString());
        return getPublicBot(newBot);
    }

    async deleteBot(botID: string) {
        const existingBot = await BotModel.findById(botID);
        
        if (!existingBot) throw new Error('BOT NOT FOUND');
        if (existingBot.status === 'playing') throw new Error('BOT IS PLAYING');

        await MatchTicketModel.deleteMany({
            ownerType: 'bot',
            ownerId: existingBot._id,
        });

        await existingBot.deleteOne();
        return true;
    }

    async disableBot(botID: string) {
        const existingBot = await BotModel.findById(botID);
        
        if (!existingBot) throw new Error('BOT NOT FOUND');
        if (existingBot.status === 'disabled') throw new Error('BOT ALREADY DISABLED');

        if (existingBot.status === 'playing') {
            existingBot.status = 'disabled';
            await existingBot.save();
            return getPublicBot(existingBot);
        }

        await MatchTicketModel.deleteMany({
            ownerType: 'bot',
            ownerId: existingBot._id,
        });

        existingBot.status = 'disabled';
        await existingBot.save();
        return getPublicBot(existingBot);
    }

    async activateBot(botID: string) {
        const existingBot = await BotModel.findById(botID);
        
        if (!existingBot) throw new Error('BOT NOT FOUND');
        if (existingBot.status !== 'disabled') throw new Error('BOT NOT DISABLED');

        existingBot.status = 'idle';
        await existingBot.save();

        scheduleBotSearch(existingBot._id.toString());
        return getPublicBot(existingBot);
    }

    // Keys Tools
    private generateKey(): string {
        return crypto
            .randomBytes(8)
            .toString('hex')
            .toUpperCase()
            .match(/.{1,4}/g)
            ?.join('-') || '';
    }

    async getAllKeys() {
        return await KeyModel.find().sort({ createdAt: -1 });
    }

    async createKey() {
        const code = this.generateKey();
        return await KeyModel.create({ code });
    }

    async deleteKey(keyID: string) {
        const existingKey = await KeyModel.findByIdAndDelete(keyID);
        if (!existingKey) throw new Error('KEY NOT FOUND');
        return true;
    }
}

export const adminService = new AdminService();