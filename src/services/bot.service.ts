import { BotModel } from '../models/Bot.model';
import { MatchTicketModel } from '../models/MatchTicket.model';

class BotService {
    private getRandomDelay() {
        return Math.floor(Math.random() * 10000) + 10000;
        // return Math.floor(Math.random() * 240000) + 60000;
    }

    scheduleBotSearch(botId: string) {
        setTimeout(async () => {
            try {
                const existingBot = await BotModel.findById(botId);

                if (!existingBot) return;
                if (existingBot.status !== 'idle') return;

                existingBot.status = 'searching';
                await existingBot.save();

                await MatchTicketModel.create({
                    ownerType: 'bot',
                    ownerId: existingBot._id,
                    elo: existingBot.elo,
                    status: 'searching',
                });
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

export const botService = new BotService();

// это я считаю нужно переназвать в bot.service и чисто вся логика ботов