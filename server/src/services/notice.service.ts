import {
  noticeRepository,
  NoticeWithDetails,
  NoticeRow,
  CreateNoticeDTO,
  UpdateNoticeDTO,
  FindNoticesOptions,
} from '../repositories/notice.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest } from '../types/common';

const VALID_CATEGORIES = ['ACADEMIC', 'ADMINISTRATIVE', 'EXAMINATION', 'EVENT', 'GENERAL', 'URGENT'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const VALID_TARGET_ROLES = ['ALL', 'STUDENT', 'STAFF', 'ADMIN'];

export class NoticeService {
  /**
   * Retrieves notices scoped by the requesting user's role and departmental affiliation.
   */
  public async getAll(req: AuthenticatedRequest, queryParams: Record<string, unknown> = {}): Promise<NoticeWithDetails[]> {
    const user = req.user;
    const userRole = user?.role;
    const departmentId = user?.departmentId || null;

    const options: FindNoticesOptions = {
      userRole,
      departmentId,
      category: queryParams.category ? String(queryParams.category) : undefined,
      priority: queryParams.priority ? String(queryParams.priority) : undefined,
      limit: queryParams.limit ? parseInt(String(queryParams.limit), 10) : undefined,
      offset: queryParams.offset ? parseInt(String(queryParams.offset), 10) : undefined,
    };

    // If Admin, allow query override for targetRole, isPublished, and includeExpired
    if (userRole === 'ADMIN') {
      if (queryParams.target_role) {
        options.targetRole = String(queryParams.target_role);
      }
      if (queryParams.is_published !== undefined) {
        options.isPublished = queryParams.is_published === 'true' || queryParams.is_published === true;
      }
      if (queryParams.include_expired === 'true' || queryParams.include_expired === true) {
        options.includeExpired = true;
      }
    }

    const list = await noticeRepository.findAll(options);

    telemetryService.emit({
      eventType: 'NOTICE_VIEW',
      result: 'SUCCESS',
      req,
      userId: user?.id,
      userRole: user?.role,
      resourceType: 'NOTICE',
      metadata: { action: 'list_notices', count: list.length },
    });

    return list;
  }

  /**
   * Retrieves single notice by ID with authorization and telemetry.
   */
  public async getById(id: string, req: AuthenticatedRequest): Promise<NoticeWithDetails> {
    const notice = await noticeRepository.findById(id);
    if (!notice) {
      throw ApiError.notFound(`Notice with ID '${id}' not found.`);
    }

    const user = req.user;
    // Check if regular user has permission to see this notice
    if (user && user.role !== 'ADMIN') {
      if (!notice.is_published) {
        throw ApiError.notFound(`Notice with ID '${id}' not found.`);
      }
      if (notice.target_role !== 'ALL' && notice.target_role !== user.role) {
        throw ApiError.forbidden('You are not authorized to view this notice.');
      }
      if (notice.department_id && user.departmentId && notice.department_id !== user.departmentId) {
        throw ApiError.forbidden('You are not authorized to view this departmental notice.');
      }
    }

    telemetryService.emit({
      eventType: 'NOTICE_VIEW',
      result: 'SUCCESS',
      req,
      userId: user?.id,
      userRole: user?.role,
      resourceType: 'NOTICE',
      resourceId: id,
      metadata: { title: notice.title, category: notice.category },
    });

    return notice;
  }

  /**
   * Creates a new notice. Requires ADMIN or STAFF role.
   */
  public async create(dto: CreateNoticeDTO, req: AuthenticatedRequest): Promise<NoticeRow> {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('Authentication required.');
    }

    if (!dto.title || !dto.title.trim()) {
      throw ApiError.badRequest('Notice title is required.');
    }
    if (dto.title.trim().length < 3 || dto.title.trim().length > 255) {
      throw ApiError.badRequest('Notice title must be between 3 and 255 characters.');
    }
    if (!dto.description || !dto.description.trim()) {
      throw ApiError.badRequest('Notice description / content is required.');
    }

    if (dto.category && !VALID_CATEGORIES.includes(dto.category.toUpperCase())) {
      throw ApiError.badRequest(`Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
    }
    if (dto.priority && !VALID_PRIORITIES.includes(dto.priority.toUpperCase())) {
      throw ApiError.badRequest(`Invalid priority. Allowed: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (dto.target_role && !VALID_TARGET_ROLES.includes(dto.target_role.toUpperCase())) {
      throw ApiError.badRequest(`Invalid target role. Allowed: ${VALID_TARGET_ROLES.join(', ')}`);
    }

    // Set publisher to authenticated user
    dto.published_by = user.id;

    // Staff creating a notice without explicit department gets assigned to their department
    if (user.role === 'STAFF' && !dto.department_id && user.departmentId) {
      dto.department_id = user.departmentId;
    }

    const created = await noticeRepository.create(dto);

    telemetryService.emit({
      eventType: 'NOTICE_CREATE',
      result: 'SUCCESS',
      req,
      userId: user.id,
      userRole: user.role,
      resourceType: 'NOTICE',
      resourceId: created.id,
      metadata: { title: created.title, category: created.category, priority: created.priority },
    });

    return created;
  }

  /**
   * Updates an existing notice. ADMIN can update any notice; STAFF can update their own notices.
   */
  public async update(id: string, dto: UpdateNoticeDTO, req: AuthenticatedRequest): Promise<NoticeRow> {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('Authentication required.');
    }

    const existing = await noticeRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Notice with ID '${id}' not found.`);
    }

    // RBAC check: Staff can only edit notices they authored
    if (user.role === 'STAFF' && existing.published_by !== user.id) {
      throw ApiError.forbidden('You can only update notices published by yourself.');
    }

    if (dto.title !== undefined) {
      if (!dto.title.trim() || dto.title.trim().length < 3 || dto.title.trim().length > 255) {
        throw ApiError.badRequest('Notice title must be between 3 and 255 characters.');
      }
    }

    if (dto.description !== undefined && !dto.description.trim()) {
      throw ApiError.badRequest('Notice description cannot be empty.');
    }

    if (dto.category && !VALID_CATEGORIES.includes(dto.category.toUpperCase())) {
      throw ApiError.badRequest(`Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
    }
    if (dto.priority && !VALID_PRIORITIES.includes(dto.priority.toUpperCase())) {
      throw ApiError.badRequest(`Invalid priority. Allowed: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (dto.target_role && !VALID_TARGET_ROLES.includes(dto.target_role.toUpperCase())) {
      throw ApiError.badRequest(`Invalid target role. Allowed: ${VALID_TARGET_ROLES.join(', ')}`);
    }

    const updated = await noticeRepository.update(id, dto);
    if (!updated) {
      throw ApiError.internal('Failed to update notice.');
    }

    telemetryService.emit({
      eventType: 'NOTICE_UPDATE',
      result: 'SUCCESS',
      req,
      userId: user.id,
      userRole: user.role,
      resourceType: 'NOTICE',
      resourceId: id,
      metadata: { title: updated.title },
    });

    return updated;
  }

  /**
   * Deletes a notice. Requires ADMIN role.
   */
  public async delete(id: string, req: AuthenticatedRequest): Promise<void> {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized('Authentication required.');
    }

    const existing = await noticeRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Notice with ID '${id}' not found.`);
    }

    await noticeRepository.delete(id);

    telemetryService.emit({
      eventType: 'NOTICE_DELETE',
      result: 'SUCCESS',
      req,
      userId: user.id,
      userRole: user.role,
      resourceType: 'NOTICE',
      resourceId: id,
      metadata: { title: existing.title },
    });
  }
}

export const noticeService = new NoticeService();
