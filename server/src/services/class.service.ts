import { Request } from 'express';
import {
  classRepository,
  ClassWithDetails,
  ClassRow,
  ClassFilter,
  CreateClassDTO,
  UpdateClassDTO,
} from '../repositories/class.repository';
import { departmentRepository } from '../repositories/department.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest } from '../types/common';

export class ClassService {
  public async getAll(filter?: ClassFilter, req?: Request): Promise<ClassWithDetails[]> {
    const list = await classRepository.findAll(filter);
    if (req) {
      telemetryService.emit({
        eventType: 'CLASS_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'CLASS',
        metadata: { filter, count: list.length },
      });
    }
    return list;
  }

  public async getById(id: string, req?: Request): Promise<ClassWithDetails> {
    const cls = await classRepository.findById(id);
    if (!cls) {
      throw ApiError.notFound(`Class with ID '${id}' not found.`);
    }
    if (req) {
      telemetryService.emit({
        eventType: 'CLASS_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'CLASS',
        resourceId: id,
        metadata: { class_name: cls.name },
      });
    }
    return cls;
  }

  public async create(dto: CreateClassDTO, req: AuthenticatedRequest): Promise<ClassRow> {
    if (!dto.name || !dto.name.trim()) {
      throw ApiError.badRequest('Class name is required.');
    }
    if (!dto.department_id) {
      throw ApiError.badRequest('Department ID is required.');
    }
    if (!dto.academic_year || !dto.academic_year.trim()) {
      throw ApiError.badRequest('Academic year is required (e.g. 2025-2026).');
    }
    if (!dto.year || dto.year < 1 || dto.year > 6) {
      throw ApiError.badRequest('Year must be between 1 and 6.');
    }
    if (!dto.semester || dto.semester < 1 || dto.semester > 12) {
      throw ApiError.badRequest('Semester must be between 1 and 12.');
    }

    const dept = await departmentRepository.findById(dto.department_id);
    if (!dept) {
      throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
    }

    try {
      const created = await classRepository.create(dto);

      telemetryService.emit({
        eventType: 'CLASS_CREATE',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'CLASS',
        resourceId: created.id,
        metadata: { name: created.name, department_id: created.department_id },
      });

      return created;
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.conflict('A class with this department, year, semester, division, and academic year already exists.');
      }
      throw err;
    }
  }

  public async update(id: string, dto: UpdateClassDTO, req: AuthenticatedRequest): Promise<ClassRow> {
    const existing = await classRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Class with ID '${id}' not found.`);
    }

    if (dto.department_id) {
      const dept = await departmentRepository.findById(dto.department_id);
      if (!dept) {
        throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
      }
    }

    if (dto.year !== undefined && (dto.year < 1 || dto.year > 6)) {
      throw ApiError.badRequest('Year must be between 1 and 6.');
    }
    if (dto.semester !== undefined && (dto.semester < 1 || dto.semester > 12)) {
      throw ApiError.badRequest('Semester must be between 1 and 12.');
    }

    try {
      const updated = await classRepository.update(id, dto);

      telemetryService.emit({
        eventType: 'CLASS_UPDATE',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'CLASS',
        resourceId: id,
        metadata: { name: updated?.name },
      });

      return updated!;
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.conflict('A class with this batch and division already exists.');
      }
      throw err;
    }
  }

  public async delete(id: string, req: AuthenticatedRequest): Promise<void> {
    const existing = await classRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Class with ID '${id}' not found.`);
    }

    if (existing.student_count > 0) {
      throw ApiError.conflict(`Cannot delete class '${existing.name}'. It has ${existing.student_count} student(s) currently enrolled.`);
    }

    await classRepository.delete(id);

    telemetryService.emit({
      eventType: 'CLASS_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'CLASS',
      resourceId: id,
      metadata: { name: existing.name },
    });
  }
}

export const classService = new ClassService();
