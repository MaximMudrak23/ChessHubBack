import type { PieceType, Square, Side } from '../../types/chess.types';
import { isKingInCheck } from '../isKingInCheck';

function areSquaresEmpty(
    pieces: PieceType[],
    squares: Square[],
) {
    return squares.every(
        square => !pieces.some(p => p.square === square),
    );
}

function isKingPathSafe(
    pieces: PieceType[],
    king: PieceType,
    side: Side,
    squares: Square[],
) {
    return squares.every(square => {
        const fakePieces = pieces.map(p =>
            p.id === king.id
                ? { ...p, square }
                : p,
        );

        return !isKingInCheck(fakePieces, side);
    });
}

// Validates king-side castling rules.

export function canCastleKingSide(
    pieces: PieceType[],
    side: Side,
) {
    const king = pieces.find(
        p => p.piece === (side === 'white' ? 'wk' : 'bk'),
    );

    if (!king || king.hasMoved) {
        return false;
    }

    const rookSquare: Square =
        side === 'white' ? 'h1' : 'h8';

    const rook = pieces.find(
        p => p.square === rookSquare,
    );

    if (!rook || rook.hasMoved) {
        return false;
    }

    if (isKingInCheck(pieces, side)) {
        return false;
    }

    const betweenSquares: Square[] =
        side === 'white'
            ? ['f1', 'g1']
            : ['f8', 'g8'];

    if (!areSquaresEmpty(pieces, betweenSquares)) {
        return false;
    }

    if (!isKingPathSafe(pieces, king, side, betweenSquares)) {
        return false;
    }

    return true;
}

// Validates queen-side castling rules.

export function canCastleQueenSide(
    pieces: PieceType[],
    side: Side,
) {
    const king = pieces.find(
        p => p.piece === (side === 'white' ? 'wk' : 'bk'),
    );

    if (!king || king.hasMoved) {
        return false;
    }

    const rookSquare: Square =
        side === 'white' ? 'a1' : 'a8';

    const rook = pieces.find(
        p => p.square === rookSquare,
    );

    if (!rook || rook.hasMoved) {
        return false;
    }

    if (isKingInCheck(pieces, side)) {
        return false;
    }

    const betweenSquares: Square[] =
        side === 'white'
            ? ['b1', 'c1', 'd1']
            : ['b8', 'c8', 'd8'];

    if (!areSquaresEmpty(pieces, betweenSquares)) {
        return false;
    }

    const passSquares: Square[] =
        side === 'white'
            ? ['d1', 'c1']
            : ['d8', 'c8'];

    if (!isKingPathSafe(pieces, king, side, passSquares)) {
        return false;
    }

    return true;
}