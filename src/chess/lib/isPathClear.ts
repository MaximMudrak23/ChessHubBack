import type { PieceType, Square } from '../types/chess.types';
import { squareToCoords, coordsToSquare } from './board';
import { getPieceBySquare } from './getPiece';

// Checks whether all squares between source and target are empty.
// Used by sliding pieces like rook, bishop and queen.

export function isPathClear(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
) {
    const from = squareToCoords(piece.square);
    const to = squareToCoords(targetSquare);

    const rowStep = Math.sign(to.row - from.row);
    const colStep = Math.sign(to.col - from.col);

    let row = from.row + rowStep;
    let col = from.col + colStep;

    while (row !== to.row || col !== to.col) {
        const square = coordsToSquare(row, col);

        if (getPieceBySquare(pieces, square)) {
            return false;
        }

        row += rowStep;
        col += colStep;
    }

    return true;
}