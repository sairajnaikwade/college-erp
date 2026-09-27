import { Request } from 'express';
import {
  subjectRepository,
  SubjectWithDetails,
  SubjectRow,
  SubjectFilter,
  CreateSubjectDTO,
  UpdateSubjectDTO,
} from '../repositories/subject.repository';
import { departmentRepository } from '../repositories/department.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest } from '../types/common';

export class SubjectService {
  public async getAll(filter?: SubjectFilter, req?: Request): Promise<SubjectWithDetails[]> {
    const list = await subjectRepository.findAll(filter);
    if (req) {
      telemetryService.emit({
        eventType: 'SUBJECT_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'SUBJECT',
        metadata: { filter, count: list.length },
      });
    }
    return list;
  }

  public async getById(id: string, req?: Request): Promise<SubjectWithDetails> {
    const subject = await subjectRepository.findById(id);
    if (!subject) {
      throw ApiError.notFound(`Subject with ID '${id}' not found.`);
    }
    if (req) {
      telemetryService.emit({
        eventType: 'SUBJECT_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'SUBJECT',
        resourceId: id,
        metadata: { code: subject.code, name: subject.name },
      });
    }
    return subject;
  }

  public async create(dto: CreateSubjectDTO, req: AuthenticatedRequest): Promise<SubjectRow> {
    if (!dto.code || !dto.code.trim()) {
      throw ApiError.badRequest('Subject code is required.');
    }
    if (!dto.name || !dto.name.trim()) {
      throw ApiError.badRequest('Subject name is required.');
    }
    if (!dto.department_id) {
      throw ApiError.badRequest('Department ID is required.');
    }
    if (!dto.semester || dto.semester < 1 || dto.semester > 12) {
      throw ApiError.badRequest('Semester must be between 1 and 12.');
    }

    const dept = await departmentRepository.findById(dto.department_id);
    if (!dept) {
      throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
    }

    const existingCode = await subjectRepository.findByCode(dto.code);
    if (existingCode) {
      throw ApiError.conflict(`Subject code '${dto.code.toUpperCase()}' already exists.`);
    }

    const created = await subjectRepository.create(dto);

    telemetryService.emit({
      eventType: 'SUBJECT_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'SUBJECT',
      resourceId: created.id,
      metadata: { code: created.code, name: created.name },
    });

    return created;
  }

  public async update(id: string, dto: UpdateSubjectDTO, req: AuthenticatedRequest): Promise<SubjectRow> {
    const existing = await subjectRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Subject with ID '${id}' not found.`);
    }

    if (dto.department_id) {
      const dept = await departmentRepository.findById(dto.department_id);
      if (!dept) {
        throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
      }
    }

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const codeCheck = await subjectRepository.findByCode(dto.code);
      if (codeCheck && codeCheck.id !== id) {
        throw ApiError.conflict(`Subject code '${dto.code.toUpperCase()}' is already in use.`);
      }
    }

    const updated = await subjectRepository.update(id, dto);

    telemetryService.emit({
      eventType: 'SUBJECT_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'SUBJECT',
      resourceId: id,
      metadata: { code: updated?.code, name: updated?.name },
    });

    return updated!;
  }

  public async delete(id: string, req: AuthenticatedRequest): Promise<void> {
    const existing = await subjectRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Subject with ID '${id}' not found.`);
    }

    if (existing.assigned_staff_count > 0) {
      throw ApiError.conflict(`Cannot delete subject '${existing.code}'. It has ${existing.assigned_staff_count} faculty member(s) assigned.`);
    }

    await subjectRepository.delete(id);

    telemetryService.emit({
      eventType: 'SUBJECT_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'SUBJECT',
      resourceId: id,
      metadata: { code: existing.code },
    });
  }
}

export const subjectService = new SubjectService();
