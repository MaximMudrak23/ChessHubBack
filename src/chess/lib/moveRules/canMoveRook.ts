import type { PieceType, Square } from '../../types/chess.types';
import { squareToCoords } from '../board';
import { isPathClear } from '../isPathClear';

// Validates rook movement.
// Rook can move only horizontally or vertically
// and cannot jump through pieces.

export function canMoveRook(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
) {
    const from = squareToCoords(piece.square);
    const to = squareToCoords(targetSquare);

    if (from.row !== to.row && from.col !== to.col) {
        return false;
    }

    return isPathClear(piece, pieces, targetSquare);
}