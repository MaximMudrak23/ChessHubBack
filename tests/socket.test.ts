import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test, type TestContext } from 'node:test';
import jwt from 'jsonwebtoken';
import express from 'express';
import { UserModel } from '../src/models/User.model';
import { GameModel } from '../src/models/Game.model';
import { MatchTicketModel } from '../src/models/MatchTicket.model';
import { gameService } from '../src/services/game.service';
import { initialPieces } from '../src/chess/initialPieces';
import gameRoutes from '../src/routes/game.routes';
import playerRoutes from '../src/routes/player.routes';
import { getMatchmakingRoom, getPlayerRoom, getUserRoom, initSocket } from '../src/socket/socket';

const ids = {
    game: '507f1f77bcf86cd799439010',
    owner: '507f1f77bcf86cd799439011',
    viewer: '507f1f77bcf86cd799439012',
    opponent: '507f1f77bcf86cd799439013',
};
const secret = 'private-socket-regression-test-secret';
const originalSecret = process.env.JWT_SECRET;
const app = express();
app.use(express.json());
app.use('/game', gameRoutes);
app.use('/players', playerRoutes);
const server = createServer(app);
let io: ReturnType<typeof initSocket>;
let baseURL: string;

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

function fixture(t: TestContext) {
    t.mock.method(console, 'log', () => {});
    return t.mock.method(UserModel, 'exists', async () => ({ _id: ids.owner }));
}

function auth(userId = ids.owner) {
    return { token: jwt.sign({ userId }, secret, { expiresIn: '1h' }) };
}

async function openSocket(t: TestContext, credentials?: unknown, query = '') {
    const client = new WebSocket(`${baseURL.replace('http:', 'ws:')}/socket.io/?EIO=4&transport=websocket${query}`);
    const packets: string[] = [];
    client.addEventListener('message', event => {
        const packet = String(event.data);
        packets.push(packet);
        if (packet === '2') client.send('3');
    });
    t.after(() => client.close());

    function waitForPacket(predicate: (packet: string) => boolean): Promise<string> {
        const found = packets.find(predicate);
        if (found !== undefined) return Promise.resolve(found);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                client.removeEventListener('message', onMessage);
                reject(new Error('Socket.IO test packet timed out'));
            }, 2000);
            function onMessage(event: MessageEvent) {
                const packet = String(event.data);
                if (!predicate(packet)) return;
                clearTimeout(timeout);
                client.removeEventListener('message', onMessage);
                resolve(packet);
            }
            client.addEventListener('message', onMessage);
        });
    }

    await once(client, 'open');
    client.send(`40${credentials === undefined ? '' : JSON.stringify(credentials)}`);
    const handshake = await waitForPacket(packet => packet.startsWith('40') || packet.startsWith('44'));
    let sequence = 0;
    return {
        client,
        handshake,
        waitForPacket,
        get socket() {
            assert.ok(handshake.startsWith('40'), handshake);
            return io.sockets.sockets.get(JSON.parse(handshake.slice(2)).sid)!;
        },
        async emit(event: string, value: unknown) {
            const socket = this.socket;
            const received = once(socket, 'test:barrier');
            client.send(`42${JSON.stringify([event, value])}`);
            client.send('42["test:barrier"]');
            await received;
        },
        async flush() {
            const marker = `test:flush:${sequence++}`;
            this.socket.emit(marker);
            await waitForPacket(packet => packet === `42${JSON.stringify([marker])}`);
        },
        events() {
            return packets.filter(packet => packet.startsWith('42['))
                .map(packet => JSON.parse(packet.slice(2)))
                .filter(([event]) => !event.startsWith('test:'));
        },
    };
}

test('anonymous visitors can watch a profile and spectate a game', async t => {
    fixture(t);
    const viewer = await openSocket(t);
    await viewer.emit('player:watch', ids.owner);
    await viewer.emit('game:join', ids.game);
    io.to(getPlayerRoom(ids.owner)).emit('player:active-game:update', ids.game);
    io.to(ids.game).emit('game:update', { _id: ids.game, currentTurn: 'black' });
    io.to(getPlayerRoom(ids.owner)).emit('player:active-game:update', null);
    await viewer.flush();
    assert.deepEqual(viewer.events(), [
        ['player:active-game:update', ids.game],
        ['game:update', { _id: ids.game, currentTurn: 'black' }],
        ['player:active-game:update', null],
    ]);
});

test('anonymous visitors cannot subscribe to personal matchmaking events', async t => {
    fixture(t);
    const viewer = await openSocket(t);
    await viewer.emit('matchmaking:join', ids.owner);
    assert.equal(viewer.socket.rooms.has(getMatchmakingRoom(ids.owner)), false);
});

