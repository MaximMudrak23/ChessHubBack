import type { PieceType, Square } from '../../types/chess.types';
import { squareToCoords } from '../board';
import { isPathClear } from '../isPathClear';

// Validates bishop movement.
// Bishop can move only diagonally
// and cannot jump through pieces.

export function canMoveBishop(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
) {
    const from = squareToCoords(piece.square);
    const to = squareToCoords(targetSquare);

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    if (rowDiff !== colDiff) {
        return false;
    }

    return isPathClear(piece, pieces, targetSquare);
}