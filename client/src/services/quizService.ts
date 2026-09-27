import api from './api';
import type {
  Quiz,
  StudentQuiz,
  QuizStartResponse,
  QuizAttemptDetail,
  QuizResult,
  QuizAnalytics,
  QuizAttempt,
  CreateQuizPayload,
  UpdateQuizPayload,
  CreateQuestionPayload,
  QuizFilters,
  ApiResponse,
} from '../types';

export const quizService = {
  // ─── Student Operations ───────────────────────────────────

  /**
   * Fetch available quizzes for the logged-in student's enrolled class.
   */
  async getStudentQuizzes(filters?: QuizFilters): Promise<StudentQuiz[]> {
    const params: Record<string, string> = {};
    if (filters?.subjectId) params.subject_id = filters.subjectId;
    if (filters?.status) params.status = filters.status;
    if (filters?.academicYear) params.academic_year = filters.academicYear;
    if (filters?.semester) params.semester = filters.semester.toString();
    if (filters?.search) params.search = filters.search;

    const response = await api.get<ApiResponse<StudentQuiz[]>>('/quizzes/student', { params });
    return response.data.data;
  },

  /**
   * View single quiz details before starting.
   */
  async getStudentQuizById(id: string): Promise<Quiz> {
    const response = await api.get<ApiResponse<Quiz>>(`/quizzes/student/${id}`);
    return response.data.data;
  },

  /**
   * Start a quiz attempt and receive questions.
   */
  async startQuiz(quizId: string): Promise<QuizStartResponse> {
    const response = await api.post<ApiResponse<QuizStartResponse>>(`/quizzes/${quizId}/start`);
    return response.data.data;
  },

  /**
   * Fetch an ongoing or finalized quiz attempt.
   */
  async getAttempt(attemptId: string): Promise<QuizAttemptDetail> {
    const response = await api.get<ApiResponse<QuizAttemptDetail>>(`/quizzes/attempts/${attemptId}`);
    return response.data.data;
  },

  /**
   * Save an answer for an active attempt.
   */
  async saveAnswer(
    attemptId: string,
    payload: { question_id: string; selected_option_id?: string | null; answer_text?: string | null }
  ): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/quizzes/attempts/${attemptId}/answers`, payload);
    return response.data.data;
  },

  /**
   * Submit quiz attempt for server-side evaluation.
   */
  async submitQuiz(attemptId: string): Promise<QuizResult> {
    const response = await api.post<ApiResponse<QuizResult>>(`/quizzes/attempts/${attemptId}/submit`);
    return response.data.data;
  },

  /**
   * Retrieve submitted attempt result.
   */
  async getAttemptResult(attemptId: string): Promise<QuizResult> {
    const response = await api.get<ApiResponse<QuizResult>>(`/quizzes/attempts/${attemptId}/result`);
    return response.data.data;
  },

  // ─── Staff & Admin Operations ─────────────────────────────

  /**
   * Fetch quizzes authored by or assigned to faculty.
   */
  async getStaffQuizzes(filters?: QuizFilters): Promise<Quiz[]> {
    const params: Record<string, string> = {};
    if (filters?.classId) params.class_id = filters.classId;
    if (filters?.subjectId) params.subject_id = filters.subjectId;
    if (filters?.status) params.status = filters.status;
    if (filters?.academicYear) params.academic_year = filters.academicYear;
    if (filters?.semester) params.semester = filters.semester.toString();
    if (filters?.search) params.search = filters.search;

    const response = await api.get<ApiResponse<Quiz[]>>('/quizzes/staff', { params });
    return response.data.data;
  },

  /**
   * Fetch overall quiz statistics.
   */
  async getStats(): Promise<{ total: number; published: number; draft: number; closed: number; total_attempts: number }> {
    const response = await api.get<ApiResponse<{ total: number; published: number; draft: number; closed: number; total_attempts: number }>>('/quizzes/stats');
    return response.data.data;
  },

  /**
   * Admin global quiz catalogue.
   */
  async getAllQuizzes(filters?: QuizFilters): Promise<{ rows: Quiz[]; total: number }> {
    const params: Record<string, string> = {};
    if (filters?.departmentId) params.department_id = filters.departmentId;
    if (filters?.classId) params.class_id = filters.classId;
    if (filters?.subjectId) params.subject_id = filters.subjectId;
    if (filters?.status) params.status = filters.status;
    if (filters?.academicYear) params.academic_year = filters.academicYear;
    if (filters?.semester) params.semester = filters.semester.toString();
    if (filters?.search) params.search = filters.search;

    const response = await api.get<ApiResponse<Quiz[]> & { total: number }>('/quizzes', { params });
    return {
      rows: response.data.data,
      total: (response.data as any).total ?? response.data.data.length,
    };
  },

  /**
   * Get single quiz with questions and options.
   */
  async getQuizById(id: string): Promise<Quiz & { questions: any[] }> {
    const response = await api.get<ApiResponse<Quiz & { questions: any[] }>>(`/quizzes/${id}`);
    return response.data.data;
  },

  /**
   * Create a new draft quiz.
   */
  async createQuiz(payload: CreateQuizPayload): Promise<Quiz> {
    const response = await api.post<ApiResponse<Quiz>>('/quizzes', payload);
    return response.data.data;
  },

  /**
   * Update quiz metadata.
   */
  async updateQuiz(id: string, payload: UpdateQuizPayload): Promise<Quiz> {
    const response = await api.put<ApiResponse<Quiz>>(`/quizzes/${id}`, payload);
    return response.data.data;
  },

  /**
   * Delete a quiz.
   */
  async deleteQuiz(id: string): Promise<void> {
    await api.delete(`/quizzes/${id}`);
  },

  /**
   * Publish a quiz.
   */
  async publishQuiz(id: string): Promise<Quiz> {
    const response = await api.post<ApiResponse<Quiz>>(`/quizzes/${id}/publish`);
    return response.data.data;
  },

  /**
   * Close a quiz.
   */
  async closeQuiz(id: string): Promise<Quiz> {
    const response = await api.post<ApiResponse<Quiz>>(`/quizzes/${id}/close`);
    return response.data.data;
  },

  /**
   * Get all attempts for a quiz.
   */
  async getQuizAttempts(id: string): Promise<QuizAttempt[]> {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(`/quizzes/${id}/attempts`);
    return response.data.data;
  },

  /**
   * Get analytics and student attempts for a quiz.
   */
  async getQuizAnalytics(id: string): Promise<{ quiz: Quiz; analytics: QuizAnalytics; attempts: QuizAttempt[] }> {
    const response = await api.get<ApiResponse<{ quiz: Quiz; analytics: QuizAnalytics; attempts: QuizAttempt[] }>>(`/quizzes/${id}/analytics`);
    return response.data.data;
  },

  /**
   * Add question with options.
   */
  async addQuestion(quizId: string, payload: CreateQuestionPayload): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/quizzes/${quizId}/questions`, payload);
    return response.data.data;
  },

  /**
   * Update question.
   */
  async updateQuestion(questionId: string, payload: Partial<CreateQuestionPayload>): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`/quizzes/questions/${questionId}`, payload);
    return response.data.data;
  },

  /**
   * Delete question.
   */
  async deleteQuestion(questionId: string): Promise<void> {
    await api.delete(`/quizzes/questions/${questionId}`);
  },
};
