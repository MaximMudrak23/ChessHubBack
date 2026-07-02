import { isValidSkillLevel } from '../engines/engineConfig';
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

    engine: {
        type: String,
        enum: ['stockfish', 'komodo', 'dragon', null],
        default: null,
    },

    skillLevel: {
        type: Number,
        default: null,
        validate: {
            validator: function (this: any, value: number | null) {
                if (value === null || this.engine === null) return true;
                return isValidSkillLevel(this.engine, value);
            },
            message: (props: any) => `skillLevel ${props.value} недопустим для этого движка`,
        },
    },
}, { _id: false });

const pieceSchema = new mongoose.Schema({
    id: String,
    piece: String,
    square: String,
    hasMoved: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

const lastMoveSchema = new mongoose.Schema({
    piece: String,
    from: String,
    to: String,
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

    pieces: {
        type: [pieceSchema],
        default: [],
    },

    lastMove: {
        type: lastMoveSchema,
        default: null,
    },

    halfmoveClock: {
        type: Number,
        default: 0,
    },

    fullmoveNumber: {
        type: Number,
        default: 1,
    },

    positionHistory: {
        type: [String],
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