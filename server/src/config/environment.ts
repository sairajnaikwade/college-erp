import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  clientUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptSaltRounds: number;
  isProduction: boolean;
  isDevelopment: boolean;
  socEnabled: boolean;
  socCopilotUrl: string;
  socCopilotApiKey: string;
  socCopilotSecret: string;
  socCopilotWebsiteId: string;
}

function getEnvVariable(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: EnvironmentConfig = {
  port: parseInt(getEnvVariable('PORT', '5000'), 10),
  nodeEnv: getEnvVariable('NODE_ENV', 'development'),
  databaseUrl: getEnvVariable('DATABASE_URL', ''),
  clientUrl: getEnvVariable('CLIENT_URL', 'http://localhost:5173'),
  jwtSecret: getEnvVariable('JWT_SECRET', 'college-erp-development-super-secret-key-2026!#'),
  jwtExpiresIn: getEnvVariable('JWT_EXPIRES_IN', '24h'),
  bcryptSaltRounds: parseInt(getEnvVariable('BCRYPT_SALT_ROUNDS', '10'), 10),

  // SOC CoPilot Integration
  socEnabled: process.env.SOC_ENABLED === 'true',
  socCopilotUrl: process.env.SOC_COPILOT_URL || '',
  socCopilotApiKey: process.env.SOC_COPILOT_API_KEY || '',
  socCopilotSecret: process.env.SOC_COPILOT_SECRET || '',
  socCopilotWebsiteId: process.env.SOC_COPILOT_WEBSITE_ID || 'WEB-003',

  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
};

