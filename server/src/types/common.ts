import { Request } from 'express';
import { UserRole } from './security-events';

/**
 * Common type definitions for the College ERP API.
 */

// ─── Account Status ───────────────────────────────────────
export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';

// ─── API Response Envelope ────────────────────────────────
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: unknown;
  timestamp: string;
}

export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

// ─── Authenticated User & Request ─────────────────────────
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  firstName: string;
  lastName: string;
  departmentId?: string;
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

// ─── Token Payload ────────────────────────────────────────
export interface AuthTokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

// ─── Pagination ───────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
