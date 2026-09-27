import api from './api';
import type {
  ApiResponse,
  StudentAcademicSummary,
  StudentAttendanceReport,
  StudentAssignmentReport,
  StudentQuizReport,
  ClassAttendanceReport,
  ClassPerformanceReport,
  SubjectPerformanceReport,
  AssignmentAnalyticsReport,
  QuizAnalyticsReport,
  FacultyActivityReport,
  DepartmentAcademicReport,
  AdminInstitutionalAnalytics,
} from '../types';

export const reportService = {
  // ─── Student Endpoints ─────────────────────────────────────
  getStudentSummary: async (studentId?: string): Promise<StudentAcademicSummary> => {
    const url = studentId ? `/reports/student/${studentId}` : '/reports/student/summary';
    const response = await api.get<ApiResponse<StudentAcademicSummary>>(url);
    return response.data.data;
  },

  getStudentAttendance: async (
    startDate?: string,
    endDate?: string,
    studentId?: string
  ): Promise<StudentAttendanceReport> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (studentId) params.student_id = studentId;

    const response = await api.get<ApiResponse<StudentAttendanceReport>>('/reports/student/attendance', { params });
    return response.data.data;
  },

  getStudentAssignments: async (studentId?: string): Promise<StudentAssignmentReport> => {
    const params: Record<string, string> = {};
    if (studentId) params.student_id = studentId;
    const response = await api.get<ApiResponse<StudentAssignmentReport>>('/reports/student/assignments', { params });
    return response.data.data;
  },

  getStudentQuizzes: async (studentId?: string): Promise<StudentQuizReport> => {
    const params: Record<string, string> = {};
    if (studentId) params.student_id = studentId;
    const response = await api.get<ApiResponse<StudentQuizReport>>('/reports/student/quizzes', { params });
    return response.data.data;
  },

  // ─── Staff / Class Endpoints ───────────────────────────────
  getClassAttendance: async (
    classId: string,
    filters: { subjectId?: string; startDate?: string; endDate?: string } = {}
  ): Promise<ClassAttendanceReport> => {
    const response = await api.get<ApiResponse<ClassAttendanceReport>>(`/reports/class/${classId}/attendance`, {
      params: filters,
    });
    return response.data.data;
  },

  getClassPerformance: async (
    classId: string,
    filters: { subjectId?: string; academicYear?: string; semester?: number } = {}
  ): Promise<ClassPerformanceReport> => {
    const response = await api.get<ApiResponse<ClassPerformanceReport>>(`/reports/class/${classId}/performance`, {
      params: filters,
    });
    return response.data.data;
  },

  getSubjectPerformance: async (
    subjectId: string,
    filters: { classId?: string; academicYear?: string; semester?: number } = {}
  ): Promise<SubjectPerformanceReport> => {
    const response = await api.get<ApiResponse<SubjectPerformanceReport>>(`/reports/subject/${subjectId}/performance`, {
      params: filters,
    });
    return response.data.data;
  },

  getAssignmentAnalytics: async (filters: { classId?: string; subjectId?: string; assignmentId?: string } = {}): Promise<AssignmentAnalyticsReport> => {
    const response = await api.get<ApiResponse<AssignmentAnalyticsReport>>('/reports/assignments/analytics', {
      params: filters,
    });
    return response.data.data;
  },

  getQuizAnalytics: async (filters: { classId?: string; subjectId?: string; quizId?: string } = {}): Promise<QuizAnalyticsReport> => {
    const response = await api.get<ApiResponse<QuizAnalyticsReport>>('/reports/quizzes/analytics', {
      params: filters,
    });
    return response.data.data;
  },

  getFacultyActivity: async (staffId?: string): Promise<FacultyActivityReport> => {
    const url = staffId ? `/reports/staff/${staffId}/activity` : '/reports/staff/activity';
    const response = await api.get<ApiResponse<FacultyActivityReport>>(url);
    return response.data.data;
  },

  // ─── Admin Endpoints ───────────────────────────────────────
  getDepartmentAnalytics: async (
    departmentId?: string,
    filters: { academicYear?: string; semester?: number } = {}
  ): Promise<DepartmentAcademicReport> => {
    const params: Record<string, any> = { ...filters };
    if (departmentId) params.department_id = departmentId;
    const response = await api.get<ApiResponse<DepartmentAcademicReport>>('/reports/admin/department', { params });
    return response.data.data;
  },

  getInstitutionalAnalytics: async (): Promise<AdminInstitutionalAnalytics> => {
    const response = await api.get<ApiResponse<AdminInstitutionalAnalytics>>('/reports/admin/summary');
    return response.data.data;
  },
};
