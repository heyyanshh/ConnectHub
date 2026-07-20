/**
 * ConnectHub - Message Controller
 * 
 * Business logic for message management:
 * - Get chat history between two users
 * - Search messages in a conversation
 * - Delete a message (soft delete)
 * - Pin/unpin a message
 * - Clear chat between two users
 * - Get recent conversations for a user
 */

const Message = require('../models/Message');

/**
 * Get chat history between two users.
 * Returns messages sorted by creation time (oldest first).
 * GET /api/messages/:user1/:user2
 */
const getChatHistory = async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        const skip = parseInt(req.query.skip) || 0;

        // Find the newest messages first for pagination
        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ],
            deleted: false
        })
        .populate('replyTo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // Reverse to send oldest first for proper chat rendering
        const sortedMessages = messages.reverse();

        res.status(200).json({
            success: true,
            count: sortedMessages.length,
            messages: sortedMessages,
            hasMore: sortedMessages.length === limit
        });
    } catch (error) {
        console.error('[MessageController] getChatHistory error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching chat history',
            error: error.message
        });
    }
};

/**
 * Search messages in a conversation.
 * GET /api/messages/search/:user1/:user2?q=searchterm
 */
const searchMessages = async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const searchQuery = req.query.q;

        if (!searchQuery || searchQuery.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ],
            deleted: false,
            message: { $regex: searchQuery, $options: 'i' }
        })
        .sort({ createdAt: -1 })
        .limit(50);

        res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('[MessageController] searchMessages error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error searching messages',
            error: error.message
        });
    }
};

/**
 * Delete a message (soft delete).
 * DELETE /api/messages/:id
 */
const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { $set: { deleted: true } },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('[MessageController] deleteMessage error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error deleting message',
            error: error.message
        });
    }
};

/**
 * Toggle pin status of a message.
 * PUT /api/messages/pin/:id
 */
const togglePinMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        message.pinned = !message.pinned;
        await message.save();

        res.status(200).json({
            success: true,
            message: message.pinned ? 'Message pinned' : 'Message unpinned',
            data: message
        });
    } catch (error) {
        console.error('[MessageController] togglePinMessage error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error pinning message',
            error: error.message
        });
    }
};

/**
 * Clear all messages between two users.
 * DELETE /api/messages/clear/:user1/:user2
 */
const clearChat = async (req, res) => {
    try {
        const { user1, user2 } = req.params;

        await Message.updateMany(
            {
                $or: [
                    { sender: user1, receiver: user2 },
                    { sender: user2, receiver: user1 }
                ]
            },
            { $set: { deleted: true } }
        );

        res.status(200).json({
            success: true,
            message: 'Chat cleared successfully'
        });
    } catch (error) {
        console.error('[MessageController] clearChat error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error clearing chat',
            error: error.message
        });
    }
};

/**
 * Get recent conversations for a user.
 * Returns the last message from each unique conversation partner.
 * GET /api/messages/recent/:phone
 */
const getRecentConversations = async (req, res) => {
    try {
        const phone = req.params.phone;

        /* Aggregate to get last message per conversation partner */
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: phone }, { receiver: phone }],
                    deleted: false
                }
            },
            {
                $addFields: {
                    partner: {
                        $cond: [
                            { $eq: ['$sender', phone] },
                            '$receiver',
                            '$sender'
                        ]
                    }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$partner',
                    lastMessage: { $first: '$message' },
                    lastMessageTime: { $first: '$createdAt' },
                    lastMessageType: { $first: '$messageType' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$receiver', phone] },
                                        { $eq: ['$seen', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { lastMessageTime: -1 } },
            { $limit: 50 }
        ]);

        res.status(200).json({
            success: true,
            count: conversations.length,
            conversations
        });
    } catch (error) {
        console.error('[MessageController] getRecentConversations error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching recent conversations',
            error: error.message
        });
    }
};

module.exports = {
    getChatHistory,
    searchMessages,
    deleteMessage,
    togglePinMessage,
    clearChat,
    getRecentConversations
};
