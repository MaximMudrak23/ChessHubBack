import mongoose from 'mongoose';

const userIconSchema = new mongoose.Schema({
    title: String,
    iconURL: String,
}, { _id: false });

const profileBackgroundSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
}, { _id: false });

const profileSongSchema = new mongoose.Schema({
    songName: {
        type: String,
        required: true,
    },
    songAuthor: {
        type: String,
        required: true,
    },
    songURL: {
        type: String,
        required: true,
    },
    songAvatarURL: {
        type: String,
        required: true,
    },
}, { _id: false });

const botSchema = new mongoose.Schema({
    isBot: {
        type: Boolean,
        default: true,
    },

    botType: {
        type: String,
        enum: ['stockfish', 'mirror', 'personality'],
        default: 'stockfish',
    },

    linkedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },

    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 24,
    },

    description: {
        type: String,
        default: '',
        maxlength: 300,
    },

    avatarURL: {
        type: String,
        default: '',
    },

    avatarFrameURL: {
        type: String,
        default: '',
    },

    userIcons: {
        type: [userIconSchema],
        default: [
            {
                title: 'Bot',
                iconURL: '/uploads/badges/bot-badge.png',
            },
        ],
    },

    profileBackground: {
        type: profileBackgroundSchema,
        default: null,
    },

    profileSong: {
        type: profileSongSchema,
        default: null,
    },

    elo: {
        type: Number,
        default: 1000,
        min: 0,
    },

    engine: {
        type: String,
        enum: ['stockfish'],
        default: 'stockfish',
    },

    skillLevel: {
        type: Number,
        min: 0,
        max: 20,
        default: 5,
    },

    pgnFiles: {
        type: [String],
        default: [],
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