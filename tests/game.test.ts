import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test, type TestContext } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import gameRoutes from '../src/routes/game.routes';
import { GameModel } from '../src/models/Game.model';
import { UserModel } from '../src/models/User.model';
import { BotModel } from '../src/models/Bot.model';
import { initialPieces } from '../src/chess/initialPieces';
import { gameService } from '../src/services/game.service';
import { botService } from '../src/services/bot.service';
import { botQueueService } from '../src/services/botQueue.service';
import { StockfishEngine } from '../src/engines/StockfishEngine';
import { initSocket } from '../src/socket/socket';

const ids = {
    game: '507f1f77bcf86cd799439010',
    white: '507f1f77bcf86cd799439011',
    black: '507f1f77bcf86cd799439012',
    outsider: '507f1f77bcf86cd799439013',
};
const secret = 'game-authorization-regression-test-secret';
const originalSecret = process.env.JWT_SECRET;
const app = express();
app.set('env', 'test');
app.use(express.json());
app.use('/game', gameRoutes);
const server = createServer(app);
let baseURL: string;
let io: ReturnType<typeof initSocket>;

before(async () => {
    process.env.JWT_SECRET = secret;
    io = initSocket(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await new Promise<void>(resolve => io.close(() => resolve()));
});

function fixture(t: TestContext, overrides: Record<string, unknown> = {}) {
    const game = new GameModel({
        _id: ids.game,
        white: { playerType: 'user', playerId: ids.white },
        black: { playerType: 'user', playerId: ids.black },
        pieces: structuredClone(initialPieces),
        __v: 0,
        ...overrides,
    });
    const save = t.mock.method(game, 'save', async () => game);
    const find = t.mock.method(GameModel, 'findById', async () => game);
    const elo = t.mock.method(UserModel, 'findByIdAndUpdate', async () => null);
    t.mock.method(UserModel, 'findById', async () => null);
    const emit = t.mock.method(io, 'to', () => ({ emit() {} }));
    const botTurn = t.mock.method(gameService, 'tryRunBotTurn', async () => null);
    t.mock.method(console, 'log', () => {});
    return { game, save, find, elo, emit, botTurn };
}

async function request(path: string, body?: unknown, userId?: string) {
    const response = await fetch(`${baseURL}/game${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(userId ? { Authorization: `Bearer ${jwt.sign({ userId }, secret)}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const content = await response.text();
    return {
        status: response.status,
        body: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(content) : content,
    };
}

const move = { gameId: ids.game, pieceID: 'wp5', targetSquare: 'e4' };
const finish = { gameId: ids.game, winner: 'white', finishedReason: 'checkmate', moves: [] };

test('outsider cannot move a piece in another game', async t => {
    const { game, save, elo, emit, botTurn } = fixture(t);
    const before = game.toObject();
    const result = await request('/move', move, ids.outsider);
    assert.equal(result.status, 403);
    assert.deepEqual(game.toObject(), before);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(elo.mock.callCount(), 0);
    assert.equal(emit.mock.callCount(), 0);
    assert.equal(botTurn.mock.callCount(), 0);
});

test('outsider cannot finish another game by claiming checkmate', async t => {
    const { game, save, elo, emit } = fixture(t);
    const before = game.toObject();
    const result = await request('/finish', finish, ids.outsider);
    assert.equal(result.status, 403);
    assert.deepEqual(game.toObject(), before);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(elo.mock.callCount(), 0);
    assert.equal(emit.mock.callCount(), 0);
});

for (const reason of ['resignation', 'stalemate', 'fifty-move-draw', 'threefold-repetition-draw', 'insufficient-material-draw', 'timeout', 'anything']) {
    test(`outsider cannot finish a game using ${reason}`, async t => {
        const { game, save, elo, emit } = fixture(t);
        const before = game.toObject();
        const result = await request('/finish', { ...finish, finishedReason: reason }, ids.outsider);
        assert.equal(result.status, 403);
        assert.deepEqual(game.toObject(), before);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(elo.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });
}

for (const [path, body] of [['/move', move], ['/finish', finish]] as const) {
    test(`${path} requires authentication and rejects invalid JWTs`, async t => {
        const { find } = fixture(t);
        assert.equal((await request(path, body)).status, 401);
        for (const token of [
            'invalid-token',
            jwt.sign({ userId: ids.white }, 'wrong-secret'),
            jwt.sign({ userId: ids.white }, secret, { expiresIn: -1 }),
            jwt.sign({}, secret),
        ]) {
            const response = await fetch(`${baseURL}/game${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            assert.equal(response.status, 401);
        }
        assert.equal(find.mock.callCount(), 0);
    });

    test(`${path} ignores a participant identity supplied in the body`, async t => {
        const { save, emit } = fixture(t);
        const result = await request(path, { ...body, userId: ids.white, userID: ids.white, playerId: ids.white }, ids.outsider);
        assert.equal(result.status, 403);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });

    test(`${path} rejects missing games`, async t => {
        const { find, save } = fixture(t);
        find.mock.mockImplementation(async () => null);
        assert.equal((await request(path, body, ids.white)).status, 404);
        assert.equal(save.mock.callCount(), 0);
    });

    test(`${path} preserves the stored result of finished games`, async t => {
        const { game, save, elo, emit } = fixture(t, { status: 'finished', winner: 'black', finishedReason: 'resignation' });
        const before = game.toObject();
        const result = await request(path, body, ids.white);
        assert.equal(result.status, path === '/finish' ? 200 : 400);
        if (path === '/finish') assert.equal(result.body.game.winner, 'black');
        assert.deepEqual(game.toObject(), before);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(elo.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });

    test(`${path} reports database failures without emitting updates`, async t => {
        const { find, emit } = fixture(t);
        find.mock.mockImplementation(async () => { throw new Error('database unavailable'); });
        const result = await request(path, body, ids.white);
        assert.deepEqual(result, { status: 500, body: { message: 'Server error' } });
        assert.equal(emit.mock.callCount(), 0);
    });
}

for (const [turn, user, attemptedMove] of [
    ['white', ids.black, move],
    ['black', ids.white, { ...move, pieceID: 'bp5', targetSquare: 'e5' }],
] as const) {
    test(`${user} cannot act during ${turn}'s turn even using the active side's piece`, async t => {
        const { game, save, emit } = fixture(t, { currentTurn: turn });
        const before = game.toObject();
        assert.equal((await request('/move', attemptedMove, user)).status, 403);
        assert.deepEqual(game.toObject(), before);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });
}

for (const [turn, user, attemptedMove] of [
    ['white', ids.white, { ...move, pieceID: 'bp5', targetSquare: 'e5' }],
    ['black', ids.black, move],
] as const) {
    test(`${turn} cannot move the opponent's piece on their own turn`, async t => {
        const { game, save, emit } = fixture(t, { currentTurn: turn });
        const before = game.toObject();
        assert.equal((await request('/move', attemptedMove, user)).status, 400);
        assert.deepEqual(game.toObject(), before);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });
}

test('both participants can make legal moves in turn', async t => {
    const { game, save, emit, botTurn } = fixture(t);
    const white = await request('/move', move, ids.white);
    assert.equal(white.status, 200);
    assert.equal(white.body.game.currentTurn, 'black');
    assert.equal(white.body.game.pieces.find((p: any) => p.id === 'wp5').square, 'e4');
    assert.equal(white.body.gameStatus, 'playing');
    assert.equal(typeof white.body.game.moveMeta.isCapture, 'boolean');
    assert.equal((await request('/move', { ...move, pieceID: 'wp4', targetSquare: 'd4' }, ids.white)).status, 403);
    const black = await request('/move', { ...move, pieceID: 'bp5', targetSquare: 'e5' }, ids.black);
    assert.equal(black.status, 200);
    assert.equal(black.body.game.currentTurn, 'white');
    assert.equal(game.moves.length, 1);
    assert.equal(save.mock.callCount(), 2);
    assert.equal(emit.mock.callCount(), 2);
    assert.equal(botTurn.mock.callCount(), 2);
});

for (const [user, winner] of [[ids.white, 'black'], [ids.black, 'white']] as const) {
    test(`${user} may resign out of turn but cannot select the winner or overwrite move history`, async t => {
        const history = [{ whiteMove: 'e4', blackMove: 'e5' }];
        const { game, save, elo } = fixture(t, { currentTurn: user === ids.white ? 'black' : 'white', moves: history });
        const result = await request('/finish', {
            ...finish, finishedReason: 'resignation', winner: user === ids.white ? 'white' : 'black', moves: [{ whiteMove: 'forged' }],
        }, user);
        assert.equal(result.status, 200);
        assert.equal(result.body.game.winner, winner);
        assert.deepEqual(result.body.game.moves, history);
        assert.equal(game.status, 'finished');
        assert.ok(game.finishedAt instanceof Date);
        assert.equal(result.body.game.finishedAt, game.finishedAt.toISOString());
        const finishedAt = game.finishedAt.getTime();
        assert.equal(save.mock.callCount(), 1);
        assert.deepEqual(elo.mock.calls.map(call => call.arguments), [
            [game[winner].playerId, { $inc: { elo: 24 } }],
            [game[winner === 'white' ? 'black' : 'white'].playerId, { $inc: { elo: -24 } }],
        ]);
        assert.equal((await request('/finish', { ...finish, finishedReason: 'resignation' }, user)).status, 200);
        assert.equal(game.finishedAt.getTime(), finishedAt);
        assert.equal(save.mock.callCount(), 1);
        assert.equal(elo.mock.callCount(), 2);
    });
}

test('finishing a game persists its date and keeps the starting player ratings', async t => {
    const { game, save, elo } = fixture(t, {
        white: { playerType: 'user', playerId: ids.white, name: 'White', elo: 1200, avatarURL: '/white.png' },
        black: { playerType: 'user', playerId: ids.black, name: 'Black', elo: 1300, avatarURL: '/black.png' },
    });
    const snapshots = { white: game.white.toObject(), black: game.black.toObject() };
    const startedAt = Date.now();
    save.mock.mockImplementation(async () => {
        assert.ok(game.finishedAt instanceof Date);
        assert.equal(elo.mock.callCount(), 0);
        return game;
    });
    const result = await request('/finish', { gameId: ids.game, finishedReason: 'resignation' }, ids.white);
    assert.equal(result.status, 200);
    assert.ok(game.finishedAt!.getTime() >= startedAt && game.finishedAt!.getTime() <= Date.now());
    assert.deepEqual({ white: game.white.toObject(), black: game.black.toObject() }, snapshots);
    assert.equal(save.mock.callCount(), 1);
    assert.equal(elo.mock.callCount(), 2);
});

for (const reason of ['checkmate', 'stalemate', 'fifty-move-draw', 'threefold-repetition-draw', 'insufficient-material-draw', 'timeout', 'agreement', 'playing']) {
    test(`participant cannot invent a ${reason} result in a playing position`, async t => {
        const { game, save, elo, emit } = fixture(t);
        const before = game.toObject();
        assert.equal((await request('/finish', { ...finish, finishedReason: reason }, ids.white)).status, 400);
        assert.deepEqual(game.toObject(), before);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(elo.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });
}

test('checkmate is detected and finalized by the server after a legal move', async t => {
    const { game, elo } = fixture(t);
    for (const [user, pieceID, targetSquare] of [
        [ids.white, 'wp6', 'f3'], [ids.black, 'bp5', 'e5'], [ids.white, 'wp7', 'g4'], [ids.black, 'bq1', 'h4'],
    ]) {
        const result = await request('/move', { gameId: ids.game, pieceID, targetSquare }, user);
        assert.equal(result.status, 200);
    }
    assert.equal(game.status, 'finished');
    assert.equal(game.winner, 'black');
    assert.equal(game.finishedReason, 'checkmate');
    assert.ok(game.finishedAt instanceof Date);
    assert.equal(elo.mock.callCount(), 2);
    const repeatedFinish = await request('/finish', finish, ids.white);
    assert.equal(repeatedFinish.status, 200);
    assert.equal(repeatedFinish.body.game.winner, 'black');
    assert.equal(elo.mock.callCount(), 2);
});

const checkmatePieces = [
    { id: 'wk1', piece: 'wk', square: 'a1' },
    { id: 'bq1', piece: 'bq', square: 'b2' },
    { id: 'bk1', piece: 'bk', square: 'c3' },
];
const kingsOnly = [
    { id: 'wk1', piece: 'wk', square: 'a1' },
    { id: 'bk1', piece: 'bk', square: 'h8' },
];

for (const [reason, overrides, winner] of [
    ['checkmate', { pieces: checkmatePieces }, 'black'],
    ['stalemate', { pieces: [checkmatePieces[0], { id: 'bq1', piece: 'bq', square: 'b3' }, checkmatePieces[2]] }, 'draw'],
    ['insufficient-material-draw', { pieces: kingsOnly }, 'draw'],
    ['fifty-move-draw', { halfmoveClock: 100 }, 'draw'],
    ['threefold-repetition-draw', { positionHistory: ['position', 'position', 'position'] }, 'draw'],
] as const) {
    test(`participant can finalize a server-confirmed ${reason} without trusting submitted result/history`, async t => {
        const history = [{ whiteMove: 'stored move' }];
        const { elo, save } = fixture(t, { ...overrides, moves: history });
        const result = await request('/finish', { ...finish, finishedReason: reason, winner: 'white', moves: [{ whiteMove: 'forged' }] }, ids.white);
        assert.equal(result.status, 200);
        assert.equal(result.body.game.winner, winner);
        assert.equal(result.body.game.finishedReason, reason);
        assert.ok(!Number.isNaN(Date.parse(result.body.game.finishedAt)));
        assert.deepEqual(result.body.game.moves, history);
        assert.equal(save.mock.callCount(), 1);
        assert.equal(elo.mock.callCount(), winner === 'draw' ? 0 : 2);
    });
}

for (const overrides of [
    { pieces: checkmatePieces },
    { white: { playerType: 'bot', playerId: ids.white, engine: 'stockfish' } },
]) {
    test('public game lookup never finishes a game or schedules bot moves', async t => {
        const { game, save, elo, emit, botTurn } = fixture(t, overrides);
        const before = game.toObject();
        for (const user of [undefined, ids.outsider]) {
            assert.equal((await request(`/by-id/${ids.game}`, undefined, user)).status, 200);
        }
        assert.deepEqual(game.toObject(), before);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(elo.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
        assert.equal(botTurn.mock.callCount(), 0);
    });
}

for (const [path, body] of [['/move', move], ['/finish', { ...finish, finishedReason: 'resignation' }]] as const) {
    test(`${path} cannot impersonate a bot even if the JWT user ID matches its ID`, async t => {
        const { save, emit } = fixture(t, { white: { playerType: 'bot', playerId: ids.white } });
        assert.equal((await request(path, body, ids.white)).status, 403);
        assert.equal(save.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });
}

test('participant cannot submit a human move during the bot turn', async t => {
    const { save } = fixture(t, { currentTurn: 'black', black: { playerType: 'bot', playerId: ids.black } });
    assert.equal((await request('/move', { ...move, pieceID: 'bp5', targetSquare: 'e5' }, ids.white)).status, 403);
    assert.equal(save.mock.callCount(), 0);
});

test('authenticated active-game lookup resumes a bot only in the requesting user game', async t => {
    const { game, botTurn } = fixture(t, { currentTurn: 'black', black: { playerType: 'bot', playerId: ids.black } });
    const find = t.mock.method(GameModel, 'findOne', async () => game);
    assert.equal((await request('/active-game', undefined, ids.white)).status, 200);
    assert.deepEqual(find.mock.calls[0].arguments[0], {
        status: 'active',
        $or: [
            { 'white.playerType': 'user', 'white.playerId': ids.white },
            { 'black.playerType': 'user', 'black.playerId': ids.white },
        ],
    });
    assert.deepEqual(botTurn.mock.calls[0].arguments, [ids.game]);
    find.mock.mockImplementation(async () => null);
    assert.equal((await request('/active-game', undefined, ids.outsider)).body.game, null);
    assert.equal(botTurn.mock.callCount(), 1);
});

test('bot still applies a legal engine move through its internal service', async t => {
    const { game, save } = fixture(t, { black: { playerType: 'bot', playerId: ids.black, engine: 'stockfish' } });
    assert.equal((await request('/move', move, ids.white)).status, 200);
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const engine = t.mock.method(StockfishEngine.prototype, 'getBestMove', async () => 'e7e5');
    const update = t.mock.method(GameModel, 'updateOne', async (_filter: any, value: any) => {
        game.set(value.$set);
        game.__v += value.$inc.__v;
        return { modifiedCount: 1 };
    });
    const result = await botService.makeBotMove(ids.game);
    assert.equal(result?.gameStatus, 'playing');
    assert.equal(result?.game.currentTurn, 'white');
    assert.equal(result?.game.pieces.find((p: any) => p.id === 'bp5').square, 'e5');
    assert.equal(save.mock.callCount(), 1);
    assert.equal(engine.mock.callCount(), 1);
    assert.equal(update.mock.callCount(), 1);
    assert.deepEqual(update.mock.calls[0].arguments[0], { _id: game._id, __v: 0, status: 'active', currentTurn: 'black' });
    assert.equal(await botService.makeBotMove(ids.game), null);
    assert.equal(engine.mock.callCount(), 1);
});

test('resigning against a bot releases it and preserves the internal rating update', async t => {
    fixture(t, { black: { playerType: 'bot', playerId: ids.black } });
    const bot = { _id: ids.black, status: 'playing', save: async () => {} };
    const save = t.mock.method(bot, 'save', async () => {});
    t.mock.method(BotModel, 'findById', async () => bot);
    const elo = t.mock.method(BotModel, 'findByIdAndUpdate', async () => null);
    const queue = t.mock.method(botQueueService, 'scheduleBotSearch', () => {});
    const result = await request('/finish', { ...finish, finishedReason: 'resignation' }, ids.white);
    assert.equal(result.status, 200);
    assert.equal(result.body.game.winner, 'black');
    assert.equal(bot.status, 'idle');
    assert.equal(save.mock.callCount(), 1);
    assert.equal(queue.mock.callCount(), 1);
    assert.equal(elo.mock.callCount(), 1);
});

for (const body of [
    {}, null,
    { ...move, gameId: 'invalid' },
    { ...move, gameId: { $ne: null } },
    { ...move, pieceID: {} },
    { ...move, targetSquare: ['e4'] },
    { ...move, targetSquare: 'e9' },
    { ...move, targetSquare: 'i4' },
    { ...move, promotion: 'k' },
]) {
    test(`move rejects malformed input ${JSON.stringify(body)}`, async t => {
        const { find } = fixture(t);
        assert.equal((await request('/move', body, ids.white)).status, 400);
        assert.equal(find.mock.callCount(), 0);
    });
}

for (const body of [{}, null, { ...finish, gameId: 'invalid' }, { ...finish, finishedReason: {} }, { gameId: ids.game }]) {
    test(`finish rejects malformed input ${JSON.stringify(body)}`, async t => {
        const { find } = fixture(t);
        assert.equal((await request('/finish', body, ids.white)).status, 400);
        assert.equal(find.mock.callCount(), 0);
    });
}

test('illegal piece moves do not change the game', async t => {
    const { game, save } = fixture(t);
    const before = game.toObject();
    for (const attemptedMove of [
        { ...move, pieceID: 'missing' },
        { ...move, targetSquare: 'e5' },
        { ...move, promotion: 'q' },
    ]) {
        assert.equal((await request('/move', attemptedMove, ids.white)).status, 400);
    }
    assert.deepEqual(game.toObject(), before);
    assert.equal(save.mock.callCount(), 0);
});

for (const [path, body] of [['/move', move], ['/finish', { ...finish, finishedReason: 'resignation' }]] as const) {
    test(`${path} rejects a concurrent stale write without emitting updates or changing ratings`, async t => {
        const { game, save, elo, emit } = fixture(t);
        save.mock.mockImplementation(async () => { throw new mongoose.Error.VersionError(game, 0, ['currentTurn']); });
        assert.equal((await request(path, body, ids.white)).status, 409);
        assert.equal(elo.mock.callCount(), 0);
        assert.equal(emit.mock.callCount(), 0);
    });
}

test('Mongoose allows only one concurrent game save against a given version', async t => {
    const initial = new GameModel({
        _id: ids.game,
        white: { playerType: 'user', playerId: ids.white },
        black: { playerType: 'user', playerId: ids.black },
        pieces: initialPieces,
        __v: 0,
    }).toObject();
    const first = GameModel.hydrate(initial);
    const stale = GameModel.hydrate(initial);
    let version = 0;
    const update = t.mock.method(GameModel.collection, 'updateOne', async (filter: any, value: any) => {
        assert.equal(filter.__v, 0);
        assert.equal(value.$inc.__v, 1);
        if (filter.__v !== version) return { matchedCount: 0, modifiedCount: 0 };
        version += value.$inc.__v;
        return { matchedCount: 1, modifiedCount: 1 };
    });
    first.currentTurn = 'black';
    stale.status = 'finished';
    await first.save();
    await assert.rejects(stale.save(), { name: 'VersionError' });
    assert.equal(version, 1);
    assert.equal(update.mock.callCount(), 2);
});

test('Socket.IO room subscriptions and forged mutation events cannot change a game', async t => {
    const { game, find, save, elo, botTurn } = fixture(t);
    const before = game.toObject();
    const connection = once(io, 'connection');
    const client = new WebSocket(`${baseURL.replace('http:', 'ws:')}/socket.io/?EIO=4&transport=websocket`);
    t.after(() => client.close());
    await once(client, 'open');
    client.send('40');
    const [socket] = await connection;
    const barrier = once(socket, 'test:barrier');
    for (const [event, data] of [
        ['game:join', ids.game],
        ['player:watch', ids.white],
        ['matchmaking:join', ids.white],
        ['game:move', move],
        ['game:finish', finish],
        ['game:update', { ...before, winner: 'white', status: 'finished' }],
        ['game:leave', ids.game],
        ['player:unwatch', ids.white],
        ['matchmaking:leave', ids.white],
        ['test:barrier', null],
    ]) {
        client.send(`42${JSON.stringify([event, data])}`);
    }
    await barrier;
    assert.deepEqual(game.toObject(), before);
    assert.equal(find.mock.callCount(), 0);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(elo.mock.callCount(), 0);
    assert.equal(botTurn.mock.callCount(), 0);
});

test('authorized human move still schedules the next bot turn', async t => {
    const { botTurn } = fixture(t, { black: { playerType: 'bot', playerId: ids.black } });
    botTurn.mock.restore();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const bot = t.mock.method(botService, 'makeBotMove', async () => null);
    assert.equal((await request('/move', move, ids.white)).status, 200);
    t.mock.timers.tick(500);
    assert.equal(bot.mock.callCount(), 1);
    assert.deepEqual(bot.mock.calls[0].arguments, [ids.game]);
});

test('participant lookup reconciles a terminal game without relying on public reads', async t => {
    const { game, save, elo, botTurn } = fixture(t, { pieces: checkmatePieces });
    t.mock.method(GameModel, 'findOne', async () => game);
    const result = await request('/active-game', undefined, ids.white);
    assert.equal(result.status, 200);
    assert.equal(result.body.game, null);
    assert.equal(game.status, 'finished');
    assert.equal(game.winner, 'black');
    assert.equal(save.mock.callCount(), 1);
    assert.equal(elo.mock.callCount(), 2);
    assert.equal(botTurn.mock.callCount(), 0);
});

test('bot checkmate still finalizes the game and releases the bot', async t => {
    const { game } = fixture(t, {
        currentTurn: 'black',
        black: { playerType: 'bot', playerId: ids.black, engine: 'stockfish' },
        pieces: [checkmatePieces[0], { id: 'bq1', piece: 'bq', square: 'c2' }, checkmatePieces[2]],
    });
    t.mock.method(StockfishEngine.prototype, 'getBestMove', async () => 'c2b2');
    t.mock.method(GameModel, 'updateOne', async (_filter: any, value: any) => {
        game.set(value.$set);
        game.__v += value.$inc.__v;
        return { modifiedCount: 1 };
    });
    const bot = { _id: ids.black, status: 'playing', save: async () => {} };
    t.mock.method(BotModel, 'findById', async () => bot);
    t.mock.method(BotModel, 'findByIdAndUpdate', async () => null);
    const queue = t.mock.method(botQueueService, 'scheduleBotSearch', () => {});
    const result = await botService.makeBotMove(ids.game);
    assert.equal(result?.gameStatus, 'checkmate');
    assert.equal(game.status, 'finished');
    assert.equal(game.winner, 'black');
    assert.equal(bot.status, 'idle');
    assert.ok(game.finishedAt instanceof Date);
    assert.equal(queue.mock.callCount(), 1);
});
