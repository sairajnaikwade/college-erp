import { Response, NextFunction } from 'express';
import { noticeService } from '../services/notice.service';
import { ApiResponse } from '../utils/api-response';
import { AuthenticatedRequest } from '../types/common';

export class NoticeController {
  public async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await noticeService.getAll(req, req.query);
      ApiResponse.success(res, data, 'Notices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await noticeService.getById(id, req);
      ApiResponse.success(res, data, 'Notice retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await noticeService.create(req.body, req);
      ApiResponse.success(res, data, 'Notice created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await noticeService.update(id, req.body, req);
      ApiResponse.success(res, data, 'Notice updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await noticeService.delete(id, req);
      ApiResponse.success(res, null, 'Notice deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const noticeController = new NoticeController();
