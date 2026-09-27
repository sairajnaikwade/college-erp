import {
  timetableRepository,
  TimetableWithDetails,
  TimetableRow,
  CreateTimetableDTO,
  UpdateTimetableDTO,
  DayOfWeek,
  LectureType,
} from '../repositories/timetable.repository';
import { studentRepository } from '../repositories/student.repository';
import { staffRepository } from '../repositories/staff.repository';
import { classRepository } from '../repositories/class.repository';
import { subjectRepository } from '../repositories/subject.repository';
import { departmentRepository } from '../repositories/department.repository';
import { ApiError } from '../utils/api-error';
import { telemetryService } from './telemetry.service';
import { AuthenticatedRequest } from '../types/common';

const VALID_DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const VALID_TYPES: LectureType[] = ['THEORY', 'LAB', 'TUTORIAL', 'SEMINAR'];

export class TimetableService {
  /**
   * Retrieves timetable slots for the authenticated student.
   */
  public async getStudentTimetable(
    req: AuthenticatedRequest,
    queryParams: Record<string, unknown> = {}
  ): Promise<TimetableWithDetails[]> {
    const user = req.user;
    if (!user || user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access student timetable endpoint.');
    }

    const student = await studentRepository.findByUserId(user.id);
    if (!student) {
      throw ApiError.notFound('Student academic record not found.');
    }

    const options = {
      dayOfWeek: queryParams.day_of_week ? String(queryParams.day_of_week).toUpperCase() : undefined,
      academicYear: queryParams.academic_year ? String(queryParams.academic_year) : undefined,
      semester: queryParams.semester ? parseInt(String(queryParams.semester), 10) : undefined,
    };

    const slots = await timetableRepository.findStudentTimetable(student.student_id, options);

    telemetryService.emit({
      eventType: 'TIMETABLE_VIEW',
      result: 'SUCCESS',
      req,
      userId: user.id,
      userRole: user.role,
      resourceType: 'TIMETABLE',
      metadata: { action: 'student_view', count: slots.length, day: options.dayOfWeek || 'ALL' },
    });

    return slots;
  }

  /**
   * Retrieves teaching schedule slots for the authenticated staff member.
   */
  public async getStaffTimetable(
    req: AuthenticatedRequest,
    queryParams: Record<string, unknown> = {}
  ): Promise<TimetableWithDetails[]> {
    const user = req.user;
    if (!user || user.role !== 'STAFF') {
      throw ApiError.forbidden('Only staff members can access staff timetable endpoint.');
    }

    const staff = await staffRepository.findByUserId(user.id);
    if (!staff) {
      throw ApiError.notFound('Staff academic record not found.');
    }

    const options = {
      dayOfWeek: queryParams.day_of_week ? String(queryParams.day_of_week).toUpperCase() : undefined,
      academicYear: queryParams.academic_year ? String(queryParams.academic_year) : undefined,
      semester: queryParams.semester ? parseInt(String(queryParams.semester), 10) : undefined,
    };

    const slots = await timetableRepository.findStaffTimetable(staff.staff_id, options);

    telemetryService.emit({
      eventType: 'TIMETABLE_VIEW',
      result: 'SUCCESS',
      req,
      userId: user.id,
      userRole: user.role,
      resourceType: 'TIMETABLE',
      metadata: { action: 'staff_view', count: slots.length, day: options.dayOfWeek || 'ALL' },
    });

    return slots;
  }

  /**
   * Retrieves timetable slots for a specific class (Admin or Staff).
   */
  public async getByClass(
    classId: string,
    req: AuthenticatedRequest,
    queryParams: Record<string, unknown> = {}
  ): Promise<TimetableWithDetails[]> {
    const cls = await classRepository.findById(classId);
    if (!cls) {
      throw ApiError.notFound(`Academic class with ID '${classId}' not found.`);
    }

    const dayOfWeek = queryParams.day_of_week ? String(queryParams.day_of_week).toUpperCase() : undefined;
    const slots = await timetableRepository.findByClass(classId, { dayOfWeek });

    telemetryService.emit({
      eventType: 'TIMETABLE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'TIMETABLE',
      resourceId: classId,
      metadata: { action: 'class_view', class_name: cls.name, count: slots.length },
    });

    return slots;
  }

