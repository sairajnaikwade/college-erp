import { Response, NextFunction } from 'express';
import { NoteService } from '../services/note.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

const noteService = new NoteService();

export class NoteController {
  /**
   * GET /api/notes/my
   */
  public static async getMyNotes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        departmentId: (req.query.department_id || req.query.departmentId) as string | undefined,
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester as string | undefined,
        search: req.query.search as string | undefined,
      };

      const notes = await noteService.getMyNotes(req, filters);
      ApiResponse.success(res, notes, 'Course notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/stats
   */
  public static async getStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await noteService.getStats(req);
      ApiResponse.success(res, stats, 'Note statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/student
   */
  public static async getStudentNotes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        category: req.query.category as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester as string | undefined,
        search: req.query.search as string | undefined,
      };

      const notes = await noteService.getStudentNotes(req, filters);
      ApiResponse.success(res, notes, 'Student course notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/staff
   */
  public static async getStaffNotes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      };

      const notes = await noteService.getStaffNotes(req, filters);
      ApiResponse.success(res, notes, 'Faculty course notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/class/:classId
   */
  public static async getClassNotes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const filters = {
        subjectId: req.query.subjectId as string | undefined,
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
      };

      const notes = await noteService.getClassNotes(classId, req, filters);
      ApiResponse.success(res, notes, 'Class notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/:id
   */
  public static async getNoteById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const note = await noteService.getNoteById(id, req);
      ApiResponse.success(res, note, 'Study material retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes/:id/file
   */
  public static async downloadNoteFile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const fileInfo = await noteService.getNoteFile(id, req);

      res.setHeader('Content-Type', fileInfo.fileType);
      if (fileInfo.fileSize) {
        res.setHeader('Content-Length', fileInfo.fileSize.toString());
      }
      const dispositionType = req.query.download === 'true' ? 'attachment' : 'inline';
      res.setHeader(
        'Content-Disposition',
        `${dispositionType}; filename="${encodeURIComponent(fileInfo.fileName)}"`
      );

      res.sendFile(fileInfo.filePath);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notes
   */
  public static async createNote(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const note = await noteService.createNote(req.body, req, req.file);
      ApiResponse.created(res, note, 'Study material published successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notes/:id
   */
  public static async updateNote(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const updated = await noteService.updateNote(id, req.body, req);
      ApiResponse.success(res, updated, 'Study material updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/notes/:id
   */
  public static async deleteNote(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      await noteService.deleteNote(id, req);
      ApiResponse.success(res, null, 'Study material deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/notes (Admin listing)
   */
  public static async getAllNotes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        classId: (req.query.class_id || req.query.classId) as string | undefined,
        subjectId: (req.query.subject_id || req.query.subjectId) as string | undefined,
        departmentId: (req.query.department_id || req.query.departmentId) as string | undefined,
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        academicYear: (req.query.academic_year || req.query.academicYear) as string | undefined,
        semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
        search: req.query.search as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };

      const result = await noteService.getAllNotes(req, filters);
      res.status(200).json({
        success: true,
        message: 'All institutional study materials retrieved',
        data: result.rows,
        total: result.total,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
