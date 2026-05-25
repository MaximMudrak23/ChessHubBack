import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import gameRoutes from './routes/game.routes';

import { connectDB } from './config/db';
import { startIdleBotsSearch } from './services/botMatchmaking.service';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/game', gameRoutes);

app.get('/', (_, res) => {
    res.json({
        message: 'Server works',
    });
});

async function start() {
    try {
        await connectDB();

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, async () => {
            console.log(`SERVER STARTED ON PORT ${PORT}`);

            try {
                await startIdleBotsSearch();
                console.log('IDLE BOTS SEARCH STARTED');
            } catch (botError) {
                console.log('FAILED TO START BOTS SEARCH:', botError);
            }
        });

    } catch (error) {
        console.log('SERVER START FAILED:', error);
        process.exit(1);
    }
}

start()