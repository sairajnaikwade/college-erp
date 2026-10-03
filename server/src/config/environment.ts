import dotenv from 'dotenv';
import path from 'path';

// Load .env from candidate paths (handles both local dev, compiled dist, and root executions)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

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
  get port() {
    return parseInt(process.env.PORT || '5000', 10);
  },
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get databaseUrl() {
    return process.env.DATABASE_URL || '';
  },
  get clientUrl() {
    return process.env.CLIENT_URL || 'http://localhost:5173';
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || 'college-erp-development-super-secret-key-2026!#';
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '24h';
  },
  get bcryptSaltRounds() {
    return parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  },

  // SOC CoPilot Integration
  get socEnabled(): boolean {
    const rawVal = process.env.SOC_ENABLED;
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const val = String(rawVal).trim().toLowerCase();
      if (val === 'false' || val === '0' || val === 'no' || val === 'disabled') {
        return false;
      }
      if (val === 'true' || val === '1' || val === 'yes' || val === 'enabled') {
        return true;
      }
    }
    // If SOC_ENABLED is not explicitly set, auto-enable if URL, API Key, and Secret are present
    return Boolean(this.socCopilotUrl && this.socCopilotApiKey && this.socCopilotSecret);
  },
  get socCopilotUrl(): string {
    return (process.env.SOC_COPILOT_URL || '').trim();
  },
  get socCopilotApiKey(): string {
    return (process.env.SOC_COPILOT_API_KEY || '').trim();
  },
  get socCopilotSecret(): string {
    return (process.env.SOC_COPILOT_SECRET || '').trim();
  },
  get socCopilotWebsiteId(): string {
    return (process.env.SOC_COPILOT_WEBSITE_ID || 'WEB-003').trim();
  },

  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
};


