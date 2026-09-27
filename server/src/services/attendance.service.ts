import { Request } from 'express';
import {
  AttendanceRepository,
  AttendanceWithDetails,
  AttendanceRow,
  StudentAttendanceFullResponse,
  CreateAttendanceDTO,
  UpdateAttendanceDTO,
  AttendanceFilterOptions,
} from '../repositories/attendance.repository';
import { SubjectRepository } from '../repositories/subject.repository';
import { ClassRepository } from '../repositories/class.repository';
import { StudentRepository } from '../repositories/student.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { telemetryService } from './telemetry.service';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest } from '../types/common';

export interface MarkAttendanceInput {
  class_id: string;
  subject_id: string;
  attendance_date: string;
  records: Array<{
    student_id: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    remarks?: string | null;
  }>;
}

export class AttendanceService {
  private attendanceRepo: AttendanceRepository;
  private subjectRepo: SubjectRepository;
  private classRepo: ClassRepository;
  private studentRepo: StudentRepository;
  private staffRepo: StaffRepository;

  constructor() {
    this.attendanceRepo = new AttendanceRepository();
    this.subjectRepo = new SubjectRepository();
    this.classRepo = new ClassRepository();
    this.studentRepo = new StudentRepository();
    this.staffRepo = new StaffRepository();
  }

