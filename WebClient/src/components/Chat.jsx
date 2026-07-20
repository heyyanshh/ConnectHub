import React, { useState, useRef, useEffect } from 'react';
import socketService from '../services/socket';
import { getChatHistory, uploadFile, toggleBlock, clearChat } from '../services/api';
import EmojiPicker from 'emoji-picker-react';
import { 
  Send, Smile, Paperclip, MoreVertical, 
  Search, Check, CheckCheck, X, Reply, 
  Edit2, File as FileIcon, Download,
  UserX, Mail, MapPin, Info, Trash2
} from 'lucide-react';

// Helper: get display name from contact
const getName = (contact) => contact?.displayName || contact?.fullName || 'Unknown';

export default function Chat({ user, contacts, onlineUsers, userStatuses, messages, setMessages, initialContact, refreshContacts }) {
  const [activeContact, setActiveContact] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New State variables for upgraded chat
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showProfileCard, setShowProfileCard] = useState(false);
  
  const messagesEndRef = useRef(null);
  const observerTarget = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-select contact
  useEffect(() => {
    if (initialContact) {
      setActiveContact(initialContact);
      setShowProfileCard(false);
    }
  }, [initialContact]);

  // Fetch chat history with pagination
  const fetchHistory = async (reset = false) => {
    if (!activeContact) return;
    try {
      setIsLoadingHistory(true);
      const currentSkip = reset ? 0 : skip;
      const res = await getChatHistory(user.phone, activeContact.phone, currentSkip, 50);
      
      if (res.success && res.messages) {
        const history = res.messages.map(msg => ({
          _id: msg._id,
          from: msg.sender,
          to: msg.receiver,
          content: msg.message,
          timestamp: msg.createdAt,
          status: msg.seen ? 'read' : (msg.delivered ? 'delivered' : 'sent'),
          replyTo: msg.replyTo,
          reactions: msg.reactions || [],
          isEdited: msg.isEdited || false,
          deleted: msg.deleted || false,
          messageType: msg.messageType || 'text',
          attachments: msg.attachments || []
        }));
        
        setMessages(prev => {
          if (reset) return history;
          const newMsgs = [...history, ...prev];
          const uniqueMsgs = [];
          const seenIds = new Set();
          for (const m of newMsgs) {
            if (!seenIds.has(m._id)) {
               uniqueMsgs.push(m);
               seenIds.add(m._id);
            }
          }
          return uniqueMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
        setHasMore(res.hasMore);
        if (!reset) setSkip(prev => prev + 50);
        else setSkip(50);
      }
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Initial load when active contact changes
  useEffect(() => {
    setMessages([]);
    setSkip(0);
    setHasMore(true);
    fetchHistory(true);
    setReplyingTo(null);
    setEditingMsgId(null);
    setNewMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact, user.phone]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingHistory && activeContact) {
          const oldHeight = scrollContainerRef.current?.scrollHeight;
          fetchHistory(false).then(() => {
             requestAnimationFrame(() => {
               if (scrollContainerRef.current) {
                 scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - oldHeight;
               }
             });
          });
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingHistory, skip, activeContact]);

  // Socket Event Listeners for Upgraded Features
  useEffect(() => {
    if (!activeContact) return;
    
    // Mark as read when opening chat
    socketService.emit('message:seen:bulk', { sender: activeContact.phone, receiver: user.phone });
    
    const onTyping = (data) => {
      if (data.sender === activeContact.phone) {
        setTypingUsers(prev => ({ ...prev, [data.sender]: data.isTyping }));
      }
    };
    
    const onMsgSeenAck = (data) => {
       setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, status: 'read' } : m));
    };
    
    const onMsgSeenBulkAck = (data) => {
       if (data.by === activeContact.phone) {
         setMessages(prev => prev.map(m => m.to === data.by ? { ...m, status: 'read' } : m));
       }
    };
    
    const onMsgReact = (data) => {
       setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, reactions: data.reactions } : m));
    };
    
    const onMsgDelete = (data) => {
       setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, deleted: true } : m));
    };
    
    const onMsgEdit = (data) => {
       setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, content: data.newContent, isEdited: true } : m));
    };

    const onReceive = (msg) => {
      // If we receive a message while chat is open, immediately mark as read
      if (activeContact && (msg.sender === activeContact.phone || msg.receiver === activeContact.phone)) {
        if (msg.sender === activeContact.phone) {
          socketService.emit('message:seen:bulk', { sender: activeContact.phone, receiver: user.phone });
        }
      }
    };
    
    socketService.on('typing:indicator', onTyping);
    socketService.on('message:seen:ack', onMsgSeenAck);
    socketService.on('message:seen:bulk:ack', onMsgSeenBulkAck);
    socketService.on('message:reaction:update', onMsgReact);
    socketService.on('message:deleted', onMsgDelete);
    socketService.on('message:edited', onMsgEdit);
    socketService.on('message:edit:success', onMsgEdit);
    socketService.on('message:delete:success', onMsgDelete);
    socketService.on('message:receive', onReceive);
    
    return () => {
      socketService.off('typing:indicator', onTyping);
      socketService.off('message:seen:ack', onMsgSeenAck);
      socketService.off('message:seen:bulk:ack', onMsgSeenBulkAck);
      socketService.off('message:reaction:update', onMsgReact);
      socketService.off('message:deleted', onMsgDelete);
      socketService.off('message:edited', onMsgEdit);
      socketService.off('message:edit:success', onMsgEdit);
      socketService.off('message:delete:success', onMsgDelete);
      socketService.off('message:receive', onReceive);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContact]);

  // Auto-scroll logic - only scroll if near bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // If user is within 300px of bottom, auto-scroll to new message
      if (scrollHeight - scrollTop - clientHeight < 300) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!activeContact) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socketService.emit('typing:start', { sender: user.phone, receiver: activeContact.phone });
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.emit('typing:stop', { sender: user.phone, receiver: activeContact.phone });
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    if (editingMsgId) {
      // Handle edit
      socketService.emit('message:edit', { messageId: editingMsgId, newContent: newMessage, sender: user.phone });
      setEditingMsgId(null);
      setNewMessage('');
      return;
    }

    const backendPayload = {
      sender: user.phone,
      receiver: activeContact.phone,
      message: newMessage,
      messageType: 'text',
      attachments: [],
      replyTo: replyingTo ? replyingTo._id : null
    };

    const tempId = Date.now().toString();
    backendPayload.tempId = tempId;

    const msgData = {
      _id: tempId,
      from: user.phone,
      to: activeContact.phone,
      content: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sent',
      replyTo: replyingTo
    };

    socketService.emit('message:send', backendPayload);
    setMessages(prev => [...prev, msgData]);
    setNewMessage('');
    setReplyingTo(null);
    setShowEmoji(false);
    
    setTimeout(() => {
       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleFileUpload = async (file) => {
    if (!file || !activeContact) return;
    try {
      const res = await uploadFile(file);
      if (res.success) {
        const isImage = file.type.startsWith('image/');
        const backendPayload = {
          sender: user.phone,
          receiver: activeContact.phone,
          messageType: isImage ? 'image' : 'file',
          attachments: [res.file]
        };
        const tempId = Date.now().toString();
        backendPayload.tempId = tempId;
        
        socketService.emit('message:send', backendPayload);
        
        setMessages(prev => [...prev, {
          _id: tempId,
          from: user.phone,
          to: activeContact.phone,
          messageType: backendPayload.messageType,
          attachments: backendPayload.attachments,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }]);
        
        setTimeout(() => {
           messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error('File upload failed', err);
      alert('Failed to upload file. Must be under 10MB.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClearChat = async () => {
    if (!activeContact) return;
    if (!window.confirm(`Are you sure you want to clear all messages with ${getName(activeContact)}?`)) return;
    try {
      const res = await clearChat(user.phone, activeContact.phone);
      if (res.success) {
        setMessages([]);
        setShowProfileCard(false);
      }
    } catch (error) {
      console.error('Failed to clear chat', error);
      alert('Failed to clear chat');
    }
  };

  const handleBlockToggle = async () => {
    try {
      if (!activeContact) return;
      await toggleBlock(activeContact._id);
      if (refreshContacts) {
        refreshContacts();
      }
      setActiveContact(prev => ({...prev, isBlocked: !prev.isBlocked}));
    } catch (err) {
      console.error('Failed to toggle block status', err);
    }
  };

  // Group messages by date
  const formatTime = (isoString) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isSameDay = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
  };

  const getLastSeenText = (phone) => {
    if (onlineUsers.includes(phone)) return null;
    const ls = userStatuses?.[phone]?.lastSeen;
    if (!ls) return 'Offline';
    const d = new Date(ls);
    if (isSameDay(d, new Date())) {
      return `Last seen today at ${formatTime(ls)}`;
    }
    return `Last seen ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${formatTime(ls)}`;
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  // Actions
  const handleReact = (messageId, emoji) => {
    socketService.emit('message:react', { messageId, emoji, by: user.phone });
    setActiveMenuId(null);
  };

  const handleDelete = (messageId) => {
    socketService.emit('message:delete', { messageId, sender: user.phone, forEveryone: true });
    setActiveMenuId(null);
  };

  const activeMessages = activeContact ? messages.filter(m => 
    (m.from === user.phone && m.to === activeContact.phone) || 
    (m.from === activeContact.phone && m.to === user.phone)
  ) : [];

  const allChatContacts = contacts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (c.displayName || c.fullName || '').toLowerCase();
    return name.includes(q) || (c.phone || '').includes(q);
  });

  return (
    <div className="h-full w-full flex animate-fade-in" style={{ background: 'var(--bg-dark)' }}>
      
      {/* Left Panel: Conversations List */}
      <div className="glass-panel" style={{ width: '380px', borderRadius: '0', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '32px 24px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800' }}>Messages</h2>
            <button style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '50%', color: 'var(--text-secondary)' }}>
              <MoreVertical size={20} />
            </button>
          </div>
          
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 46px', borderRadius: '24px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-primary)', fontSize: '15px' }}
            />
            <Search size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '15px' }} />
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {allChatContacts.map(contact => {
              const contactName = getName(contact);
              const contactMsgs = messages.filter(m => (m.from === user.phone && m.to === contact.phone) || (m.from === contact.phone && m.to === user.phone));
              const lastMsg = contactMsgs.length > 0 ? contactMsgs[contactMsgs.length - 1] : null;
              const isOnline = onlineUsers.includes(contact.phone);
              const isActive = activeContact?.phone === contact.phone;
              
              // Calculate unread
              const unreadCount = contactMsgs.filter(m => m.to === user.phone && m.status !== 'read').length;

              return (
                <div 
                  key={contact.phone}
                  onClick={() => setActiveContact(contact)}
                  style={{ 
                    padding: '16px', cursor: 'pointer', borderRadius: '20px', marginBottom: '10px',
                    background: isActive ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'transparent',
                    boxShadow: isActive ? '0 10px 25px -5px var(--accent-primary)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-input)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
                      width: '56px', height: '56px', borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <span style={{ fontWeight: 'bold', fontSize: '22px', color: 'white' }}>{contactName.charAt(0)}</span>
                    </div>
                    {isOnline && (
                      <div style={{ 
                        position: 'absolute', bottom: 0, right: 0, 
                        width: '16px', height: '16px', background: '#10b981', 
                        borderRadius: '50%', border: `3px solid ${isActive ? 'transparent' : 'var(--bg-panel)'}` 
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="flex justify-between items-center mb-1">
                      <h4 style={{ fontWeight: '700', fontSize: '17px', color: isActive ? 'white' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {contactName}
                      </h4>
                      {lastMsg && (
                        <span style={{ fontSize: '12px', color: unreadCount > 0 && !isActive ? '#10b981' : (isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)'), fontWeight: unreadCount > 0 ? '700' : '400' }}>
                          {formatTime(lastMsg.timestamp)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p style={{ 
                        fontSize: '14px', 
                        color: isActive ? 'rgba(255,255,255,0.9)' : (unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'),
                        fontWeight: unreadCount > 0 && !isActive ? '700' : '400',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                      }}>
                        {lastMsg ? (
                          <>
                            {lastMsg.from === user.phone && (
                              <span style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                                <CheckCheck size={14} color={lastMsg.status === 'read' ? (isActive ? "white" : "#3b82f6") : (isActive ? "rgba(255,255,255,0.6)" : "var(--text-muted)")} />
                              </span>
                            )}
                            {lastMsg.deleted ? <i>Message deleted</i> : (lastMsg.messageType === 'image' ? '📸 Image' : (lastMsg.messageType === 'file' ? '📁 File' : lastMsg.content))}
                          </>
                        ) : (
                          contact.status || 'Hey there! I am using ConnectHub'
                        )}
                      </p>
                      {unreadCount > 0 && !isActive && (
                        <div style={{ background: '#10b981', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRadius: '12px', padding: '2px 8px' }}>
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Right Panel: Active Chat */}
      <div 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
      >
        
        {isDragging && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(59, 130, 246, 0.1)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '4px dashed var(--accent-primary)' }}>
            <h2 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800' }}>Drop files to send</h2>
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, opacity: 0.02, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="glass-panel" style={{ padding: '24px 32px', borderRadius: '0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', padding: '8px', borderRadius: '12px', transition: 'background 0.2s', margin: '-8px' }}
                onClick={() => setShowProfileCard(true)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--accent-primary)' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '22px', color: 'white' }}>{getName(activeContact).charAt(0)}</span>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{getName(activeContact)}</h3>
                  <p className="text-sm flex items-center gap-2" style={{ color: onlineUsers.includes(activeContact.phone) ? '#10b981' : 'var(--text-secondary)', marginTop: '4px' }}>
                    {onlineUsers.includes(activeContact.phone) ? (
                      <><span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span> Online</>
                    ) : getLastSeenText(activeContact.phone)}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollContainerRef} style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1, position: 'relative' }}>
              <div ref={observerTarget} style={{ height: '20px' }}>
                 {isLoadingHistory && <div className="text-center text-sm text-gray">Loading history...</div>}
              </div>

              {activeMessages.map((msg, idx) => {
                  const isMe = msg.from === user.phone;
                  const showDate = idx === 0 || !isSameDay(msg.timestamp, activeMessages[idx - 1].timestamp);

                  return (
                    <React.Fragment key={idx}>
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span style={{ background: 'var(--bg-input)', padding: '8px 20px', borderRadius: '24px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div 
                        className="animate-slide-up" 
                        style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', position: 'relative' }}
                        onMouseEnter={() => setActiveMenuId(msg._id)}
                        onMouseLeave={() => setActiveMenuId(null)}
                      >
                        
                        {/* Context Menu */}
                        {activeMenuId === msg._id && !msg.deleted && (
                          <div style={{ position: 'absolute', top: '-15px', right: isMe ? '0' : 'auto', left: isMe ? 'auto' : '0', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', gap: '4px', padding: '4px', zIndex: 50, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
                             <button onClick={() => setReplyingTo(msg)} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px' }} title="Reply"><Reply size={16} /></button>
                             <button onClick={() => handleReact(msg._id, '❤️')} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px' }} title="React ❤️">❤️</button>
                             <button onClick={() => handleReact(msg._id, '👍')} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px' }} title="React 👍">👍</button>
                             <button onClick={() => handleReact(msg._id, '😂')} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px' }} title="React 😂">😂</button>
                             {isMe && <button onClick={() => { setEditingMsgId(msg._id); setNewMessage(msg.content); }} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px' }} title="Edit"><Edit2 size={16} /></button>}
                             {isMe && <button onClick={() => handleDelete(msg._id)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '8px' }} title="Delete"><Trash2 size={16} /></button>}
                          </div>
                        )}

                        <div style={{ 
                          padding: '16px 20px', 
                          background: msg.deleted ? 'transparent' : (isMe ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-panel)'),
                          borderRadius: isMe ? '24px 24px 6px 24px' : '24px 24px 24px 6px',
                          color: msg.deleted ? 'var(--text-muted)' : (isMe ? 'white' : 'var(--text-primary)'),
                          fontSize: '16px',
                          lineHeight: '1.5',
                          boxShadow: msg.deleted ? 'none' : (isMe ? '0 8px 24px -8px var(--accent-primary)' : '0 4px 15px rgba(0,0,0,0.1)'),
                          border: msg.deleted ? '1px dashed var(--border-color)' : (isMe ? 'none' : '1px solid var(--border-color)'),
                          fontStyle: msg.deleted ? 'italic' : 'normal'
                        }}>
                          {/* Reply UI */}
                          {!msg.deleted && msg.replyTo && (
                             <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', marginBottom: '8px', borderLeft: '4px solid rgba(255,255,255,0.5)', fontSize: '14px' }}>
                                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Replying to</span>
                                {msg.replyTo.message}
                             </div>
                          )}
                          
                          {/* Attachments */}
                          {!msg.deleted && msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ marginBottom: msg.content ? '12px' : '0' }}>
                              {msg.messageType === 'image' ? (
                                <img src={msg.attachments[0].filePath} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => window.open(msg.attachments[0].filePath, '_blank')} />
                              ) : (
                                <a href={msg.attachments[0].filePath} download target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '12px', color: 'inherit', textDecoration: 'none' }}>
                                  <FileIcon size={24} />
                                  <span>{msg.attachments[0].fileName}</span>
                                  <Download size={18} style={{ marginLeft: 'auto' }} />
                                </a>
                              )}
                            </div>
                          )}
                          
                          {msg.deleted ? 'This message was deleted' : msg.content}
                        </div>
                        
                        {/* Reactions */}
                        {!msg.deleted && msg.reactions && msg.reactions.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '-8px', marginBottom: '8px', zIndex: 2, background: 'var(--bg-panel)', padding: '4px 8px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                            {msg.reactions.map((r, i) => (
                              <span key={i} style={{ fontSize: '14px' }}>{r.emoji}</span>
                            ))}
                          </div>
                        )}

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                          {formatTime(msg.timestamp)}
                          {msg.isEdited && <span>(edited)</span>}
                          {isMe && (
                             <CheckCheck size={16} color={msg.status === 'read' ? "#3b82f6" : "var(--text-muted)"} />
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
              })}
              
              {/* Typing indicator */}
              {typingUsers[activeContact.phone] && (
                 <div className="animate-fade-in flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', padding: '10px 20px', background: 'var(--bg-panel)', alignSelf: 'flex-start', borderRadius: '24px 24px 24px 6px', border: '1px solid var(--border-color)' }}>
                    <div className="typing-dots"><span>.</span><span>.</span><span>.</span></div> {getName(activeContact)} is typing
                 </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="glass-panel" style={{ padding: '24px 32px', borderRadius: '0', borderTop: '1px solid var(--border-color)', zIndex: 10, position: 'relative' }}>
              
              {/* Replying To Preview */}
              {replyingTo && (
                <div className="animate-slide-up" style={{ position: 'absolute', top: '-60px', left: '32px', right: '32px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px 16px 0 0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none' }}>
                   <div style={{ borderLeft: '4px solid var(--accent-primary)', paddingLeft: '12px' }}>
                     <p style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '4px' }}>Replying to {replyingTo.from === user.phone ? 'yourself' : getName(activeContact)}</p>
                     <p style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>{replyingTo.content}</p>
                   </div>
                   <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
              )}

              {/* Editing Preview */}
              {editingMsgId && (
                <div className="animate-slide-up" style={{ position: 'absolute', top: '-60px', left: '32px', right: '32px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '16px 16px 0 0', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none' }}>
                   <div style={{ borderLeft: '4px solid #f59e0b', paddingLeft: '12px' }}>
                     <p style={{ fontWeight: 'bold', fontSize: '13px', color: '#f59e0b', marginBottom: '4px' }}>Editing Message</p>
                   </div>
                   <button onClick={() => { setEditingMsgId(null); setNewMessage(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
              )}

              {/* Emoji Picker Popover */}
              {showEmoji && (
                <div style={{ position: 'absolute', bottom: '100px', left: '32px', zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                </div>
              )}

              {activeContact.isBlocked ? (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', padding: '20px', borderRadius: '40px', border: '1px solid var(--border-color)', color: '#ef4444' }}>
                  <UserX size={20} />
                  <span style={{ fontWeight: '500' }}>You have blocked this contact. Unblock to send a message.</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-input)', padding: '10px 10px 10px 20px', borderRadius: (replyingTo || editingMsgId) ? '0 0 40px 40px' : '40px', border: '1px solid var(--border-color)' }}>
                  <button type="button" onClick={() => setShowEmoji(!showEmoji)} style={{ background: 'transparent', padding: '8px', color: showEmoji ? 'var(--accent-primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>
                    <Smile size={24} />
                  </button>
                  
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files[0])} />
                  
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', padding: '8px', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='var(--accent-primary)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}>
                    <Paperclip size={24} />
                  </button>
                  
                  <input 
                    type="text" 
                    placeholder={editingMsgId ? "Edit your message..." : "Type your message here..."}
                    value={newMessage}
                    onChange={handleTyping}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 8px', fontSize: '16px', outline: 'none', color: 'var(--text-primary)' }}
                  />
                  
                  <button type="submit" disabled={!newMessage.trim()} style={{ 
                    padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    width: '56px', height: '56px', background: newMessage.trim() ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-panel)',
                    color: newMessage.trim() ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.3s', border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                    boxShadow: newMessage.trim() ? '0 8px 24px -8px var(--accent-primary)' : 'none'
                  }}>
                    {editingMsgId ? <Check size={22} /> : <Send size={22} style={{ transform: newMessage.trim() ? 'translateX(2px)' : 'none', transition: 'transform 0.2s' }} />}
                  </button>
                </form>
              )}
            </div>

            {/* Profile Card Side Panel */}
            {showProfileCard && (
              <div className="glass-panel" style={{ 
                position: 'absolute', top: 0, right: 0, bottom: 0, width: '380px', 
                borderLeft: '1px solid var(--border-color)', zIndex: 100, display: 'flex', flexDirection: 'column',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Contact Info</h3>
                  <button onClick={() => setShowProfileCard(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <X size={24} />
                  </button>
                </div>
                
                <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)', marginBottom: '20px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '48px', color: 'white' }}>{getName(activeContact).charAt(0)}</span>
                  </div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>{getName(activeContact)}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>{activeContact.phone}</p>
                </div>
                
                <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <Info size={24} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</p>
                      <p style={{ fontSize: '16px', fontWeight: '500' }}>{activeContact.category || 'Other'}</p>
                    </div>
                  </div>
                  
                  {activeContact.email && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <Mail size={24} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</p>
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>{activeContact.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {activeContact.address && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <MapPin size={24} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Address</p>
                        <p style={{ fontSize: '16px', fontWeight: '500', lineHeight: '1.5' }}>{activeContact.address}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    onClick={handleClearChat} 
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '16px', 
                      background: 'transparent', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      color: '#ef4444', 
                      border: '1px solid rgba(239, 68, 68, 0.4)', 
                      cursor: 'pointer', transition: 'all 0.2s', 
                      fontWeight: '600', fontSize: '16px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Trash2 size={24} color="#ef4444" strokeWidth={2.5} />
                    Clear Chat
                  </button>

                  <button 
                    onClick={handleBlockToggle} 
                    style={{ 
                      width: '100%', padding: '16px', borderRadius: '16px', 
                      background: activeContact.isBlocked ? 'var(--bg-panel)' : 'linear-gradient(135deg, #f87171, #ef4444)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                      color: activeContact.isBlocked ? '#ef4444' : 'white', 
                      border: activeContact.isBlocked ? '1px solid rgba(239, 68, 68, 0.4)' : 'none', 
                      cursor: 'pointer', transition: 'all 0.2s', 
                      boxShadow: activeContact.isBlocked ? 'none' : '0 4px 15px rgba(239, 68, 68, 0.4)',
                      fontWeight: '600', fontSize: '16px'
                    }}
                  >
                    <UserX size={24} color={activeContact.isBlocked ? '#ef4444' : 'white'} strokeWidth={2.5} />
                    {activeContact.isBlocked ? "Unblock Contact" : "Block Contact"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animate-slide-up" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(45, 212, 191, 0.1))', padding: '40px', borderRadius: '50%', marginBottom: '32px', boxShadow: 'inset 0 0 60px rgba(59, 130, 246, 0.1)' }}>
              <div style={{ width: '96px', height: '96px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-10deg)', boxShadow: '0 24px 48px -12px var(--accent-primary)' }}>
                <span style={{ fontSize: '48px', color: 'white', fontWeight: '800', fontFamily: 'serif' }}>C</span>
              </div>
            </div>
            <h2 className="text-gradient" style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>ConnectHub Web</h2>
            <p style={{ fontSize: '18px', maxWidth: '420px', textAlign: 'center', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              Select a conversation from the left menu to start chatting with high-end features.
            </p>
          </div>
        )}
      </div>

      {/* Typing animation styles */}
      <style>{`
        .typing-dots span {
          animation: blink 1.4s infinite;
          animation-fill-mode: both;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