  /**
   * Retrieves all timetable slots matching query filters (Admin).
   */
  public async getAll(
    req: AuthenticatedRequest,
    queryParams: Record<string, unknown> = {}
  ): Promise<TimetableWithDetails[]> {
    const options = {
      departmentId: queryParams.department_id ? String(queryParams.department_id) : undefined,
      classId: queryParams.class_id ? String(queryParams.class_id) : undefined,
      staffId: queryParams.staff_id ? String(queryParams.staff_id) : undefined,
      dayOfWeek: queryParams.day_of_week ? String(queryParams.day_of_week).toUpperCase() : undefined,
      academicYear: queryParams.academic_year ? String(queryParams.academic_year) : undefined,
      semester: queryParams.semester ? parseInt(String(queryParams.semester), 10) : undefined,
    };

    const slots = await timetableRepository.findAll(options);

    telemetryService.emit({
      eventType: 'TIMETABLE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'TIMETABLE',
      metadata: { action: 'admin_list', count: slots.length },
    });

    return slots;
  }

  /**
   * Retrieves a single timetable slot by ID.
   */
  public async getById(id: string, req: AuthenticatedRequest): Promise<TimetableWithDetails> {
    const slot = await timetableRepository.findById(id);
    if (!slot) {
      throw ApiError.notFound(`Timetable slot with ID '${id}' not found.`);
    }

    const user = req.user;
    if (user && user.role === 'STUDENT') {
      const student = await studentRepository.findByUserId(user.id);
      if (!student || student.current_class_id !== slot.class_id) {
        throw ApiError.forbidden('You are not authorized to view this timetable entry.');
      }
    } else if (user && user.role === 'STAFF') {
      const staff = await staffRepository.findByUserId(user.id);
      if (!staff || staff.staff_id !== slot.staff_id) {
        throw ApiError.forbidden('You are not authorized to view this timetable entry.');
      }
    }

    telemetryService.emit({
      eventType: 'TIMETABLE_VIEW',
      result: 'SUCCESS',
      req,
      userId: user?.id,
      userRole: user?.role,
      resourceType: 'TIMETABLE',
      resourceId: id,
      metadata: { subject: slot.subject_name, day: slot.day_of_week, room: slot.room },
    });

    return slot;
  }

  /**
   * Creates a new timetable slot (ADMIN only).
   */
  public async create(dto: CreateTimetableDTO, req: AuthenticatedRequest): Promise<TimetableRow> {
    if (!dto.academic_year || !dto.academic_year.trim()) {
      throw ApiError.badRequest('Academic year is required.');
    }
    if (!dto.semester || dto.semester < 1 || dto.semester > 12) {
      throw ApiError.badRequest('Valid semester (1-12) is required.');
    }
    if (!dto.department_id) {
      throw ApiError.badRequest('Department ID is required.');
    }
    if (!dto.class_id) {
      throw ApiError.badRequest('Class ID is required.');
    }
    if (!dto.subject_id) {
      throw ApiError.badRequest('Subject ID is required.');
    }
    if (!dto.staff_id) {
      throw ApiError.badRequest('Staff ID is required.');
    }
    if (!dto.day_of_week || !VALID_DAYS.includes(dto.day_of_week.toUpperCase() as DayOfWeek)) {
      throw ApiError.badRequest(`Valid day of week is required (${VALID_DAYS.join(', ')}).`);
    }
    if (!dto.start_time || !dto.end_time) {
      throw ApiError.badRequest('Start time and end time are required.');
    }
    if (dto.start_time >= dto.end_time) {
      throw ApiError.badRequest('Start time must be before end time.');
    }
    if (!dto.room || !dto.room.trim()) {
      throw ApiError.badRequest('Room or laboratory designation is required.');
    }
    if (dto.lecture_type && !VALID_TYPES.includes(dto.lecture_type.toUpperCase() as LectureType)) {
      throw ApiError.badRequest(`Valid lecture type is required (${VALID_TYPES.join(', ')}).`);
    }

    // 1. Verify department exists
    const dept = await departmentRepository.findById(dto.department_id);
    if (!dept) {
      throw ApiError.badRequest(`Department with ID '${dto.department_id}' does not exist.`);
    }

    // 2. Verify class exists and belongs to department
    const cls = await classRepository.findById(dto.class_id);
    if (!cls) {
      throw ApiError.badRequest(`Class with ID '${dto.class_id}' does not exist.`);
    }
    if (cls.department_id !== dto.department_id) {
      throw ApiError.badRequest(
        `Class department mismatch: class belongs to department '${cls.department_code}' rather than requested department.`
      );
    }

    // 3. Verify subject exists and belongs to department
    const sub = await subjectRepository.findById(dto.subject_id);
    if (!sub) {
      throw ApiError.badRequest(`Subject with ID '${dto.subject_id}' does not exist.`);
    }
    if (sub.department_id !== dto.department_id) {
      throw ApiError.badRequest(
        `Subject department mismatch: subject '${sub.code}' belongs to department '${sub.department_code}' rather than requested department.`
      );
    }

    // 4. Verify staff exists and belongs to department
    const stf = await staffRepository.findById(dto.staff_id);
    if (!stf) {
      throw ApiError.badRequest(`Staff with ID '${dto.staff_id}' does not exist.`);
    }
    if (stf.department_id && stf.department_id !== dto.department_id) {
      throw ApiError.badRequest(
        `Staff department mismatch: staff member belongs to department '${stf.department_code}' rather than requested department.`
      );
    }

    // 5. Check slot conflicts
    const conflicts = await timetableRepository.findConflicts(
      dto.class_id,
      dto.staff_id,
      dto.day_of_week,
      dto.start_time,
      dto.end_time
    );

    if (conflicts.classConflict) {
      throw ApiError.conflict(
        `Class scheduling conflict: ${cls.name} already has a session scheduled on ${dto.day_of_week} between ${dto.start_time} and ${dto.end_time}.`
      );
    }
    if (conflicts.staffConflict) {
      throw ApiError.conflict(
        `Faculty scheduling conflict: ${stf.first_name} ${stf.last_name} is already assigned to another session on ${dto.day_of_week} between ${dto.start_time} and ${dto.end_time}.`
      );
    }

    const created = await timetableRepository.create(dto);

    telemetryService.emit({
      eventType: 'TIMETABLE_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'TIMETABLE',
      resourceId: created.id,
      metadata: {
        academic_year: created.academic_year,
        semester: created.semester,
        day: created.day_of_week,
        time: `${created.start_time}-${created.end_time}`,
        room: created.room,
      },
    });

    return created;
  }