test('game:join cannot access private rooms by passing a room name', async t => {
    fixture(t);
    const viewer = await openSocket(t);
    for (const room of [getMatchmakingRoom(ids.owner), getUserRoom(ids.owner), getPlayerRoom(ids.owner)]) {
        await viewer.emit('game:join', room);
        assert.equal(viewer.socket.rooms.has(room), false);
    }
});

for (const [name, token] of [
    ['empty', ''],
    ['non-string', { userId: ids.owner }],
    ['malformed', 'invalid-jwt'],
    ['forged', jwt.sign({ userId: ids.owner }, 'attacker-secret')],
    ['expired', jwt.sign({ userId: ids.owner }, secret, { expiresIn: -1 })],
    ['wrong algorithm', jwt.sign({ userId: ids.owner }, secret, { algorithm: 'HS384' })],
    ['missing user', jwt.sign({}, secret)],
    ['invalid user', jwt.sign({ userId: 'invalid' }, secret)],
    ['selector user', jwt.sign({ userId: { $ne: null } }, secret)],
] as const) {
    test(`invalid ${name} credentials cannot establish a personal session`, async t => {
        const exists = fixture(t);
        const client = await openSocket(t, { token });
        assert.equal(client.handshake, '44{"message":"Unauthorized"}');
        assert.equal(exists.mock.callCount(), 0);
    });
}

for (const failure of ['deleted user', 'database failure', 'missing secret']) {
    test(`personal authentication fails closed for ${failure}`, async t => {
        const exists = fixture(t);
        if (failure === 'deleted user') exists.mock.mockImplementation(async () => null);
        if (failure === 'database failure') exists.mock.mockImplementation(async () => { throw new Error('private database details'); });
        if (failure === 'missing secret') {
            delete process.env.JWT_SECRET;
            t.after(() => { process.env.JWT_SECRET = secret; });
        }
        const client = await openSocket(t, auth());
        assert.equal(client.handshake, '44{"message":"Unauthorized"}');
    });
}

test('claimed identity and query tokens cannot grant personal access', async t => {
    const exists = fixture(t);
    const anonymous = await openSocket(t, { userId: ids.owner }, `&token=${auth().token}&userId=${ids.owner}`);
    await anonymous.emit('matchmaking:join', ids.owner);
    assert.equal(anonymous.socket.rooms.has(getUserRoom(ids.owner)), false);
    assert.equal(anonymous.socket.rooms.has(getMatchmakingRoom(ids.owner)), false);
    assert.equal(exists.mock.callCount(), 0);

    const viewer = await openSocket(t, { ...auth(ids.viewer), userId: ids.owner });
    await viewer.emit('matchmaking:join', ids.owner);
    assert.equal(viewer.socket.rooms.has(getUserRoom(ids.viewer)), true);
    assert.equal(viewer.socket.rooms.has(getUserRoom(ids.owner)), false);
    assert.equal(viewer.socket.rooms.has(getMatchmakingRoom(ids.owner)), false);
});

for (const event of ['game:join', 'game:leave', 'player:watch', 'player:unwatch', 'matchmaking:join', 'matchmaking:leave']) {
    test(`${event} validates IDs including arrays and room prefixes`, async t => {
        fixture(t);
        const owner = await openSocket(t, auth());
        const before = [...owner.socket.rooms];
        for (const value of [null, '', 7, {}, { $ne: null }, [], [ids.game], [getUserRoom(ids.viewer)], getMatchmakingRoom(ids.viewer)]) {
            await owner.emit(event, value);
        }
        assert.deepEqual([...owner.socket.rooms], before);
    });
}

test('watching another profile never subscribes to its private search status', async t => {
    fixture(t);
    const owner = await openSocket(t, auth());
    const viewer = await openSocket(t, auth(ids.viewer));
    const anonymous = await openSocket(t);
    for (const client of [owner, viewer, anonymous]) await client.emit('player:watch', ids.owner);

    t.mock.method(UserModel, 'findById', async () => ({ _id: ids.owner, elo: 1000 }));
    t.mock.method(GameModel, 'findOne', async () => null);
    const started = new Date();
    const ticket = { _id: 'ticket', ownerId: ids.owner, ownerType: 'user', searchStartedAt: started };
    t.mock.method(MatchTicketModel, 'findOne', (filter: any) => (
        filter.ownerType === 'user' ? Promise.resolve(ticket) : { sort: async () => null }
    ));
    t.mock.method(MatchTicketModel, 'deleteOne', async () => ({}));

    assert.equal((await gameService.findGame(ids.owner)).status, 'searching');
    await gameService.cancelSearch(ids.owner);
    io.to(getPlayerRoom(ids.owner)).emit('player:active-game:update', ids.game);
    for (const client of [owner, viewer, anonymous]) await client.flush();
    assert.deepEqual(owner.events(), [
        ['matchmaking:status:update', { searching: true, eloRange: 200, searchStartedAt: started.toISOString() }],
        ['matchmaking:status:update', { searching: false, eloRange: null, searchStartedAt: null }],
        ['player:active-game:update', ids.game],
    ]);
    for (const client of [viewer, anonymous]) {
        assert.deepEqual(client.events(), [['player:active-game:update', ids.game]]);
    }
});

