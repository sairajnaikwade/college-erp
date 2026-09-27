import apiClient from './api';
import type {
  ApiResponse,
  Assignment,
  StudentAssignment,
  AssignmentSubmission,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
  SubmitAssignmentPayload,
  GradeSubmissionPayload,
} from '../types';

export interface StudentAssignmentFilters {
  subjectId?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
}

export interface StaffAssignmentFilters {
  classId?: string;
  subjectId?: string;
  status?: string;
}

export interface AdminAssignmentFilters {
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export const assignmentService = {
  /**
   * Retrieves assignments list for the logged-in student (with their submission status).
   */
  async getStudentAssignments(
    filters: StudentAssignmentFilters = {}
  ): Promise<StudentAssignment[]> {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.status) params.append('status', filters.status);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.semester) params.append('semester', filters.semester.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<StudentAssignment[]>>(
      `/assignments/student${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves assignments created by faculty or for authorized classes.
   */
  async getStaffAssignments(
    filters: StaffAssignmentFilters = {}
  ): Promise<Assignment[]> {
    const params = new URLSearchParams();
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Assignment[]>>(
      `/assignments/staff${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves assignments for a specific class batch.
   */
  async getClassAssignments(
    classId: string,
    filters: { subjectId?: string; status?: string } = {}
  ): Promise<Assignment[]> {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Assignment[]>>(
      `/assignments/class/${classId}${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves a single assignment by ID.
   */
  async getAssignmentById(id: string): Promise<Assignment> {
    const res = await apiClient.get<ApiResponse<Assignment>>(
      `/assignments/${id}`
    );
    return res.data.data;
  },

  /**
   * Creates a new assignment (Staff / Admin).
   */
  async createAssignment(payload: CreateAssignmentPayload): Promise<Assignment> {
    const res = await apiClient.post<ApiResponse<Assignment>>(
      '/assignments',
      payload
    );
    return res.data.data;
  },

  /**
   * Updates an existing assignment (Staff / Admin).
   */
  async updateAssignment(
    id: string,
    payload: UpdateAssignmentPayload
  ): Promise<Assignment> {
    const res = await apiClient.put<ApiResponse<Assignment>>(
      `/assignments/${id}`,
      payload
    );
    return res.data.data;
  },

  /**
   * Deletes an assignment (Staff / Admin).
   */
  async deleteAssignment(id: string): Promise<void> {
    await apiClient.delete(`/assignments/${id}`);
  },

  /**
   * Submits student work for an assignment (Student only).
   */
  async submitAssignment(
    id: string,
    payload: SubmitAssignmentPayload
  ): Promise<AssignmentSubmission> {
    const res = await apiClient.post<ApiResponse<AssignmentSubmission>>(
      `/assignments/${id}/submit`,
      payload
    );
    return res.data.data;
  },

  /**
   * Retrieves all student submissions for an assignment (Staff / Admin).
   */
  async getAssignmentSubmissions(
    id: string
  ): Promise<AssignmentSubmission[]> {
    const res = await apiClient.get<ApiResponse<AssignmentSubmission[]>>(
      `/assignments/${id}/submissions`
    );
    return res.data.data;
  },

  /**
   * Grades a student submission (Staff / Admin).
   */
  async gradeSubmission(
    submissionId: string,
    payload: GradeSubmissionPayload
  ): Promise<AssignmentSubmission> {
    const res = await apiClient.post<ApiResponse<AssignmentSubmission>>(
      `/assignments/submissions/${submissionId}/grade`,
      payload
    );
    return res.data.data;
  },

  /**
   * List all assignments across institution (Admin only).
   */
  async getAllAssignments(
    filters: AdminAssignmentFilters = {}
  ): Promise<{ rows: Assignment[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.status) params.append('status', filters.status);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.semester) params.append('semester', filters.semester.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Assignment[]> & { total: number }>(
      `/assignments${queryString}`
    );
    return {
      rows: res.data.data || [],
      total: (res.data as any).total || 0,
    };
  },
};
export default assignmentService;
