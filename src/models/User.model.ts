import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    avatarURL: {
        type: String,
        default: '',
    },

    avatarFrameURL: {
        type: String,
        default: '',
    },

    profileSong: {
        songName: {
            type: String,
            default: '',
        },

        songURL: {
            type: String,
            default: '',
        },

        songAvatarURL: {
            type: String,
            default: '',
        },
    },

    description: {
        type: String,
        default: '',
        maxlength: 300,
    },

    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 24,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },

    password: {
        type: String,
        required: true,
    },

    elo: {
        type: Number,
        default: 1000,
    },

    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
}, {
    timestamps: true,
});

export const UserModel = mongoose.model('User', userSchema);