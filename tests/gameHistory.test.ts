import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Types, type PipelineStage } from 'mongoose';
import gameRoutes from '../src/routes/game.routes';
import { GameModel } from '../src/models/Game.model';
import { UserModel } from '../src/models/User.model';
import { BotModel } from '../src/models/Bot.model';
import type { GameHistoryRecord } from '../src/dtos/gameHistory.dto';

const ids = {
    game: new Types.ObjectId('507f1f77bcf86cd799439010'),
    white: new Types.ObjectId('507f1f77bcf86cd799439011'),
    black: new Types.ObjectId('507f1f77bcf86cd799439012'),
};
const secret = 'game-history-test-secret';
const originalSecret = process.env.JWT_SECRET;
const app = express();
app.set('env', 'test');
app.use('/game', gameRoutes);
const server = createServer(app);
let baseURL: string;

before(async () => {
    process.env.JWT_SECRET = secret;
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/game/history`;
});

after(async () => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function request(query = '', token: string | null = jwt.sign({ userId: String(ids.white) }, secret)) {
    const response = await fetch(`${baseURL}${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: response.status, body: await response.json() };
}

function record(overrides: Partial<GameHistoryRecord> = {}): GameHistoryRecord {
    return {
        _id: ids.game,
        white: { playerType: 'user', playerId: ids.white, name: 'White at start', avatarURL: '/white.png', elo: 1200 },
        black: { playerType: 'user', playerId: ids.black, name: 'Black at start', avatarURL: '/black.png', elo: 1300 },
        winner: 'white',
        movesCount: 23,
        finishedAt: new Date('2026-11-18T12:30:00.000Z'),
        ...overrides,
    };
}

test('history rejects missing, invalid and incomplete credentials before querying games', async t => {
    const aggregate = t.mock.method(GameModel, 'aggregate', async () => []);
    for (const token of [
        null,
        'invalid-token',
        jwt.sign({ userId: String(ids.white) }, 'wrong-secret'),
        jwt.sign({ userId: String(ids.white) }, secret, { expiresIn: -1 }),
        jwt.sign({}, secret),
        jwt.sign({ userId: { $ne: null } }, secret),
        jwt.sign({ userId: 'invalid-id' }, secret),
    ]) {
        assert.equal((await request('', token)).status, 401);
    }
    assert.equal(aggregate.mock.callCount(), 0);
});

test('history validates pagination before querying MongoDB', async t => {
    const aggregate = t.mock.method(GameModel, 'aggregate', async () => []);
    for (const query of [
        '?page=0', '?page=-1', '?page=1.5', '?page=1e2', '?page=', '?page=abc',
        '?page=1&page=2', '?page=9007199254740992',
        '?limit=0', '?limit=-1', '?limit=101', '?limit=1.5', '?limit=',
        '?limit=1&limit=2', '?page=9007199254740991&limit=100',
    ]) {
        assert.equal((await request(query)).status, 400, query);
    }
    assert.equal(aggregate.mock.callCount(), 0);
});

test('bracket query keys cannot inject MongoDB selectors into pagination', async t => {
    t.mock.method(GameModel, 'aggregate', async () => [{ games: [], total: [] }]);
    const response = await request('?page[$ne]=1&limit[$ne]=1');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.pagination, { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false });
});

for (const userSide of ['white', 'black'] as const) {
    for (const winner of ['white', 'black', 'draw'] as const) {
        test(`history reports ${winner} result relative to the ${userSide} participant`, async t => {
            t.mock.method(GameModel, 'aggregate', async () => [{ games: [record({ winner })], total: [{ count: 1 }] }]);
            const result = await request('', jwt.sign({ userId: String(ids[userSide]) }, secret));
            assert.equal(result.status, 200);
            assert.deepEqual(result.body, {
                games: [{
                    id: String(ids.game),
                    white: { name: 'White at start', avatarURL: '/white.png', elo: 1200 },
                    black: { name: 'Black at start', avatarURL: '/black.png', elo: 1300 },
                    result: winner === 'draw' ? 'draw' : winner === userSide ? 'win' : 'loss',
                    movesCount: 23,
                    finishedAt: '2026-11-18T12:30:00.000Z',
                }],
                pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
            });
        });
    }
}

