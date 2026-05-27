import type { PieceType, Square } from '../types/chess.types';
import { getPieceSide } from './getPiece';
import { isKingInCheck } from './isKingInCheck';

// Checks whether a move leaves own king safe.
// Used to reject moves that expose own king to check.

export function isMoveSafe(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
) {
    const side = getPieceSide(piece);

    const nextPieces = pieces
        .filter(p => p.square !== targetSquare)
        .map(p =>
            p.id === piece.id
                ? { ...p, square: targetSquare }
                : p,
        );

    return !isKingInCheck(nextPieces, side);
}