import type { PieceType, Side } from '../types/chess.types';
import { getPieceSide } from './getPiece';
import { canMovePiece } from './canMovePiece';

// Checks whether the king of a given side
// is currently under attack.

export function isKingInCheck(
    pieces: PieceType[],
    side: Side,
) {
    const king = pieces.find(
        p => p.piece === (side === 'white' ? 'wk' : 'bk'),
    );

    if (!king) return false;

    const enemyPieces = pieces.filter(
        p => getPieceSide(p) !== side,
    );

    return enemyPieces.some(enemy =>
        canMovePiece(enemy, pieces, king.square),
    );
}