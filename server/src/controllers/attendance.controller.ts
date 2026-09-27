import { Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class AttendanceController {
  /**
   * GET /api/attendance/student
   */
  public async getStudentAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await attendanceService.getStudentAttendance(req, req.query);
      ApiResponse.success(res, data, 'Student attendance summary retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/class/:classId
   */
  public async getClassAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const data = await attendanceService.getClassAttendance(classId, req, req.query);
      ApiResponse.success(res, data, 'Class attendance retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/class/:classId/date/:date
   */
  public async getClassAttendanceByDate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const date = req.params.date as string;
      const subjectId = req.query.subjectId as string;
      const data = await attendanceService.getClassAttendanceByDate(classId, subjectId, date, req);
      ApiResponse.success(res, data, 'Class attendance for date retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/attendance
   */
  public async markAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await attendanceService.markAttendance(req.body, req);
      ApiResponse.success(res, data, 'Attendance recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/attendance/:id
   */
  public async updateAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await attendanceService.updateAttendance(id, req.body, req);
      ApiResponse.success(res, data, 'Attendance record updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/attendance/:id
   */
  public async deleteAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await attendanceService.deleteAttendance(id, req);
      ApiResponse.success(res, null, 'Attendance record deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance/:id
   */
  public async getAttendanceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await attendanceService.getAttendanceById(id, req);
      ApiResponse.success(res, data, 'Attendance record retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/attendance
   */
  public async getAllAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = {
        studentId: req.query.studentId as string,
        classId: req.query.classId as string,
        subjectId: req.query.subjectId as string,
        markedBy: req.query.markedBy as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const page = options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
      const limit = options.limit || 10;
      const result = await attendanceService.getAllAttendance(req, options);
      ApiResponse.paginated(
        res,
        result.rows,
        result.total,
        page,
        limit,
        'All attendance records retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}

export const attendanceController = new AttendanceController();
