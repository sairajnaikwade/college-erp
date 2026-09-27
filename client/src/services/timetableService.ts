import apiClient from './api';
import type { ApiResponse, TimetableEntry } from '../types';

export interface TimetableQueryParams {
  day_of_week?: string;
  academic_year?: string;
  semester?: number;
  department_id?: string;
  class_id?: string;
  staff_id?: string;
}

export const timetableService = {
  /**
   * Retrieves timetable slots for the authenticated student.
   */
  async getStudentTimetable(params?: TimetableQueryParams): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>('/timetable/student', { params });
    return res.data?.data || [];
  },

  /**
   * Retrieves teaching timetable slots for the authenticated faculty/staff.
   */
  async getStaffTimetable(params?: TimetableQueryParams): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>('/timetable/staff', { params });
    return res.data?.data || [];
  },

  /**
   * Retrieves timetable slots for a specific class (Staff/Admin).
   */
  async getClassTimetable(classId: string, params?: TimetableQueryParams): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>(`/timetable/class/${classId}`, { params });
    return res.data?.data || [];
  },

  /**
   * Retrieves all timetable slots with optional filters (Admin).
   */
  async getAll(params?: TimetableQueryParams): Promise<TimetableEntry[]> {
    const res = await apiClient.get<ApiResponse<TimetableEntry[]>>('/timetable', { params });
    return res.data?.data || [];
  },

  /**
   * Retrieves single timetable slot by ID.
   */
  async getById(id: string): Promise<TimetableEntry> {
    const res = await apiClient.get<ApiResponse<TimetableEntry>>(`/timetable/${id}`);
    return res.data.data;
  },

  /**
   * Creates a new timetable slot (Admin).
   */
  async createTimetable(data: Partial<TimetableEntry>): Promise<TimetableEntry> {
    const res = await apiClient.post<ApiResponse<TimetableEntry>>('/timetable', data);
    return res.data.data;
  },

  /**
   * Updates an existing timetable slot (Admin).
   */
  async updateTimetable(id: string, data: Partial<TimetableEntry>): Promise<TimetableEntry> {
    const res = await apiClient.put<ApiResponse<TimetableEntry>>(`/timetable/${id}`, data);
    return res.data.data;
  },

  /**
   * Deletes a timetable slot (Admin).
   */
  async deleteTimetable(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/timetable/${id}`);
  },
};
