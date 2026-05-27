import type { PieceType, Square } from '../../types/chess.types';
import { squareToCoords } from '../board';

// Validates knight movement.
// Knight moves in an L-shape and can jump over pieces.

export function canMoveKnight(
    piece: PieceType,
    targetSquare: Square,
) {
    const from = squareToCoords(piece.square);
    const to = squareToCoords(targetSquare);

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    return (
        (rowDiff === 2 && colDiff === 1) ||
        (rowDiff === 1 && colDiff === 2)
    );
}