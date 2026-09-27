import { Request } from 'express';
import {
  staffRepository,
  StaffWithFullProfile,
  StaffFilter,
  CreateStaffDTO,
  UpdateStaffDTO,
} from '../repositories/staff.repository';
import { subjectRepository } from '../repositories/subject.repository';
import { staffSubjectRepository } from '../repositories/staff-subject.repository';
import { userRepository } from '../repositories/user.repository';
import { departmentRepository } from '../repositories/department.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest, AccountStatus } from '../types/common';

export class StaffService {
  public async getAll(filter?: StaffFilter, req?: Request): Promise<StaffWithFullProfile[]> {
    const list = await staffRepository.findAll(filter);
    if (req) {
      telemetryService.emit({
        eventType: 'STAFF_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'STAFF',
        metadata: { filter, count: list.length },
      });
    }
    return list;
  }

  public async getById(id: string, req?: Request): Promise<StaffWithFullProfile> {
    const staff = await staffRepository.findById(id);
    if (!staff) {
      throw ApiError.notFound(`Staff member with ID '${id}' not found.`);
    }
    if (req) {
      telemetryService.emit({
        eventType: 'STAFF_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'STAFF',
        resourceId: id,
        metadata: { employee_id: staff.employee_id },
      });
    }
    return staff;
  }

  /**
   * Retrieves profile for currently authenticated faculty/staff (identity scoped).
   */
  public async getMyProfile(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STAFF') {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'PROFILE',
        metadata: { endpoint: '/api/staff/me', reason: 'NON_STAFF_ACCESS' },
      });
      throw ApiError.forbidden('Only staff members can access staff profile.');
    }

    const staff = await staffRepository.findByUserId(req.user.id);
    if (!staff) {
      throw ApiError.notFound('Staff record not found for this user account.');
    }

    telemetryService.emit({
      eventType: 'PROFILE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: 'STAFF',
      resourceType: 'STAFF',
      resourceId: staff.staff_id,
      metadata: { employee_id: staff.employee_id },
    });

    return staff;
  }

  /**
   * Creates staff + user account (Transactional).
   */
  public async create(dto: CreateStaffDTO, req: AuthenticatedRequest): Promise<StaffWithFullProfile> {
    if (!dto.username || !dto.email || !dto.first_name || !dto.last_name || !dto.department_id || !dto.employee_id || !dto.designation) {
      throw ApiError.badRequest('Required staff details are missing.');
    }

    const dept = await departmentRepository.findById(dto.department_id);
    if (!dept) {
      throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
    }

    // Constraint 3: Staff department must match subject department
    if (dto.subject_ids && dto.subject_ids.length > 0) {
      for (const subId of dto.subject_ids) {
        const sub = await subjectRepository.findById(subId);
        if (!sub) {
          throw ApiError.notFound(`Subject with ID '${subId}' does not exist.`);
        }
        if (sub.department_id !== dto.department_id) {
          throw ApiError.badRequest(
            `Department mismatch: Staff is in '${dept.name}', but subject '${sub.name}' belongs to '${sub.department_name}'.`
          );
        }
      }
    }

    // Check unique email/username
    const existingUser = await userRepository.findByEmailOrUsername(dto.email);
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists.');
    }
    const existingUsername = await userRepository.findByEmailOrUsername(dto.username);
    if (existingUsername) {
      throw ApiError.conflict('An account with this username already exists.');
    }

    try {
      const created = await staffRepository.createWithUser(dto);

      telemetryService.emit({
        eventType: 'STAFF_CREATE',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'STAFF',
        resourceId: created.staff_id,
        metadata: {
          employee_id: created.employee_id,
          department_id: created.department_id,
        },
      });

      return created;
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.conflict('Employee ID already exists.');
      }
      throw err;
    }
  }

  public async update(
    id: string,
    dto: UpdateStaffDTO,
    req: AuthenticatedRequest
  ): Promise<StaffWithFullProfile> {
    const existing = await staffRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Staff member with ID '${id}' not found.`);
    }

    if (dto.department_id) {
      const dept = await departmentRepository.findById(dto.department_id);
      if (!dept) {
        throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
      }
    }

    const updated = await staffRepository.update(id, dto);

    telemetryService.emit({
      eventType: 'STAFF_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'STAFF',
      resourceId: id,
      metadata: { employee_id: updated?.employee_id },
    });

    return updated!;
  }

  public async updateStatus(
    id: string,
    status: AccountStatus,
    req: AuthenticatedRequest
  ): Promise<void> {
    const existing = await staffRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Staff member with ID '${id}' not found.`);
    }

    await staffRepository.updateStatus(id, status);

    const eventType = status === 'ACTIVE' ? 'STAFF_ENABLE' : 'STAFF_DISABLE';
    telemetryService.emit({
      eventType,
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'STAFF',
      resourceId: id,
      metadata: { new_status: status },
    });
  }

  /**
   * Assigns a staff member to a subject (Enforcing department matching).
   */
  public async assignSubject(
    staffId: string,
    subjectId: string,
    req?: AuthenticatedRequest
  ): Promise<any> {
    const staff = await staffRepository.findById(staffId);
    if (!staff) {
      throw ApiError.notFound(`Staff member with ID '${staffId}' not found.`);
    }

    if (staff.account_status !== 'ACTIVE') {
      throw ApiError.badRequest('Cannot assign subjects to a disabled or locked staff account.');
    }

    const subject = await subjectRepository.findById(subjectId);
    if (!subject) {
      throw ApiError.notFound(`Subject with ID '${subjectId}' not found.`);
    }

    // Constraint 3: Staff department must match subject department
    if (staff.department_id !== subject.department_id) {
      throw ApiError.badRequest(
        `Department mismatch: Faculty '${staff.first_name} ${staff.last_name}' is in '${staff.department_name}', but subject '${subject.name}' belongs to '${subject.department_name}'.`
      );
    }

    const assignment = await staffSubjectRepository.assign(staffId, subjectId);

    if (req) {
      telemetryService.emit({
        eventType: 'STAFF_SUBJECT_ASSIGN',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'STAFF',
        resourceId: staffId,
        metadata: { subject_id: subjectId, subject_code: subject.code },
      });
    }

    return assignment;
  }

  public async removeSubject(
    staffId: string,
    subjectId: string,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await staffSubjectRepository.remove(staffId, subjectId);

    if (req) {
      telemetryService.emit({
        eventType: 'STAFF_SUBJECT_REMOVE',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'STAFF',
        resourceId: staffId,
        metadata: { subject_id: subjectId },
      });
    }
  }

  public async getSubjects(staffId: string): Promise<any[]> {
    return staffRepository.getAssignedSubjects(staffId);
  }
}

export const staffService = new StaffService();
