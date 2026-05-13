import mongoose from 'mongoose';

export async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);

        console.log('MONGO CONNECTED');
    } catch (error) {
        console.log('MONGO ERROR:', error);
    }
}