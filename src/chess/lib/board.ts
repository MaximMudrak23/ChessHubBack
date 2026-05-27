import type { File, Square } from '../types/chess.types';

export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const boardSize = files.length;

export function squareToCoords(square: Square) {
    const file = square[0] as File;
    const rank = Number(square[1]);

    return {
        col: files.indexOf(file),
        row: boardSize - rank,
    };
}

export function coordsToSquare(row: number, col: number): Square {
    const file = files[col];
    const rank = boardSize - row;

    return `${file}${rank}` as Square;
}