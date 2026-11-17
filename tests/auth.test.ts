import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import authRoutes from '../src/routes/auth.routes';
import { KeyModel } from '../src/models/Key.model';
import { PendingRegistrationModel } from '../src/models/PendingRegistration.model';
import { UserModel } from '../src/models/User.model';
import { emailService } from '../src/services/email.service';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
const server = createServer(app);
let baseURL: string;
const originalJwtSecret = process.env.JWT_SECRET;
const originalServerURL = process.env.SERVER_URL;
const testSecret = 'auth-regression-test-secret';
const password = 'correct-password';
const user = {
    _id: '507f1f77bcf86cd799439011',
    email: 'victim@example.com',
    name: 'Test User',
    password: bcrypt.hashSync(password, 4),
    role: 'user',
};
const invite = { _id: 'invite-id', code: 'VALID-INVITE' };

function makePending(overrides: Record<string, unknown> = {}) {
    return {
        _id: 'pending-id',
        email: user.email,
        password: user.password,
        keyCode: invite.code,
        verifyToken: 'unguessable-email-verification-token',
        verified: false,
        expiresAt: new Date(Date.now() + 60_000),
        lastEmailSentAt: undefined as Date | undefined,
        save: async () => {},
        ...overrides,
    };
}

before(async () => {
    process.env.JWT_SECRET = testSecret;
    process.env.SERVER_URL = 'https://backend.example.test';
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalServerURL === undefined) delete process.env.SERVER_URL;
    else process.env.SERVER_URL = originalServerURL;
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
});

function assertAuthenticated(result: Awaited<ReturnType<typeof request>>) {
    const decoded = jwt.verify(result.body.token, testSecret) as jwt.JwtPayload;
    assert.equal(decoded.userId, user._id);
    assert.equal(result.body.user.id, user._id);
    assert.equal(result.body.user.email, user.email);
    assert.equal(result.body.user.boardTheme, 'water');
    assert.equal(result.body.user.pieceSet, 'default');
    assert.equal(result.body.user.menuBackground, 'default');
    assert.equal('password' in result.body.user, false);
}

