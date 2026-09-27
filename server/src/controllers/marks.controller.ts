import { Response, NextFunction } from 'express';
import { MarksService } from '../services/marks.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

const marksService = new MarksService();

export class MarksController {
  // ─── Mark Components ──────────────────────────────────────────

  public static async createComponent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await marksService.createComponent(req.body, req);
      ApiResponse.created(res, created, 'Mark component created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateComponent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await marksService.updateComponent(id, req.body, req);
      ApiResponse.success(res, updated, 'Mark component updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteComponent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await marksService.deleteComponent(id, req);
      ApiResponse.success(res, null, 'Mark component deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getComponents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        componentType: (req.query.component_type || req.query.componentType) as string | undefined,
        departmentId: (req.query.department_id || req.query.departmentId) as string | undefined,
      };
      const components = await marksService.getComponents(req, filters);
      ApiResponse.success(res, components, 'Mark components retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getComponentStudents(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const componentId = (req.params.componentId || req.params.id) as string;
      const data = await marksService.getComponentStudents(componentId, req);
      ApiResponse.success(res, data, 'Component eligible students retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Mark Entry & Updates ─────────────────────────────────────

  public static async enterMarks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await marksService.enterMarks(req.body, req);
      ApiResponse.success(res, result, 'Student marks recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateMark(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await marksService.updateMark(id, req.body, req);
      ApiResponse.success(res, updated, 'Student mark updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async publishMark(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const published = await marksService.publishMark(id, req);
      ApiResponse.success(res, published, 'Student mark published successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentMarks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = (req.query.subject_id || req.query.subjectId) as string | undefined;
      const marks = await marksService.getStudentMarks(req, subjectId);
      ApiResponse.success(res, marks, 'Student marks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentMarksByStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const marks = await marksService.getMarksForStudentByStaff(studentId, req);
      ApiResponse.success(res, marks, 'Student marks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getMarksStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await marksService.getMarksStats(req);
      ApiResponse.success(res, stats, 'Marks statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Results Calculation & Publishing ─────────────────────────

  public static async calculateSubjectResult(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const subjectId = req.params.subjectId as string;
      const result = await marksService.calculateSubjectResult(studentId, subjectId, req);
      ApiResponse.success(res, result, 'Subject result calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async publishSubjectResult(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const subjectId = req.params.subjectId as string;
      const published = await marksService.publishSubjectResult(studentId, subjectId, req);
      ApiResponse.success(res, published, 'Subject result published successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentResults(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await marksService.getStudentResults(req);
      ApiResponse.success(res, results, 'Student academic results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentSubjectResultDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = req.params.subjectId as string;
      const details = await marksService.getStudentSubjectResultDetails(subjectId, req);
      ApiResponse.success(res, details, 'Subject result breakdown retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getClassResults(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const filters = {
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        resultStatus: (req.query.result_status || req.query.resultStatus || req.query.status) as string | undefined,
      };
      const results = await marksService.getClassResults(classId, req, filters);
      ApiResponse.success(res, results, 'Class results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentResultsByStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const data = await marksService.getResultsForStudentByStaff(studentId, req);
      ApiResponse.success(res, data, 'Student results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getAllResults(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        departmentId: (req.query.department_id || req.query.departmentId) as string | undefined,
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        grade: req.query.grade as string | undefined,
        resultStatus: (req.query.result_status || req.query.resultStatus || req.query.status) as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };
      const result = await marksService.getAllResults(req, filters);
      res.status(200).json({
        success: true,
        message: 'Institution results retrieved successfully',
        data: result.rows,
        total: result.total,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getResultsStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await marksService.getResultsStats(req);
      ApiResponse.success(res, stats, 'Results statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