  /**
   * Retrieves full attendance report (summary, subject-breakdown, logs) for the logged-in student.
   */
  public async getStudentAttendance(
    req: AuthenticatedRequest,
    filters: { subjectId?: string; startDate?: string; endDate?: string; status?: string; academicYear?: string; semester?: any } = {}
  ): Promise<StudentAttendanceFullResponse> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access their personal attendance dashboard');
    }

    const student = await this.attendanceRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found for authenticated user');
    }

    const records = await this.attendanceRepo.findStudentAttendance(student.id, filters);
    const { overall, subjects } = await this.attendanceRepo.getStudentAttendanceSummary(student.id, {
      academicYear: filters.academicYear,
      semester: filters.semester ? parseInt(filters.semester.toString(), 10) : undefined,
    });

    // Telemetry
    telemetryService.emit({
      eventType: 'ATTENDANCE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTENDANCE',
      resourceId: student.id,
      metadata: {
        total_conducted: overall.total_conducted,
        overall_percentage: overall.overall_percentage,
        subjects_count: subjects.length,
      },
    });

    return {
      overall,
      subjects,
      records,
    };
  }

  /**
   * Retrieves class attendance list for authorized faculty or admin.
   */
  public async getClassAttendance(
    classId: string,
    req: AuthenticatedRequest,
    filters: { subjectId?: string; date?: string; status?: string } = {}
  ): Promise<AttendanceWithDetails[]> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) {
      throw ApiError.notFound('Academic class batch not found');
    }

    if (req.user.role === 'STAFF') {
      const staff = await this.attendanceRepo.findStaffByUserId(req.user.id);
      if (!staff) {
        throw ApiError.forbidden('Faculty profile not found');
      }
      // If subjectId is given, verify assignment
      if (filters.subjectId) {
        const isAssigned = await this.attendanceRepo.isStaffAssignedToSubject(staff.id, filters.subjectId);
        if (!isAssigned) {
          throw ApiError.forbidden('Faculty is not assigned to this subject');
        }
      }
    } else if (req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Unauthorized to view class attendance register');
    }

    const rows = await this.attendanceRepo.findClassAttendance(classId, filters);

    telemetryService.emit({
      eventType: 'ATTENDANCE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTENDANCE',
      resourceId: classId,
      metadata: {
        class_id: classId,
        subject_id: filters.subjectId,
        date: filters.date,
        count: rows.length,
      },
    });

    return rows;
  }

  /**
   * Retrieves class attendance for a specific date and subject.
   */
  public async getClassAttendanceByDate(
    classId: string,
    subjectId: string,
    date: string,
    req: AuthenticatedRequest
  ): Promise<AttendanceWithDetails[]> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) {
      throw ApiError.notFound('Academic class batch not found');
    }

    const sub = await this.subjectRepo.findById(subjectId);
    if (!sub) {
      throw ApiError.notFound('Subject not found');
    }

    if (req.user.role === 'STAFF') {
      const staff = await this.attendanceRepo.findStaffByUserId(req.user.id);
      if (!staff) {
        throw ApiError.forbidden('Faculty profile not found');
      }
      const isAssigned = await this.attendanceRepo.isStaffAssignedToSubject(staff.id, subjectId);
      if (!isAssigned) {
        throw ApiError.forbidden('Faculty is not assigned to this course');
      }
    } else if (req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Unauthorized to view attendance records');
    }

    return this.attendanceRepo.findAttendanceByDate(classId, subjectId, date);
  }

  /**
   * Records attendance in bulk or single mode with strict validation & transactions.
   */
  public async markAttendance(
    input: MarkAttendanceInput,
    req: AuthenticatedRequest
  ): Promise<AttendanceRow[]> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (req.user.role === 'STUDENT') {
      throw ApiError.forbidden('Students cannot record or modify attendance');
    }

    if (!input.class_id || !input.subject_id || !input.attendance_date || !Array.isArray(input.records)) {
      throw ApiError.badRequest('Missing required attendance marking fields');
    }

    // Validate class
    const cls = await this.classRepo.findById(input.class_id);
    if (!cls) {
      throw ApiError.notFound('Selected class batch does not exist');
    }

    // Validate subject
    const sub = await this.subjectRepo.findById(input.subject_id);
    if (!sub) {
      throw ApiError.notFound('Selected course / subject does not exist');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.attendance_date)) {
      throw ApiError.badRequest('Invalid date format. Expected YYYY-MM-DD');
    }

    let markedById: string;

    if (req.user.role === 'STAFF') {
      const staff = await this.attendanceRepo.findStaffByUserId(req.user.id);
      if (!staff) {
        throw ApiError.forbidden('Faculty record not found');
      }
      const isAssigned = await this.attendanceRepo.isStaffAssignedToSubject(staff.id, input.subject_id);
      if (!isAssigned) {
        throw ApiError.forbidden('Faculty is not assigned to teach this subject');
      }
      markedById = staff.id;
    } else {
      // ADMIN: pick a staff or fallback to first staff in department
      const staffList = await this.staffRepo.findAll();
      markedById = staffList[0]?.staff_id;
      if (!markedById) {
        throw ApiError.badRequest('No staff profile available in the system');
      }
    }

    // Validate each student
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE'];
    const preparedRecords: CreateAttendanceDTO[] = [];

    for (const rec of input.records) {
      if (!rec.student_id || !validStatuses.includes(rec.status)) {
        throw ApiError.badRequest(`Invalid status or missing student ID: ${rec.status}`);
      }

      // Check student enrollment in the class
      const isInClass = await this.attendanceRepo.isStudentInClass(rec.student_id, input.class_id);
      if (!isInClass) {
        throw ApiError.badRequest(`Student ${rec.student_id} is not enrolled in class ${input.class_id}`);
      }

      preparedRecords.push({
        student_id: rec.student_id,
        class_id: input.class_id,
        subject_id: input.subject_id,
        marked_by: markedById,
        attendance_date: input.attendance_date,
        status: rec.status,
        remarks: rec.remarks || null,
      });
    }

    const saved = await this.attendanceRepo.createBulk(preparedRecords);

    telemetryService.emit({
      eventType: 'ATTENDANCE_MARK',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTENDANCE',
      resourceId: input.class_id,
      metadata: {
        class_id: input.class_id,
        subject_id: input.subject_id,
        date: input.attendance_date,
        marked_by: markedById,
        total_records: saved.length,
      },
    });

    return saved;
  }

  /**
   * Update an individual attendance record.
   */
  public async updateAttendance(
    attendanceId: string,
    data: UpdateAttendanceDTO,
    req: AuthenticatedRequest
  ): Promise<AttendanceRow> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (req.user.role === 'STUDENT') {
      throw ApiError.forbidden('Students cannot modify attendance records');
    }

    const existing = await this.attendanceRepo.findById(attendanceId);
    if (!existing) {
      throw ApiError.notFound('Attendance record not found');
    }

    if (req.user.role === 'STAFF') {
      const staff = await this.attendanceRepo.findStaffByUserId(req.user.id);
      if (!staff) {
        throw ApiError.forbidden('Faculty profile not found');
      }
      const isAssigned = await this.attendanceRepo.isStaffAssignedToSubject(staff.id, existing.subject_id);
      if (!isAssigned) {
        throw ApiError.forbidden('Faculty is not authorized to edit attendance for this subject');
      }
    }

    if (data.status && !['PRESENT', 'ABSENT', 'LATE'].includes(data.status)) {
      throw ApiError.badRequest('Invalid attendance status');
    }

    const updated = await this.attendanceRepo.update(attendanceId, data);
    if (!updated) {
      throw ApiError.internal('Failed to update attendance record');
    }

    telemetryService.emit({
      eventType: 'ATTENDANCE_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTENDANCE',
      resourceId: attendanceId,
      metadata: {
        attendance_id: attendanceId,
        previous_status: existing.status,
        new_status: updated.status,
      },
    });

    return updated;
  }

  /**
   * Delete attendance record (Admin only).
   */
  public async deleteAttendance(
    attendanceId: string,
    req: AuthenticatedRequest
  ): Promise<void> {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only administrators can delete attendance records');
    }

    const existing = await this.attendanceRepo.findById(attendanceId);
    if (!existing) {
      throw ApiError.notFound('Attendance record not found');
    }

    await this.attendanceRepo.delete(attendanceId);

    telemetryService.emit({
      eventType: 'ATTENDANCE_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTENDANCE',
      resourceId: attendanceId,
      metadata: {
        attendance_id: attendanceId,
        student_id: existing.student_id,
        subject_id: existing.subject_id,
        date: existing.attendance_date,
      },
    });
  }

  /**
   * Get single attendance record by ID.
   */
  public async getAttendanceById(
    attendanceId: string,
    req: AuthenticatedRequest
  ): Promise<AttendanceWithDetails> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const record = await this.attendanceRepo.findById(attendanceId);
    if (!record) {
      throw ApiError.notFound('Attendance record not found');
    }

    if (req.user.role === 'STUDENT') {
      const student = await this.attendanceRepo.findStudentByUserId(req.user.id);
      if (!student || student.id !== record.student_id) {
        throw ApiError.forbidden('Access denied to attendance record');
      }
    }

    return record;
  }

  /**
   * List all attendance records for Admin portal.
   */
  public async getAllAttendance(
    req: AuthenticatedRequest,
    options: AttendanceFilterOptions = {}
  ): Promise<{ rows: AttendanceWithDetails[]; total: number }> {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only administrators can view all attendance registers');
    }

    return this.attendanceRepo.findAll(options);
  }
}

export const attendanceService = new AttendanceService();
