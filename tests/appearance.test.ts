import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../src/routes/auth.routes';
import userRoutes from '../src/routes/user.routes';
import { getPrivateUserDTO, getSelfUserDTO } from '../src/dtos/user.dto';
import { UserModel } from '../src/models/User.model';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
const server = createServer(app);
let baseURL: string;
const originalJwtSecret = process.env.JWT_SECRET;
const secret = 'appearance-test-secret';
const userID = '507f1f77bcf86cd799439011';
const otherUserID = '507f1f77bcf86cd799439012';
const password = 'correct-password';
const account = {
    _id: userID,
    name: 'Appearance User',
    email: 'appearance@example.test',
    password: bcrypt.hashSync(password, 4),
};
const defaults = { boardTheme: 'water', pieceSet: 'default', menuBackground: 'default' };
const appearance = { boardTheme: 'New-board_2', pieceSet: 'new_set-3', menuBackground: 'new-background_4' };
const token = jwt.sign({ userId: userID }, secret);

before(async () => {
    process.env.JWT_SECRET = secret;
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
});

async function request(path: string, method = 'PATCH', body?: unknown, authToken: string | null = token) {
    const response = await fetch(`${baseURL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(authToken === null ? {} : { Authorization: `Bearer ${authToken}` }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
}

function assertAppearance(user: Record<string, unknown>, expected = defaults) {
    for (const field of ['boardTheme', 'pieceSet', 'menuBackground'] as const) {
        assert.equal(user[field], expected[field], field);
    }
}

test('new accounts receive valid appearance defaults in the model and both private DTOs', async () => {
    const user = new UserModel(account);
    await user.validate();
    assertAppearance(user.toObject());
    assertAppearance(getSelfUserDTO(user));
    assertAppearance(getPrivateUserDTO(user));
});

test('the model accepts new IDs and normalizes legacy background filenames on writes', async () => {
    const user = new UserModel({ ...account, ...appearance });
    await user.validate();
    assertAppearance(getSelfUserDTO(user), appearance);
    user.menuBackground = 'dark-mac.jpg';
    await user.validate();
    assert.equal(user.menuBackground, 'dark-mac');
    for (const field of ['boardTheme', 'pieceSet', 'menuBackground'] as const) {
        const invalid = new UserModel({ ...account, [field]: '../invalid' });
        await assert.rejects(invalid.validate());
    }
});

test('appearance saves all fields in one write for the token owner and survives login, me and profile updates', async t => {
    let stored = new UserModel(account).toObject();
    const otherUser = new UserModel({ ...account, _id: otherUserID, email: 'other@example.test' }).toObject();
    const originalOtherUser = JSON.stringify(otherUser);
    t.mock.method(UserModel, 'findById', async (id: unknown) => {
        assert.equal(id, userID);
        return UserModel.hydrate(stored);
    });
    t.mock.method(UserModel, 'findOne', async (filter: unknown) => {
        assert.deepEqual(filter, { email: account.email });
        return UserModel.hydrate(stored);
    });
    const write = t.mock.method(UserModel.collection, 'updateOne', async (filter: any, update: any) => {
        assert.equal(filter._id.toString(), userID);
        stored = { ...stored, ...update.$set };
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    });

    const result = await request('/users/appearance', 'PATCH', {
        ...appearance, userId: otherUserID, _id: otherUserID, role: 'admin', email: 'changed@example.test',
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.message, 'Appearance updated');
    assertAppearance(result.body.user, appearance);
    assert.deepEqual(result.body.user, JSON.parse(JSON.stringify(getSelfUserDTO(UserModel.hydrate(stored)))));
    assert.equal(result.body.user.id, userID);
    assert.equal(result.body.user.role, 'user');
    assert.equal(result.body.user.email, account.email);
    assert.equal('password' in result.body.user, false);
    assert.equal(write.mock.callCount(), 1);
    const update = (write.mock.calls[0].arguments as any[])[1].$set;
    for (const field of ['boardTheme', 'pieceSet', 'menuBackground'] as const) {
        assert.equal(update[field], appearance[field]);
        assert.equal(stored[field], appearance[field]);
    }
    assert.equal(JSON.stringify(otherUser), originalOtherUser);

    const login = await request('/auth/login', 'POST', { email: account.email, password }, null);
    assert.equal(login.status, 200);
    assertAppearance(login.body.user, appearance);
    const me = await request('/auth/me', 'GET', undefined, login.body.token);
    assert.equal(me.status, 200);
    assertAppearance(me.body.user, appearance);
    const profile = await request('/users/profile', 'PATCH', { name: 'Updated Name', description: 'Updated description' });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.name, 'Updated Name');
    assertAppearance(profile.body.user, appearance);
});

test('appearance writes include all three fields even when some IDs have not changed', async t => {
    const stored = new UserModel(account).toObject();
    t.mock.method(UserModel, 'findById', async () => UserModel.hydrate(stored));
    const write = t.mock.method(UserModel.collection, 'updateOne', async (_filter: unknown, update: any) => {
        assert.equal(update.$set.boardTheme, defaults.boardTheme);
        assert.equal(update.$set.pieceSet, 'set1');
        assert.equal(update.$set.menuBackground, defaults.menuBackground);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    });
    const expected = { ...defaults, pieceSet: 'set1' };
    const result = await request('/users/appearance', 'PATCH', expected);
    assert.equal(result.status, 200);
    assertAppearance(result.body.user, expected);
    assert.equal(write.mock.callCount(), 1);
});

for (const background of ['default.jpg', 'dark-mac.jpg']) {
    test(`legacy ${background} and missing pieceSet are normalized on login, me and profile responses`, async t => {
        const legacy = UserModel.hydrate({ ...account, menuBackground: background });
        const expected = { ...defaults, menuBackground: background.replace('.jpg', '') };
        // Hydration preserves the filename actually stored in an old MongoDB document.
        assert.equal(legacy.menuBackground, background);
        t.mock.method(UserModel, 'findOne', async () => legacy);
        t.mock.method(UserModel, 'findById', async () => legacy);
        t.mock.method(UserModel.collection, 'updateOne', async (_filter: unknown, update: any) => {
            assert.equal(update.$set.menuBackground, expected.menuBackground);
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
        });
        assertAppearance(getPrivateUserDTO({ ...account, menuBackground: background }), expected);
        assertAppearance(getSelfUserDTO({ ...account, menuBackground: background }), expected);
        const login = await request('/auth/login', 'POST', { email: account.email, password }, null);
        assert.equal(login.status, 200);
        assertAppearance(login.body.user, expected);
        const me = await request('/auth/me', 'GET');
        assert.equal(me.status, 200);
        assertAppearance(me.body.user, expected);
        const profile = await request('/users/profile', 'PATCH', { name: account.name, description: '' });
        assert.equal(profile.status, 200);
        assertAppearance(profile.body.user, expected);
    });
}

test('invalid or missing IDs reject the whole request before reading or changing the user', async t => {
    const findUser = t.mock.method(UserModel, 'findById', async () => new UserModel(account));
    const write = t.mock.method(UserModel.collection, 'updateOne', async () => ({}));
    const invalidValues = [
        undefined, null, '', ' ', 'a'.repeat(65), '-water', '_water', 'has space', ' water', 'water ',
        'water\n', 'water\r', 'water\r\n', 'water\t', 'водa', 'é', 'default.jpg', '../water',
        'https://example.test/image', 'a/b', 'a\\b', 1, true, ['water'], { $ne: null },
    ];
    for (const field of ['boardTheme', 'pieceSet', 'menuBackground']) {
        for (const value of invalidValues) {
            const result = await request('/users/appearance', 'PATCH', { ...defaults, [field]: value });
            assert.equal(result.status, 400, `${field}=${JSON.stringify(value)}`);
            assert.equal('user' in result.body, false);
        }
    }
    for (const body of [undefined, {}, []]) {
        assert.equal((await request('/users/appearance', 'PATCH', body)).status, 400);
    }
    assert.equal(findUser.mock.callCount(), 0);
    assert.equal(write.mock.callCount(), 0);
});

test('ID format accepts lengths 1 and 64 and arbitrary future IDs', async t => {
    t.mock.method(UserModel, 'findById', async () => UserModel.hydrate(account));
    t.mock.method(UserModel.collection, 'updateOne', async () => ({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }));
    for (const id of ['a', '7', 'A'.repeat(64), '0-new_Theme-42']) {
        const expected = { boardTheme: id, pieceSet: id, menuBackground: id };
        const result = await request('/users/appearance', 'PATCH', expected);
        assert.equal(result.status, 200);
        assertAppearance(result.body.user, expected);
    }
});

test('missing, invalid, expired and forged tokens cannot read or change appearance', async t => {
    const findUser = t.mock.method(UserModel, 'findById', async () => new UserModel(account));
    const tokens = [
        null, 'invalid', jwt.sign({ userId: userID }, 'wrong-secret'),
        jwt.sign({ userId: userID }, secret, { expiresIn: -1 }), jwt.sign({}, secret),
    ];
    for (const authToken of tokens) {
        const result = await request('/users/appearance', 'PATCH', defaults, authToken);
        assert.equal(result.status, 401);
        assert.equal('user' in result.body, false);
    }
    assert.equal(findUser.mock.callCount(), 0);
});

test('missing users return 404 without a write', async t => {
    t.mock.method(console, 'log', () => {});
    t.mock.method(UserModel, 'findById', async () => null);
    const write = t.mock.method(UserModel.collection, 'updateOne', async () => ({}));
    assert.deepEqual(await request('/users/appearance', 'PATCH', defaults), {
        status: 404, body: { message: 'User not found' },
    });
    assert.equal(write.mock.callCount(), 0);
});

for (const operation of ['read', 'write']) {
    test(`database ${operation} failures return 500 without exposing private errors`, async t => {
        t.mock.method(console, 'log', () => {});
        t.mock.method(UserModel, 'findById', async () => {
            if (operation === 'read') throw new Error('private database details');
            return UserModel.hydrate(account);
        });
        t.mock.method(UserModel.collection, 'updateOne', async () => { throw new Error('private database details'); });
        assert.deepEqual(await request('/users/appearance', 'PATCH', appearance), {
            status: 500, body: { message: 'Server error' },
        });
    });
}
