import fs from 'fs';
import path from 'path';
import { getPool, closePool } from '../config/database';
import { logger } from '../utils/logger';

interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function ensureMigrationTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
  const pool = getPool();
  const res = await pool.query<MigrationRecord>(
    'SELECT name FROM schema_migrations ORDER BY id ASC'
  );
  return res.rows.map((row) => row.name);
}

export async function migrateUp(): Promise<void> {
  await ensureMigrationTable();
  const applied = await getAppliedMigrations();
  const pool = getPool();

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn('Migrations directory does not exist:', MIGRATIONS_DIR);
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.up.sql'))
    .sort();

  let count = 0;

  for (const file of files) {
    const migrationName = file.replace('.up.sql', '');
    if (!applied.includes(migrationName)) {
      logger.info(`Applying migration: ${migrationName}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
          migrationName,
        ]);
        await client.query('COMMIT');
        logger.info(`Successfully applied: ${migrationName}`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Failed to apply migration ${migrationName}:`, err);
        throw err;
      } finally {
        client.release();
      }
    }
  }

  if (count === 0) {
    logger.info('Database is already up to date. No migrations to apply.');
  } else {
    logger.info(`Applied ${count} migration(s).`);
  }
}

export async function migrateDown(): Promise<void> {
  await ensureMigrationTable();
  const applied = await getAppliedMigrations();
  const pool = getPool();

  if (applied.length === 0) {
    logger.info('No migrations to roll back.');
    return;
  }

  const lastMigration = applied[applied.length - 1];
  const downFile = `${lastMigration}.down.sql`;
  const downFilePath = path.join(MIGRATIONS_DIR, downFile);

  if (!fs.existsSync(downFilePath)) {
    throw new Error(`Down migration file not found: ${downFile}`);
  }

  logger.info(`Rolling back migration: ${lastMigration}...`);
  const sql = fs.readFileSync(downFilePath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [
      lastMigration,
    ]);
    await client.query('COMMIT');
    logger.info(`Successfully rolled back: ${lastMigration}`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Failed to rollback migration ${lastMigration}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

export async function migrationStatus(): Promise<void> {
  await ensureMigrationTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.up.sql'))
    .sort();

  console.log('\n--- Migration Status ---');
  for (const file of files) {
    const migrationName = file.replace('.up.sql', '');
    const isApplied = applied.includes(migrationName);
    console.log(`[${isApplied ? 'APPLIED' : 'PENDING'}] ${migrationName}`);
  }
  console.log('------------------------\n');
}

// CLI entry point
if (require.main === module) {
  const action = process.argv[2] || 'up';

  (async () => {
    try {
      if (action === 'up') {
        await migrateUp();
      } else if (action === 'down') {
        await migrateDown();
      } else if (action === 'status') {
        await migrationStatus();
      } else {
        console.error(`Unknown action: ${action}. Use 'up', 'down', or 'status'.`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
