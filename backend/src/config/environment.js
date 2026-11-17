import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'test'
  ? '.env.test'
  : '.env';

const envPath = path.resolve(__dirname, '../../', envFile);
dotenv.config({ path: envPath });

/**
 * Environment Configuration
 * 
 * Centralized configuration management with validation
 */

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/experthub',
  },

  // Redis (for sessions, cache, queues)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',') 
      : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max requests per window
    authMax: 5, // Max auth attempts per window
  },

  // Email (SendGrid / AWS SES)
  email: {
    from: process.env.EMAIL_FROM || 'noreply@experthub.com',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    
    // Stripe Connect Platform (v2 Accounts)
    platformCountry: process.env.STRIPE_PLATFORM_COUNTRY || '', // e.g., 'US', 'GB', 'CA'
    platformAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID || '', // Stripe platform account ID
    
    // Destination charge configuration
    commissionPercentage: parseInt(process.env.STRIPE_COMMISSION_PERCENTAGE || '15', 10), // Platform fee %
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },

  // AWS S3 / Cloud Storage
  storage: {
    type: process.env.STORAGE_TYPE || 's3', // 's3' or 'cloudinary'
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Sentry (Error Tracking)
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
  },
};

/**
 * Validate required environment variables
 */
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (config.isProduction && missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
    `Please set them in your .env.production file or environment.`
  );
}

// Warn about missing optional vars in production
if (config.isProduction) {
  const optionalVars = ['MONGODB_URI', 'STRIPE_SECRET_KEY', 'OPENAI_API_KEY'];
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  
  if (missingOptional.length > 0) {
    console.warn(`⚠️  Warning: Optional environment variables not set: ${missingOptional.join(', ')}`);
  }
}

export default config;
