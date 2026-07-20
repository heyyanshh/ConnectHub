import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Contacts from './components/Contacts';
import Chat from './components/Chat';
import Profile from './components/Profile';
import Settings from './components/Settings';
import socketService from './services/socket';
import { fetchContacts } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Global State
  const [contacts, setContacts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatTarget, setChatTarget] = useState(null); // Contact to open chat with

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse user from local storage:', e);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      // Connect Socket
      socketService.connect(user);
      
      // Load Contacts
      loadContacts();

      // Setup Socket Listeners
      socketService.on('users:online', (users) => setOnlineUsers(users.map(u => u.phone)));
      socketService.on('user:status_change', ({ phone, isOnline, lastSeen }) => {
        setUserStatuses(prev => ({ ...prev, [phone]: { isOnline, lastSeen } }));
      });
      
      socketService.on('contact:new', () => {
        loadContacts();
      });

      socketService.on('message:receive', (msg) => {
        // Map backend message format to frontend format
        const frontendMsg = {
          _id: msg._id,
          from: msg.sender,
          to: msg.receiver,
          content: msg.message,
          timestamp: msg.createdAt || new Date().toISOString(),
          status: msg.seen ? 'read' : (msg.delivered ? 'delivered' : 'sent'),
          replyTo: msg.replyTo,
          reactions: msg.reactions || [],
          isEdited: msg.isEdited || false,
          deleted: msg.deleted || false,
          messageType: msg.messageType || 'text',
          attachments: msg.attachments || []
        };
        
        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, frontendMsg];
        });
        
        // Global notification sound
        if (msg.sender !== user.phone) {
           try {
             new Audio('/notification.mp3').play().catch(() => {});
             if (Notification.permission === 'granted' && document.hidden) {
               new Notification('New Message', {
                 body: msg.messageType === 'text' ? msg.message : 'Sent an attachment',
                 icon: '/favicon.ico'
               });
             } else if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
               Notification.requestPermission();
             }
           } catch (e) {
             console.error('Notification error:', e);
           }
        }
      });

      return () => {
        socketService.disconnect();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadContacts = async () => {
    try {
      const response = await fetchContacts(user.phone);
      if (response.success) {
        setContacts(response.contacts);
        const newStatuses = {};
        response.contacts.forEach(c => {
          if (c.lastSeen) {
            newStatuses[c.phone] = { isOnline: c.isOnline, lastSeen: c.lastSeen };
          }
        });
        setUserStatuses(prev => ({ ...prev, ...newStatuses }));
      }
    } catch (err) {
      console.error('Failed to load contacts', err);
    }
  };

  const handleStartChat = (contact) => {
    setChatTarget(contact);
    setActiveTab('chat');
  };

  const handleLogout = () => {
    socketService.disconnect();
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return <div className="text-gray flex justify-center items-center h-full">Loading...</div>;

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  // Render active tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} contacts={contacts} onlineUsers={onlineUsers} onNavigate={setActiveTab} onStartChat={handleStartChat} />;
      case 'contacts':
        return <Contacts user={user} contacts={contacts} onlineUsers={onlineUsers} refreshContacts={loadContacts} onStartChat={handleStartChat} />;
      case 'chat':
        return <Chat user={user} contacts={contacts} onlineUsers={onlineUsers} userStatuses={userStatuses} messages={messages} setMessages={setMessages} initialContact={chatTarget} refreshContacts={loadContacts} />;
      case 'profile':
        return <Profile user={user} onUpdateUser={(newUser) => {
          setUser(newUser);
          localStorage.setItem('user', JSON.stringify(newUser));
        }} onLogout={handleLogout} />;
      case 'settings':
        return <Settings user={user} setUser={setUser} />;
      default:
        return <Dashboard user={user} contacts={contacts} onlineUsers={onlineUsers} onNavigate={setActiveTab} onStartChat={handleStartChat} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
