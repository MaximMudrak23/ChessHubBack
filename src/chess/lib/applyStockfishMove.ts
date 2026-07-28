import type {
    PieceType,
    PromotionPiece,
    Square,
} from '../types/chess.types';

// Converts Stockfish move notation (e.g. "e2e4")
// into internal move data used by the chess engine.
// Finds the piece on the source square and returns:
// {
//     pieceID,
//     targetSquare
// }

type Props = {
    move: string;
    pieces: PieceType[];
};

export function applyEngineMove({ move, pieces }: Props) {
    const from = move.slice(0, 2) as Square;
    const to = move.slice(2, 4) as Square;

    const piece = pieces.find(p => p.square === from);

    if (!piece) {
        return null;
    }

    const promotionChar = move[4];

    const promotion = ['q', 'r', 'b', 'n'].includes(promotionChar)
        ? promotionChar as PromotionPiece
        : undefined;

    return {
        pieceID: piece.id,
        targetSquare: to,
        promotion,
    };
}