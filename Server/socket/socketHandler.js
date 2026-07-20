/**
 * ConnectHub - Socket.IO Handler
 * 
 * Manages real-time communication between clients:
 * - User join/disconnect with online status broadcasting
 * - Real-time message sending and delivery
 * - Typing indicators
 * - Message seen acknowledgments
 * - Online users list management
 * 
 * Each connected socket is mapped to a user via their phone number.
 */

const User = require('../models/User');
const Message = require('../models/Message');

/* In-memory map of phone -> Set of socketIds for multi-tab/device support */
const onlineUsers = new Map();

/**
 * Initialize Socket.IO event handlers.
 * @param {Server} io - Socket.IO server instance
 */
const initializeSocket = (io) => {

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

        /**
         * EVENT: user:join
         * When a user opens the app and identifies themselves.
         * Updates their online status in DB and broadcasts to all clients.
         */
        socket.on('user:join', async (data) => {
            try {
                const { phone, displayName } = data;

                if (!phone) {
                    socket.emit('error', { message: 'Phone number is required' });
                    return;
                }

                /* Store the mapping: phone -> Set of socketIds */
                if (!onlineUsers.has(phone)) {
                    onlineUsers.set(phone, new Set());
                }
                onlineUsers.get(phone).add(socket.id);
                socket.phone = phone;

                console.log(`[Socket] User joined: ${displayName} (${phone}) -> ${socket.id}`);

                // Only update DB and broadcast online status if this is their first connection
                if (onlineUsers.get(phone).size === 1) {
                    /* Update user online status in database */
                    await User.findOneAndUpdate(
                        { phone },
                        {
                            $set: {
                                isOnline: true,
                                lastSeen: new Date(),
                                socketId: socket.id
                            }
                        }
                    );
                }

                /* Broadcast updated online users list to ALL connected clients */
                const onlineList = [];
                for (const [userPhone, sockIds] of onlineUsers.entries()) {
                    onlineList.push({ phone: userPhone, socketId: Array.from(sockIds)[0] });
                }
                io.emit('users:online', onlineList);
                io.emit('user:status_change', { phone, isOnline: true, lastSeen: new Date() });

                /* Send pending undelivered messages to this user */
                const pendingMessages = await Message.find({
                    receiver: phone,
                    delivered: false,
                    deleted: false
                }).sort({ createdAt: 1 });

                if (pendingMessages.length > 0) {
                    for (const msg of pendingMessages) {
                        socket.emit('message:receive', msg);
                        msg.delivered = true;
                        await msg.save();
                    }
                }

            } catch (error) {
                console.error('[Socket] user:join error:', error.message);
                socket.emit('error', { message: 'Failed to join' });
            }
        });

        /**
         * EVENT: message:send
         * When a user sends a message to another user.
         * Stores in DB, delivers to recipient if online, confirms to sender.
         */
        socket.on('message:send', async (data) => {
            try {
                const { sender, receiver, message, messageType, attachments, replyTo } = data;

                if (!sender || !receiver) {
                    socket.emit('error', { message: 'Sender and receiver are required' });
                    return;
                }

                /* Create message in database */
                const messageData = {
                    sender,
                    receiver,
                    message: message || '',
                    messageType: messageType || 'text',
                    attachments: attachments || [],
                    delivered: false,
                    seen: false
                };
                if (replyTo) {
                    messageData.replyTo = replyTo;
                }
                const newMessage = await Message.create(messageData);

                /* If it's a reply, we want to populate the replyTo field so receiver has context */
                let populatedMessage = newMessage;
                if (replyTo) {
                    populatedMessage = await Message.findById(newMessage._id).populate('replyTo');
                }

                /* Auto-add sender to receiver's contacts if not present */
                const Contact = require('../models/Contact');
                const User = require('../models/User');
                const existingContact = await Contact.findOne({ ownerPhone: receiver, phone: sender });
                if (!existingContact) {
                    const senderProfile = await User.findOne({ phone: sender });
                    await Contact.create({
                        ownerPhone: receiver,
                        phone: sender,
                        fullName: senderProfile ? senderProfile.displayName : sender,
                        category: 'Other'
                    });
                }

                /* Check if sender blocked receiver */
                const senderContactForReceiver = await Contact.findOne({ ownerPhone: sender, phone: receiver });
                if (senderContactForReceiver && senderContactForReceiver.isBlocked) {
                    socket.emit('error', { message: 'You have blocked this contact' });
                    return;
                }

                /* Check if receiver is online */
                const receiverSockets = onlineUsers.get(receiver);
                
                console.log(`[DEBUG] Attempting to send message. Sender: ${sender}, Receiver: ${receiver}`);
                console.log(`[DEBUG] onlineUsers map size: ${onlineUsers.size}`);

                if (receiverSockets && receiverSockets.size > 0) {
                    /* Receiver is online — check if receiver blocked sender before delivering */
                    if (existingContact && existingContact.isBlocked) {
                        console.log(`[DEBUG] Message dropped. ${receiver} has blocked ${sender}`);
                    } else {
                        /* Deliver immediately to all their devices */
                        for (const receiverSocketId of receiverSockets) {
                            if (!existingContact) {
                                io.to(receiverSocketId).emit('contact:new', { phone: sender });
                            }
                            io.to(receiverSocketId).emit('message:receive', populatedMessage);
                        }

                        /* Mark as delivered */
                        newMessage.delivered = true;
                        await newMessage.save();

                        /* Notify sender of delivery */
                        socket.emit('message:delivered', {
                            messageId: newMessage._id,
                            deliveredAt: new Date()
                        });
                    }
                }

                /* Confirm message was sent (to the sender) */
                socket.emit('message:sent', {
                    messageId: newMessage._id,
                    tempId: data.tempId, /* Client-side temp ID for matching */
                    createdAt: newMessage.createdAt,
                    replyTo: populatedMessage.replyTo
                });

            } catch (error) {
                console.error('[Socket] message:send error:', error.message);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        /**
         * EVENT: message:seen
         * When a user reads messages from another user.
         * Updates seen status and notifies the sender.
         */
        socket.on('message:seen', async (data) => {
            try {
                const { messageId, sender } = data;

                /* Mark message as seen in database */
                await Message.findByIdAndUpdate(messageId, {
                    $set: { seen: true }
                });

                /* Notify the original sender that their message was seen */
                const senderSockets = onlineUsers.get(sender);
                if (senderSockets) {
                    for (const senderSocketId of senderSockets) {
                        io.to(senderSocketId).emit('message:seen:ack', {
                            messageId,
                            seenAt: new Date()
                        });
                    }
                }

            } catch (error) {
                console.error('[Socket] message:seen error:', error.message);
            }
        });

        /**
         * EVENT: message:seen:bulk
         * Mark all messages from a sender to receiver as seen.
         */
        socket.on('message:seen:bulk', async (data) => {
            try {
                const { sender, receiver } = data;

                const result = await Message.updateMany(
                    { sender, receiver, seen: false, deleted: false },
                    { $set: { seen: true } }
                );

                /* Notify sender that their messages were read */
                const senderSockets = onlineUsers.get(sender);
                if (senderSockets) {
                    for (const senderSocketId of senderSockets) {
                        io.to(senderSocketId).emit('message:seen:bulk:ack', {
                            by: receiver,
                            count: result.modifiedCount
                        });
                    }
                }

            } catch (error) {
                console.error('[Socket] message:seen:bulk error:', error.message);
            }
        });

        /**
         * EVENT: message:react
         */
        socket.on('message:react', async (data) => {
            try {
                const { messageId, emoji, by } = data;
                
                const msg = await Message.findById(messageId);
                if (!msg) return;

                // Check if reaction exists
                const existingIndex = msg.reactions.findIndex(r => r.by === by);
                if (existingIndex > -1) {
                    if (msg.reactions[existingIndex].emoji === emoji) {
                        msg.reactions.splice(existingIndex, 1); // toggle off
                    } else {
                        msg.reactions[existingIndex].emoji = emoji; // change
                    }
                } else {
                    msg.reactions.push({ emoji, by }); // add
                }

                await msg.save();

                const receiverSockets = onlineUsers.get(msg.sender === by ? msg.receiver : msg.sender);
                if (receiverSockets) {
                    for (const receiverSocketId of receiverSockets) {
                        io.to(receiverSocketId).emit('message:reaction:update', { messageId, reactions: msg.reactions });
                    }
                }
            } catch (error) {
                console.error('[Socket] message:react error:', error.message);
            }
        });

        /**
         * EVENT: message:edit
         */
        socket.on('message:edit', async (data) => {
            try {
                const { messageId, newContent, sender } = data;
                const msg = await Message.findOneAndUpdate(
                    { _id: messageId, sender },
                    { $set: { message: newContent, isEdited: true } },
                    { new: true }
                );

                if (msg) {
                    const receiverSockets = onlineUsers.get(msg.receiver);
                    if (receiverSockets) {
                        for (const receiverSocketId of receiverSockets) {
                            io.to(receiverSocketId).emit('message:edited', { messageId, newContent, isEdited: true });
                        }
                    }
                    socket.emit('message:edit:success', { messageId, newContent, isEdited: true });
                }
            } catch (error) {
                console.error('[Socket] message:edit error:', error.message);
            }
        });

        /**
         * EVENT: message:delete
         */
        socket.on('message:delete', async (data) => {
            try {
                const { messageId, sender, forEveryone } = data;
                
                if (forEveryone) {
                    const msg = await Message.findOneAndUpdate(
                        { _id: messageId, sender },
                        { $set: { deleted: true } },
                        { new: true }
                    );
                    
                    if (msg) {
                        const receiverSockets = onlineUsers.get(msg.receiver);
                        if (receiverSockets) {
                            for (const receiverSocketId of receiverSockets) {
                                io.to(receiverSocketId).emit('message:deleted', { messageId });
                            }
                        }
                        socket.emit('message:delete:success', { messageId });
                    }
                } else {
                    // Delete for me - handled client side or soft delete logic not affecting receiver
                    socket.emit('message:delete:success', { messageId, localOnly: true });
                }
            } catch (error) {
                console.error('[Socket] message:delete error:', error.message);
            }
        });

        /**
         * EVENT: typing:start
         * Notify the receiver that the sender is typing.
         */
        socket.on('typing:start', (data) => {
            const { sender, receiver } = data;
            const receiverSockets = onlineUsers.get(receiver);
            if (receiverSockets) {
                for (const receiverSocketId of receiverSockets) {
                    io.to(receiverSocketId).emit('typing:indicator', {
                        sender,
                        isTyping: true
                    });
                }
            }
        });

        /**
         * EVENT: typing:stop
         * Notify the receiver that the sender stopped typing.
         */
        socket.on('typing:stop', (data) => {
            const { sender, receiver } = data;
            const receiverSockets = onlineUsers.get(receiver);
            if (receiverSockets) {
                for (const receiverSocketId of receiverSockets) {
                    io.to(receiverSocketId).emit('typing:indicator', {
                        sender,
                        isTyping: false
                    });
                }
            }
        });

        /**
         * EVENT: disconnect
         * When a user disconnects (closes app, loses connection).
         * Updates online status and broadcasts to all.
         */
        socket.on('disconnect', async () => {
            try {
                const phone = socket.phone;

                if (phone) {
                    console.log(`[Socket] User disconnected: ${phone}`);

                    const sockets = onlineUsers.get(phone);
                    if (sockets) {
                        sockets.delete(socket.id);

                        if (sockets.size === 0) {
                            /* Completely disconnected from all tabs/devices */
                            onlineUsers.delete(phone);

                            /* Update database */
                            await User.findOneAndUpdate(
                                { phone },
                                {
                                    $set: {
                                        isOnline: false,
                                        lastSeen: new Date(),
                                        socketId: ''
                                    }
                                }
                            );

                            /* Broadcast updated online users list */
                            const onlineList = [];
                            for (const [userPhone, sockIds] of onlineUsers.entries()) {
                                onlineList.push({ phone: userPhone, socketId: Array.from(sockIds)[0] });
                            }
                            io.emit('users:online', onlineList);
                            io.emit('user:status_change', { phone, isOnline: false, lastSeen: new Date() });
                        }
                    }
                }

            } catch (error) {
                console.error('[Socket] disconnect error:', error.message);
            }
        });
    });
};

module.exports = { initializeSocket };
