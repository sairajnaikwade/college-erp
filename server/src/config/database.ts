import { Pool, PoolConfig } from 'pg';
import { env } from './environment';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

/**
 * Creates and returns a PostgreSQL connection pool.
 * Uses DATABASE_URL from environment variables.
 * The pool is lazily initialized on first call.
 */
export function getPool(): Pool {
  if (!pool) {
    if (!env.databaseUrl) {
      logger.warn('DATABASE_URL is not set. Database features will be unavailable.');
      // Return a pool that will fail on query — allows server to start without DB
      const config: PoolConfig = {
        connectionString: 'postgresql://localhost:5432/college_erp',
        max: 1,
      };
      pool = new Pool(config);
      return pool;
    }

    const config: PoolConfig = {
      connectionString: env.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    // In production, require SSL
    if (env.isProduction) {
      config.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err.message);
    });

    pool.on('connect', () => {
      logger.info('New database connection established');
    });
  }

  return pool;
}

/**
 * Tests the database connection by executing a simple query.
 * Returns true if the connection is successful.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await getPool().connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Database connection test failed: ${message}`);
    return false;
  }
}

/**
 * Gracefully shuts down the database pool.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
