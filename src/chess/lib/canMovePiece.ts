import type {
    PieceType,
    Square,
    LastMove,
} from '../types/chess.types';
import { getPieceSide } from './getPiece';

import { canMovePawn } from './moveRules/canMovePawn';
import { canMoveRook } from './moveRules/canMoveRook';
import { canMoveKnight } from './moveRules/canMoveKnight';
import { canMoveBishop } from './moveRules/canMoveBishop';
import { canMoveQueen } from './moveRules/canMoveQueen';
import { canMoveKing } from './moveRules/canMoveKing';

// Main chess move validator.
// Delegates validation to a specific piece rule.

export function canMovePiece(
    piece: PieceType,
    pieces: PieceType[],
    targetSquare: Square,
    lastMove?: LastMove,
) {
    if (piece.square === targetSquare) {
        return false;
    }

    const targetPiece = pieces.find(p => p.square === targetSquare);

    if (targetPiece && getPieceSide(targetPiece) === getPieceSide(piece)) {
        return false;
    }

    const pieceName = piece.piece[1];

    if (pieceName === 'p') {
        return canMovePawn(
            piece,
            pieces,
            targetSquare,
            lastMove,
        );
    }

    if (pieceName === 'r') {
        return canMoveRook(
            piece,
            pieces,
            targetSquare,
        );
    }

    if (pieceName === 'n') {
        return canMoveKnight(
            piece,
            targetSquare,
        );
    }

    if (pieceName === 'b') {
        return canMoveBishop(
            piece,
            pieces,
            targetSquare,
        );
    }

    if (pieceName === 'q') {
        return canMoveQueen(
            piece,
            pieces,
            targetSquare,
        );
    }

    if (pieceName === 'k') {
        return canMoveKing(
            piece,
            pieces,
            targetSquare,
        );
    }

    return false;
}