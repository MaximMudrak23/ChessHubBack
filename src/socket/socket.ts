import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.model';

let io: Server | null = null;

export function getPlayerRoom(playerId: string) {
    return `player:${playerId}`;
}
export function getMatchmakingRoom(userId: string) {
    return `matchmaking:${userId}`;
}

export function getUserRoom(userId: string) {
    return `user:${userId}`;
}

function parseId(value: unknown): string | null {
    return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
        ? value.toLowerCase() : null;
}

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: '*',
        },
    });

    console.log('SOCKET IO INITIALIZED');

    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        // Public game and profile subscriptions remain available without a token.
        if (token === undefined) return next();

        try {
            if (typeof token !== 'string' || !token) throw new Error('UNAUTHORIZED');
            const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
            const userId = typeof payload === 'string' ? null : parseId(payload.userId);
            if (!userId || typeof payload === 'string') throw new Error('UNAUTHORIZED');
            if (!await UserModel.exists({ _id: userId })) throw new Error('UNAUTHORIZED');
            if (payload.exp !== undefined && payload.exp * 1000 <= Date.now()) throw new Error('UNAUTHORIZED');

            socket.data.userId = userId;
            socket.data.expiresAt = payload.exp === undefined ? undefined : payload.exp * 1000;
            next();
        } catch {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        console.log('SOCKET CONNECTED:', socket.id);
        const userId: string | undefined = socket.data.userId;
        const expiresAt: number | undefined = socket.data.expiresAt;
        let expiryTimer: ReturnType<typeof setTimeout> | undefined;

        socket.on('disconnect', () => {
            clearTimeout(expiryTimer);
            console.log('SOCKET DISCONNECTED:', socket.id);
        });

        function expireSession() {
            if (expiresAt === undefined) return;
            const remaining = expiresAt - Date.now();
            if (remaining <= 0) {
                socket.disconnect(true);
                return;
            }
            expiryTimer = setTimeout(expireSession, Math.min(remaining, 2 ** 31 - 1));
            expiryTimer.unref();
        }

        if (userId) {
            expireSession();
            if (!socket.connected) return;
            // Personal status does not depend on public profile watches or search subscriptions.
            socket.join(getUserRoom(userId));
        }

        function handleRoomEvent(
            event: string,
            roomForId: (id: string) => string,
            action: 'join' | 'leave',
            ownerOnly = false,
        ) {
            socket.on(event, (value: unknown) => {
                const id = parseId(value);
                if (!id) return;
                if (ownerOnly && (!userId || id !== userId
                    || (expiresAt !== undefined && expiresAt <= Date.now()))) return;

                const room = roomForId(id);
                if (action === 'join') socket.join(room);
                else socket.leave(room);
            });
        }

        handleRoomEvent('game:join', id => id, 'join');
        handleRoomEvent('game:leave', id => id, 'leave');
        handleRoomEvent('player:watch', getPlayerRoom, 'join');
        handleRoomEvent('player:unwatch', getPlayerRoom, 'leave');
        handleRoomEvent('matchmaking:join', getMatchmakingRoom, 'join', true);
        handleRoomEvent('matchmaking:leave', getMatchmakingRoom, 'leave', true);
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }

    return io;
}
