import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_SERVICE_ENABLED: process.env.AI_SERVICE_ENABLED === 'true',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '346769116770-8sbq3hjq50ubsjkp5vt3apf0l6mejhbj.apps.googleusercontent.com',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validate required env vars on startup
const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
