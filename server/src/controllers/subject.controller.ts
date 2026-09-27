import { Response, NextFunction } from 'express';
import { subjectService } from '../services/subject.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class SubjectController {
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { department_id, semester } = req.query;
      const data = await subjectService.getAll(
        {
          department_id: department_id as string,
          semester: semester ? parseInt(semester as string, 10) : undefined,
        },
        req
      );
      ApiResponse.success(res, data, 'Subjects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await subjectService.getById(id, req);
      ApiResponse.success(res, data, 'Subject retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await subjectService.create(req.body, req);
      ApiResponse.success(res, data, 'Subject created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await subjectService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Subject updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await subjectService.delete(id, req);
      ApiResponse.success(res, null, 'Subject deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const subjectController = new SubjectController();
