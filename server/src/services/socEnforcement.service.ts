import { ipBlocklistRepository, IpBlockRow, AccountBlockRow } from '../repositories/ip-blocklist.repository';
import { userRepository } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { env } from '../config/environment';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';
import { telemetryService } from './telemetry.service';
import { normalizeIp } from '../utils/client-ip';

export interface EnforceIpBlockDTO {
  website_id?: string;
  ip_address: string;
  duration_seconds?: number;
  expires_at?: string;
  reason?: string;
  incident_id?: string;
  initiator?: string;
}

export interface EnforceIpUnblockDTO {
  website_id?: string;
  ip_address: string;
  reason?: string;
  initiator?: string;
}

export interface EnforceAccountBlockDTO {
  website_id?: string;
  user_id?: string;
  identifier?: string;
  reason?: string;
  incident_id?: string;
  initiator?: string;
  expires_at?: string;
}

export interface EnforceAccountUnblockDTO {
  website_id?: string;
  user_id?: string;
  identifier?: string;
  reason?: string;
  initiator?: string;
}

export class SocEnforcementService {
  /**
   * Enforces an IP block in the College ERP database.
   * Idempotent: repeated calls will refresh/update the active block.
   */
  public async enforceIpBlock(dto: EnforceIpBlockDTO): Promise<{
    enforced: boolean;
    block: IpBlockRow;
    message: string;
  }> {
    const websiteId = (dto.website_id || env.socCopilotWebsiteId || 'WEB-001').trim();
    const expectedWebsiteId = env.socCopilotWebsiteId || 'WEB-001';

    if (websiteId !== expectedWebsiteId) {
      throw ApiError.forbidden(
        `Website ID mismatch. Target website '${websiteId}' is not managed by this ERP instance (${expectedWebsiteId}).`
      );
    }

    if (!dto.ip_address || typeof dto.ip_address !== 'string') {
      throw ApiError.badRequest('Valid ip_address string is required.');
    }

    const cleanIp = normalizeIp(dto.ip_address);
    const reason = dto.reason || 'Blocked via SOC CoPilot Incident Response';
    const durationSeconds = dto.duration_seconds && dto.duration_seconds > 0 ? dto.duration_seconds : 3600;
    const explicitExpiresAt = dto.expires_at ? new Date(dto.expires_at) : undefined;

    const block = await ipBlocklistRepository.blockIp({
      ipAddress: cleanIp,
      websiteId,
      reason,
      durationSeconds,
      expiresAt: explicitExpiresAt,
      sourceIncidentId: dto.incident_id,
      initiator: dto.initiator || 'SOC_COPILOT',
    });

    logger.info(
      `[SOC-ENFORCE] IP Block Enforced for ${cleanIp} on ${websiteId} until ${block.expires_at.toISOString()}`
    );

    return {
      enforced: true,
      block,
      message: `IP ${cleanIp} successfully blocked until ${block.expires_at.toISOString()}`,
    };
  }

  /**
   * Revokes an active IP block.
   */
  public async enforceIpUnblock(dto: EnforceIpUnblockDTO): Promise<{
    unblocked: boolean;
    ip_address: string;
    message: string;
  }> {
    const websiteId = (dto.website_id || env.socCopilotWebsiteId || 'WEB-001').trim();
    const expectedWebsiteId = env.socCopilotWebsiteId || 'WEB-001';

    if (websiteId !== expectedWebsiteId) {
      throw ApiError.forbidden(`Website ID mismatch.`);
    }

    if (!dto.ip_address) {
      throw ApiError.badRequest('ip_address is required.');
    }

    const cleanIp = normalizeIp(dto.ip_address);
    const unblocked = await ipBlocklistRepository.unblockIp(cleanIp, websiteId);

    logger.info(`[SOC-ENFORCE] IP Unblock Enforced for ${cleanIp} on ${websiteId}. Revoked: ${unblocked}`);

    return {
      unblocked,
      ip_address: cleanIp,
      message: unblocked
        ? `IP ${cleanIp} unblocked successfully.`
        : `No active block found for IP ${cleanIp}.`,
    };
  }

