import mongoose from 'mongoose';

const pendingRegistrationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true,
    },

    password: {
        type: String,
        required: true,
    },

    keyCode: {
        type: String,
        required: true,
    },

    verifyToken: {
        type: String,
        required: true,
        unique: true,
    },

    verified: {
        type: Boolean,
        default: false,
    },

    authToken: {
        type: String,
        default: null,
    },

    expiresAt: {
        type: Date,
        required: true,
        expires: 0,
    },

    lastEmailSentAt: Date
}, {
    timestamps: true,
});

export const PendingRegistrationModel = mongoose.model(
    'PendingRegistration',
    pendingRegistrationSchema
);