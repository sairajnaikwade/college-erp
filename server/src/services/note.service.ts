import path from 'path';
import fs from 'fs';
import {
  NoteRepository,
  NoteWithDetails,
  NoteRow,
  CreateNoteDTO,
  UpdateNoteDTO,
  NoteFilterOptions,
  NoteCategory,
  NoteStatus,
} from '../repositories/note.repository';
import { SubjectRepository } from '../repositories/subject.repository';
import { ClassRepository } from '../repositories/class.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { telemetryService } from './telemetry.service';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest } from '../types/common';
import { NOTES_UPLOAD_DIR } from '../middleware/upload';


const VALID_CATEGORIES: NoteCategory[] = [
  'LECTURE_NOTES',
  'STUDY_MATERIAL',
  'PRACTICAL',
  'REFERENCE',
  'QUESTION_BANK',
  'SYLLABUS',
  'OTHER',
];

const VALID_STATUSES: NoteStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export class NoteService {
  private noteRepo: NoteRepository;
  private subjectRepo: SubjectRepository;
  private classRepo: ClassRepository;
  private staffRepo: StaffRepository;
  private departmentRepo: DepartmentRepository;

  constructor() {
    this.noteRepo = new NoteRepository();
    this.subjectRepo = new SubjectRepository();
    this.classRepo = new ClassRepository();
    this.staffRepo = new StaffRepository();
    this.departmentRepo = new DepartmentRepository();
  }

  /**
   * Dispatches note retrieval based on the authenticated user's role.
   */
  public async getMyNotes(
    req: AuthenticatedRequest,
    filters: { classId?: string; subjectId?: string; category?: string; status?: string; academicYear?: string; semester?: any; search?: string } = {}
  ): Promise<NoteWithDetails[]> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (req.user.role === 'STUDENT') {
      return this.getStudentNotes(req, filters);
    } else if (req.user.role === 'STAFF') {
      return this.getStaffNotes(req, filters);
    } else if (req.user.role === 'ADMIN') {
      const all = await this.getAllNotes(req, filters);
      return all.rows;
    }

    throw ApiError.forbidden('Unauthorized role for note access');
  }

  /**
   * Retrieves overall statistics for study materials.
   */
  public async getStats(req: AuthenticatedRequest): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    byCategory: Record<string, number>;
  }> {
    return this.noteRepo.getStats();
  }

  /**
   * Retrieves published notes for the logged-in student's enrolled class.
   */
  public async getStudentNotes(
    req: AuthenticatedRequest,
    filters: { subjectId?: string; category?: string; academicYear?: string; semester?: any; search?: string } = {}
  ): Promise<NoteWithDetails[]> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access this notes view');
    }

    const student = await this.noteRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    if (filters.category && !VALID_CATEGORIES.includes(filters.category.toUpperCase() as NoteCategory)) {
      throw ApiError.badRequest(`Invalid note category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
    }

    const rows = await this.noteRepo.findForStudent(student.id, {
      subjectId: filters.subjectId,
      category: filters.category,
      academicYear: filters.academicYear,
      semester: filters.semester ? parseInt(filters.semester.toString(), 10) : undefined,
      search: filters.search,
    });

    telemetryService.emit({
      eventType: 'NOTE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      metadata: {
        student_id: student.id,
        count: rows.length,
      },
    });

    return rows;
  }

  /**
   * Retrieves notes authored by faculty or for authorized classes.
   */
  public async getStaffNotes(
    req: AuthenticatedRequest,
    filters: NoteFilterOptions = {}
  ): Promise<NoteWithDetails[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can view staff notes');
    }

    if (filters.category && !VALID_CATEGORIES.includes(filters.category.toUpperCase() as NoteCategory)) {
      throw ApiError.badRequest(`Invalid note category. Allowed: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (filters.status && !VALID_STATUSES.includes(filters.status.toUpperCase() as NoteStatus)) {
      throw ApiError.badRequest(`Invalid note status. Allowed: ${VALID_STATUSES.join(', ')}`);
    }

    if (req.user.role === 'ADMIN') {
      const result = await this.noteRepo.findAll(filters);
      return result.rows;
    }

    const staff = await this.noteRepo.findStaffByUserId(req.user.id);
    if (!staff) {
      throw ApiError.forbidden('Faculty profile not found');
    }

    const rows = await this.noteRepo.findForStaff(staff.id, filters);

    telemetryService.emit({
      eventType: 'NOTE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      metadata: {
        staff_id: staff.id,
        count: rows.length,
      },
    });

    return rows;
  }

  /**
   * Retrieves notes for a class batch.
   */
  public async getClassNotes(
    classId: string,
    req: AuthenticatedRequest,
    filters: { subjectId?: string; category?: string; status?: string } = {}
  ): Promise<NoteWithDetails[]> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const cls = await this.classRepo.findById(classId);
    if (!cls) throw ApiError.notFound('Class batch not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.noteRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');
      if (filters.subjectId) {
        const isAssigned = await this.noteRepo.isStaffAssignedToSubject(staff.id, filters.subjectId);
        if (!isAssigned) throw ApiError.forbidden('Faculty is not assigned to this course');
      }
    } else if (req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Access denied to class notes');
    }

    return this.noteRepo.findForClass(classId, filters);
  }

  /**
   * Retrieves single note by ID with RBAC & class enrollment enforcement.
   */
  public async getNoteById(id: string, req: AuthenticatedRequest): Promise<NoteWithDetails> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const note = await this.noteRepo.findById(id);
    if (!note) {
      throw ApiError.notFound('Note or study material not found');
    }

    // Role-based access checks
    if (req.user.role === 'STUDENT') {
      if (note.status !== 'PUBLISHED') {
        throw ApiError.forbidden('Draft or archived study material is not accessible to students');
      }

      const student = await this.noteRepo.findStudentByUserId(req.user.id);
      if (!student) throw ApiError.forbidden('Student profile not found');

      const isEnrolled = await this.noteRepo.isStudentEnrolledInClass(student.id, note.class_id);
      if (!isEnrolled) {
        throw ApiError.forbidden('You are not enrolled in the class for this study material');
      }
    } else if (req.user.role === 'STAFF') {
      const staff = await this.noteRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      const isUploader = note.uploaded_by === staff.id;
      const isAssigned = await this.noteRepo.isStaffAssignedToSubject(staff.id, note.subject_id);

      if (!isUploader && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to view this course study material');
      }
    }

    telemetryService.emit({
      eventType: 'NOTE_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      resourceId: note.id,
      metadata: {
        subject_id: note.subject_id,
        class_id: note.class_id,
        category: note.category,
      },
    });

    return note;
  }

  /**
   * Retrieves note file with RBAC validation and path traversal safety.
   */
  public async getNoteFile(
    id: string,
    req: AuthenticatedRequest
  ): Promise<{ filePath: string; fileName: string; fileSize: number | null; fileType: string }> {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required to access study materials');
    }

    const note = await this.noteRepo.findById(id);
    if (!note) {
      telemetryService.emit({
        eventType: 'NOTE_DOWNLOAD',
        result: 'FAILURE',
        req,
        userId: req.user.id,
        userRole: req.user.role,
        resourceType: 'NOTE',
        resourceId: id,
        metadata: { reason: 'NOTE_NOT_FOUND' },
      });
      throw ApiError.notFound('Note or study material not found');
    }

    // Role-based access checks
    if (req.user.role === 'STUDENT') {
      if (note.status !== 'PUBLISHED') {
        telemetryService.emit({
          eventType: 'NOTE_DOWNLOAD',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'NOTE',
          resourceId: note.id,
          metadata: { reason: 'STUDENT_ACCESS_UNPUBLISHED_NOTE', status: note.status },
        });
        throw ApiError.forbidden('Draft or archived study material is not accessible to students');
      }

      const student = await this.noteRepo.findStudentByUserId(req.user.id);
      if (!student) {
        telemetryService.emit({
          eventType: 'NOTE_DOWNLOAD',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'NOTE',
          resourceId: note.id,
          metadata: { reason: 'STUDENT_PROFILE_NOT_FOUND' },
        });
        throw ApiError.forbidden('Student profile not found');
      }

      const isEnrolled = await this.noteRepo.isStudentEnrolledInClass(student.id, note.class_id);
      if (!isEnrolled) {
        telemetryService.emit({
          eventType: 'NOTE_DOWNLOAD',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'NOTE',
          resourceId: note.id,
          metadata: {
            reason: 'STUDENT_NOT_ENROLLED_IN_CLASS',
            student_id: student.id,
            class_id: note.class_id,
          },
        });
        throw ApiError.forbidden('You are not enrolled in the class for this study material');
      }
    } else if (req.user.role === 'STAFF') {
      const staff = await this.noteRepo.findStaffByUserId(req.user.id);
      if (!staff) {
        telemetryService.emit({
          eventType: 'NOTE_DOWNLOAD',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'NOTE',
          resourceId: note.id,
          metadata: { reason: 'STAFF_PROFILE_NOT_FOUND' },
        });
        throw ApiError.forbidden('Faculty profile not found');
      }

      const isUploader = note.uploaded_by === staff.id;
      const isAssigned = await this.noteRepo.isStaffAssignedToSubject(staff.id, note.subject_id);

      if (!isUploader && !isAssigned) {
        telemetryService.emit({
          eventType: 'NOTE_DOWNLOAD',
          result: 'DENIED',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'NOTE',
          resourceId: note.id,
          metadata: {
            reason: 'STAFF_NOT_ASSIGNED_OR_UPLOADER',
            staff_id: staff.id,
            subject_id: note.subject_id,
          },
        });
        throw ApiError.forbidden('You are not authorized to view this course study material');
      }
    } else if (req.user.role !== 'ADMIN') {
      telemetryService.emit({
        eventType: 'NOTE_DOWNLOAD',
        result: 'DENIED',
        req,
        userId: req.user.id,
        userRole: req.user.role,
        resourceType: 'NOTE',
        resourceId: note.id,
        metadata: { reason: 'UNAUTHORIZED_ROLE' },
      });
      throw ApiError.forbidden('Unauthorized role for note access');
    }

    // Resolve file path strictly within uploads/notes directory
    const normalizedUploadDir = path.resolve(NOTES_UPLOAD_DIR);
    const filePath = path.resolve(NOTES_UPLOAD_DIR, `${note.id}.pdf`);

    if (!filePath.startsWith(normalizedUploadDir)) {
      throw ApiError.forbidden('Invalid file path request');
    }

    if (!fs.existsSync(filePath)) {
      telemetryService.emit({
        eventType: 'NOTE_DOWNLOAD',
        result: 'FAILURE',
        req,
        userId: req.user.id,
        userRole: req.user.role,
        resourceType: 'NOTE',
        resourceId: note.id,
        metadata: { reason: 'FILE_NOT_FOUND_ON_DISK', file_url: note.file_url },
      });
      throw ApiError.notFound('Study material file attachment not found on server storage');
    }

    const stat = await fs.promises.stat(filePath);

    telemetryService.emit({
      eventType: 'NOTE_DOWNLOAD',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      resourceId: note.id,
      metadata: {
        file_name: note.file_name,
        file_type: note.file_type || 'application/pdf',
        file_size: Number(stat.size),
        subject_id: note.subject_id,
        class_id: note.class_id,
        category: note.category,
      },
    });

    return {
      filePath,
      fileName: note.file_name || `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      fileSize: Number(stat.size),
      fileType: note.file_type || 'application/pdf',
    };
  }

  /**
   * Creates a new note (Staff / Admin) with optional uploaded PDF file.
   */
  public async createNote(
    payload: {
      title: string;
      description?: string;
      department_id?: string;
      class_id: string;
      subject_id: string;
      academic_year?: string;
      semester?: number;
      category: NoteCategory;
      status?: NoteStatus;
      file_name?: string;
      file_url?: string;
      file_type?: string;
      file_size?: number | string;
    },
    req: AuthenticatedRequest,
    file?: Express.Multer.File
  ): Promise<NoteRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.forbidden('Only faculty and administrators can upload study materials');
    }

    if (!payload.title || !payload.title.trim()) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.badRequest('Note title is required');
    }
    if (!payload.subject_id) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.badRequest('Course subject ID is required');
    }
    if (!payload.category || !VALID_CATEGORIES.includes(payload.category.toUpperCase() as NoteCategory)) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.badRequest(`Invalid category. Allowed values: ${VALID_CATEGORIES.join(', ')}`);
    }

    const sub = await this.subjectRepo.findById(payload.subject_id);
    if (!sub) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.notFound('Course subject not found');
    }

    let classId = payload.class_id;
    if (!classId) {
      const classes = await this.classRepo.findAll();
      const match = classes.find(c => c.department_id === sub.department_id && c.semester === sub.semester);
      if (match) {
        classId = match.id;
      } else {
        const anyClass = classes.find(c => c.department_id === sub.department_id);
        if (anyClass) {
          classId = anyClass.id;
        } else {
          if (file && fs.existsSync(file.path)) {
            try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
          }
          throw ApiError.badRequest('Target class ID is required');
        }
      }
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.notFound('Target class batch not found');
    }

    if (cls.department_id !== sub.department_id) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.badRequest('Subject and Class must belong to the same academic department');
    }

    let staffId: string;
    if (req.user.role === 'STAFF') {
      const staff = await this.noteRepo.findStaffByUserId(req.user.id);
      if (!staff) {
        if (file && fs.existsSync(file.path)) {
          try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
        }
        throw ApiError.forbidden('Faculty profile not found');
      }
      staffId = staff.id;

      const isAssigned = await this.noteRepo.isStaffAssignedToSubject(staffId, payload.subject_id);
      if (!isAssigned) {
        if (file && fs.existsSync(file.path)) {
          try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
        }
        throw ApiError.forbidden('You are not authorized to publish notes for this course subject');
      }
    } else {
      // Admin: assign to authoring staff or first staff teaching subject
      const staffMembers = await this.staffRepo.findAll();
      staffId = staffMembers[0]?.staff_id;
      if (!staffId) {
        if (file && fs.existsSync(file.path)) {
          try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
        }
        throw ApiError.badRequest('No staff members registered in institution');
      }
    }

    const status = payload.status ? (payload.status.toUpperCase() as NoteStatus) : 'PUBLISHED';
    if (!VALID_STATUSES.includes(status)) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw ApiError.badRequest(`Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`);
    }

    let fileName: string | null = payload.file_name || null;
    let fileType: string | null = payload.file_type || null;
    let numericFileSize: number | null = null;
    let fileUrl: string | null = payload.file_url || null;

    if (file) {
      fileName = path.basename(file.originalname);
      fileType = 'application/pdf';
      numericFileSize = file.size;
    } else {
      if (typeof payload.file_size === 'number') {
        numericFileSize = payload.file_size;
      } else if (typeof payload.file_size === 'string') {
        const parsed = parseInt(payload.file_size, 10);
        numericFileSize = isNaN(parsed) ? 3500000 : parsed;
      }
    }

    let note: NoteRow;
    try {
      note = await this.noteRepo.create({
        title: payload.title.trim(),
        description: payload.description ? payload.description.trim() : null,
        department_id: payload.department_id || sub.department_id,
        class_id: classId,
        subject_id: payload.subject_id,
        uploaded_by: staffId,
        academic_year: payload.academic_year || cls.academic_year || '2025-2026',
        semester: payload.semester || cls.semester || sub.semester || 5,
        category: payload.category.toUpperCase() as NoteCategory,
        status,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        file_size: numericFileSize,
        published_at: status === 'PUBLISHED' ? new Date() : null,
      });

      // If a real file was uploaded, store it with safe unique UUID filename matching note.id
      if (file) {
        const destination = path.join(NOTES_UPLOAD_DIR, `${note.id}.pdf`);
        await fs.promises.rename(file.path, destination);
        const generatedFileUrl = `/api/notes/${note.id}/file`;
        const updated = await this.noteRepo.update(note.id, {
          file_url: generatedFileUrl,
        });
        if (updated) {
          note = updated;
        }

        // Emit NOTE_UPLOAD telemetry
        telemetryService.emit({
          eventType: 'NOTE_UPLOAD',
          result: 'SUCCESS',
          req,
          userId: req.user.id,
          userRole: req.user.role,
          resourceType: 'NOTE',
          resourceId: note.id,
          metadata: {
            file_name: note.file_name,
            file_type: 'application/pdf',
            file_size: numericFileSize,
            subject_id: note.subject_id,
            class_id: note.class_id,
            category: note.category,
          },
        });
      }
    } catch (createErr) {
      if (file && fs.existsSync(file.path)) {
        try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      }
      throw createErr;
    }

    telemetryService.emit({
      eventType: 'NOTE_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      resourceId: note.id,
      metadata: {
        title: note.title,
        subject_id: note.subject_id,
        class_id: note.class_id,
        category: note.category,
        status: note.status,
      },
    });

    return note;
  }

  /**
   * Updates an existing note (Staff / Admin).
   */
  public async updateNote(
    id: string,
    payload: UpdateNoteDTO,
    req: AuthenticatedRequest
  ): Promise<NoteRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can update study materials');
    }

    const existing = await this.noteRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound('Note or study material not found');
    }

    if (req.user.role === 'STAFF') {
      const staff = await this.noteRepo.findStaffByUserId(req.user.id);
      if (!staff || staff.id !== existing.uploaded_by) {
        throw ApiError.forbidden('You can only modify study materials authored by yourself');
      }
    }

    if (payload.category && !VALID_CATEGORIES.includes(payload.category.toUpperCase() as NoteCategory)) {
      throw ApiError.badRequest(`Invalid category. Allowed values: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (payload.status && !VALID_STATUSES.includes(payload.status.toUpperCase() as NoteStatus)) {
      throw ApiError.badRequest(`Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`);
    }

    const updated = await this.noteRepo.update(id, {
      ...payload,
      category: payload.category ? (payload.category.toUpperCase() as NoteCategory) : undefined,
      status: payload.status ? (payload.status.toUpperCase() as NoteStatus) : undefined,
    });

    if (!updated) {
      throw ApiError.notFound('Failed to update study material');
    }

    telemetryService.emit({
      eventType: 'NOTE_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      resourceId: updated.id,
      metadata: {
        note_id: updated.id,
        updated_fields: Object.keys(payload),
      },
    });

    return updated;
  }

  /**
   * Deletes an existing note (Staff / Admin).
   */
  public async deleteNote(id: string, req: AuthenticatedRequest): Promise<void> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can delete study materials');
    }

    const existing = await this.noteRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound('Note or study material not found');
    }

    if (req.user.role === 'STAFF') {
      const staff = await this.noteRepo.findStaffByUserId(req.user.id);
      if (!staff || staff.id !== existing.uploaded_by) {
        throw ApiError.forbidden('You can only delete study materials authored by yourself');
      }
    }

    const deleted = await this.noteRepo.delete(id);
    if (!deleted) {
      throw ApiError.notFound('Failed to delete study material');
    }

    // Clean up stored file from server storage if present
    const filePath = path.resolve(NOTES_UPLOAD_DIR, `${id}.pdf`);
    if (filePath.startsWith(path.resolve(NOTES_UPLOAD_DIR)) && fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore deletion cleanup error
      }
    }

    telemetryService.emit({
      eventType: 'NOTE_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'NOTE',
      resourceId: id,
      metadata: {
        note_id: id,
        title: existing.title,
      },
    });
  }

  /**
   * Retrieves all notes across institution (Admin only).
   */
  public async getAllNotes(
    req: AuthenticatedRequest,
    filters: NoteFilterOptions = {}
  ): Promise<{ rows: NoteWithDetails[]; total: number }> {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only administrators can access global institutional notes');
    }

    return this.noteRepo.findAll(filters);
  }
}
