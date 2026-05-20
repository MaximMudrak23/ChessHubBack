import mongoose from 'mongoose';
import { startIdleBotsSearch } from '../services/botMatchmaking.service';

export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        console.log('MONGO CONNECTED');
        await startIdleBotsSearch();
    } catch (error) {
        console.log('MONGO ERROR:', error);
    }
}