import crypto from 'node:crypto'
import { UserModel } from '../models/User.model'
import { BotModel } from '../models/Bot.model'
import { KeyModel } from '../models/Key.model';
import { MatchTicketModel } from '../models/MatchTicket.model';
import { getPrivateUserDTO } from '../dtos/user.dto';
import { getPrivateBotDTO } from '../dtos/bot.dto';
import { botQueueService } from './botQueue.service';
import { GameModel } from '../models/Game.model';
import { uploadAvatarToCloudinary } from '../utils/uploadAvatar';

type EngineType = 'stockfish' | 'komodo' | 'dragon' | 'reckless';

class AdminService {
    // Users Tools
    async getAllUsers() {
        const existingUsers = await UserModel.find().sort({ createdAt: -1 });
        return existingUsers.map(getPrivateUserDTO);
    }

    async deleteUser(userID: string) {
        const existingUser = await UserModel.findByIdAndDelete(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');
        return true;
    }

    // Bots tools
    async getAllBots() {
        const existingBots = await BotModel.find().sort({ createdAt: -1 });
        return existingBots.map(bot => getPrivateBotDTO(bot));
    }

    async createBot(name: string, engine: EngineType, skillLevel: number, fileBuffer?: Buffer) {
        const newBot = new BotModel({
            name: name.trim(),
            botType: 'classic',
            engine,
            skillLevel,
        });

        await newBot.validate();

        if (fileBuffer) {
            newBot.avatarURL = await uploadAvatarToCloudinary(
                `bots/${newBot._id}`,
                fileBuffer,
                ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            );
        }

        await newBot.save();
        botQueueService.scheduleBotSearch(newBot._id.toString());
        return getPrivateBotDTO(newBot);
    }

    async updateBot(botID: string, name?: string, fileBuffer?: Buffer) {
        const existingBot = await BotModel.findById(botID);
        if (!existingBot) throw new Error('BOT NOT FOUND');

        if (name !== undefined) existingBot.name = name.trim();

        await existingBot.validate();

        if (fileBuffer) {
            existingBot.avatarURL = await uploadAvatarToCloudinary(
                `bots/${existingBot._id}`,
                fileBuffer,
                ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            );
        }

        await existingBot.save();
        return getPrivateBotDTO(existingBot);
    }

    async deleteBot(botID: string) {
        const existingBot = await BotModel.findById(botID);
        
        if (!existingBot) throw new Error('BOT NOT FOUND');
        const activeGame = await GameModel.findOne({
            status: 'active',
            $or: [
                { 'white.playerType': 'bot', 'white.playerId': existingBot._id },
                { 'black.playerType': 'bot', 'black.playerId': existingBot._id },
            ],
        });

        if (activeGame) throw new Error('BOT HAS ACTIVE GAME');

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
            return getPrivateBotDTO(existingBot);
        }

        await MatchTicketModel.deleteMany({
            ownerType: 'bot',
            ownerId: existingBot._id,
        });

        existingBot.status = 'disabled';
        await existingBot.save();
        return getPrivateBotDTO(existingBot);
    }

    async activateBot(botID: string) {
        const existingBot = await BotModel.findById(botID);
        
        if (!existingBot) throw new Error('BOT NOT FOUND');
        if (existingBot.status !== 'disabled') throw new Error('BOT NOT DISABLED');

        existingBot.status = 'idle';
        await existingBot.save();

        botQueueService.scheduleBotSearch(existingBot._id.toString());
        return getPrivateBotDTO(existingBot);
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
