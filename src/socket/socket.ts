import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';

let io: Server | null = null;

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