async function request(path: string, body?: unknown, token?: string) {
    const response = await fetch(`${baseURL}/auth${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
}

test('status never discloses a legacy JWT or private user data to an email-only caller', async t => {
    const pending = {
        _id: 'pending-id',
        email: 'victim@example.com',
        verified: true,
        authToken: 'legacy-jwt-that-must-stay-private',
        expiresAt: new Date(Date.now() + 60_000),
    };
    t.mock.method(PendingRegistrationModel, 'findOne', async () => pending);
    const findUser = t.mock.method(UserModel, 'findOne', async () => ({
        _id: 'victim-id', email: pending.email, unlockedFrames: ['private-frame'],
    }));
    const deletePending = t.mock.method(PendingRegistrationModel, 'deleteOne', async () => ({}));

    for (let attempt = 0; attempt < 2; attempt++) {
        const result = await request('/register/status?email=victim%40example.com');
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { verified: true });
    }
    assert.equal(findUser.mock.callCount(), 0);
    assert.equal(deletePending.mock.callCount(), 0);
});

for (const [name, pending] of [
    ['unknown', null],
    ['unverified', makePending()],
    ['expired', makePending({ verified: true, expiresAt: new Date(0) })],
] as const) {
    test(`status returns only verified=false for an ${name} registration`, async t => {
        t.mock.method(PendingRegistrationModel, 'findOne', async () => pending);
        const result = await request('/register/status?email=victim%40example.com');
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { verified: false });
    });
}

test('status works for verified registrations without a stored JWT', async t => {
    t.mock.method(PendingRegistrationModel, 'findOne', async () => makePending({ verified: true }));
    assert.deepEqual(await request('/register/status?email=victim%40example.com'), {
        status: 200, body: { verified: true },
    });
});

test('status rejects missing, blank and repeated email values before querying MongoDB', async t => {
    const findPending = t.mock.method(PendingRegistrationModel, 'findOne', async () => null);
    for (const query of ['', '?email=', '?email=%20', '?email=a&email=b', '?email[$ne]=x']) {
        const result = await request(`/register/status${query}`);
        assert.equal(result.status, 400);
        assert.equal('token' in result.body, false);
    }
    assert.equal(findPending.mock.callCount(), 0);
});

test('status database failures do not disclose secrets', async t => {
    t.mock.method(console, 'log', () => {});
    t.mock.method(PendingRegistrationModel, 'findOne', async () => {
        throw new Error('private database error');
    });
    assert.deepEqual(await request('/register/status?email=victim%40example.com'), {
        status: 500, body: { message: 'Server error' },
    });
});

for (const endpoint of ['/login', '/register', '/register/start', '/register/resend']) {
    test(`${endpoint} rejects invalid field types and MongoDB selectors`, async t => {
        const findUser = t.mock.method(UserModel, 'findOne', async () => null);
        const findKey = t.mock.method(KeyModel, 'findOne', async () => null);
        const findPending = t.mock.method(PendingRegistrationModel, 'findOne', async () => null);
        const fields = endpoint === '/register/resend' ? ['email']
            : endpoint === '/login' ? ['email', 'password'] : ['email', 'password', 'key'];
        for (const field of fields) {
            for (const value of [{ $ne: null }, ['victim@example.com'], 42, null, '', '   ']) {
                if (field === 'password' && value === '   ') continue;
                const result = await request(endpoint, {
                    email: user.email, password, key: invite.code, [field]: value,
                });
                assert.equal(result.status, 400, `${field}=${JSON.stringify(value)}`);
                assert.equal('token' in result.body, false);
            }
        }
        assert.equal((await request(endpoint, {})).status, 400);
        assert.equal(findUser.mock.callCount(), 0);
        assert.equal(findKey.mock.callCount(), 0);
        assert.equal(findPending.mock.callCount(), 0);
    });
}

test('login requires the correct password and returns a usable JWT for that user', async t => {
    t.mock.method(UserModel, 'findOne', async (query: unknown) => {
        assert.deepEqual(query, { email: user.email });
        return user;
    });
    t.mock.method(UserModel, 'findById', async (id: unknown) => {
        assert.equal(id, user._id);
        return user;
    });
    const result = await request('/login', { email: user.email, password });
    assert.equal(result.status, 200);
    assertAuthenticated(result);
    const profile = await request('/me', undefined, result.body.token);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.id, user._id);
    assert.equal('password' in profile.body.user, false);
});

test('login never issues a JWT for an incorrect password or unknown user', async t => {
    t.mock.method(console, 'log', () => {});
    t.mock.method(UserModel, 'findOne', async (query: { email: string }) =>
        query.email === user.email ? user : null);
    for (const [email, suppliedPassword, status] of [
        [user.email, 'wrong-password', 401],
        ['unknown@example.com', password, 404],
    ] as const) {
        const result = await request('/login', { email, password: suppliedPassword });
        assert.equal(result.status, status);
        assert.equal('token' in result.body, false);
        assert.equal('user' in result.body, false);
    }
});

test('login preserves existing password handling, including whitespace passwords', async t => {
    const whitespacePassword = '   ';
    t.mock.method(UserModel, 'findOne', async () => ({
        ...user, password: await bcrypt.hash(whitespacePassword, 4),
    }));
    const result = await request('/login', { email: user.email, password: whitespacePassword });
    assert.equal(result.status, 200);
    assertAuthenticated(result);
});

test('/me rejects missing, malformed and forged JWTs before reading user data', async t => {
    const findUser = t.mock.method(UserModel, 'findById', async () => user);
    const forged = jwt.sign({ userId: user._id }, 'attacker-secret');
    for (const token of [undefined, 'malformed', forged]) {
        const result = await request('/me', undefined, token);
        assert.equal(result.status, 401);
        assert.equal('user' in result.body, false);
        assert.equal('token' in result.body, false);
    }
    assert.equal(findUser.mock.callCount(), 0);
});

for (const endpoint of ['/register', '/register/start']) {
    test(`${endpoint} refuses to issue an existing user's JWT`, async t => {
        t.mock.method(console, 'log', () => {});
        t.mock.method(KeyModel, 'findOne', async () => invite);
        t.mock.method(UserModel, 'findOne', async () => user);
        const createUser = t.mock.method(UserModel, 'create', async () => user);
        const result = await request(endpoint, { email: user.email, password: 'attacker-password', key: invite.code });
        assert.equal(result.status, 409);
        assert.equal('token' in result.body, false);
        assert.equal('user' in result.body, false);
        assert.equal(createUser.mock.callCount(), 0);
    });

    test(`${endpoint} rejects invalid invites`, async t => {
        t.mock.method(console, 'log', () => {});
        t.mock.method(KeyModel, 'findOne', async () => null);
        const result = await request(endpoint, { email: user.email, password, key: 'INVALID' });
        assert.equal(result.status, 400);
        assert.equal('token' in result.body, false);
    });

    test(`${endpoint} creates a new account with a hashed password (email disabled)`, async t => {
        t.mock.method(emailService, 'isEnabled', () => false);
        t.mock.method(KeyModel, 'findOne', async () => invite);
        t.mock.method(UserModel, 'findOne', async () => null);
        t.mock.method(UserModel, 'create', async (data: { email: string; password: string }) => {
            assert.equal(data.email, user.email);
            assert.notEqual(data.password, password);
            assert.equal(await bcrypt.compare(password, data.password), true);
            return { ...user, ...data };
        });
        const deleteKey = t.mock.method(KeyModel, 'deleteOne', async () => ({}));
        const result = await request(endpoint, { email: user.email, password, key: invite.code });
        assert.equal(result.status, 201);
        assertAuthenticated(result);
        assert.deepEqual(deleteKey.mock.calls[0].arguments, [{ _id: invite._id }]);
    });
}

