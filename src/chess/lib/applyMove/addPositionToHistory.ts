import type {
    LastMove,
    PieceType,
    Side,
} from '../../types/chess.types';

import { piecesToFen } from '../piecesToFen';

type Args = {
    pieces: PieceType[];
    nextTurn: Side;
    halfmoveClock: number;
    fullmoveNumber: number;
    lastMove: LastMove;
    positionHistory: string[];
};

// Adds normalized position key to history.
// Uses first 4 FEN fields because move counters
// do not matter for threefold repetition.

export function addPositionToHistory({
    pieces,
    nextTurn,
    halfmoveClock,
    fullmoveNumber,
    lastMove,
    positionHistory,
}: Args) {
    const nextFen = piecesToFen(
        pieces,
        nextTurn,
        halfmoveClock,
        fullmoveNumber,
        lastMove,
    );

    const positionKey = nextFen
        .split(' ')
        .slice(0, 4)
        .join(' ');

    return [
        ...positionHistory,
        positionKey,
    ];
}