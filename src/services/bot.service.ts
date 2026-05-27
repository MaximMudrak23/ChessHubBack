import { BotModel } from '../models/Bot.model';
import { MatchTicketModel } from '../models/MatchTicket.model';

import { GameModel } from '../models/Game.model';
import { getStockfishMove } from '../stockfish-engine/stockfish';
import { piecesToFen } from '../chess/lib/piecesToFen';
import { applyStockfishMove } from '../chess/lib/applyStockfishMove';
import { applyMoveToGameState } from '../chess/applyMoveToGameState';
import { normalizePieces } from '../chess/lib/normalizePieces';

class BotService {
    private getRandomDelay() {
        return Math.floor(Math.random() * 10000) + 10000;
        // return Math.floor(Math.random() * 240000) + 60000;
    }

    async makeBotMove(gameId: string) {
        const game = await GameModel.findById(gameId);

        if (!game) {
            throw new Error('GAME NOT FOUND');
        }

        if (game.status !== 'active') {
            return null;
        }

        const activePlayer = game.currentTurn === 'white'
            ? game.white
            : game.black;

        if (activePlayer.playerType !== 'bot') {
            return null;
        }

        const pieces = normalizePieces(game.pieces);

        const fen = piecesToFen(
            pieces,
            game.currentTurn as any,
            game.halfmoveClock,
            game.fullmoveNumber,
            game.lastMove as any,
        );

        const stockfishMove = await getStockfishMove(
            fen,
            activePlayer.skillLevel ?? 5,
        );

        const parsedMove = applyStockfishMove({
            move: stockfishMove,
            pieces,
        });

        if (!parsedMove) return null;

        const result = applyMoveToGameState({
            pieces,
            currentTurn: game.currentTurn as any,
            moves: game.moves as any,
            lastMove: game.lastMove as any,
            halfmoveClock: game.halfmoveClock,
            fullmoveNumber: game.fullmoveNumber,
            positionHistory: game.positionHistory,
            pieceID: parsedMove.pieceID,
            targetSquare: parsedMove.targetSquare,
        });

        if (!result) return null;

        game.pieces = result.pieces as any;
        game.currentTurn = result.currentTurn;
        game.moves = result.moves as any;
        game.lastMove = result.lastMove as any;
        game.halfmoveClock = result.halfmoveClock;
        game.fullmoveNumber = result.fullmoveNumber;
        game.positionHistory = result.positionHistory;

        await game.save();

        return {
            game,
            gameStatus: result.gameStatus,
        };
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