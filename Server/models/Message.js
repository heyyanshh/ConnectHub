/**
 * ConnectHub - Message Model
 * 
 * Represents a chat message between two users.
 * Tracks sender, receiver, message content, delivery/seen status,
 * file attachments, pinned state, and soft deletion.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: [true, 'Sender phone is required'],
        trim: true
    },
    receiver: {
        type: String,
        required: [true, 'Receiver phone is required'],
        trim: true
    },
    message: {
        type: String,
        default: '',
        maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    attachments: [{
        fileName: { type: String, default: '' },
        filePath: { type: String, default: '' },
        fileType: { type: String, default: '' },
        fileSize: { type: Number, default: 0 }
    }],
    delivered: {
        type: Boolean,
        default: false
    },
    seen: {
        type: Boolean,
        default: false
    },
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: null
    },
    reactions: [{
        emoji: String,
        by: String
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    pinned: {
        type: Boolean,
        default: false
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

/* Index for fetching conversation history between two users */
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

/* Index for searching messages */
messageSchema.index({ message: 'text' });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
