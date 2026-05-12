import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

app.get('/', (_, res) => {
    res.json({
        message: 'Server works',
    });
});

app.listen(3000, () => {
    console.log('SERVER STARTED');
});