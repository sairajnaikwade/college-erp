import { Response, NextFunction } from 'express';
import { departmentService } from '../services/department.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class DepartmentController {
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.getAll(req);
      ApiResponse.success(res, data, 'Departments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await departmentService.getById(id, req);
      ApiResponse.success(res, data, 'Department retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await departmentService.create(req.body, req);
      ApiResponse.success(res, data, 'Department created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await departmentService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Department updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await departmentService.delete(id, req);
      ApiResponse.success(res, null, 'Department deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const departmentController = new DepartmentController();
