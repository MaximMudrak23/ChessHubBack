import { UserModel } from '../models/User.model';
import { BotModel } from '../models/Bot.model';
import { botQueueService } from './botQueue.service';
import { getIO, getPlayerRoom } from '../socket/socket';

type Winner = 'white' | 'black' | 'draw' | null;

type FinishGameInput = {
    game: any;
    winner: Winner;
    finishedReason: string;
    moves?: any[];
};

class GameFinalizerService {
    private emitActiveGameCleared(game: any) {
        getIO()
            .to(getPlayerRoom(String(game.white.playerId)))
            .emit('player:active-game:update', null);

        getIO()
            .to(getPlayerRoom(String(game.black.playerId)))
            .emit('player:active-game:update', null);
    }

    private async releaseBots(game: any) {
        const players = [game.white, game.black];

        for (const player of players) {
            if (player.playerType !== 'bot') continue;

            const bot = await BotModel.findById(player.playerId);
            if (!bot) continue;

            if (bot.status === 'disabled') {
                continue;
            }

            bot.status = 'idle';
            await bot.save();

            botQueueService.scheduleBotSearch(bot._id.toString());
        }
    }

    private async updateElo(game: any, winner: Winner) {
        if (winner !== 'white' && winner !== 'black') return;

        const winnerPlayer = winner === 'white' ? game.white : game.black;
        const loserPlayer = winner === 'white' ? game.black : game.white;

        if (winnerPlayer.playerType === 'user') {
            await UserModel.findByIdAndUpdate(winnerPlayer.playerId, {
                $inc: { elo: 24 },
            });
        }

        if (loserPlayer.playerType === 'user') {
            await UserModel.findByIdAndUpdate(loserPlayer.playerId, {
                $inc: { elo: -24 },
            });
        }

        if (winnerPlayer.playerType === 'bot') {
            await BotModel.findByIdAndUpdate(winnerPlayer.playerId, {
                $inc: { elo: 24 },
            });
        }

        if (loserPlayer.playerType === 'bot') {
            await BotModel.findByIdAndUpdate(loserPlayer.playerId, {
                $inc: { elo: -24 },
            });
        }
    }

    async finishGame(input: FinishGameInput) {
        const { game, winner, finishedReason, moves } = input;

        if (game.status === 'finished') {
            return game;
        }

        game.status = 'finished';
        game.winner = winner;
        game.finishedReason = finishedReason;

        if (moves) {
            game.moves = moves;
        }

        await game.save();

        this.emitActiveGameCleared(game);

        await this.releaseBots(game);
        await this.updateElo(game, winner);

        return game;
    }
}

export const gameFinalizerService = new GameFinalizerService();