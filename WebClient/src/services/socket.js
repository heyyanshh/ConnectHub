import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(user) {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // In production, connect to the same origin; in dev, Vite proxy handles '/'
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    this.socket = io(socketUrl);

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.socket.emit('user:join', { phone: user.phone, displayName: user.displayName || 'User' });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    // Register all active listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => {
        this.socket.on(event, cb);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit', event);
    }
  }
}

const socketService = new SocketService();
export default socketService;
