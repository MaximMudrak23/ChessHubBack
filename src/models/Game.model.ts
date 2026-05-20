import mongoose from 'mongoose';

const gamePlayerSchema = new mongoose.Schema({
    playerType: {
        type: String,
        enum: ['user', 'bot'],
        required: true,
    },

    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },

    name: String,
    elo: Number,
    avatarURL: String,
    avatarFrameURL: String,
    userIcons: {
        type: [
            {
                title: String,
                iconURL: String,
            }
        ],
        default: [],
    },

    skillLevel: {
        type: Number,
        default: null,
    },
}, { _id: false });

const gameSchema = new mongoose.Schema({
    white: {
        type: gamePlayerSchema,
        required: true,
    },

    black: {
        type: gamePlayerSchema,
        required: true,
    },

    currentTurn: {
        type: String,
        enum: ['white', 'black'],
        default: 'white',
    },

    moves: {
        type: Array,
        default: [],
    },

    status: {
        type: String,
        enum: ['active', 'finished'],
        default: 'active',
    },

    winner: {
        type: String,
        enum: ['white', 'black', 'draw', null],
        default: null,
    },

    finishedReason: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

export const GameModel = mongoose.model('Game', gameSchema);