import mongoose from 'mongoose';

export async function connectDB() {
    try {
        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error('MONGO_URI is missing');
        }

        await mongoose.connect(mongoURI);
        console.log('MONGO CONNECTED');
    } catch (error) {
        console.log('MONGO ERROR:', error);
        throw error;
    }
}