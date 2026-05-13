import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import { connectDB } from './config/db';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.get('/', (_, res) => {
    res.json({
        message: 'Server works',
    });
});

connectDB();

app.listen(3000, () => {
    console.log('SERVER STARTED');
});