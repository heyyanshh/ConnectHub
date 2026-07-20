/**
 * ConnectHub - Contact Model
 * 
 * Represents a contact belonging to a specific user (ownerPhone).
 * Each contact stores personal info, category, favorite status, and profile picture.
 * ownerPhone + phone combination must be unique (one user can't have duplicate contacts).
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    ownerPhone: {
        type: String,
        required: [true, 'Owner phone is required'],
        trim: true
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^\+?[1-9]\d{6,14}$/, 'Please provide a valid phone number']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
        match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    address: {
        type: String,
        trim: true,
        default: '',
        maxlength: [300, 'Address cannot exceed 300 characters']
    },
    category: {
        type: String,
        enum: ['Family', 'Friends', 'Work', 'College', 'Other'],
        default: 'Other'
    },
    favorite: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    profilePicture: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

/* Compound index: prevent duplicate contacts per user */
contactSchema.index({ ownerPhone: 1, phone: 1 }, { unique: true });

/* Index for fast lookups by owner */
contactSchema.index({ ownerPhone: 1 });

/* Index for searching */
contactSchema.index({ ownerPhone: 1, fullName: 'text', email: 'text' });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
