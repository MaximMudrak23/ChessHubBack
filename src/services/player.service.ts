import { UserModel } from '../models/User.model';
import { BotModel } from '../models/Bot.model';
import { getPublicUserDTO } from '../dtos/user.dto';
import { getPublicBotDTO } from '../dtos/bot.dto';

class PlayerService {
    async searchPlayers(q: string, page: number, limit: number) {
        if (!q) {
            return {
                users: [],
                totalPages: 0,
            };
        }

        const skip = (page - 1) * limit;

        const filter = {
            name: { $regex: q, $options: 'i' },
        };

        const [users, bots] = await Promise.all([
            UserModel.find(filter),
            BotModel.find(filter),
        ]);

        const results = [
            ...users.map(getPublicUserDTO),
            ...bots.map(getPublicBotDTO),
        ];

        return {
            users: results.slice(skip, skip + limit),
            totalPages: Math.ceil(results.length / limit),
        };
    }

    async getPlayerById(id: string) {
        const existingUser = await UserModel.findById(id);
        if (existingUser) return getPublicUserDTO(existingUser);

        const existingBot = await BotModel.findById(id);
        if (!existingBot) throw new Error('PLAYER NOT FOUND');

        return getPublicBotDTO(existingBot);
    }
}

export const playerService = new PlayerService();