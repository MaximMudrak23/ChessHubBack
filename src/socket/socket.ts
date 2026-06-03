import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';

let io: Server | null = null;

export function getPlayerRoom(playerId: string) {
    return `player:${playerId}`;
}

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: '*',
        },
    });

    console.log('SOCKET IO INITIALIZED');

    io.on('connection', (socket) => {
        console.log('SOCKET CONNECTED:', socket.id);

        socket.on('game:join', (gameId: string) => {
            socket.join(gameId);
            console.log(`SOCKET ${socket.id} JOINED GAME ${gameId}`);
        });

        socket.on('game:leave', (gameId: string) => {
            socket.leave(gameId);
            console.log(`SOCKET ${socket.id} LEFT GAME ${gameId}`);
        });

        socket.on('player:watch', (playerId: string) => {
            socket.join(getPlayerRoom(playerId));
            console.log(`SOCKET ${socket.id} WATCHING PLAYER ${playerId}`);
        });

        socket.on('player:unwatch', (playerId: string) => {
            socket.leave(getPlayerRoom(playerId));
            console.log(`SOCKET ${socket.id} STOPPED WATCHING PLAYER ${playerId}`);
        });

        socket.on('disconnect', () => {
            console.log('SOCKET DISCONNECTED:', socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }

    return io;
}