import { testConnection } from '../config/database';
import { env } from '../config/environment';

export interface HealthStatus {
  status: string;
  service: string;
  environment: string;
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
  };
}

/**
 * Health check service.
 * Returns the current status of the API server and its dependencies.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const dbConnected = await testConnection();

  return {
    status: 'ok',
    service: 'college-erp-api',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      connected: dbConnected,
    },
  };
}
