import type {PieceType, Square, LastMove, Side, GameStatus} from './types/chess.types';
import { canMovePiece } from './lib/canMovePiece';
import { isMoveSafe } from './lib/isMoveSafe';
import { getPieceById, getPieceSide } from './lib/getPiece';

import { getMoveFlags } from './lib/applyMove/getMoveFlags';
import { getPromotedPiece } from './lib/applyMove/getPromotedPiece';
import { getNextPieces } from './lib/applyMove/getNextPieces';
import { updateMoveCounters } from './lib/applyMove/updateMoveCounters';
import { addMoveToHistory } from './lib/applyMove/addMoveToHistory';
import { addPositionToHistory } from './lib/applyMove/addPositionToHistory';
import { getGameStatus } from './lib/applyMove/getGameStatus';
import { createMoveLabel } from './lib/createMoveLabel';
import { isKingInCheck } from './lib/isKingInCheck';
import { hasLegalMoves } from './lib/hasLegalMoves';

// Main chess engine state updater.
// Applies a move to the current game state,
// validates legality and returns updated state.

type Move = {
    whiteMove: string;
    blackMove?: string;
};

type ApplyMoveInput = {
    pieces: PieceType[];
    currentTurn: Side;
    moves: Move[];
    lastMove: LastMove;
    halfmoveClock: number;
    fullmoveNumber: number;
    positionHistory: string[];
    pieceID: string;
    targetSquare: Square;
};

type ApplyMoveResult = {
    pieces: PieceType[];
    currentTurn: Side;
    moves: Move[];
    lastMove: LastMove;
    halfmoveClock: number;
    fullmoveNumber: number;
    positionHistory: string[];
    gameStatus: GameStatus;
    moveMeta: {
        isCapture: boolean;
        isCastling: boolean;
        isPromotion: boolean;
        isCheck: boolean;
        isCheckmate: boolean;
    };
};

export function applyMoveToGameState(input: ApplyMoveInput): ApplyMoveResult | null {
    const {
        pieces,
        currentTurn,
        moves,
        lastMove,
        halfmoveClock,
        fullmoveNumber,
        positionHistory,
        pieceID,
        targetSquare,
    } = input;

    const selectedPiece = getPieceById(pieces, pieceID);

    if (!selectedPiece) {
        return null;
    }

    if (getPieceSide(selectedPiece) !== currentTurn) {
        return null;
    }

    if (!canMovePiece(selectedPiece, pieces, targetSquare, lastMove)) {
        return null;
    }

    if (!isMoveSafe(selectedPiece, pieces, targetSquare)) {
        return null;
    }

    const nextTurn = currentTurn === 'white' ? 'black' : 'white';

    const flags = getMoveFlags({
        piece: selectedPiece,
        pieces,
        targetSquare,
    });

    const promotedPiece = getPromotedPiece(selectedPiece, targetSquare);

    const nextPieces = getNextPieces({
        pieces,
        movingPieceID: selectedPiece.id,
        targetPieceID: flags.targetPiece?.id,
        targetSquare,
        enPassantCapturedSquare: flags.enPassantCapturedSquare,
        promotedPiece,
        isCastling: flags.isCastling,
    });

    const givesCheck = isKingInCheck(nextPieces, nextTurn);
    const isMate = givesCheck && !hasLegalMoves(nextPieces, nextTurn);

    const moveLabel = createMoveLabel({
        piece: selectedPiece,
        pieces,
        targetSquare,
        isCapture: flags.isRealCapture,
        isCastling: flags.isCastling,
        promotedPiece,
        isCheck: givesCheck,
        isCheckmate: isMate,
    });

    const counters = updateMoveCounters({
        currentTurn,
        halfmoveClock,
        fullmoveNumber,
        isPawnMove: flags.isPawnMove,
        isRealCapture: flags.isRealCapture,
    });

    const nextLastMove = {
        piece: selectedPiece.piece,
        from: selectedPiece.square,
        to: targetSquare,
    };

    const nextPositionHistory = addPositionToHistory({
        pieces: nextPieces,
        nextTurn,
        halfmoveClock: counters.halfmoveClock,
        fullmoveNumber: counters.fullmoveNumber,
        lastMove: nextLastMove,
        positionHistory,
    });

    const nextGameStatus = getGameStatus({
        pieces: nextPieces,
        currentTurn: nextTurn,
        halfmoveClock: counters.halfmoveClock,
        positionHistory: nextPositionHistory,
    });

    return {
        pieces: nextPieces,
        currentTurn: nextTurn,
        moves: addMoveToHistory({
            moves,
            currentTurn,
            moveLabel,
        }),
        lastMove: nextLastMove,
        halfmoveClock: counters.halfmoveClock,
        fullmoveNumber: counters.fullmoveNumber,
        positionHistory: nextPositionHistory,
        gameStatus: nextGameStatus,
        moveMeta: {
            isCapture: flags.isRealCapture,
            isCastling: flags.isCastling,
            isPromotion: Boolean(promotedPiece),
            isCheck: givesCheck,
            isCheckmate: isMate,
        },
    };
}