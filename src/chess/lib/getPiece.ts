import type { PieceType, Square } from '../types/chess.types';

export function getPieceSide(piece: PieceType) {
    return piece.piece[0] === 'w' ? 'white' : 'black';
}

export function getPieceById(pieces: PieceType[], pieceID: string) {
    return pieces.find(p => p.id === pieceID);
}

export function getPieceBySquare(pieces: PieceType[], square: Square) {
    return pieces.find(p => p.square === square);
}