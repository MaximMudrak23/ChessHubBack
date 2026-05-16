import mongoose from 'mongoose';

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
        minlength: 1,
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
        min: 0,
    },

    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },

    userIcons: {
        type: [
            {
                title: String,
                iconURL: String,
            }
        ],
        default: [],
    },

    profileBackground: {
        type: profileBackgroundSchema,
        default: null,
    },

    boardTheme: {
        type: String,
        enum: ['water'],
        default: 'water',
    },

    menuBackground: {
        type: String,
        enum: ['default', 'red-bull', 'wood'],
        default: 'default',
    },
}, {
    timestamps: true,
});

export const UserModel = mongoose.model('User', userSchema);