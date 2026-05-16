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
        type: {
            type: String,
            enum: ['image', 'video'],
            default: 'image',
        },
        url: {
            type: String,
            default: '',
        },
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