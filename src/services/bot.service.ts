import { GameModel } from '../models/Game.model';
import { getStockfishMove } from '../stockfish-engine/stockfish';
import { piecesToFen } from '../chess/lib/piecesToFen';
import { applyStockfishMove } from '../chess/lib/applyStockfishMove';
import { applyMoveToGameState } from '../chess/applyMoveToGameState';
import { normalizePieces } from '../chess/lib/normalizePieces';
import { getIO } from '../socket/socket';
import { gameFinalizerService } from './gameFinalizer.service';

class BotService {
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

        if (result.gameStatus !== 'playing') {
            const winner =
                result.gameStatus === 'checkmate'
                    ? result.currentTurn === 'white'
                        ? 'black'
                        : 'white'
                    : 'draw';

            await gameFinalizerService.finishGame({
                game,
                winner,
                finishedReason: result.gameStatus,
            });
        } else {
            await game.save();
        }

        getIO().to(game._id.toString()).emit('game:update', {
            ...game.toObject(),
            moveMeta: result.moveMeta,
        });

        if (result.gameStatus === 'playing') {
            setTimeout(() => {
                this.makeBotMove(gameId).catch(error => {
                    console.log('BOT NEXT MOVE ERROR:', error);
                });
            }, 500);
        }

        return {
            game: {
                ...game.toObject(),
                moveMeta: result.moveMeta,
            },
            gameStatus: result.gameStatus,
        };
    }
}

export const botService = new BotService();