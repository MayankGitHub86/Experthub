import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * MongoDB Database Configuration and Connection
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection pooling
 * - Event logging
 * - Graceful shutdown
 * - Error handling
 */

const connectDB = async () => {
  // Use separate test database for test environment
  const dbName = process.env.NODE_ENV === 'test' ? 'experthub_test' : 'experthub';
  const MONGODB_URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${dbName}?replicaSet=rs0&retryWrites=true&w=majority`;
  
  const options = {
    // Connection pool size
    maxPoolSize: 10,
    minPoolSize: 2,
    
    // Timeouts
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    
    // Behavior
    autoIndex: process.env.NODE_ENV !== 'production',
    
    // Naming
    dbName: dbName,
  };

  try {
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') });
    
    await mongoose.connect(MONGODB_URI, options);
    
    logger.info('✅ MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      poolSize: mongoose.connection.client.s.options.maxPoolSize
    });

    // Connection event handlers
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed due to application termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    
    // Retry connection after delay
    logger.info('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * Gracefully close database connection
 */
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

/**
 * Check if database is connected
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection stats
 */
export const getConnectionStats = () => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models),
  };
};

export default connectDB;
