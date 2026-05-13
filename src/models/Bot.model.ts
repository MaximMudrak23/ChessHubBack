import mongoose from 'mongoose';

const botSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 24,
    },

    avatarURL: {
        type: String,
        default: '',
    },

    avatarFrameURL: {
        type: String,
        default: '',
    },

    description: {
        type: String,
        default: '',
        maxlength: 300,
    },

    elo: {
        type: Number,
        default: 1000,
    },

    engine: {
        type: String,
        enum: ['stockfish'],
        default: 'stockfish',
    },

    skillLevel: {
        type: Number,
        min: 1,
        max: 20,
        default: 5,
    },

    // style: {
    //     type: String,
    //     enum: ['balanced', 'aggressive', 'defensive', 'random'],
    //     default: 'balanced',
    // },

    pgnFolderURL: {
        type: String,
        default: '',
    },

    status: {
        type: String,
        enum: ['idle', 'searching', 'playing', 'disabled'],
        default: 'idle',
    },
}, {
    timestamps: true,
});

export const BotModel = mongoose.model('Bot', botSchema);