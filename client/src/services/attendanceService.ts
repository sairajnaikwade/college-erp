import apiClient from './api';
import type {
  ApiResponse,
  StudentAttendanceResponse,
  AttendanceRecord,
  MarkAttendancePayload,
  AttendanceStatus,
} from '../types';

export interface StudentAttendanceFilters {
  subjectId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
}

export interface ClassAttendanceFilters {
  subjectId?: string;
  date?: string;
  status?: string;
}

export interface AdminAttendanceFilters {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  markedBy?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const attendanceService = {
  /**
   * Retrieves full attendance dashboard summary and records for the logged-in student.
   */
  async getStudentAttendance(
    filters: StudentAttendanceFilters = {}
  ): Promise<StudentAttendanceResponse> {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.semester) params.append('semester', filters.semester.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<StudentAttendanceResponse>>(
      `/attendance/student${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves class attendance list for faculty or admin.
   */
  async getClassAttendance(
    classId: string,
    filters: ClassAttendanceFilters = {}
  ): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.date) params.append('date', filters.date);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<AttendanceRecord[]>>(
      `/attendance/class/${classId}${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves class attendance for a specific date and subject.
   */
  async getClassAttendanceByDate(
    classId: string,
    date: string,
    subjectId: string
  ): Promise<AttendanceRecord[]> {
    const res = await apiClient.get<ApiResponse<AttendanceRecord[]>>(
      `/attendance/class/${classId}/date/${date}?subjectId=${encodeURIComponent(subjectId)}`
    );
    return res.data.data;
  },

  /**
   * Records attendance in bulk or single mode.
   */
  async markAttendance(payload: MarkAttendancePayload): Promise<AttendanceRecord[]> {
    const res = await apiClient.post<ApiResponse<AttendanceRecord[]>>(
      '/attendance',
      payload
    );
    return res.data.data;
  },

  /**
   * Updates an existing attendance record.
   */
  async updateAttendance(
    id: string,
    payload: { status?: AttendanceStatus; remarks?: string | null }
  ): Promise<AttendanceRecord> {
    const res = await apiClient.put<ApiResponse<AttendanceRecord>>(
      `/attendance/${id}`,
      payload
    );
    return res.data.data;
  },

  /**
   * Deletes an attendance record (Admin only).
   */
  async deleteAttendance(id: string): Promise<void> {
    await apiClient.delete(`/attendance/${id}`);
  },

  /**
   * List all attendance records (Admin only).
   */
  async getAllAttendance(
    filters: AdminAttendanceFilters = {}
  ): Promise<{ rows: AttendanceRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('studentId', filters.studentId);
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.markedBy) params.append('markedBy', filters.markedBy);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<AttendanceRecord[]> & { total: number }>(
      `/attendance${queryString}`
    );
    return {
      rows: res.data.data || [],
      total: (res.data as any).total || 0,
    };
  },
};
