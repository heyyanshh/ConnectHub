/**
 * ConnectHub - Message Routes
 * 
 * Endpoints:
 *   GET    /api/messages/recent/:phone          - Get recent conversations
 *   GET    /api/messages/search/:user1/:user2   - Search messages
 *   DELETE /api/messages/clear/:user1/:user2    - Clear chat
 *   PUT    /api/messages/pin/:id                - Toggle pin
 *   GET    /api/messages/:user1/:user2          - Get chat history
 *   DELETE /api/messages/:id                    - Delete message
 */

const express = require('express');
const router = express.Router();
const {
    getChatHistory,
    searchMessages,
    deleteMessage,
    togglePinMessage,
    clearChat,
    getRecentConversations
} = require('../controllers/messageController');

/* Static/specific routes first */
router.get('/recent/:phone', getRecentConversations);
router.get('/search/:user1/:user2', searchMessages);
router.delete('/clear/:user1/:user2', clearChat);
router.put('/pin/:id', togglePinMessage);

/* Parameterized routes */
router.get('/:user1/:user2', getChatHistory);
router.delete('/:id', deleteMessage);

module.exports = router;
