import { Request } from 'express';
import {
  departmentRepository,
  DepartmentWithStats,
  DepartmentRow,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
} from '../repositories/department.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest } from '../types/common';

export class DepartmentService {
  public async getAll(req?: Request): Promise<DepartmentWithStats[]> {
    const list = await departmentRepository.findAll();
    if (req) {
      telemetryService.emit({
        eventType: 'DEPARTMENT_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'DEPARTMENT',
        metadata: { action: 'list_all', count: list.length },
      });
    }
    return list;
  }

  public async getById(id: string, req?: Request): Promise<DepartmentWithStats> {
    const dept = await departmentRepository.findById(id);
    if (!dept) {
      throw ApiError.notFound(`Department with ID '${id}' not found.`);
    }
    if (req) {
      telemetryService.emit({
        eventType: 'DEPARTMENT_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'DEPARTMENT',
        resourceId: id,
        metadata: { department_code: dept.code },
      });
    }
    return dept;
  }

  public async create(dto: CreateDepartmentDTO, req: AuthenticatedRequest): Promise<DepartmentRow> {
    if (!dto.name || !dto.name.trim()) {
      throw ApiError.badRequest('Department name is required.');
    }
    if (!dto.code || !dto.code.trim()) {
      throw ApiError.badRequest('Department code is required.');
    }

    const existing = await departmentRepository.findByCode(dto.code);
    if (existing) {
      throw ApiError.conflict(`Department code '${dto.code.toUpperCase()}' already exists.`);
    }

    const created = await departmentRepository.create(dto);

    telemetryService.emit({
      eventType: 'DEPARTMENT_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'DEPARTMENT',
      resourceId: created.id,
      metadata: { code: created.code, name: created.name },
    });

    return created;
  }

  public async update(
    id: string,
    dto: UpdateDepartmentDTO,
    req: AuthenticatedRequest
  ): Promise<DepartmentRow> {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Department with ID '${id}' not found.`);
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await departmentRepository.findByCode(dto.code);
      if (codeCheck && codeCheck.id !== id) {
        throw ApiError.conflict(`Department code '${dto.code.toUpperCase()}' already in use.`);
      }
    }

    const updated = await departmentRepository.update(id, dto);

    telemetryService.emit({
      eventType: 'DEPARTMENT_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'DEPARTMENT',
      resourceId: id,
      metadata: { code: updated?.code, name: updated?.name },
    });

    return updated!;
  }

  public async delete(id: string, req: AuthenticatedRequest): Promise<void> {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Department with ID '${id}' not found.`);
    }

    // Constraint 4: Prefer deactivation over destructive deletion when dependencies exist
    if (existing.student_count > 0 || existing.staff_count > 0 || existing.class_count > 0 || existing.subject_count > 0) {
      throw ApiError.conflict(
        `Cannot delete department '${existing.code}'. It has ${existing.student_count} student(s), ${existing.staff_count} staff, ${existing.class_count} class(es), and ${existing.subject_count} subject(s) associated with it.`
      );
    }

    await departmentRepository.delete(id);

    telemetryService.emit({
      eventType: 'DEPARTMENT_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'DEPARTMENT',
      resourceId: id,
      metadata: { code: existing.code },
    });
  }
}

export const departmentService = new DepartmentService();
