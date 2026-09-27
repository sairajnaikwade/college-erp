import { Response, NextFunction } from 'express';
import { staffService } from '../services/staff.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest, AccountStatus } from '../types/common';

export class StaffController {
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, department_id, account_status } = req.query;
      const data = await staffService.getAll(
        {
          search: search as string,
          department_id: department_id as string,
          account_status: account_status as AccountStatus,
        },
        req
      );
      ApiResponse.success(res, data, 'Staff members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await staffService.getById(id, req);
      ApiResponse.success(res, data, 'Staff member retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await staffService.getMyProfile(req);
      ApiResponse.success(res, data, 'Staff profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await staffService.create(req.body, req);
      ApiResponse.success(res, data, 'Staff member created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await staffService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Staff member updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      await staffService.updateStatus(id, status, req);
      ApiResponse.success(res, null, `Staff member status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  public async assignSubject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const subjectId = req.params.subjectId as string;
      const data = await staffService.assignSubject(id, subjectId, req);
      ApiResponse.success(res, data, 'Subject assigned to staff successfully');
    } catch (error) {
      next(error);
    }
  }

  public async removeSubject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const subjectId = req.params.subjectId as string;
      await staffService.removeSubject(id, subjectId, req);
      ApiResponse.success(res, null, 'Subject unassigned from staff successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getSubjects(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await staffService.getSubjects(id);
      ApiResponse.success(res, data, 'Assigned subjects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const staffController = new StaffController();
