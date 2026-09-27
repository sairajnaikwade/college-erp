import { Response, NextFunction } from 'express';
import { reportsService } from '../services/reports.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class ReportsController {
  // ─── Student Reports ────────────────────────────────────────

  public async getStudentSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentSummary(req);
      ApiResponse.success(res, data, 'Student academic summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getStudentAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const data = await reportsService.getStudentAttendanceReport(req, {
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      });
      ApiResponse.success(res, data, 'Student attendance report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getStudentAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentAssignmentReport(req);
      ApiResponse.success(res, data, 'Student assignment report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getStudentQuizzes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getStudentQuizReport(req);
      ApiResponse.success(res, data, 'Student quiz report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getStudentAcademic(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string | undefined;
      const data = await reportsService.getStudentAcademicReport(studentId, req);
      ApiResponse.success(res, data, 'Student academic performance report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ─── Staff & Admin Reports ──────────────────────────────────

  public async getClassAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const { subjectId, academicYear, semester, startDate, endDate } = req.query;
      const data = await reportsService.getClassAttendanceReport(classId, req, {
        subjectId: subjectId ? String(subjectId) : undefined,
        academicYear: academicYear ? String(academicYear) : undefined,
        semester: semester ? Number(semester) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
      });
      ApiResponse.success(res, data, 'Class attendance report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getClassPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const { subjectId, academicYear, semester } = req.query;
      const data = await reportsService.getClassPerformanceReport(classId, req, {
        subjectId: subjectId ? String(subjectId) : undefined,
        academicYear: academicYear ? String(academicYear) : undefined,
        semester: semester ? Number(semester) : undefined,
      });
      ApiResponse.success(res, data, 'Class performance report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getSubjectPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = req.params.subjectId as string;
      const { classId, academicYear, semester } = req.query;
      const data = await reportsService.getSubjectPerformanceReport(subjectId, req, {
        classId: classId ? String(classId) : undefined,
        academicYear: academicYear ? String(academicYear) : undefined,
        semester: semester ? Number(semester) : undefined,
      });
      ApiResponse.success(res, data, 'Subject performance report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getAssignmentAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignmentId = req.params.assignmentId as string | undefined;
      const { classId, subjectId } = req.query;
      const data = await reportsService.getAssignmentAnalytics(assignmentId, req, {
        classId: classId ? String(classId) : undefined,
        subjectId: subjectId ? String(subjectId) : undefined,
      });
      ApiResponse.success(res, data, 'Assignment analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getQuizAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const quizId = req.params.quizId as string | undefined;
      const { classId, subjectId } = req.query;
      const data = await reportsService.getQuizAnalytics(quizId, req, {
        classId: classId ? String(classId) : undefined,
        subjectId: subjectId ? String(subjectId) : undefined,
      });
      ApiResponse.success(res, data, 'Quiz analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getStaffActivity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetStaffId = req.params.staffId as string | undefined;
      const data = await reportsService.getFacultyActivitySummary(req, targetStaffId);
      ApiResponse.success(res, data, 'Faculty activity summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ─── Admin Reports ──────────────────────────────────────────

  public async getDepartmentReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { departmentId, academicYear, semester } = req.query;
      const data = await reportsService.getDepartmentAcademicReport(req, departmentId ? String(departmentId) : undefined, {
        academicYear: academicYear ? String(academicYear) : undefined,
        semester: semester ? Number(semester) : undefined,
      });
      ApiResponse.success(res, data, 'Department academic report retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public async getAdminSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getAdminInstitutionalAnalytics(req);
      ApiResponse.success(res, data, 'Admin institutional analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const reportsController = new ReportsController();
