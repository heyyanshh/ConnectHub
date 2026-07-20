/**
 * ConnectHub - User Model
 * 
 * Represents a user in the system.
 * Each user is uniquely identified by their phone number.
 * Tracks online status, last seen timestamp, display name, avatar, and about info.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    displayName: {
        type: String,
        required: [true, 'Display name is required'],
        trim: true,
        minlength: [2, 'Display name must be at least 2 characters'],
        maxlength: [50, 'Display name cannot exceed 50 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^\+?[1-9]\d{6,14}$/, 'Please provide a valid phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    avatar: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: 'Hey there! I am using ConnectHub',
        maxlength: [150, 'Status cannot exceed 150 characters']
    },
    aboutMe: {
        type: String,
        default: '',
        maxlength: [500, 'About me cannot exceed 500 characters']
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    socketId: {
        type: String,
        default: ''
    },
    allowGlobalMessage: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

/* Index on phone for fast lookups */
userSchema.index({ phone: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
