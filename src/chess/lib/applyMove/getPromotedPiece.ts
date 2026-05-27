import type {
    PieceCode,
    PieceType,
    Square,
} from '../../types/chess.types';

import { getPieceSide } from '../getPiece';

// Returns promoted piece code.
// Current version always promotes pawn to queen.

export function getPromotedPiece(
    piece: PieceType,
    targetSquare: Square,
): PieceCode | null {
    if (piece.piece[1] !== 'p') {
        return null;
    }

    const side = getPieceSide(piece);

    if (side === 'white' && targetSquare[1] === '8') {
        return 'wq';
    }

    if (side === 'black' && targetSquare[1] === '1') {
        return 'bq';
    }

    return null;
}