import type { PieceType, Square, Side } from '../types/chess.types'

// Converts current chess position into FEN notation.
// Used for Stockfish, repetition detection, game restore and position serialization.

const pieceMap: Record<string, string> = {
    wp: 'P',
    wr: 'R',
    wn: 'N',
    wb: 'B',
    wq: 'Q',
    wk: 'K',

    bp: 'p',
    br: 'r',
    bn: 'n',
    bb: 'b',
    bq: 'q',
    bk: 'k',
};

export function piecesToFen(
    pieces: PieceType[],
    currentTurn: Side,
    halfmoveClock: number,
    fullmoveNumber: number,
    lastMove?: { piece: string; from: Square; to: Square } | null,
) {
    const board: string[] = [];

    for (let rank = 8; rank >= 1; rank--) {
        let empty = 0;
        let row = '';

        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            const square = `${file}${rank}`;
            const piece = pieces.find(p => p.square === square);

            if (!piece) {
                empty++;
                continue;
            }

            if (empty > 0) {
                row += empty;
                empty = 0;
            }

            row += pieceMap[piece.piece];
        }

        if (empty > 0) {
            row += empty;
        }

        board.push(row);
    }

    let enPassantSquare = '-';

    if (lastMove?.piece[1] === 'p') {
        const fromRank = Number(lastMove.from[1]);
        const toRank = Number(lastMove.to[1]);

        const isDoublePawnMove = Math.abs(fromRank - toRank) === 2;

        if (isDoublePawnMove) {
            const file = lastMove.from[0];
            const middleRank = (fromRank + toRank) / 2;

            enPassantSquare = `${file}${middleRank}`;
        }
    }

    function getCastlingRights() {
        let rights = '';

        const whiteKing = pieces.find(p => p.piece === 'wk');
        const blackKing = pieces.find(p => p.piece === 'bk');

        const whiteKingSideRook = pieces.find(p => p.piece === 'wr' && p.square === 'h1');
        const whiteQueenSideRook = pieces.find(p => p.piece === 'wr' && p.square === 'a1');

        const blackKingSideRook = pieces.find(p => p.piece === 'br' && p.square === 'h8');
        const blackQueenSideRook = pieces.find(p => p.piece === 'br' && p.square === 'a8');

        if (whiteKing && !whiteKing.hasMoved) {
            if (whiteKingSideRook && !whiteKingSideRook.hasMoved) rights += 'K';
            if (whiteQueenSideRook && !whiteQueenSideRook.hasMoved) rights += 'Q';
        }

        if (blackKing && !blackKing.hasMoved) {
            if (blackKingSideRook && !blackKingSideRook.hasMoved) rights += 'k';
            if (blackQueenSideRook && !blackQueenSideRook.hasMoved) rights += 'q';
        }

        return rights || '-';
    }

    const castlingRights = getCastlingRights();

    return `${board.join('/')} ${currentTurn === 'white' ? 'w' : 'b'} ${castlingRights} ${enPassantSquare} ${halfmoveClock} ${fullmoveNumber}`;
}