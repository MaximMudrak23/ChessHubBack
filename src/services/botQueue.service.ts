import { BotModel } from '../models/Bot.model';
import { MatchTicketModel } from '../models/MatchTicket.model';
import { gameService } from './game.service';

class BotQueueService {
    private getRandomDelay() {
        return Math.floor(Math.random() * 10000) + 10000;
        // return Math.floor(Math.random() * 240000) + 60000;
    }

    scheduleBotSearch(botId: string) {
        setTimeout(async () => {
            try {
                const bot = await BotModel.findById(botId);

                if (!bot) return;
                if (bot.status !== 'idle') return;

                bot.status = 'searching';
                await bot.save();

                const existingTicket = await MatchTicketModel.findOne({
                    ownerType: 'bot',
                    ownerId: bot._id,
                    status: 'searching',
                });

                if (!existingTicket) {
                    await MatchTicketModel.create({
                        ownerType: 'bot',
                        ownerId: bot._id,
                        elo: bot.elo,
                        status: 'searching',
                    });
                }

                await gameService.findGameForBot(bot._id.toString());
            } catch (error) {
                console.log('SCHEDULE BOT SEARCH ERROR:', error);
            }
        }, this.getRandomDelay());
    }

    async startIdleBotsSearch() {
        const idleBots = await BotModel.find({ status: 'idle' });

        for (const bot of idleBots) {
            this.scheduleBotSearch(bot._id.toString());
        }
    }
}

export const botQueueService = new BotQueueService();