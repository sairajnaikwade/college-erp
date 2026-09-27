import { Response, NextFunction } from 'express';
import { timetableService } from '../services/timetable.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class TimetableController {
  public async getStudentTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await timetableService.getStudentTimetable(req, req.query);
      ApiResponse.success(res, data, 'Student timetable retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getStaffTimetable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await timetableService.getStaffTimetable(req, req.query);
      ApiResponse.success(res, data, 'Staff teaching schedule retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getByClass(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = req.params.classId as string;
      const data = await timetableService.getByClass(classId, req, req.query);
      ApiResponse.success(res, data, 'Class timetable retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await timetableService.getAll(req, req.query);
      ApiResponse.success(res, data, 'Timetable entries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await timetableService.getById(id, req);
      ApiResponse.success(res, data, 'Timetable entry retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await timetableService.create(req.body, req);
      ApiResponse.success(res, data, 'Timetable slot created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await timetableService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Timetable slot updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await timetableService.delete(id, req);
      ApiResponse.success(res, null, 'Timetable slot deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const timetableController = new TimetableController();
