/**
 * ConnectHub - Database Configuration
 * 
 * Establishes connection to MongoDB using Mongoose.
 * Uses environment variable MONGO_URI or defaults to local MongoDB.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/connecthub';
        
        const conn = await mongoose.connect(mongoURI, {
            /* Mongoose 8 uses these defaults automatically */
        });

        console.log(`[ConnectHub] MongoDB Connected: ${conn.connection.host}`);
        console.log(`[ConnectHub] Database: ${conn.connection.name}`);
    } catch (error) {
        console.error(`[ConnectHub] MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
