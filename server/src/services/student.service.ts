import { Request } from 'express';
import {
  studentRepository,
  StudentWithFullProfile,
  StudentFilter,
  CreateStudentDTO,
  UpdateStudentDTO,
} from '../repositories/student.repository';
import { classRepository } from '../repositories/class.repository';
import { studentClassRepository } from '../repositories/student-class.repository';
import { userRepository } from '../repositories/user.repository';
import { departmentRepository } from '../repositories/department.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest, AccountStatus } from '../types/common';

export class StudentService {
  public async getAll(filter?: StudentFilter, req?: Request): Promise<StudentWithFullProfile[]> {
    const list = await studentRepository.findAll(filter);
    if (req) {
      telemetryService.emit({
        eventType: 'STUDENT_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'STUDENT',
        metadata: { filter, count: list.length },
      });
    }
    return list;
  }

  public async getById(id: string, req?: Request): Promise<StudentWithFullProfile> {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw ApiError.notFound(`Student with ID '${id}' not found.`);
    }
    if (req) {
      telemetryService.emit({
        eventType: 'STUDENT_VIEW',
        result: 'SUCCESS',
        req,
        resourceType: 'STUDENT',
        resourceId: id,
        metadata: { student_roll_number: student.student_roll_number },
      });
    }
    return student;
  }

  /**
   * Retrieves profile for currently authenticated student (identity scoped).
   */
  public async getMyProfile(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'PROFILE',
        metadata: { endpoint: '/api/students/me', reason: 'NON_STUDENT_ACCESS' },
      });
      throw ApiError.forbidden('Only students can access student profile.');
    }

    const student = await studentRepository.findByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student record not found for this user account.');
    }

    const enrolledSubjects = await studentRepository.getEnrolledSubjects(student.student_id);
    const classHistory = await studentClassRepository.findByStudent(student.student_id);

    telemetryService.emit({
      eventType: 'PROFILE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: 'STUDENT',
      resourceType: 'STUDENT',
      resourceId: student.student_id,
      metadata: { roll_number: student.student_roll_number },
    });

    return {
      ...student,
      enrolled_subjects: enrolledSubjects,
      class_history: classHistory,
    };
  }

  /**
   * Creates student + user account (Transactional).
   */
  public async create(dto: CreateStudentDTO, req: AuthenticatedRequest): Promise<StudentWithFullProfile> {
    if (!dto.username || !dto.email || !dto.first_name || !dto.last_name || !dto.department_id || !dto.student_roll_number || !dto.enrollment_number) {
      throw ApiError.badRequest('Required student details are missing.');
    }

    const dept = await departmentRepository.findById(dto.department_id);
    if (!dept) {
      throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
    }

    // Constraint 2: Student department must match assigned class department
    if (dto.class_id) {
      const cls = await classRepository.findById(dto.class_id);
      if (!cls) {
        throw ApiError.notFound(`Class with ID '${dto.class_id}' does not exist.`);
      }
      if (cls.department_id !== dto.department_id) {
        throw ApiError.badRequest(
          `Department mismatch: Student is in '${dept.name}', but selected class belongs to '${cls.department_name}'.`
        );
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
      const created = await studentRepository.createWithUser(dto);

      telemetryService.emit({
        eventType: 'STUDENT_CREATE',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'STUDENT',
        resourceId: created.student_id,
        metadata: {
          roll_number: created.student_roll_number,
          department_id: created.department_id,
        },
      });

      return created;
    } catch (err: any) {
      if (err.code === '23505') {
        throw ApiError.conflict('Roll number or enrollment number already exists.');
      }
      throw err;
    }
  }

  public async update(
    id: string,
    dto: UpdateStudentDTO,
    req: AuthenticatedRequest
  ): Promise<StudentWithFullProfile> {
    const existing = await studentRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Student with ID '${id}' not found.`);
    }

    if (dto.department_id) {
      const dept = await departmentRepository.findById(dto.department_id);
      if (!dept) {
        throw ApiError.notFound(`Department with ID '${dto.department_id}' does not exist.`);
      }
    }

    const updated = await studentRepository.update(id, dto);

    telemetryService.emit({
      eventType: 'STUDENT_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'STUDENT',
      resourceId: id,
      metadata: { roll_number: updated?.student_roll_number },
    });

    return updated!;
  }

  public async updateStatus(
    id: string,
    status: AccountStatus,
    req: AuthenticatedRequest
  ): Promise<void> {
    const existing = await studentRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Student with ID '${id}' not found.`);
    }

    await studentRepository.updateStatus(id, status);

    const eventType = status === 'ACTIVE' ? 'STUDENT_ENABLE' : 'STUDENT_DISABLE';
    telemetryService.emit({
      eventType,
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'STUDENT',
      resourceId: id,
      metadata: { new_status: status },
    });
  }

  /**
   * Assigns a student to a class (Enforcing department matching).
   */
  public async assignToClass(
    studentId: string,
    classId: string,
    academicYear = '2025-2026',
    req?: AuthenticatedRequest
  ): Promise<any> {
    const student = await studentRepository.findById(studentId);
    if (!student) {
      throw ApiError.notFound(`Student with ID '${studentId}' not found.`);
    }

    const cls = await classRepository.findById(classId);
    if (!cls) {
      throw ApiError.notFound(`Class with ID '${classId}' not found.`);
    }

    // Constraint 2: Student department must match class department
    if (student.department_id !== cls.department_id) {
      throw ApiError.badRequest(
        `Department mismatch: Student is registered in '${student.department_name}', but class '${cls.name}' belongs to '${cls.department_name}'.`
      );
    }

    const assignment = await studentClassRepository.assign(studentId, classId, academicYear);

    if (req) {
      telemetryService.emit({
        eventType: 'STUDENT_CLASS_ASSIGN',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'STUDENT',
        resourceId: studentId,
        metadata: { class_id: classId, academic_year: academicYear },
      });
    }

    return assignment;
  }

  public async removeFromClass(
    studentId: string,
    classId: string,
    req?: AuthenticatedRequest
  ): Promise<void> {
    await studentClassRepository.remove(studentId, classId);

    if (req) {
      telemetryService.emit({
        eventType: 'STUDENT_CLASS_REMOVE',
        result: 'SUCCESS',
        req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'STUDENT',
        resourceId: studentId,
        metadata: { class_id: classId },
      });
    }
  }

  public async getClass(studentId: string): Promise<any[]> {
    return studentClassRepository.findByStudent(studentId);
  }
}

export const studentService = new StudentService();
