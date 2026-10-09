import { getPool } from '../config/database';

export type BlockStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface IpBlockRow {
  id: string;
  ip_address: string;
  website_id: string;
  reason: string;
  source_incident_id: string | null;
  initiator: string;
  status: BlockStatus;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AccountBlockRow {
  id: string;
  user_id: string;
  website_id: string;
  reason: string;
  source_incident_id: string | null;
  initiator: string;
  status: 'ACTIVE' | 'REVOKED';
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BlockIpParams {
  ipAddress: string;
  websiteId: string;
  reason: string;
  durationSeconds?: number;
  expiresAt?: Date;
  sourceIncidentId?: string;
  initiator?: string;
}

export interface BlockAccountParams {
  userId: string;
  websiteId: string;
  reason: string;
  sourceIncidentId?: string;
  initiator?: string;
  expiresAt?: Date;
}

export class IpBlocklistRepository {
  /**
   * Finds an active, non-expired block for a given IP and website.
   */
  public async findActiveBlock(
    ipAddress: string,
    websiteId: string = 'WEB-001'
  ): Promise<IpBlockRow | null> {
    const pool = getPool();
    const query = `
      SELECT *
      FROM ip_blocklist
      WHERE ip_address = $1
        AND website_id = $2
        AND status = 'ACTIVE'
        AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1;
    `;
    const res = await pool.query<IpBlockRow>(query, [ipAddress, websiteId]);
    return res.rows[0] || null;
  }

  /**
   * Idempotently creates or updates an active IP block.
   */
  public async blockIp(params: BlockIpParams): Promise<IpBlockRow> {
    const pool = getPool();
    const {
      ipAddress,
      websiteId,
      reason,
      durationSeconds = 3600,
      expiresAt: explicitExpiresAt,
      sourceIncidentId = null,
      initiator = 'SOC_COPILOT',
    } = params;

    const expiresAt =
      explicitExpiresAt || new Date(Date.now() + durationSeconds * 1000);

    // Check for existing active record to ensure idempotency
    const existing = await this.findActiveBlock(ipAddress, websiteId);

    if (existing) {
      // Update existing active block with new expiry and reason
      const updateQuery = `
        UPDATE ip_blocklist
        SET
          expires_at = $1,
          reason = $2,
          source_incident_id = COALESCE($3, source_incident_id),
          initiator = $4,
          updated_at = NOW()
        WHERE id = $5
        RETURNING *;
      `;
      const res = await pool.query<IpBlockRow>(updateQuery, [
        expiresAt,
        reason,
        sourceIncidentId,
        initiator,
        existing.id,
      ]);
      return res.rows[0];
    }

    // Insert new block record
    const insertQuery = `
      INSERT INTO ip_blocklist (
        ip_address,
        website_id,
        reason,
        source_incident_id,
        initiator,
        status,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
      RETURNING *;
    `;
    const res = await pool.query<IpBlockRow>(insertQuery, [
      ipAddress,
      websiteId,
      reason,
      sourceIncidentId,
      initiator,
      expiresAt,
    ]);
    return res.rows[0];
  }

  /**
   * Revokes all active blocks for a given IP and website.
   */
  public async unblockIp(
    ipAddress: string,
    websiteId: string = 'WEB-001'
  ): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE ip_blocklist
      SET status = 'REVOKED', updated_at = NOW()
      WHERE ip_address = $1
        AND website_id = $2
        AND status = 'ACTIVE'
        AND expires_at > NOW();
    `;
    const res = await pool.query(query, [ipAddress, websiteId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Lists all currently active blocks.
   */
  public async listActiveBlocks(
    websiteId: string = 'WEB-001'
  ): Promise<IpBlockRow[]> {
    const pool = getPool();
    const query = `
      SELECT *
      FROM ip_blocklist
      WHERE website_id = $1
        AND status = 'ACTIVE'
        AND expires_at > NOW()
      ORDER BY created_at DESC;
    `;
    const res = await pool.query<IpBlockRow>(query, [websiteId]);
    return res.rows;
  }

  /**
   * Creates or records an account block action.
   */
  public async recordAccountBlock(
    params: BlockAccountParams
  ): Promise<AccountBlockRow> {
    const pool = getPool();
    const {
      userId,
      websiteId,
      reason,
      sourceIncidentId = null,
      initiator = 'SOC_COPILOT',
      expiresAt = null,
    } = params;

    const insertQuery = `
      INSERT INTO account_blocklist (
        user_id,
        website_id,
        reason,
        source_incident_id,
        initiator,
        status,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)
      RETURNING *;
    `;
    const res = await pool.query<AccountBlockRow>(insertQuery, [
      userId,
      websiteId,
      reason,
      sourceIncidentId,
      initiator,
      expiresAt,
    ]);
    return res.rows[0];
  }

  /**
   * Revokes account block records.
   */
  public async unblockAccountRecord(
    userId: string,
    websiteId: string = 'WEB-001'
  ): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE account_blocklist
      SET status = 'REVOKED', updated_at = NOW()
      WHERE user_id = $1
        AND website_id = $2
        AND status = 'ACTIVE';
    `;
    const res = await pool.query(query, [userId, websiteId]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const ipBlocklistRepository = new IpBlocklistRepository();
