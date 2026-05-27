import type { Side } from '../../types/chess.types';

type Args = {
    currentTurn: Side;
    halfmoveClock: number;
    fullmoveNumber: number;
    isPawnMove: boolean;
    isRealCapture: boolean;
};

// Updates chess move counters.
// halfmoveClock resets after pawn move or capture.
// fullmoveNumber increases after black move.

export function updateMoveCounters({
    currentTurn,
    halfmoveClock,
    fullmoveNumber,
    isPawnMove,
    isRealCapture,
}: Args) {
    return {
        halfmoveClock:
            isPawnMove || isRealCapture
                ? 0
                : halfmoveClock + 1,

        fullmoveNumber:
            currentTurn === 'black'
                ? fullmoveNumber + 1
                : fullmoveNumber,
    };
}