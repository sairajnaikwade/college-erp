import { Response, NextFunction } from 'express';
import { classService } from '../services/class.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class ClassController {
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { department_id, year, semester, academic_year } = req.query;
      const data = await classService.getAll(
        {
          department_id: department_id as string,
          year: year ? parseInt(year as string, 10) : undefined,
          semester: semester ? parseInt(semester as string, 10) : undefined,
          academic_year: academic_year as string,
        },
        req
      );
      ApiResponse.success(res, data, 'Classes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await classService.getById(id, req);
      ApiResponse.success(res, data, 'Class retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await classService.create(req.body, req);
      ApiResponse.success(res, data, 'Class created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await classService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Class updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await classService.delete(id, req);
      ApiResponse.success(res, null, 'Class deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const classController = new ClassController();
