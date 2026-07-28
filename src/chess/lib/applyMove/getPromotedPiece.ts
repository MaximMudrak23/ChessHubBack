import type {
    PieceCode,
    PieceType,
    PromotionPiece,
    Square,
} from '../../types/chess.types';

import { getPieceSide } from '../getPiece';

// Returns promoted piece code.
// Current version always promotes pawn to queen.

export function getPromotedPiece(
    piece: PieceType,
    targetSquare: Square,
    promotion?: PromotionPiece,
): PieceCode | null {
    if (piece.piece[1] !== 'p' || !promotion) {
        return null;
    }

    const side = getPieceSide(piece);

    const isPromotionSquare =
        (side === 'white' && targetSquare[1] === '8') ||
        (side === 'black' && targetSquare[1] === '1');

    if (!isPromotionSquare) {
        return null;
    }

    const color = side === 'white' ? 'w' : 'b';

    return `${color}${promotion}` as PieceCode;
}