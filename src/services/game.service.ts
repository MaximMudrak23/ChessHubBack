import { UserModel } from "../models/User.model";
import { GameModel } from "../models/Game.model";
import { BotModel } from "../models/Bot.model";
import { MatchTicketModel } from "../models/MatchTicket.model";
import { botService } from "./bot.service";
import { initialPieces } from "../chess/initialPieces";
import { getRandomSides } from "../utils/getRandomSides";
import { getPlayerFromTicket } from "../utils/getPlayerFromTicket";
// import { getPublicUser } from "../utils/getPublicUser";
import { getSelfUserDTO } from "../dtos/user.dto";

class GameService {
    private getEloRange(searchStartedAt: Date): number {
        const seconds = (Date.now() - searchStartedAt.getTime()) / 1000;
        if (seconds < 30) return 200;
        if (seconds < 60) return 400;
        if (seconds < 90) return 600;
        if (seconds < 120) return 800;
        return 1000;
    }

    async findGame(userID: string) {
        const existingUser = await UserModel.findById(userID);
        if (!existingUser) throw new Error('USER NOT FOUND');

        const activeGame = await GameModel.findOne({
            status: 'active',
            $or: [
                { 'white.playerId': existingUser._id },
                { 'black.playerId': existingUser._id },
            ],
        });

        if (activeGame) {
            return { status: 'in_game' as const, game: activeGame };
        }

        let ticket = await MatchTicketModel.findOne({
            ownerType: 'user',
            ownerId: existingUser._id,
            status: 'searching',
        });

        if (!ticket) {
            ticket = await MatchTicketModel.create({
                ownerType: 'user',
                ownerId: existingUser._id,
                elo: existingUser.elo,
            });
        }

        const eloRange = this.getEloRange(ticket.searchStartedAt);

        const opponentTicket = await MatchTicketModel.findOne({
            _id: { $ne: ticket._id },
            status: 'searching',
            elo: {
                $gte: existingUser.elo - eloRange,
                $lte: existingUser.elo + eloRange,
            },
        }).sort({ createdAt: 1 });

        if (!opponentTicket) {
            return { status: 'searching' as const, eloRange };
        }

        const firstPlayer = await getPlayerFromTicket(ticket);
        const secondPlayer = await getPlayerFromTicket(opponentTicket);

        if (!firstPlayer || !secondPlayer) {
            await MatchTicketModel.deleteMany({
                _id: { $in: [ticket._id, opponentTicket._id] },
            });
            return { status: 'searching' as const, eloRange };
        }

        const { firstSide, secondSide } = getRandomSides();

        const newGame = await GameModel.create({
            white: firstSide === 'white' ? firstPlayer : secondPlayer,
            black: secondSide === 'black' ? secondPlayer : firstPlayer,
            currentTurn: 'white',
            moves: [],
            pieces: initialPieces,
            lastMove: null,
            halfmoveClock: 0,
            fullmoveNumber: 1,
            positionHistory: [],
            status: 'active',
        });

        await MatchTicketModel.deleteMany({
            _id: { $in: [ticket._id, opponentTicket._id] },
        });

        if (firstPlayer.playerType === 'bot') await BotModel.findByIdAndUpdate(firstPlayer.playerId, { status: 'playing' });
        if (secondPlayer.playerType === 'bot') await BotModel.findByIdAndUpdate(secondPlayer.playerId, { status: 'playing' });

        return { status: 'matched' as const, game: newGame };
    }

    async cancelSearch(userID: string) {
        await MatchTicketModel.deleteOne({
            ownerType: 'user',
            ownerId: userID,
            status: 'searching',
        });
        return true;
    }

    async finishGame(
        userID: string,
        gameId: string,
        winner: string,
        finishedReason: string,
        moves: any[]
    ) {
        const existingGame = await GameModel.findById(gameId);
        if (!existingGame) throw new Error('GAME NOT FOUND');

        if (existingGame.status === 'finished') {
            const currentUser = await UserModel.findById(userID);
            return {
                game: existingGame,
                user: currentUser ? getSelfUserDTO(currentUser) : null
            };
        }

        if (winner !== 'white' && winner !== 'black' && winner !== 'draw' && winner !== null) throw new Error('INVALID WINNER TYPE');

        existingGame.status = 'finished';
        existingGame.winner = winner as 'white' | 'black' | 'draw' | null;
        existingGame.finishedReason = finishedReason;
        existingGame.moves = moves ?? [];
        await existingGame.save();

        const players = [existingGame.white, existingGame.black];
        for (const player of players) {
            if (player.playerType === 'bot') {
                await BotModel.findByIdAndUpdate(player.playerId, { status: 'idle' });
                botService.scheduleBotSearch(player.playerId.toString());
            }
        }

        if (winner === 'white' || winner === 'black') {
            const loser = winner === 'white' ? existingGame.black : existingGame.white;
            const winnerPlayer = winner === 'white' ? existingGame.white : existingGame.black;

            if (winnerPlayer.playerType === 'user') await UserModel.findByIdAndUpdate(winnerPlayer.playerId, { $inc: { elo: 24 } });
            if (loser.playerType === 'user') await UserModel.findByIdAndUpdate(loser.playerId, { $inc: { elo: -24 } });
            if (winnerPlayer.playerType === 'bot') await BotModel.findByIdAndUpdate(winnerPlayer.playerId, { $inc: { elo: 24 } });
            if (loser.playerType === 'bot') await BotModel.findByIdAndUpdate(loser.playerId, { $inc: { elo: -24 } });
        }

        const updatedUser = await UserModel.findById(userID);
        return {
            game: existingGame,
            user: updatedUser ? getSelfUserDTO(updatedUser) : null,
        };
    }

    async getGameById(id: string) {
        const existingGame = await GameModel.findById(id);
        if (!existingGame) throw new Error('GAME NOT FOUND');
        return existingGame;
    }

    async getActiveGame(userID: string) {
        return await GameModel.findOne({
            status: 'active',
            $or: [
                { 'white.playerId': userID },
                { 'black.playerId': userID },
            ],
        });
    }

    async saveGameState(state: any) {
        const { gameId, pieces, currentTurn, moves, lastMove, halfmoveClock, fullmoveNumber, positionHistory } = state;

        const existingGame = await GameModel.findByIdAndUpdate(
            gameId,
            { pieces, currentTurn, moves, lastMove, halfmoveClock, fullmoveNumber, positionHistory },
            { returnDocument: 'after' }
        );

        if (!existingGame) throw new Error('GAME NOT FOUND');
        return existingGame;
    }
}

export const gameService = new GameService();