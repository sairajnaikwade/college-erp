import { reportsRepository, DateRangeFilter } from '../repositories/reports.repository';
import { classRepository } from '../repositories/class.repository';
import { subjectRepository } from '../repositories/subject.repository';
import { telemetryService } from './telemetry.service';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest } from '../types/common';

export class ReportsService {
  private reportsRepo = reportsRepository;
  private classRepo = classRepository;
  private subjectRepo = subjectRepository;

  // ─── 1. STUDENT REPORTS ─────────────────────────────────────

  /**
   * GET /api/reports/student/summary (Authenticated Student)
   */
  public async getStudentSummary(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access their personal academic summary');
    }

    const student = await this.reportsRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const summary = await this.reportsRepo.getStudentAcademicSummary(student.id);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'STUDENT_REPORT',
      resourceId: student.id,
      metadata: {
        report_type: 'STUDENT_ACADEMIC_SUMMARY',
        student_roll_number: student.student_roll_number,
      },
    });

    return summary;
  }

  /**
   * GET /api/reports/student/attendance (Authenticated Student)
   */
  public async getStudentAttendanceReport(
    req: AuthenticatedRequest,
    filters: DateRangeFilter = {}
  ): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access their personal attendance report');
    }

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw ApiError.badRequest('Invalid date range: startDate cannot be after endDate');
    }

    const student = await this.reportsRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const report = await this.reportsRepo.getStudentAttendanceReport(student.id, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'STUDENT_REPORT',
      resourceId: student.id,
      metadata: {
        report_type: 'STUDENT_ATTENDANCE_REPORT',
        start_date: filters.startDate,
        end_date: filters.endDate,
      },
    });

    return report;
  }

  /**
   * GET /api/reports/student/assignments (Authenticated Student)
   */
  public async getStudentAssignmentReport(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access their personal assignment report');
    }

    const student = await this.reportsRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const report = await this.reportsRepo.getStudentAssignmentReport(student.id);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'STUDENT_REPORT',
      resourceId: student.id,
      metadata: {
        report_type: 'STUDENT_ASSIGNMENT_REPORT',
      },
    });

    return report;
  }

  /**
   * GET /api/reports/student/quizzes (Authenticated Student)
   */
  public async getStudentQuizReport(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access their personal quiz report');
    }

    const student = await this.reportsRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const report = await this.reportsRepo.getStudentQuizReport(student.id);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'STUDENT_REPORT',
      resourceId: student.id,
      metadata: {
        report_type: 'STUDENT_QUIZ_REPORT',
      },
    });

    return report;
  }

  /**
   * GET /api/reports/student/academic or /api/reports/student/:studentId (Authorized View)
   */
  public async getStudentAcademicReport(
    targetStudentId: string | undefined,
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    let resolvedStudentId = targetStudentId;

    if (req.user.role === 'STUDENT') {
      const student = await this.reportsRepo.findStudentByUserId(req.user.id);
      if (!student) throw ApiError.notFound('Student profile not found');

      // IDOR guard: students can only access their own report
      if (targetStudentId && targetStudentId !== student.id) {
        telemetryService.emit({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'STUDENT_REPORT',
          resourceId: targetStudentId,
          metadata: { attempted_student_id: targetStudentId, reason: 'Cross-student IDOR attempt' },
        });
        throw ApiError.forbidden('Access denied: Cannot access another student academic report');
      }
      resolvedStudentId = student.id;
    } else if (req.user.role === 'STAFF') {
      if (!targetStudentId) throw ApiError.badRequest('Student ID is required');
      const staff = await this.reportsRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      resolvedStudentId = targetStudentId;
    } else if (req.user.role === 'ADMIN') {
      if (!targetStudentId) throw ApiError.badRequest('Student ID is required');
      resolvedStudentId = targetStudentId;
    }

    if (!resolvedStudentId) throw ApiError.badRequest('Student ID is required');

    const report = await this.reportsRepo.getStudentAcademicSummary(resolvedStudentId);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'STUDENT_REPORT',
      resourceId: resolvedStudentId,
      metadata: {
        report_type: 'STUDENT_FULL_ACADEMIC_REPORT',
        target_student_id: resolvedStudentId,
      },
    });

    return report;
  }

  // ─── 2. CLASS & SUBJECT REPORTS (Staff / Admin) ──────────────

  /**
   * GET /api/reports/class/:classId/attendance
   */
  public async getClassAttendanceReport(
    classId: string,
    req: AuthenticatedRequest,
    filters: {
      subjectId?: string;
      academicYear?: string;
      semester?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can access class attendance reports');
    }

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw ApiError.badRequest('Invalid date range: startDate cannot be after endDate');
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) throw ApiError.notFound('Class batch not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.reportsRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      if (cls.department_id !== staff.department_id) {
        telemetryService.emit({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'CLASS_REPORT',
          resourceId: classId,
          metadata: { class_id: classId, reason: 'Department mismatch' },
        });
        throw ApiError.forbidden('Faculty is not authorized to access reports for this class');
      }

      if (filters.subjectId) {
        const isAssigned = await this.reportsRepo.isStaffAssignedToSubject(staff.id, filters.subjectId);
        if (!isAssigned) {
          telemetryService.emit({
            eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
            result: 'DENIED',
            req,
            userId: req.user.id,
            userRole: req.user.role,
            resourceType: 'CLASS_REPORT',
            resourceId: classId,
            metadata: { subject_id: filters.subjectId, reason: 'Staff not assigned to subject' },
          });
          throw ApiError.forbidden('Faculty is not assigned to this course subject');
        }
      }
    }

    const report = await this.reportsRepo.getClassAttendanceReport(classId, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'CLASS_REPORT',
      resourceId: classId,
      metadata: {
        report_type: 'CLASS_ATTENDANCE_REPORT',
        class_id: classId,
        subject_id: filters.subjectId,
      },
    });

    return report;
  }

  /**
   * GET /api/reports/class/:classId/performance
   */
  public async getClassPerformanceReport(
    classId: string,
    req: AuthenticatedRequest,
    filters: { subjectId?: string; academicYear?: string; semester?: number } = {}
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can access class performance reports');
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) throw ApiError.notFound('Class batch not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.reportsRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      if (cls.department_id !== staff.department_id) {
        telemetryService.emit({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'CLASS_REPORT',
          resourceId: classId,
          metadata: { class_id: classId, reason: 'Department mismatch' },
        });
        throw ApiError.forbidden('Faculty is not authorized to access performance reports for this class');
      }
    }

    const report = await this.reportsRepo.getClassPerformanceReport(classId, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'CLASS_REPORT',
      resourceId: classId,
      metadata: {
        report_type: 'CLASS_PERFORMANCE_REPORT',
        class_id: classId,
        subject_id: filters.subjectId,
      },
    });

    return report;
  }

  /**
   * GET /api/reports/subject/:subjectId/performance
   */
  public async getSubjectPerformanceReport(
    subjectId: string,
    req: AuthenticatedRequest,
    filters: { classId?: string; academicYear?: string; semester?: number } = {}
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can access subject performance reports');
    }

    const sub = await this.subjectRepo.findById(subjectId);
    if (!sub) throw ApiError.notFound('Subject not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.reportsRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      const isAssigned = await this.reportsRepo.isStaffAssignedToSubject(staff.id, subjectId);
      if (!isAssigned) {
        telemetryService.emit({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'SUBJECT_REPORT',
          resourceId: subjectId,
          metadata: { subject_id: subjectId, reason: 'Staff not assigned to subject' },
        });
        throw ApiError.forbidden('Faculty is not assigned to this course subject');
      }
    }

    const report = await this.reportsRepo.getSubjectPerformanceReport(subjectId, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'SUBJECT_REPORT',
      resourceId: subjectId,
      metadata: {
        report_type: 'SUBJECT_PERFORMANCE_REPORT',
        subject_id: subjectId,
      },
    });

    return report;
  }

  // ─── 3. ASSIGNMENT & QUIZ ANALYTICS ──────────────────────────

  /**
   * GET /api/reports/assignments/:assignmentId/analytics or overall
   */
  public async getAssignmentAnalytics(
    assignmentId: string | undefined,
    req: AuthenticatedRequest,
    filters: { classId?: string; subjectId?: string } = {}
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can view assignment analytics');
    }

    const report = await this.reportsRepo.getAssignmentAnalytics(assignmentId, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'REPORT',
      resourceId: assignmentId,
      metadata: {
        report_type: 'ASSIGNMENT_ANALYTICS',
        assignment_id: assignmentId,
      },
    });

    return report;
  }

  /**
   * GET /api/reports/quizzes/:quizId/analytics or overall
   */
  public async getQuizAnalytics(
    quizId: string | undefined,
    req: AuthenticatedRequest,
    filters: { classId?: string; subjectId?: string } = {}
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can view quiz analytics');
    }

    const report = await this.reportsRepo.getQuizAnalytics(quizId, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'REPORT',
      resourceId: quizId,
      metadata: {
        report_type: 'QUIZ_ANALYTICS',
        quiz_id: quizId,
      },
    });

    return report;
  }

  // ─── 4. FACULTY ACTIVITY SUMMARY ─────────────────────────────

  /**
   * GET /api/reports/staff/activity or /api/reports/staff/summary
   */
  public async getFacultyActivitySummary(
    req: AuthenticatedRequest,
    targetStaffId?: string
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can view faculty activity');
    }

    let resolvedStaffId: string;

    if (req.user.role === 'STAFF') {
      const staff = await this.reportsRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      if (targetStaffId && targetStaffId !== staff.id) {
        throw ApiError.forbidden('Faculty can only access their own activity report');
      }
      resolvedStaffId = staff.id;
    } else {
      // ADMIN
      if (targetStaffId) {
        resolvedStaffId = targetStaffId;
      } else {
        const staff = await this.reportsRepo.findStaffByUserId(req.user.id);
        if (staff) {
          resolvedStaffId = staff.id;
        } else {
          // Find first staff from database
          const staffActivity = await this.reportsRepo.getFacultyActivitySummary('11111111-1111-1111-1111-111111111111');
          return staffActivity;
        }
      }
    }

    const report = await this.reportsRepo.getFacultyActivitySummary(resolvedStaffId);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'REPORT',
      resourceId: resolvedStaffId,
      metadata: {
        report_type: 'FACULTY_ACTIVITY_SUMMARY',
        staff_id: resolvedStaffId,
      },
    });

    return report;
  }

  // ─── 5. ADMIN & DEPARTMENT REPORTS ───────────────────────────

  /**
   * GET /api/reports/admin/department
   */
  public async getDepartmentAcademicReport(
    req: AuthenticatedRequest,
    departmentId?: string,
    filters: { academicYear?: string; semester?: number } = {}
  ): Promise<any> {
    if (!req.user || req.user.role !== 'ADMIN') {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'STUDENT',
        resourceType: 'DEPARTMENT_REPORT',
        metadata: { reason: 'Non-admin attempted to access department report' },
      });
      throw ApiError.forbidden('Only administrators can view department academic reports');
    }

    const report = await this.reportsRepo.getDepartmentAcademicReport(departmentId, filters);

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'DEPARTMENT_REPORT',
      resourceId: departmentId,
      metadata: {
        report_type: 'DEPARTMENT_ACADEMIC_REPORT',
        department_id: departmentId,
      },
    });

    return report;
  }

  /**
   * GET /api/reports/admin/summary
   */
  public async getAdminInstitutionalAnalytics(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'ADMIN') {
      telemetryService.emit({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        result: 'DENIED',
        req,
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'STUDENT',
        resourceType: 'REPORT',
        metadata: { reason: 'Non-admin attempted to access institutional analytics' },
      });
      throw ApiError.forbidden('Only administrators can view institutional analytics');
    }

    const report = await this.reportsRepo.getAdminInstitutionalAnalytics();

    telemetryService.emit({
      eventType: 'REPORT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'REPORT',
      metadata: {
        report_type: 'ADMIN_INSTITUTIONAL_ANALYTICS',
      },
    });

    return report;
  }
}

export const reportsService = new ReportsService();
