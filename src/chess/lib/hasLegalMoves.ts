import type {PieceType, Side} from '../types/chess.types';
import { getPieceSide } from './getPiece';
import { getAvailableMoves } from './getAvailableMoves';

// Checks whether a side has at least one legal move.

export function hasLegalMoves(
    pieces: PieceType[],
    side: Side,
) {
    const sidePieces = pieces.filter(
        p => getPieceSide(p) === side,
    );

    return sidePieces.some(
        piece =>
            getAvailableMoves(piece, pieces).length > 0,
    );
}