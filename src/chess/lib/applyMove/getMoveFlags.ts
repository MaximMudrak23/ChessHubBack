import type {
    PieceType,
    Square,
} from '../../types/chess.types';

import { getPieceBySquare } from '../getPiece';

type Args = {
    piece: PieceType;
    pieces: PieceType[];
    targetSquare: Square;
};

// Detects special move conditions and move metadata.
// Used during move application.

export function getMoveFlags({
    piece,
    pieces,
    targetSquare,
}: Args) {
    const fromSquare = piece.square;

    const targetPiece = getPieceBySquare(
        pieces,
        targetSquare,
    );

    // en passant

    const isEnPassant =
        piece.piece[1] === 'p' &&
        !targetPiece &&
        fromSquare[0] !== targetSquare[0];

    const enPassantCapturedSquare = isEnPassant
        ? `${targetSquare[0]}${fromSquare[1]}` as Square
        : null;

    // capture

    const isCapture = Boolean(targetPiece);
    const isRealCapture = isCapture || isEnPassant;

    // pawn move

    const isPawnMove = piece.piece[1] === 'p';

    // castling

    const isCastling =
        piece.piece[1] === 'k' &&
        Math.abs(
            targetSquare.charCodeAt(0) -
            fromSquare.charCodeAt(0)
        ) === 2;

    return {
        targetPiece,
        isEnPassant,
        enPassantCapturedSquare,
        isCapture,
        isRealCapture,
        isPawnMove,
        isCastling,
    };
}