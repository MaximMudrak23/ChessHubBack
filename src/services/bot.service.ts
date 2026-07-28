import { GameModel } from '../models/Game.model';
import { piecesToFen } from '../chess/lib/piecesToFen';
import { applyEngineMove } from '../chess/lib/applyStockfishMove';
import { applyMoveToGameState } from '../chess/applyMoveToGameState';
import { normalizePieces } from '../chess/lib/normalizePieces';
import { getIO } from '../socket/socket';
import { gameFinalizerService } from './gameFinalizer.service';
import { createEngine } from '../engines/EngineFactory';

class BotService {
    private processingGames = new Set<string>();

    async makeBotMove(gameId: string) {
        if (this.processingGames.has(gameId)) return null;

        this.processingGames.add(gameId);

        try {
            const game = await GameModel.findById(gameId);
            if (!game) throw new Error('GAME NOT FOUND');
            if (game.status !== 'active') return null;

            const activePlayer = game.currentTurn === 'white' ? game.white : game.black;
            if (activePlayer.playerType !== 'bot') return null;

            const version = game.__v;
            const turn = game.currentTurn;
            const pieces = normalizePieces(game.pieces);

            const fen = piecesToFen(
                pieces,
                game.currentTurn as any,
                game.halfmoveClock,
                game.fullmoveNumber,
                game.lastMove as any,
            );

            const engine = createEngine(activePlayer.engine ?? 'stockfish');

            const engineMove = await engine.getBestMove(fen, {
                skillLevel: activePlayer.skillLevel ?? 5,
            });

            const freshGame = await GameModel.findById(gameId);
            if (!freshGame) throw new Error('GAME NOT FOUND');
            if (freshGame.status !== 'active') return null;
            if (freshGame.__v !== version) return null;
            if (freshGame.currentTurn !== turn) return null;

            const freshActivePlayer = freshGame.currentTurn === 'white'
                ? freshGame.white
                : freshGame.black;

            if (freshActivePlayer.playerType !== 'bot') return null;

            const freshPieces = normalizePieces(freshGame.pieces);

            const parsedMove = applyEngineMove({
                move: engineMove,
                pieces: freshPieces,
            });

            if (!parsedMove) return null;

            const result = applyMoveToGameState({
                pieces: freshPieces,
                currentTurn: freshGame.currentTurn as any,
                moves: freshGame.moves as any,
                lastMove: freshGame.lastMove as any,
                halfmoveClock: freshGame.halfmoveClock,
                fullmoveNumber: freshGame.fullmoveNumber,
                positionHistory: freshGame.positionHistory,
                pieceID: parsedMove.pieceID,
                targetSquare: parsedMove.targetSquare,
                promotion: parsedMove.promotion,
            });

            if (!result) return null;

            const updateResult = await GameModel.updateOne(
                {
                    _id: freshGame._id,
                    __v: freshGame.__v,
                    status: 'active',
                    currentTurn: freshGame.currentTurn,
                },
                {
                    $set: {
                        pieces: result.pieces,
                        currentTurn: result.currentTurn,
                        moves: result.moves,
                        lastMove: result.lastMove,
                        halfmoveClock: result.halfmoveClock,
                        fullmoveNumber: result.fullmoveNumber,
                        positionHistory: result.positionHistory,
                    },
                    $inc: {
                        __v: 1,
                    },
                }
            );

            if (updateResult.modifiedCount !== 1) {
                return null;
            }

            const updatedGameDoc = await GameModel.findById(gameId);
            if (!updatedGameDoc) throw new Error('GAME NOT FOUND');

            if (result.gameStatus !== 'playing') {
                const winner =
                    result.gameStatus === 'checkmate'
                        ? result.currentTurn === 'white'
                            ? 'black'
                            : 'white'
                        : 'draw';

                await gameFinalizerService.finishGame({
                    game: updatedGameDoc,
                    winner,
                    finishedReason: result.gameStatus,
                });
            }

            const finalGameDoc = await GameModel.findById(gameId);
            if (!finalGameDoc) throw new Error('GAME NOT FOUND');

            const updatedGame = {
                ...finalGameDoc.toObject(),
                moveMeta: result.moveMeta,
            };

            getIO().to(gameId).emit('game:update', updatedGame);

            if (result.gameStatus === 'playing') {
                setTimeout(() => {
                    this.makeBotMove(gameId).catch(error => {
                        console.log('BOT NEXT MOVE ERROR:', error);
                    });
                }, 500);
            }

            return {
                game: updatedGame,
                gameStatus: result.gameStatus,
            };
        } finally {
            this.processingGames.delete(gameId);
        }
    }
}

export const botService = new BotService();