  /**
   * Enforces an Account block on a user identity.
   * Updates user account_status to 'LOCKED' and immediately revokes all active sessions.
   */
  public async enforceAccountBlock(dto: EnforceAccountBlockDTO): Promise<{
    enforced: boolean;
    user_id: string;
    username: string;
    account_status: string;
    record: AccountBlockRow;
    message: string;
  }> {
    const websiteId = (dto.website_id || env.socCopilotWebsiteId || 'WEB-001').trim();
    const expectedWebsiteId = env.socCopilotWebsiteId || 'WEB-001';

    if (websiteId !== expectedWebsiteId) {
      throw ApiError.forbidden(`Website ID mismatch.`);
    }

    // Resolve user by ID or Identifier (email/username)
    let user = null;
    if (dto.user_id) {
      user = await userRepository.findById(dto.user_id);
    } else if (dto.identifier) {
      user = await userRepository.findByEmailOrUsername(dto.identifier);
    } else {
      throw ApiError.badRequest('Either user_id or identifier must be provided.');
    }

    if (!user) {
      throw ApiError.notFound('Target user account not found in ERP.');
    }

    // Update account status to LOCKED
    await userRepository.updateStatus(user.id, 'LOCKED');

    // Revoke all active sessions immediately
    await sessionRepository.revokeAllUserSessions(user.id);

    const reason = dto.reason || 'Account locked via SOC Incident Response';
    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : undefined;

    const record = await ipBlocklistRepository.recordAccountBlock({
      userId: user.id,
      websiteId,
      reason,
      sourceIncidentId: dto.incident_id,
      initiator: dto.initiator || 'SOC_COPILOT',
      expiresAt,
    });

    // Telemetry
    telemetryService.emit({
      eventType: 'ACCOUNT_LOCKED',
      result: 'SUCCESS',
      userId: user.id,
      userRole: user.role,
      resourceType: 'USER',
      resourceId: user.id,
      metadata: {
        reason,
        sourceIncidentId: dto.incident_id,
        initiator: dto.initiator || 'SOC_COPILOT',
      },
    });

    logger.info(`[SOC-ENFORCE] Account Block Enforced for user ${user.username} (${user.id})`);

    return {
      enforced: true,
      user_id: user.id,
      username: user.username,
      account_status: 'LOCKED',
      record,
      message: `Account ${user.username} locked and all active sessions revoked.`,
    };
  }

  /**
   * Revokes an Account block on a user identity.
   */
  public async enforceAccountUnblock(dto: EnforceAccountUnblockDTO): Promise<{
    unblocked: boolean;
    user_id: string;
    username: string;
    account_status: string;
    message: string;
  }> {
    const websiteId = (dto.website_id || env.socCopilotWebsiteId || 'WEB-001').trim();
    const expectedWebsiteId = env.socCopilotWebsiteId || 'WEB-001';

    if (websiteId !== expectedWebsiteId) {
      throw ApiError.forbidden(`Website ID mismatch.`);
    }

    let user = null;
    if (dto.user_id) {
      user = await userRepository.findById(dto.user_id);
    } else if (dto.identifier) {
      user = await userRepository.findByEmailOrUsername(dto.identifier);
    } else {
      throw ApiError.badRequest('Either user_id or identifier must be provided.');
    }

    if (!user) {
      throw ApiError.notFound('Target user account not found in ERP.');
    }

    // Update account status to ACTIVE
    await userRepository.updateStatus(user.id, 'ACTIVE');

    // Revoke account block records
    await ipBlocklistRepository.unblockAccountRecord(user.id, websiteId);

    // Telemetry
    telemetryService.emit({
      eventType: 'ACCOUNT_UNLOCKED',
      result: 'SUCCESS',
      userId: user.id,
      userRole: user.role,
      resourceType: 'USER',
      resourceId: user.id,
      metadata: {
        reason: dto.reason || 'Account unlocked via SOC CoPilot',
        initiator: dto.initiator || 'SOC_COPILOT',
      },
    });

    logger.info(`[SOC-ENFORCE] Account Unblocked for user ${user.username} (${user.id})`);

    return {
      unblocked: true,
      user_id: user.id,
      username: user.username,
      account_status: 'ACTIVE',
      message: `Account ${user.username} restored to ACTIVE status.`,
    };
  }

  /**
   * Retrieves current active blocks and statuses.
   */
  public async getEnforcementStatus(params: {
    ip_address?: string;
    user_id?: string;
    website_id?: string;
  }): Promise<{
    ip_block: IpBlockRow | null;
    account_status: string | null;
    website_id: string;
  }> {
    const websiteId = (params.website_id || env.socCopilotWebsiteId || 'WEB-001').trim();
    let ipBlock: IpBlockRow | null = null;
    let accountStatus: string | null = null;

    if (params.ip_address) {
      const cleanIp = normalizeIp(params.ip_address);
      ipBlock = await ipBlocklistRepository.findActiveBlock(cleanIp, websiteId);
    }

    if (params.user_id) {
      const user = await userRepository.findById(params.user_id);
      accountStatus = user ? user.account_status : null;
    }

    return {
      ip_block: ipBlock,
      account_status: accountStatus,
      website_id: websiteId,
    };
  }
}

export const socEnforcementService = new SocEnforcementService();
