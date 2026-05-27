import type {
    PieceCode,
    PieceType,
    Square,
} from '../../types/chess.types';

type Args = {
    pieces: PieceType[];
    movingPieceID: string;
    targetPieceID?: string;
    targetSquare: Square;
    enPassantCapturedSquare: Square | null;
    promotedPiece: PieceCode | null;
    isCastling: boolean;
};

// Builds next pieces array after a legal move.
// Handles:
// - normal move
// - capture
// - en passant capture
// - promotion
// - castling rook movement

export function getNextPieces({
    pieces,
    movingPieceID,
    targetPieceID,
    targetSquare,
    enPassantCapturedSquare,
    promotedPiece,
    isCastling,
}: Args) {
    return pieces
        .filter(p => p.id !== targetPieceID)
        .filter(p => p.square !== enPassantCapturedSquare)
        .map(p => {
            if (p.id === movingPieceID) {
                return {
                    ...p,
                    square: targetSquare,
                    piece: promotedPiece ?? p.piece,
                    hasMoved: true,
                };
            }

            if (isCastling) {
                if (targetSquare === 'g1' && p.square === 'h1') {
                    return { ...p, square: 'f1' as Square, hasMoved: true };
                }

                if (targetSquare === 'g8' && p.square === 'h8') {
                    return { ...p, square: 'f8' as Square, hasMoved: true };
                }

                if (targetSquare === 'c1' && p.square === 'a1') {
                    return { ...p, square: 'd1' as Square, hasMoved: true };
                }

                if (targetSquare === 'c8' && p.square === 'a8') {
                    return { ...p, square: 'd8' as Square, hasMoved: true };
                }
            }

            return p;
        });
}