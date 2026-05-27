import type { PieceType, Square, PieceCode } from '../types/chess.types';
import { getPieceSide } from './getPiece';
import { canMovePiece } from './canMovePiece';
import { isMoveSafe } from './isMoveSafe';

// Creates SAN-like move label for move history and future PGN export.

const pieceLabels = {
    p: '',
    r: 'R',
    n: 'N',
    b: 'B',
    q: 'Q',
    k: 'K',
};

type Args = {
    piece: PieceType;
    pieces: PieceType[];
    targetSquare: Square;
    isCapture: boolean;
    isCastling: boolean;
    promotedPiece: PieceCode | null;
    isCheck: boolean;
    isCheckmate: boolean;
};

export function createMoveLabel({
    piece,
    pieces,
    targetSquare,
    isCapture,
    isCastling,
    promotedPiece,
    isCheck,
    isCheckmate,
}: Args) {
    if (isCastling) {
        return targetSquare[0] === 'g' ? 'O-O' : 'O-O-O';
    }

    const pieceName = piece.piece[1] as keyof typeof pieceLabels;
    const pieceLabel = pieceLabels[pieceName];

    const fromFile = piece.square[0];

    const samePieces = pieceName === 'p'
        ? []
        : pieces.filter(p =>
            p.id !== piece.id &&
            p.piece === piece.piece &&
            getPieceSide(p) === getPieceSide(piece) &&
            canMovePiece(p, pieces, targetSquare) &&
            isMoveSafe(p, pieces, targetSquare)
        );

    const needFromFile =
        pieceName !== 'p' &&
        samePieces.some(p => p.square[0] !== fromFile);

    const needFromRank =
        pieceName !== 'p' &&
        samePieces.some(p => p.square[1] !== piece.square[1]);

    const disambiguation =
        pieceName === 'p'
            ? isCapture ? fromFile : ''
            : samePieces.length
                ? `${needFromFile ? fromFile : ''}${needFromRank ? piece.square[1] : ''}`
                : '';

    const promotion = promotedPiece
        ? `=${promotedPiece[1].toUpperCase()}`
        : '';

    const ending = isCheckmate
        ? '#'
        : isCheck
            ? '+'
            : '';

    return `${pieceLabel}${disambiguation}${isCapture ? 'x' : ''}${targetSquare}${promotion}${ending}`;
}