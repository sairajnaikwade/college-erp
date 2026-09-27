import apiClient from './api';
import type { ApiResponse, Notice } from '../types';

export interface NoticeQueryParams {
  category?: string;
  priority?: string;
  limit?: number;
  offset?: number;
  target_role?: string;
  is_published?: boolean;
}

export const noticeService = {
  /**
   * Fetch notices matching user's role and filter parameters.
   */
  async getNotices(params?: NoticeQueryParams): Promise<Notice[]> {
    const res = await apiClient.get<ApiResponse<Notice[]>>('/notices', { params });
    return res.data?.data || [];
  },

  /**
   * Fetch single notice by ID.
   */
  async getNoticeById(id: string): Promise<Notice> {
    const res = await apiClient.get<ApiResponse<Notice>>(`/notices/${id}`);
    return res.data.data;
  },

  /**
   * Create a new campus bulletin / notice (ADMIN / STAFF).
   */
  async createNotice(data: Partial<Notice>): Promise<Notice> {
    const res = await apiClient.post<ApiResponse<Notice>>('/notices', data);
    return res.data.data;
  },

  /**
   * Update an existing notice (ADMIN or author).
   */
  async updateNotice(id: string, data: Partial<Notice>): Promise<Notice> {
    const res = await apiClient.put<ApiResponse<Notice>>(`/notices/${id}`, data);
    return res.data.data;
  },

  /**
   * Delete a notice (ADMIN only).
   */
  async deleteNotice(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/notices/${id}`);
  },
};
