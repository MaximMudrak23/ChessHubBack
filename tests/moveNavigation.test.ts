import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMoveToGameState } from '../src/chess/applyMoveToGameState';
import { initialPieces } from '../src/chess/initialPieces';
import type { PieceType, PromotionPiece, Square } from '../src/chess/types/chess.types';

type State = Parameters<typeof applyMoveToGameState>[0];

function initialState(pieces = structuredClone(initialPieces)): State {
    return {
        pieces,
        currentTurn: 'white',
        moves: [],
        lastMove: null,
        halfmoveClock: 0,
        fullmoveNumber: 1,
        positionHistory: [],
        pieceID: '',
        targetSquare: 'a1',
    };
}

function move(state: State, pieceID: string, targetSquare: Square, promotion?: PromotionPiece): State {
    const before = structuredClone(state);
    const result = applyMoveToGameState({ ...state, pieceID, targetSquare, promotion });
    assert.ok(result, `Expected legal move ${pieceID} to ${targetSquare}`);
    assert.deepEqual(state, before, 'Applying a move must preserve earlier states');
    assert.deepEqual(result.positionHistory.slice(0, -1), state.positionHistory);
    assert.equal(result.positionHistory.length, state.positionHistory.length + 1);
    return { ...state, ...result };
}

test('position history indexes individual plies, preserves captures and excludes the initial position', () => {
    const start = initialState();
    assert.deepEqual(start.positionHistory, []);
    const white = move(start, 'wp5', 'e4');
    const black = move(white, 'bp4', 'd5');
    const capture = move(black, 'wp5', 'd5');

    assert.deepEqual(capture.positionHistory, [
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6',
        'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq -',
    ]);
    assert.deepEqual(capture.moves, [
        { whiteMove: 'e4', blackMove: 'd5' },
        { whiteMove: 'exd5' },
    ]);
    assert.equal(capture.pieces.some(piece => piece.id === 'bp4'), false);
    assert.equal(black.pieces.find(piece => piece.id === 'bp4')?.square, 'd5');
    assert.equal(white.positionHistory.length, 1);
    assert.equal(black.positionHistory.length, 2);
});

const castlingPieces: PieceType[] = [
    { id: 'wk1', piece: 'wk', square: 'e1' },
    { id: 'wr1', piece: 'wr', square: 'a1' },
    { id: 'wr2', piece: 'wr', square: 'h1' },
    { id: 'bk1', piece: 'bk', square: 'e8' },
    { id: 'br1', piece: 'br', square: 'a8' },
    { id: 'br2', piece: 'br', square: 'h8' },
];

for (const [side, target, expected] of [
    ['white', 'g1', 'r3k2r/8/8/8/8/8/8/R4RK1 b kq -'],
    ['white', 'c1', 'r3k2r/8/8/8/8/8/8/2KR3R b kq -'],
    ['black', 'g8', 'r4rk1/8/8/8/8/8/8/R3K2R w KQ -'],
    ['black', 'c8', '2kr3r/8/8/8/8/8/8/R3K2R w KQ -'],
] as const) {
    test(`history records both king and rook after ${side} castling to ${target}`, () => {
        const state = initialState(structuredClone(castlingPieces));
        state.currentTurn = side;
        const result = move(state, side === 'white' ? 'wk1' : 'bk1', target);
        assert.deepEqual(result.positionHistory, [expected]);
    });
}

test('history records the removed pawn after en passant while retaining its earlier position', () => {
    let state = initialState();
    for (const [pieceID, square] of [
        ['wp5', 'e4'], ['bp1', 'a6'], ['wp5', 'e5'], ['bp4', 'd5'],
    ] as const) {
        state = move(state, pieceID, square);
    }
    const result = move(state, 'wp5', 'd6');
    assert.equal(state.positionHistory[3], 'rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6');
    assert.equal(result.positionHistory[4], 'rnbqkbnr/1pp1pppp/p2P4/8/8/8/PPPP1PPP/RNBQKBNR b KQkq -');
    assert.equal(result.pieces.some(piece => piece.id === 'bp4'), false);
    assert.equal(result.moves[2]?.whiteMove, 'exd6');
});

for (const promotion of ['q', 'r', 'b', 'n'] as const) {
    test(`history records the promoted ${promotion} and preserves the pawn in the previous state`, () => {
        const state = initialState([
            { id: 'wk1', piece: 'wk', square: 'a1', hasMoved: true },
            { id: 'bk1', piece: 'bk', square: 'h8', hasMoved: true },
            { id: 'wp5', piece: 'wp', square: 'e7', hasMoved: true },
        ]);
        const result = move(state, 'wp5', 'e8', promotion);
        assert.equal(result.positionHistory[0], `4${promotion.toUpperCase()}2k/8/8/8/8/8/8/K7 b - -`);
        assert.equal(result.pieces.find(piece => piece.id === 'wp5')?.piece, `w${promotion}`);
        assert.equal(state.pieces.find(piece => piece.id === 'wp5')?.piece, 'wp');
    });
}
