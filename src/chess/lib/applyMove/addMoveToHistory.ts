import type { Side } from '../../types/chess.types';

type Move = {
    whiteMove: string;
    blackMove?: string;
};

type Args = {
    moves: Move[];
    currentTurn: Side;
    moveLabel: string;
};

// Adds move label to move history.
// White creates a new move row.
// Black completes the latest move row.

export function addMoveToHistory({
    moves,
    currentTurn,
    moveLabel,
}: Args) {
    if (currentTurn === 'white') {
        return [
            ...moves,
            { whiteMove: moveLabel },
        ];
    }

    if (moves.length === 0) {
        return [
            { whiteMove: '', blackMove: moveLabel },
        ];
    }

    return moves.map((move, index) =>
        index === moves.length - 1
            ? { ...move, blackMove: moveLabel }
            : move,
    );
}