import mongoose from 'mongoose';

const matchTicketSchema = new mongoose.Schema({
    ownerType: {
        type: String,
        enum: ['user', 'bot'],
        required: true,
    },

    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },

    elo: {
        type: Number,
        required: true,
    },

    status: {
        type: String,
        enum: ['searching', 'matched'],
        default: 'searching',
    },

    searchStartedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

export const MatchTicketModel = mongoose.model('MatchTicket', matchTicketSchema);