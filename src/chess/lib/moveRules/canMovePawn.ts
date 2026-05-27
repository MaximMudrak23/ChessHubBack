import type { PieceType, Square, LastMove } from '../../types/chess.types';
import { squareToCoords, coordsToSquare } from '../board';
import { getPieceBySquare, getPieceSide } from '../getPiece';

// Validates pawn movement.
// Handles:
// - normal move
// - double step
// - capture
// - en passant

export function canMovePawn(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
    lastMove?: LastMove,
) {
    const from = squareToCoords(piece.square);
    const to = squareToCoords(targetSquare);

    const side = getPieceSide(piece);

    const direction = side === 'white' ? -1 : 1;
    const startRow = side === 'white' ? 6 : 1;

    const rowDiff = to.row - from.row;
    const colDiff = Math.abs(to.col - from.col);

    const targetPiece = getPieceBySquare(pieces, targetSquare);

    // normal move:

    if (
        colDiff === 0 &&
        rowDiff === direction &&
        !targetPiece
    ) {
        return true;
    }

    // double step:

    if (
        colDiff === 0 &&
        from.row === startRow &&
        rowDiff === direction * 2 &&
        !targetPiece
    ) {
        const middleRow = from.row + direction;
        const middleSquare = coordsToSquare(middleRow, from.col);

        if (getPieceBySquare(pieces, middleSquare)) {
            return false;
        }

        return true;
    }

    // captures:
    // normal capture

    if (
        colDiff === 1 &&
        rowDiff === direction &&
        targetPiece
    ) {
        return true;
    }

    // en passant

    if (
        colDiff === 1 &&
        rowDiff === direction &&
        !targetPiece &&
        lastMove?.piece[1] === 'p'
    ) {
        const lastFrom = squareToCoords(lastMove.from);
        const lastTo = squareToCoords(lastMove.to);

        const lastMoveWasDoubleStep =
            Math.abs(lastTo.row - lastFrom.row) === 2;

        const lastPawnIsNextToCurrentPawn =
            lastMove.to[0] === targetSquare[0];

        const lastPawnIsOnSameRow =
            lastTo.row === from.row;

        if (
            lastMoveWasDoubleStep &&
            lastPawnIsNextToCurrentPawn &&
            lastPawnIsOnSameRow
        ) {
            return true;
        }
    }

    return false;
}