for (const [name, pending] of [
    ['unknown', null],
    ['expired', makePending({ expiresAt: new Date(0) })],
    ['already used', makePending({ verified: true })],
] as const) {
    test(`verification rejects an ${name} email token without creating a user or JWT`, async t => {
        t.mock.method(console, 'log', () => {});
        t.mock.method(PendingRegistrationModel, 'findOne', async () => pending);
        const findUser = t.mock.method(UserModel, 'findOne', async () => null);
        const createUser = t.mock.method(UserModel, 'create', async () => user);
        const result = await request('/register/verify/invalid-or-expired-token');
        assert.equal(result.status, 400);
        assert.equal('token' in result.body, false);
        assert.equal(findUser.mock.callCount(), 0);
        assert.equal(createUser.mock.callCount(), 0);
    });
}

for (const [name, existingUser, existingKey, status] of [
    ['existing account', user, invite, 409],
    ['invalid invite', null, null, 400],
] as const) {
    test(`verification rejects an ${name} without issuing JWTs`, async t => {
        t.mock.method(console, 'log', () => {});
        t.mock.method(PendingRegistrationModel, 'findOne', async () => makePending());
        t.mock.method(UserModel, 'findOne', async () => existingUser);
        t.mock.method(KeyModel, 'findOne', async () => existingKey);
        const createUser = t.mock.method(UserModel, 'create', async () => user);
        const result = await request('/register/verify/unguessable-email-verification-token');
        assert.equal(result.status, status);
        assert.equal('token' in result.body, false);
        assert.equal(createUser.mock.callCount(), 0);
    });
}

