import apiClient from './api';
import type {
  ApiResponse,
  Note,
  CreateNotePayload,
  UpdateNotePayload,
  NoteFilters,
} from '../types';

export interface StudentNoteFilters {
  subjectId?: string;
  category?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
}

export interface StaffNoteFilters {
  classId?: string;
  subjectId?: string;
  category?: string;
  status?: string;
  search?: string;
}

export const noteService = {
  /**
   * Retrieves published notes for the logged-in student.
   */
  async getStudentNotes(
    filters: StudentNoteFilters = {}
  ): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.category) params.append('category', filters.category);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.semester) params.append('semester', filters.semester.toString());
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Note[]>>(
      `/notes/student${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves notes authored by faculty or for authorized classes.
   */
  async getStaffNotes(
    filters: StaffNoteFilters = {}
  ): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Note[]>>(
      `/notes/staff${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves notes for a class batch.
   */
  async getClassNotes(
    classId: string,
    filters: { subjectId?: string; category?: string; status?: string } = {}
  ): Promise<Note[]> {
    const params = new URLSearchParams();
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Note[]>>(
      `/notes/class/${classId}${queryString}`
    );
    return res.data.data;
  },

  /**
   * Retrieves single note by ID.
   */
  async getNoteById(id: string): Promise<Note> {
    const res = await apiClient.get<ApiResponse<Note>>(
      `/notes/${id}`
    );
    return res.data.data;
  },

  /**
   * Creates/publishes a new study material note (Staff / Admin).
   * Accepts FormData for multipart/form-data PDF file upload or CreateNotePayload JSON.
   */
  async createNote(payload: FormData | CreateNotePayload): Promise<Note> {
    const res = await apiClient.post<ApiResponse<Note>>(
      '/notes',
      payload,
      payload instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined
    );
    return res.data.data;
  },

  /**
   * Retrieves the authenticated PDF file blob for secure viewing or downloading.
   */
  async getNoteFileBlob(id: string): Promise<Blob> {
    const res = await apiClient.get(`/notes/${id}/file`, {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Downloads the authenticated PDF file directly to user device.
   */
  async downloadNoteFile(id: string, fallbackFileName: string = 'study_material.pdf'): Promise<void> {
    const blob = await this.getNoteFileBlob(id);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fallbackFileName.endsWith('.pdf') ? fallbackFileName : `${fallbackFileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Opens the authenticated PDF file in a new browser window/tab.
   */
  async openNoteFileInNewTab(id: string): Promise<void> {
    const blob = await this.getNoteFileBlob(id);
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  },


  /**
   * Updates an existing study material note (Staff / Admin).
   */
  async updateNote(
    id: string,
    payload: UpdateNotePayload
  ): Promise<Note> {
    const res = await apiClient.put<ApiResponse<Note>>(
      `/notes/${id}`,
      payload
    );
    return res.data.data;
  },

  /**
   * Deletes a study material note (Staff / Admin).
   */
  async deleteNote(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },

  /**
   * List all notes across institution (Admin only).
   */
  async getAllNotes(
    filters: NoteFilters & { limit?: number; offset?: number } = {}
  ): Promise<{ rows: Note[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.classId) params.append('classId', filters.classId);
    if (filters.subjectId) params.append('subjectId', filters.subjectId);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.academicYear) params.append('academicYear', filters.academicYear);
    if (filters.semester) params.append('semester', filters.semester.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<ApiResponse<Note[]> & { total: number }>(
      `/notes${queryString}`
    );
    return {
      rows: res.data.data || [],
      total: (res.data as any).total || 0,
    };
  },
};
export default noteService;
