import mongoose from "mongoose";

const keySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
}, {
    timestamps: true,
})

export const KeyModel = mongoose.model('Key', keySchema);