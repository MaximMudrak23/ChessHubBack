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

const userSchema = new mongoose.Schema({
    avatarURL: {
        type: String,
        default: '',
    },

    avatarFrameURL: {
        type: String,
        default: '',
    },

    unlockedFrames: {
        type: [String],
        default: [],
    },

    unlockedProfileBackgrounds: {
        type: [profileBackgroundSchema],
        default: [],
    },

    unlockedProfileSongs: {
        type: [profileSongSchema],
        default: [],
    },

    profileSong: {
        type: profileSongSchema,
        default: null,
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
        type: [userIconSchema],
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
        default: 'default.jpg',
    },
}, {
    timestamps: true,
});

export const UserModel = mongoose.model('User', userSchema);