test('finding a match notifies spectators publicly and only each player personally', async t => {
    fixture(t);
    const owner = await openSocket(t, auth());
    const opponent = await openSocket(t, auth(ids.opponent));
    const viewer = await openSocket(t, auth(ids.viewer));
    await owner.emit('matchmaking:join', ids.owner.toUpperCase());
    await opponent.emit('matchmaking:join', ids.opponent);
    await viewer.emit('player:watch', ids.owner);
    await viewer.emit('matchmaking:join', ids.owner);
    await viewer.emit('game:join', getMatchmakingRoom(ids.owner));
    const ticket = { _id: 'first-ticket', ownerId: ids.owner, ownerType: 'user', searchStartedAt: new Date() };
    const otherTicket = { ...ticket, _id: 'second-ticket', ownerId: ids.opponent };
    t.mock.method(UserModel, 'findById', async (id: string) => ({ _id: id, elo: 1000 }));
    t.mock.method(GameModel, 'findOne', async () => null);
    t.mock.method(MatchTicketModel, 'findOne', (filter: any) => (
        filter.ownerType === 'user' ? Promise.resolve(ticket) : { sort: async () => otherTicket }
    ));
    const game = new GameModel({
        _id: ids.game,
        white: { playerType: 'user', playerId: ids.owner },
        black: { playerType: 'user', playerId: ids.opponent },
    });
    t.mock.method(GameModel, 'create', async () => game);
    t.mock.method(MatchTicketModel, 'deleteMany', async () => ({}));
    t.mock.method(gameService, 'tryRunBotTurn', async () => null);

    assert.equal((await gameService.findGame(ids.owner)).status, 'matched');
    for (const client of [owner, opponent, viewer]) await client.flush();
    assert.deepEqual(owner.events(), [['match:found', ids.game]]);
    assert.deepEqual(opponent.events(), [['match:found', ids.game]]);
    assert.deepEqual(viewer.events(), [['player:active-game:update', ids.game]]);
});

test('unwatching a profile or leaving matchmaking does not remove personal status access', async t => {
    fixture(t);
    const owner = await openSocket(t, auth());
    await owner.emit('player:watch', ids.owner);
    await owner.emit('matchmaking:join', ids.owner);
    await owner.emit('player:unwatch', ids.owner);
    await owner.emit('matchmaking:leave', ids.owner);
    assert.equal(owner.socket.rooms.has(getPlayerRoom(ids.owner)), false);
    assert.equal(owner.socket.rooms.has(getMatchmakingRoom(ids.owner)), false);
    assert.equal(owner.socket.rooms.has(getUserRoom(ids.owner)), true);
    io.to(getUserRoom(ids.owner)).emit('matchmaking:status:update', { searching: false });
    await owner.flush();
    assert.deepEqual(owner.events(), [['matchmaking:status:update', { searching: false }]]);
});