test('email registration, verification, status polling and password login work without storing a JWT', async t => {
    let pending: ReturnType<typeof makePending> | null = null;
    let createdUser: typeof user | null = null;
    const sent: { to: string; link: string }[] = [];
    t.mock.method(console, 'log', () => {});
    t.mock.method(emailService, 'isEnabled', () => true);
    t.mock.method(emailService, 'sendVerificationEmail', async (to: string, link: string) => {
        sent.push({ to, link });
    });
    t.mock.method(KeyModel, 'findOne', async () => invite);
    t.mock.method(KeyModel, 'deleteOne', async () => ({}));
    t.mock.method(UserModel, 'findOne', async () => createdUser);
    t.mock.method(UserModel, 'create', async (data: { email: string; password: string }) => {
        createdUser = { ...user, ...data };
        return createdUser;
    });
    t.mock.method(PendingRegistrationModel, 'findOneAndUpdate', async (_query: unknown, data: Record<string, unknown>) => {
        pending = makePending(data);
        return pending;
    });
    t.mock.method(PendingRegistrationModel, 'updateOne', async () => ({}));
    t.mock.method(PendingRegistrationModel, 'findOne', async (query: { email?: string; verifyToken?: string }) => {
        if (pending && (query.email === pending.email || query.verifyToken === pending.verifyToken)) return pending;
        return null;
    });

    const start = await request('/register/start', { email: user.email, password, key: invite.code });
    assert.deepEqual(start, { status: 200, body: { message: 'Verification email sent' } });
    const registration = pending!;
    assert.equal(await bcrypt.compare(password, registration.password), true);
    assert.match(registration.verifyToken, /^[a-f0-9]{64}$/);
    assert.equal('authToken' in registration, false);
    assert.deepEqual(sent, [{
        to: user.email,
        link: `${process.env.SERVER_URL}/auth/register/verify/${registration.verifyToken}`,
    }]);
    assert.deepEqual((await request(`/register/status?email=${user.email}`)).body, { verified: false });

    const verify = await request(`/register/verify/${registration.verifyToken}`);
    assert.equal(verify.status, 200);
    assertAuthenticated(verify);
    assert.equal(registration.verified, true);
    assert.equal('authToken' in registration, false);
    assert.deepEqual((await request(`/register/status?email=${user.email}`)).body, { verified: true });
    const replay = await request(`/register/verify/${registration.verifyToken}`);
    assert.equal(replay.status, 400);
    assert.equal('token' in replay.body, false);
    const login = await request('/login', { email: user.email, password });
    assert.equal(login.status, 200);
    assertAuthenticated(login);
});

test('resend sends only an email link and never returns a JWT', async t => {
    const pending = makePending();
    t.mock.method(PendingRegistrationModel, 'findOne', async () => pending);
    const sendEmail = t.mock.method(emailService, 'sendVerificationEmail', async () => {});
    const result = await request('/register/resend', { email: user.email });
    assert.deepEqual(result, { status: 200, body: { message: 'Verification email resent' } });
    assert.deepEqual(sendEmail.mock.calls[0].arguments, [
        user.email, `${process.env.SERVER_URL}/auth/register/verify/${pending.verifyToken}`,
    ]);
    assert.ok(pending.lastEmailSentAt instanceof Date);
});

for (const [name, pending, status] of [
    ['unknown', null, 404],
    ['expired', makePending({ expiresAt: new Date(0) }), 404],
    ['cooldown', makePending({ lastEmailSentAt: new Date() }), 429],
    ['verified', makePending({ verified: true, authToken: 'legacy-private-jwt' }), 200],
] as const) {
    test(`resend handles ${name} registrations without returning JWTs or sending email`, async t => {
        t.mock.method(console, 'log', () => {});
        t.mock.method(PendingRegistrationModel, 'findOne', async () => pending);
        const sendEmail = t.mock.method(emailService, 'sendVerificationEmail', async () => {});
        const result = await request('/register/resend', { email: user.email });
        assert.equal(result.status, status);
        assert.equal('token' in result.body, false);
        assert.equal('user' in result.body, false);
        assert.equal(sendEmail.mock.callCount(), 0);
    });
}
