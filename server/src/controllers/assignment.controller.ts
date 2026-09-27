import { Response, NextFunction } from 'express';
import { assignmentService } from '../services/assignment.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class AssignmentController {
  /**
   * GET /api/assignments/student
   */
  public async getStudentAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await assignmentService.getStudentAssignments(req, req.query);
      ApiResponse.success(res, data, 'Student assignments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/staff
   */
  public async getStaffAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await assignmentService.getStaffAssignments(req, req.query);
      ApiResponse.success(res, data, 'Staff assignments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/class/:classId
   */
  public async getClassAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const data = await assignmentService.getClassAssignments(classId, req, req.query);
      ApiResponse.success(res, data, 'Class assignments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id
   */
  public async getAssignmentById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await assignmentService.getAssignmentById(id, req);
      ApiResponse.success(res, data, 'Assignment details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments
   */
  public async createAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await assignmentService.createAssignment(req.body, req);
      ApiResponse.success(res, data, 'Assignment created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/assignments/:id
   */
  public async updateAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await assignmentService.updateAssignment(id, req.body, req);
      ApiResponse.success(res, data, 'Assignment updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/assignments/:id
   */
  public async deleteAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await assignmentService.deleteAssignment(id, req);
      ApiResponse.success(res, null, 'Assignment deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/submission
   */
  public async getMySubmission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await assignmentService.getMySubmission(id, req);
      ApiResponse.success(res, data, 'Submission retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/assignments/:id/submit
   */
  public async submitAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await assignmentService.submitAssignment(id, req.body, req);
      ApiResponse.success(res, data, 'Assignment submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/:id/submissions
   */
  public async getAssignmentSubmissions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await assignmentService.getAssignmentSubmissions(id, req);
      ApiResponse.success(res, data, 'Assignment submissions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments/submissions/:submissionId
   */
  public async getSubmissionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissionId = req.params.submissionId as string;
      const data = await assignmentService.getSubmissionById(submissionId, req);
      ApiResponse.success(res, data, 'Submission details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/assignments/submissions/:submissionId/grade
   */
  public async gradeSubmission(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissionId = req.params.submissionId as string;
      const data = await assignmentService.gradeSubmission(submissionId, req.body, req);
      ApiResponse.success(res, data, 'Submission graded successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/assignments
   */
  public async getAllAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const options = {
        classId: req.query.classId as string,
        subjectId: req.query.subjectId as string,
        departmentId: req.query.departmentId as string,
        status: req.query.status as string,
        academicYear: req.query.academicYear as string,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const page = options.offset ? Math.floor(options.offset / (options.limit || 10)) + 1 : 1;
      const limit = options.limit || 10;
      const result = await assignmentService.getAllAssignments(req, options);
      ApiResponse.paginated(
        res,
        result.rows,
        result.total,
        page,
        limit,
        'All assignments retrieved successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}

export const assignmentController = new AssignmentController();
