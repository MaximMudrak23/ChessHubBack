import { UserModel } from "../models/User.model";
import { GameModel } from "../models/Game.model";
import { BotModel } from "../models/Bot.model";
import { MatchTicketModel } from "../models/MatchTicket.model";
import { botService } from "./bot.service";
import { initialPieces } from "../chess/initialPieces";
import { getRandomSides } from "../utils/getRandomSides";
import { getPlayerFromTicket } from "../utils/getPlayerFromTicket";
import { getSelfUserDTO } from "../dtos/user.dto";
import { applyMoveToGameState } from "../chess/applyMoveToGameState";
import type { Square } from "../chess/types/chess.types";
import { normalizePieces } from "../chess/lib/normalizePieces";
import { getIO } from "../socket/socket";
import { getGameStatus } from "../chess/lib/applyMove/getGameStatus";
import { gameFinalizerService } from "./gameFinalizer.service";

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

        this.tryRunBotTurn(newGame._id.toString());

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

        if (winner !== 'white' && winner !== 'black' && winner !== 'draw' && winner !== null) {
            throw new Error('INVALID WINNER TYPE');
        }

        await gameFinalizerService.finishGame({
            game: existingGame,
            winner: winner as 'white' | 'black' | 'draw' | null,
            finishedReason,
            moves: moves ?? [],
        });

        getIO().to(existingGame._id.toString()).emit('game:update', existingGame);

        const updatedUser = await UserModel.findById(userID);

        return {
            game: existingGame,
            user: updatedUser ? getSelfUserDTO(updatedUser) : null,
        };
    }

    async getGameById(id: string) {
        const existingGame = await GameModel.findById(id);
        if (!existingGame) throw new Error('GAME NOT FOUND');

        if (existingGame.status === 'active') {
            const gameStatus = getGameStatus({
                pieces: normalizePieces(existingGame.pieces),
                currentTurn: existingGame.currentTurn as any,
                halfmoveClock: existingGame.halfmoveClock,
                positionHistory: existingGame.positionHistory,
            });

            if (gameStatus !== 'playing') {
                const winner =
                    gameStatus === 'checkmate'
                        ? existingGame.currentTurn === 'white'
                            ? 'black'
                            : 'white'
                        : 'draw';

                await gameFinalizerService.finishGame({
                    game: existingGame,
                    winner,
                    finishedReason: gameStatus,
                });

                getIO().to(existingGame._id.toString()).emit('game:update', existingGame);

                return existingGame;
            }

            this.tryRunBotTurn(existingGame._id.toString());
        }

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

    async makeMove(gameId: string, pieceID: string, targetSquare: Square) {
        const existingGame = await GameModel.findById(gameId);
        if (!existingGame) throw new Error('GAME NOT FOUND');
        if (existingGame.status !== 'active') throw new Error('GAME NOT ACTIVE');

        const pieces = normalizePieces(existingGame.pieces);

        const result = applyMoveToGameState({
            pieces,
            currentTurn: existingGame.currentTurn as any,
            moves: existingGame.moves as any,
            lastMove: existingGame.lastMove as any,
            halfmoveClock: existingGame.halfmoveClock,
            fullmoveNumber: existingGame.fullmoveNumber,
            positionHistory: existingGame.positionHistory,
            pieceID,
            targetSquare,
        });

        if (!result) throw new Error('ILLEGAL MOVE');

        existingGame.pieces = result.pieces as any;
        existingGame.currentTurn = result.currentTurn;
        existingGame.moves = result.moves as any;
        existingGame.lastMove = result.lastMove as any;
        existingGame.halfmoveClock = result.halfmoveClock;
        existingGame.fullmoveNumber = result.fullmoveNumber;
        existingGame.positionHistory = result.positionHistory;

        if (result.gameStatus !== 'playing') {
            const winner =
                result.gameStatus === 'checkmate'
                    ? result.currentTurn === 'white'
                        ? 'black'
                        : 'white'
                    : 'draw';

            await gameFinalizerService.finishGame({
                game: existingGame,
                winner,
                finishedReason: result.gameStatus,
            });
        } else {
            await existingGame.save();
        }

        getIO().to(existingGame._id.toString()).emit('game:update', {
            ...existingGame.toObject(),
            moveMeta: result.moveMeta,
        });

        if (result.gameStatus === 'playing') {
            this.tryRunBotTurn(existingGame._id.toString());
        }

        return {
            game: {
                ...existingGame.toObject(),
                moveMeta: result.moveMeta,
            },
            gameStatus: result.gameStatus,
        };
    }

    async tryRunBotTurn(gameId: string) {
        const existingGame = await GameModel.findById(gameId);
        if (!existingGame) return null;
        if (existingGame.status !== 'active') return null;

        const activePlayer = existingGame.currentTurn === 'white'
            ? existingGame.white
            : existingGame.black;

        if (activePlayer.playerType !== 'bot') return null;

        setTimeout(() => {
            botService.makeBotMove(gameId).catch(error => {
                console.log('TRY RUN BOT TURN ERROR:', error);
            });
        }, 500);

        return true;
    }

    async findGameForBot(botID: string) {
        const bot = await BotModel.findById(botID);
        if (!bot) return null;
        if (bot.status !== 'searching') return null;

        const ticket = await MatchTicketModel.findOne({
            ownerType: 'bot',
            ownerId: bot._id,
            status: 'searching',
        });

        if (!ticket) return null;

        const eloRange = this.getEloRange(ticket.searchStartedAt);

        const opponentTicket = await MatchTicketModel.findOne({
            _id: { $ne: ticket._id },
            status: 'searching',
            elo: {
                $gte: bot.elo - eloRange,
                $lte: bot.elo + eloRange,
            },
        }).sort({ createdAt: 1 });

        if (!opponentTicket) return null;

        const firstPlayer = await getPlayerFromTicket(ticket);
        const secondPlayer = await getPlayerFromTicket(opponentTicket);

        if (!firstPlayer || !secondPlayer) {
            await MatchTicketModel.deleteMany({
                _id: { $in: [ticket._id, opponentTicket._id] },
            });
            return null;
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

        if (firstPlayer.playerType === 'bot') {
            await BotModel.findByIdAndUpdate(firstPlayer.playerId, { status: 'playing' });
        }

        if (secondPlayer.playerType === 'bot') {
            await BotModel.findByIdAndUpdate(secondPlayer.playerId, { status: 'playing' });
        }

        this.tryRunBotTurn(newGame._id.toString());

        return newGame;
    }
}

export const gameService = new GameService();