test('history uses stored snapshots for users and bots without reading current profiles', async t => {
    const game = record({
        black: { playerType: 'bot', playerId: ids.black, name: 'Bot at start', avatarURL: '/bot.png', elo: 1400 },
    });
    t.mock.method(GameModel, 'aggregate', async () => [{ games: [game], total: [{ count: 1 }] }]);
    const user = t.mock.method(UserModel, 'findById', () => { throw new Error('Must use game snapshot'); });
    const bot = t.mock.method(BotModel, 'findById', () => { throw new Error('Must use game snapshot'); });
    const response = await request();
    assert.equal(response.status, 200);
    assert.equal(response.body.games[0].black.elo, 1400);
    assert.equal(response.body.games[0].black.name, 'Bot at start');
    assert.equal(user.mock.callCount(), 0);
    assert.equal(bot.mock.callCount(), 0);
});

test('history keeps missing historical profile fields explicit and preserves a zero rating', async t => {
    const game = record({ white: { playerType: 'user', playerId: ids.white, elo: 0 }, movesCount: 0 });
    t.mock.method(GameModel, 'aggregate', async () => [{ games: [game], total: [{ count: 1 }] }]);
    const result = await request();
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.games[0].white, { name: null, avatarURL: null, elo: 0 });
    assert.equal(result.body.games[0].movesCount, 0);
});

test('history query restricts participants to the JWT identity and orders legacy and new games together', async t => {
    let pipeline: PipelineStage[] = [];
    t.mock.method(GameModel, 'aggregate', async (stages: PipelineStage[]) => {
        pipeline = stages;
        return [{ games: [record()], total: [{ count: 5 }] }];
    });
    const response = await request(`?page=2&limit=2&userId=${ids.black}&status=active`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3, hasMore: true });
    const match = pipeline.find(stage => '$match' in stage) as PipelineStage.Match;
    assert.equal(match.$match.status, 'finished');
    assert.deepEqual(match.$match.winner, { $in: ['white', 'black', 'draw'] });
    assert.deepEqual(match.$match.$or, [
        { 'white.playerType': 'user', 'white.playerId': ids.white },
        { 'black.playerType': 'user', 'black.playerId': ids.white },
    ]);
    const projection = pipeline.find(stage => '$project' in stage) as PipelineStage.Project;
    assert.deepEqual(projection.$project.finishedAt, { $ifNull: ['$finishedAt', '$updatedAt'] });
    assert.deepEqual(projection.$project.movesCount, { $size: { $ifNull: ['$moves', []] } });
    const facet = pipeline.find(stage => '$facet' in stage) as PipelineStage.Facet;
    assert.deepEqual(facet.$facet.games, [
        { $sort: { finishedAt: -1, _id: -1 } }, { $skip: 2 }, { $limit: 2 },
    ]);
    assert.ok(pipeline.indexOf(projection) < pipeline.indexOf(facet));
});

for (const [query, total, totalPages] of [['', 0, 0], ['?page=2&limit=2', 4, 2], ['?page=10&limit=2', 4, 2]] as const) {
    test(`history returns a valid empty page for ${query || 'a user without games'}`, async t => {
        t.mock.method(GameModel, 'aggregate', async () => [{ games: [], total: total ? [{ count: total }] : [] }]);
        const response = await request(query);
        assert.equal(response.status, 200);
        assert.deepEqual(response.body.games, []);
        assert.equal(response.body.pagination.total, total);
        assert.equal(response.body.pagination.totalPages, totalPages);
        assert.equal(response.body.pagination.hasMore, false);
    });
}

test('history accepts the maximum page size and stops pagination on the last page', async t => {
    t.mock.method(GameModel, 'aggregate', async () => [{ games: [record()], total: [{ count: 101 }] }]);
    const result = await request('?page=2&limit=100');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.pagination, { page: 2, limit: 100, total: 101, totalPages: 2, hasMore: false });
});

test('history database failures return a generic error without exposing internal details', async t => {
    t.mock.method(console, 'log', () => {});
    t.mock.method(GameModel, 'aggregate', async () => { throw new Error('private database details'); });
    assert.deepEqual(await request(), { status: 500, body: { message: 'Server error' } });
});
