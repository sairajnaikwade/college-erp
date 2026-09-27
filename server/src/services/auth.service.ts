import { Request } from 'express';
import { userRepository, UserWithProfile } from '../repositories/user.repository';
import { sessionRepository } from '../repositories/session.repository';
import { verifyPassword } from '../utils/password';
import {
  generateToken,
  hashToken,
  generateSessionSecret,
} from '../utils/token';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';

export interface LoginParams {
  identifier: string;
  password: string;
  role?: string;
  req: Request;
}

export interface LoginResult {
  token: string;
  session: {
    id: string;
    expiresAt: Date;
  };
  user: UserWithProfile;
}

export interface LogoutParams {
  userId: string;
  sessionId: string;
  req: Request;
}

export class AuthService {
  /**
   * Authenticates user, creates active session, issues JWT and records telemetry.
   */
  public async login(params: LoginParams): Promise<LoginResult> {
    const { identifier, password, role, req } = params;

    if (!identifier || !password) {
      throw ApiError.badRequest('Email/Username and password are required.');
    }

    const user = await userRepository.findByEmailOrUsername(identifier);

    if (!user) {
      telemetryService.emit({
        eventType: 'LOGIN_FAILURE',
        result: 'FAILURE',
        req,
        resourceType: 'USER',
        metadata: { reason: 'USER_NOT_FOUND', identifier },
      });
      throw ApiError.unauthorized('Invalid email/username or password.');
    }

    // Check account status
    if (user.account_status === 'LOCKED') {
      telemetryService.emit({
        eventType: 'LOGIN_FAILURE',
        result: 'DENIED',
        req,
        userId: user.id,
        userRole: user.role,
        resourceType: 'USER',
        metadata: { reason: 'ACCOUNT_LOCKED', username: user.username },
      });
      throw ApiError.forbidden(
        'Account is locked due to security policy. Please contact an administrator.'
      );
    }

    if (user.account_status === 'DISABLED') {
      telemetryService.emit({
        eventType: 'LOGIN_FAILURE',
        result: 'DENIED',
        req,
        userId: user.id,
        userRole: user.role,
        resourceType: 'USER',
        metadata: { reason: 'ACCOUNT_DISABLED', username: user.username },
      });
      throw ApiError.forbidden('Account has been deactivated.');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      telemetryService.emit({
        eventType: 'LOGIN_FAILURE',
        result: 'FAILURE',
        req,
        userId: user.id,
        userRole: user.role,
        resourceType: 'USER',
        metadata: { reason: 'INVALID_PASSWORD', username: user.username },
      });
      throw ApiError.unauthorized('Invalid email/username or password.');
    }

    // Verify requested role matches actual database user role (portal-role consistency)
    if (role) {
      const normalizedRequestedRole = role.toUpperCase();
      if (normalizedRequestedRole !== user.role) {
        telemetryService.emit({
          eventType: 'LOGIN_FAILURE',
          result: 'FAILURE',
          req,
          userId: user.id,
          userRole: user.role,
          resourceType: 'USER',
          metadata: {
            reason: 'ROLE_MISMATCH',
            requestedRole: normalizedRequestedRole,
            actualRole: user.role,
            username: user.username,
          },
        });
        throw ApiError.unauthorized('Invalid email/username or password.');
      }
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Create session
    const sessionSecret = generateSessionSecret();
    const tokenHash = hashToken(sessionSecret);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const ipAddress =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'];

    const session = await sessionRepository.createSession({
      userId: user.id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    // Sign JWT with session details
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      sessionId: session.id,
    });

    // Emit Login Success Event
    telemetryService.emit({
      eventType: 'LOGIN_SUCCESS',
      result: 'SUCCESS',
      req,
      userId: user.id,
      userRole: user.role,
      resourceType: 'SESSION',
      resourceId: session.id,
      metadata: {
        username: user.username,
        email: user.email,
        loginMethod: 'PASSWORD',
      },
    });

    // Retrieve full profile data
    const userProfile = await userRepository.findWithProfileById(user.id);
    if (!userProfile) {
      throw ApiError.internal('Failed to retrieve user profile.');
    }

    return {
      token,
      session: {
        id: session.id,
        expiresAt: session.expires_at,
      },
      user: userProfile,
    };
  }

  /**
   * Terminates active session and records logout telemetry.
   */
  public async logout(params: LogoutParams): Promise<void> {
    const { userId, sessionId, req } = params;

    if (sessionId) {
      await sessionRepository.revokeSession(sessionId);
    }

    telemetryService.emit({
      eventType: 'LOGOUT',
      result: 'SUCCESS',
      req,
      userId,
      resourceType: 'SESSION',
      resourceId: sessionId,
      metadata: {
        reason: 'USER_INITIATED',
      },
    });
  }

  /**
   * Retrieves profile for current authenticated user.
   */
  public async getMe(userId: string): Promise<UserWithProfile> {
    const userProfile = await userRepository.findWithProfileById(userId);
    if (!userProfile) {
      throw ApiError.notFound('User not found.');
    }
    return userProfile;
  }
}

export const authService = new AuthService();