  /**
   * Updates an existing timetable slot (ADMIN only).
   */
  public async update(
    id: string,
    dto: UpdateTimetableDTO,
    req: AuthenticatedRequest
  ): Promise<TimetableRow> {
    const existing = await timetableRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Timetable slot with ID '${id}' not found.`);
    }

    const targetDeptId = dto.department_id || existing.department_id;
    const targetClassId = dto.class_id || existing.class_id;
    const targetSubjectId = dto.subject_id || existing.subject_id;
    const targetStaffId = dto.staff_id || existing.staff_id;
    const targetDay = (dto.day_of_week || existing.day_of_week).toUpperCase() as DayOfWeek;
    const targetStartTime = dto.start_time || existing.start_time;
    const targetEndTime = dto.end_time || existing.end_time;

    if (!VALID_DAYS.includes(targetDay)) {
      throw ApiError.badRequest(`Valid day of week is required (${VALID_DAYS.join(', ')}).`);
    }

    if (targetStartTime >= targetEndTime) {
      throw ApiError.badRequest('Start time must be before end time.');
    }

    // Verify entities if changed
    if (dto.class_id) {
      const cls = await classRepository.findById(targetClassId);
      if (!cls) throw ApiError.badRequest('Referenced class not found.');
      if (cls.department_id !== targetDeptId) {
        throw ApiError.badRequest('Class department does not match timetable department.');
      }
    }

    if (dto.subject_id) {
      const sub = await subjectRepository.findById(targetSubjectId);
      if (!sub) throw ApiError.badRequest('Referenced subject not found.');
      if (sub.department_id !== targetDeptId) {
        throw ApiError.badRequest('Subject department does not match timetable department.');
      }
    }

    if (dto.staff_id) {
      const stf = await staffRepository.findById(targetStaffId);
      if (!stf) throw ApiError.badRequest('Referenced staff not found.');
      if (stf.department_id && stf.department_id !== targetDeptId) {
        throw ApiError.badRequest('Staff department does not match timetable department.');
      }
    }

    // Check conflicts excluding self
    const conflicts = await timetableRepository.findConflicts(
      targetClassId,
      targetStaffId,
      targetDay,
      targetStartTime,
      targetEndTime,
      id
    );

    if (conflicts.classConflict) {
      throw ApiError.conflict(`Class already has an overlapping session on ${targetDay}.`);
    }
    if (conflicts.staffConflict) {
      throw ApiError.conflict(`Faculty member already has an overlapping session on ${targetDay}.`);
    }

    const updated = await timetableRepository.update(id, dto);
    if (!updated) {
      throw ApiError.internal('Failed to update timetable slot.');
    }

    telemetryService.emit({
      eventType: 'TIMETABLE_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'TIMETABLE',
      resourceId: id,
      metadata: { day: updated.day_of_week, room: updated.room },
    });

    return updated;
  }

  /**
   * Deletes a timetable slot (ADMIN only).
   */
  public async delete(id: string, req: AuthenticatedRequest): Promise<void> {
    const existing = await timetableRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Timetable slot with ID '${id}' not found.`);
    }

    await timetableRepository.delete(id);

    telemetryService.emit({
      eventType: 'TIMETABLE_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'TIMETABLE',
      resourceId: id,
      metadata: { subject: existing.subject_name, day: existing.day_of_week },
    });
  }
}

export const timetableService = new TimetableService();
