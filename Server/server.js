/**
 * ConnectHub - Main Server Entry Point
 * 
 * Sets up Express server with:
 * - CORS configuration for Qt desktop client
 * - JSON body parsing
 * - Static file serving for uploads
 * - REST API routes (users, contacts, messages, uploads)
 * - Socket.IO for real-time communication
 * - MongoDB connection
 * 
 * Default port: 3000
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { initializeSocket } = require('./socket/socketHandler');

/* Import Routes */
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

/* Initialize Express and HTTP server */
const app = express();
const server = http.createServer(app);

/* Initialize Socket.IO with CORS */
const io = new Server(server, {
    cors: {
        origin: '*', /* Allow all origins (Qt client doesn't have a fixed origin) */
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    },
    /* Transport configuration */
    transports: ['websocket', 'polling'],
    /* Ping configuration for connection health */
    pingTimeout: 60000,
    pingInterval: 25000
});

/* Middleware */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* Serve uploaded files statically */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* API Routes */
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

/* Health check endpoint */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'ConnectHub Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/* Root endpoint */
app.get('/', (req, res) => {
    res.status(200).json({
        name: 'ConnectHub Server',
        version: '1.0.0',
        description: 'Smart Contact Management System with Real-Time Chat',
        endpoints: {
            health: '/api/health',
            users: '/api/users',
            contacts: '/api/contacts',
            messages: '/api/messages',
            upload: '/api/upload'
        }
    });
});

/* Serve React frontend in production */
if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '..', 'WebClient', 'dist');
    app.use(express.static(clientBuildPath));

    /* SPA catch-all — must come after API routes */
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    /* 404 handler (development only — in production the SPA catch-all handles this) */
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: `Route ${req.method} ${req.originalUrl} not found`
        });
    });
}

/* Global error handler */
app.use((err, req, res, next) => {
    console.error('[Server] Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

/* Initialize Socket.IO handlers */
initializeSocket(io);

/* Connect to MongoDB and start server */
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, '0.0.0.0', () => {
            console.log('═══════════════════════════════════════════');
            console.log('   ConnectHub Server');
            console.log('═══════════════════════════════════════════');
            console.log(`   HTTP Server:  http://localhost:${PORT}`);
            console.log(`   Socket.IO:    ws://localhost:${PORT}`);
            console.log(`   Health Check: http://localhost:${PORT}/api/health`);
            console.log('═══════════════════════════════════════════');
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error.message);
        process.exit(1);
    }
};

startServer();
