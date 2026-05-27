import type { PieceType } from '../types/chess.types';

// Converts mongoose piece subdocuments into plain chess engine objects.

export function normalizePieces(pieces: any[]): PieceType[] {
    return pieces.map((p: any) => ({
        id: p.id,
        piece: p.piece,
        square: p.square,
        hasMoved: p.hasMoved,
    }));
}