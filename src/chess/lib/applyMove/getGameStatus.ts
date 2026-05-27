import type {GameStatus, PieceType, Side} from '../../types/chess.types';
import { hasInsufficientMaterial } from '../hasInsufficientMaterial';
import { hasLegalMoves } from '../hasLegalMoves';
import { isKingInCheck } from '../isKingInCheck';

type Args = {
    pieces: PieceType[];
    currentTurn: Side;
    halfmoveClock: number;
    positionHistory: string[];
};

// Calculates current game status after move.

export function getGameStatus({
    pieces,
    currentTurn,
    halfmoveClock,
    positionHistory,
}: Args): GameStatus {
    const isCheck = isKingInCheck(pieces, currentTurn);
    const hasMoves = hasLegalMoves(pieces, currentTurn);

    const currentPositionKey =
        positionHistory[positionHistory.length - 1];

    const currentPositionCount = positionHistory.filter(
        key => key === currentPositionKey,
    ).length;

    if (hasInsufficientMaterial(pieces)) {
        return 'insufficient-material-draw';
    }

    if (currentPositionCount >= 3) {
        return 'threefold-repetition-draw';
    }

    if (halfmoveClock >= 100) {
        return 'fifty-move-draw';
    }

    if (isCheck && !hasMoves) {
        return 'checkmate';
    }

    if (!isCheck && !hasMoves) {
        return 'stalemate';
    }

    return 'playing';
}