import { Response, NextFunction } from 'express';
import { studentService } from '../services/student.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest, AccountStatus } from '../types/common';

export class StudentController {
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, department_id, year, division, account_status } = req.query;
      const data = await studentService.getAll(
        {
          search: search as string,
          department_id: department_id as string,
          year: year ? parseInt(year as string, 10) : undefined,
          division: division as string,
          account_status: account_status as AccountStatus,
        },
        req
      );
      ApiResponse.success(res, data, 'Students retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await studentService.getById(id, req);
      ApiResponse.success(res, data, 'Student retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await studentService.getMyProfile(req);
      ApiResponse.success(res, data, 'Student profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await studentService.create(req.body, req);
      ApiResponse.success(res, data, 'Student created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await studentService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Student updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      await studentService.updateStatus(id, status, req);
      ApiResponse.success(res, null, `Student status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  public async assignClass(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { class_id, academic_year } = req.body;
      const data = await studentService.assignToClass(id, class_id, academic_year, req);
      ApiResponse.success(res, data, 'Student assigned to class successfully');
    } catch (error) {
      next(error);
    }
  }

  public async removeClass(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { class_id } = req.body;
      await studentService.removeFromClass(id, class_id, req);
      ApiResponse.success(res, null, 'Student removed from class successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getClass(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await studentService.getClass(id);
      ApiResponse.success(res, data, 'Student class history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();
