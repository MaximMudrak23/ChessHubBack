import { BotModel } from '../models/Bot.model';
import { MatchTicketModel } from '../models/MatchTicket.model';

function getRandomDelay() {
    return Math.floor(Math.random() * 10000) + 10000;

    // return Math.floor(Math.random() * 240000) + 60000;
}

export function scheduleBotSearch(botId: string) {
    setTimeout(async () => {
        try {
            const bot = await BotModel.findById(botId);

            if (!bot) return;
            if (bot.status !== 'idle') return;

            bot.status = 'searching';
            await bot.save();

            await MatchTicketModel.create({
                ownerType: 'bot',
                ownerId: bot._id,
                elo: bot.elo,
                status: 'searching',
            });
        } catch (error) {
            console.log('Schedule bot search error:', error);
        }
    }, getRandomDelay());
}

export async function startIdleBotsSearch() {
    const idleBots = await BotModel.find({
        status: 'idle',
    });

    for (const bot of idleBots) {
        scheduleBotSearch(bot._id.toString());
    }
}

// это я считаю нужно переназвать в bot.service и чисто вся логика ботов