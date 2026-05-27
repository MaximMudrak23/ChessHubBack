import type { PieceType, Square, LastMove} from '../types/chess.types';
import { boardSize, coordsToSquare } from './board';
import { canMovePiece } from './canMovePiece';
import { getPieceBySquare, getPieceSide } from './getPiece';
import { isMoveSafe } from './isMoveSafe';

// Returns all legal moves for a given piece.
// Used for:
// - move highlighting
// - checkmate/stalemate detection

export function getAvailableMoves(
    piece: PieceType,
    pieces: PieceType[],
    lastMove?: LastMove,
) {
    const moves: {
        square: Square;
        type: 'move' | 'capture';
    }[] = [];

    const pieceSide = getPieceSide(piece);

    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const square = coordsToSquare(row, col);

            if (
                !canMovePiece(
                    piece,
                    pieces,
                    square,
                    lastMove,
                )
            ) {
                continue;
            }

            if (
                !isMoveSafe(
                    piece,
                    pieces,
                    square,
                )
            ) {
                continue;
            }

            const targetPiece = getPieceBySquare(
                pieces,
                square,
            );

            if (!targetPiece) {
                const isEnPassant =
                    piece.piece[1] === 'p' &&
                    piece.square[0] !== square[0];

                moves.push({
                    square,
                    type: isEnPassant
                        ? 'capture'
                        : 'move',
                });

                continue;
            }

            if (
                getPieceSide(targetPiece) !== pieceSide
            ) {
                moves.push({
                    square,
                    type: 'capture',
                });
            }
        }
    }

    return moves;
}