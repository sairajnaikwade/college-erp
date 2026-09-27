import api from './api';
import type {
  MarkComponent,
  StudentMark,
  StudentSubjectResult,
  SubjectResultDetailResponse,
  StudentOverallResults,
  MarksStats,
  ResultsStats,
  ComponentType,
  MarkStatus,
} from '../types';

export interface ComponentFilters {
  subjectId?: string;
  classId?: string;
  academicYear?: string;
  semester?: number;
  componentType?: string;
  departmentId?: string;
}

export interface ResultFilters {
  departmentId?: string;
  classId?: string;
  subjectId?: string;
  academicYear?: string;
  semester?: number;
  grade?: string;
  resultStatus?: string;
  limit?: number;
  offset?: number;
}

export const marksService = {
  // ─── Component Management ────────────────────────────────────

  async getComponents(filters: ComponentFilters = {}): Promise<MarkComponent[]> {
    const params: Record<string, string> = {};
    if (filters.subjectId) params.subject_id = filters.subjectId;
    if (filters.classId) params.class_id = filters.classId;
    if (filters.academicYear) params.academic_year = filters.academicYear;
    if (filters.semester) params.semester = filters.semester.toString();
    if (filters.componentType) params.component_type = filters.componentType;
    if (filters.departmentId) params.department_id = filters.departmentId;

    const res = await api.get('/marks/components', { params });
    return res.data?.data || [];
  },

  async createComponent(payload: {
    name: string;
    code: string;
    description?: string;
    department_id?: string;
    subject_id: string;
    class_id?: string;
    academic_year?: string;
    semester?: number;
    max_marks: number;
    weightage?: number;
    component_type: ComponentType;
  }): Promise<MarkComponent> {
    const res = await api.post('/marks/components', payload);
    return res.data?.data;
  },

  async updateComponent(
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      description: string | null;
      max_marks: number;
      weightage: number | null;
      component_type: ComponentType;
    }>
  ): Promise<MarkComponent> {
    const res = await api.put(`/marks/components/${id}`, payload);
    return res.data?.data;
  },

  async deleteComponent(id: string): Promise<void> {
    await api.delete(`/marks/components/${id}`);
  },

  async getComponentStudents(componentId: string): Promise<{
    component: MarkComponent;
    students: Array<{
      student_id: string;
      student_roll_number: string;
      enrollment_number: string;
      first_name: string;
      last_name: string;
      email: string;
      mark_id: string | null;
      marks_obtained: number | null;
      status: string;
      remarks: string | null;
      published_at: string | null;
    }>;
  }> {
    const res = await api.get(`/marks/components/${componentId}/students`);
    return res.data?.data;
  },

  // ─── Student Marks Entry & Updates ───────────────────────────

  async enterMarks(payload: {
    component_id: string;
    student_id?: string;
    marks_obtained?: number;
    remarks?: string | null;
    status?: MarkStatus;
    entries?: Array<{
      student_id: string;
      marks_obtained: number;
      remarks?: string | null;
      status?: MarkStatus;
    }>;
  }): Promise<any> {
    const res = await api.post('/marks', payload);
    return res.data?.data;
  },

  async updateMark(
    id: string,
    payload: { marks_obtained?: number; remarks?: string | null; status?: MarkStatus }
  ): Promise<StudentMark> {
    const res = await api.put(`/marks/${id}`, payload);
    return res.data?.data;
  },

  async publishMark(id: string): Promise<StudentMark> {
    const res = await api.post(`/marks/${id}/publish`);
    return res.data?.data;
  },

  async getStudentMarks(subjectId?: string): Promise<StudentMark[]> {
    const params = subjectId ? { subject_id: subjectId } : {};
    const res = await api.get('/marks/student', { params });
    return res.data?.data || [];
  },

  async getStudentMarksByStaff(studentId: string): Promise<StudentMark[]> {
    const res = await api.get(`/marks/student/${studentId}`);
    return res.data?.data || [];
  },

  async getMarksStats(): Promise<MarksStats> {
    const res = await api.get('/marks/stats');
    return res.data?.data || { total_components: 0, total_marks_entered: 0, published_marks: 0, draft_marks: 0 };
  },

  // ─── Results Calculation & Publishing ─────────────────────────

  async calculateSubjectResult(studentId: string, subjectId: string): Promise<any> {
    const res = await api.post(`/results/${studentId}/${subjectId}/calculate`);
    return res.data?.data;
  },

  async publishSubjectResult(studentId: string, subjectId: string): Promise<StudentSubjectResult> {
    const res = await api.post(`/results/${studentId}/${subjectId}/publish`);
    return res.data?.data;
  },

  async getStudentResults(): Promise<StudentOverallResults> {
    const res = await api.get('/results/student');
    return res.data?.data;
  },

  async getStudentSubjectResultDetails(subjectId: string): Promise<SubjectResultDetailResponse> {
    const res = await api.get(`/results/student/${subjectId}`);
    return res.data?.data;
  },

  async getClassResults(classId: string, filters: { subjectId?: string; academicYear?: string; semester?: number; resultStatus?: string } = {}): Promise<StudentSubjectResult[]> {
    const params: Record<string, string> = {};
    if (filters.subjectId) params.subject_id = filters.subjectId;
    if (filters.academicYear) params.academic_year = filters.academicYear;
    if (filters.semester) params.semester = filters.semester.toString();
    if (filters.resultStatus) params.result_status = filters.resultStatus;

    const res = await api.get(`/results/class/${classId}`, { params });
    return res.data?.data || [];
  },

  async getAllResults(filters: ResultFilters = {}): Promise<{ rows: StudentSubjectResult[]; total: number }> {
    const params: Record<string, string> = {};
    if (filters.departmentId) params.department_id = filters.departmentId;
    if (filters.classId) params.class_id = filters.classId;
    if (filters.subjectId) params.subject_id = filters.subjectId;
    if (filters.academicYear) params.academic_year = filters.academicYear;
    if (filters.semester) params.semester = filters.semester.toString();
    if (filters.grade) params.grade = filters.grade;
    if (filters.resultStatus) params.result_status = filters.resultStatus;
    if (filters.limit) params.limit = filters.limit.toString();
    if (filters.offset) params.offset = filters.offset.toString();

    const res = await api.get('/results', { params });
    return {
      rows: res.data?.data || [],
      total: res.data?.total || 0,
    };
  },

  async getResultsStats(): Promise<ResultsStats> {
    const res = await api.get('/results/stats');
    return res.data?.data || {
      total_results: 0,
      published_results: 0,
      draft_results: 0,
      students_with_results: 0,
      average_percentage: 0,
      pass_count: 0,
      fail_count: 0,
    };
  },
};