test('a spectator can load a profile, open its game and receive real moves without mutation rights', async t => {
    fixture(t);
    const game = new GameModel({
        _id: ids.game,
        white: { playerType: 'user', playerId: ids.owner },
        black: { playerType: 'user', playerId: ids.opponent },
        pieces: structuredClone(initialPieces),
    });
    t.mock.method(GameModel, 'findById', async () => game);
    t.mock.method(GameModel, 'findOne', async () => game);
    t.mock.method(UserModel, 'findById', async () => ({ _id: ids.owner, name: 'Player' }));
    t.mock.method(game, 'save', async () => game);
    t.mock.method(gameService, 'tryRunBotTurn', async () => null);
    const viewer = await openSocket(t, auth(ids.viewer));
    const headers = { Authorization: `Bearer ${auth(ids.viewer).token}` };
    const profile = await fetch(`${baseURL}/players/profile/${ids.owner}`, { headers });
    assert.equal(profile.status, 200);
    assert.equal((await profile.json()).user.id, ids.owner);
    const active = await fetch(`${baseURL}/players/active-game/${ids.owner}`, { headers });
    assert.equal(active.status, 200);
    assert.equal((await active.json()).game._id, ids.game);
    await viewer.emit('player:watch', ids.owner);
    const snapshot = await fetch(`${baseURL}/game/by-id/${ids.game}`);
    assert.equal(snapshot.status, 200);
    assert.equal((await snapshot.json()).game._id, ids.game);
    await viewer.emit('game:join', ids.game);

    const body = { gameId: ids.game, pieceID: 'wp5', targetSquare: 'e4' };
    const forbidden = await fetch(`${baseURL}/game/move`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(forbidden.status, 403);
    const played = await fetch(`${baseURL}/game/move`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth().token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    assert.equal(played.status, 200);
    await viewer.flush();
    const [[event, update]] = viewer.events();
    assert.equal(event, 'game:update');
    assert.equal(update.currentTurn, 'black');
    assert.equal(update.pieces.find((piece: any) => piece.id === 'wp5').square, 'e4');
    await viewer.emit('game:leave', ids.game);
    await viewer.emit('player:unwatch', ids.owner);
    assert.equal(viewer.socket.rooms.has(ids.game), false);
    assert.equal(viewer.socket.rooms.has(getPlayerRoom(ids.owner)), false);
});

test('reconnection reauthenticates private rooms and permits public resubscriptions', async t => {
    const exists = fixture(t);
    const first = await openSocket(t, auth());
    await first.emit('player:watch', ids.opponent);
    await first.emit('game:join', ids.game);
    await first.emit('matchmaking:join', ids.owner);
    const oldSocket = first.socket;
    const disconnected = once(oldSocket, 'disconnect');
    first.client.close();
    await disconnected;
    assert.equal(oldSocket.rooms.size, 0);
    const second = await openSocket(t, auth());
    assert.equal(exists.mock.callCount(), 2);
    assert.equal(second.socket.rooms.has(getUserRoom(ids.owner)), true);
    assert.equal(second.socket.rooms.has(getMatchmakingRoom(ids.owner)), false);
    await second.emit('player:watch', ids.opponent);
    await second.emit('game:join', ids.game);
    await second.emit('matchmaking:join', ids.owner);
    io.to(ids.game).emit('game:update', { _id: ids.game, currentTurn: 'black' });
    io.to(getUserRoom(ids.owner)).emit('matchmaking:status:update', { searching: false });
    await second.flush();
    assert.deepEqual(second.events(), [
        ['game:update', { _id: ids.game, currentTurn: 'black' }],
        ['matchmaking:status:update', { searching: false }],
    ]);
});

test('switching accounts cannot carry over another account\'s private rooms', async t => {
    fixture(t);
    const first = await openSocket(t, auth());
    await first.emit('matchmaking:join', ids.owner);
    const disconnected = once(first.socket, 'disconnect');
    first.client.close();
    await disconnected;
    const second = await openSocket(t, auth(ids.viewer));
    await second.emit('matchmaking:join', ids.owner);
    assert.equal(second.socket.rooms.has(getUserRoom(ids.owner)), false);
    assert.equal(second.socket.rooms.has(getMatchmakingRoom(ids.owner)), false);
    assert.equal(second.socket.rooms.has(getUserRoom(ids.viewer)), true);
    io.to(getUserRoom(ids.owner)).emit('matchmaking:status:update', { searching: true });
    io.to(getMatchmakingRoom(ids.owner)).emit('match:found', ids.game);
    await second.flush();
    assert.deepEqual(second.events(), []);
});

test('reconnection cannot restore private access for a deleted account', async t => {
    const exists = fixture(t);
    const first = await openSocket(t, auth());
    const disconnected = once(first.socket, 'disconnect');
    first.client.close();
    await disconnected;
    exists.mock.mockImplementation(async () => null);
    const second = await openSocket(t, auth());
    assert.equal(second.handshake, '44{"message":"Unauthorized"}');
});

test('expired sessions are disconnected and lose both personal rooms', async t => {
    fixture(t);
    const credentials = { token: jwt.sign({ userId: ids.owner }, secret, { expiresIn: 2 }) };
    const client = await openSocket(t, credentials);
    const socket = client.socket;
    await client.emit('matchmaking:join', ids.owner);
    assert.equal(socket.rooms.has(getMatchmakingRoom(ids.owner)), true);
    const [reason] = await once(socket, 'disconnect');
    assert.equal(reason, 'server namespace disconnect');
    assert.equal(socket.rooms.size, 0);
    assert.equal(io.sockets.adapter.rooms.has(getUserRoom(ids.owner)), false);
    assert.equal(io.sockets.adapter.rooms.has(getMatchmakingRoom(ids.owner)), false);
    const reconnected = await openSocket(t, credentials);
    assert.equal(reconnected.handshake, '44{"message":"Unauthorized"}');
});
