import { getPool } from '../config/database';

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  expires_at: Date;
  last_activity_at: Date;
  revoked_at: Date | null;
}

export interface CreateSessionDTO {
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export class SessionRepository {
  /**
   * Creates a new session record.
   */
  public async createSession(dto: CreateSessionDTO): Promise<SessionRow> {
    const pool = getPool();
    const query = `
      INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await pool.query<SessionRow>(query, [
      dto.userId,
      dto.tokenHash,
      dto.ipAddress || null,
      dto.userAgent || null,
      dto.expiresAt,
    ]);
    return res.rows[0];
  }

  /**
   * Finds an active (not expired, not revoked) session by ID and token hash.
   */
  public async findActiveSession(
    id: string,
    tokenHash: string
  ): Promise<SessionRow | null> {
    const pool = getPool();
    const query = `
      SELECT *
      FROM sessions
      WHERE id = $1 
        AND token_hash = $2
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1;
    `;
    const res = await pool.query<SessionRow>(query, [id, tokenHash]);
    return res.rows[0] || null;
  }

  /**
   * Updates last_activity_at for active session.
   */
  public async updateActivity(id: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE sessions SET last_activity_at = NOW() WHERE id = $1;`,
      [id]
    );
  }

  /**
   * Revokes a specific session.
   */
  public async revokeSession(id: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE sessions SET revoked_at = NOW() WHERE id = $1;`,
      [id]
    );
  }

  /**
   * Revokes all active sessions for a given user.
   */
  public async revokeAllUserSessions(userId: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;`,
      [userId]
    );
  }
}

export const sessionRepository = new SessionRepository();
