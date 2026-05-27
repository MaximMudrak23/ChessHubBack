import type { PieceType, Square } from '../../types/chess.types';
import { squareToCoords } from '../board';
import { getPieceSide } from '../getPiece';
import {
    canCastleKingSide,
    canCastleQueenSide,
} from './canCastle';

// Validates king movement.
// Handles:
// - normal king move
// - castling

export function canMoveKing(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
) {
    const from = squareToCoords(piece.square);
    const to = squareToCoords(targetSquare);

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    if (rowDiff <= 1 && colDiff <= 1) {
        return true;
    }

    const side = getPieceSide(piece);

    if (rowDiff === 0 && colDiff === 2) {
        if (targetSquare === (side === 'white' ? 'g1' : 'g8')) {
            return canCastleKingSide(pieces, side);
        }

        if (targetSquare === (side === 'white' ? 'c1' : 'c8')) {
            return canCastleQueenSide(pieces, side);
        }
    }

    return false;
}