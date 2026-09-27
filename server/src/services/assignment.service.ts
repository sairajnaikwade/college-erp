import {
  AssignmentRepository,
  AssignmentWithDetails,
  StudentAssignmentWithSubmission,
  AssignmentRow,
  SubmissionWithDetails,
  SubmissionRow,
  CreateAssignmentDTO,
  UpdateAssignmentDTO,
  AssignmentFilterOptions,
} from '../repositories/assignment.repository';
import { SubjectRepository } from '../repositories/subject.repository';
import { ClassRepository } from '../repositories/class.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { telemetryService } from './telemetry.service';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest } from '../types/common';

export interface SubmitAssignmentInput {
  submission_text?: string;
  attachment_name?: string;
  attachment_url?: string;
}

export interface GradeSubmissionInput {
  marks: number;
  feedback?: string;
}

export class AssignmentService {
  private assignmentRepo: AssignmentRepository;
  private subjectRepo: SubjectRepository;
  private classRepo: ClassRepository;
  private staffRepo: StaffRepository;

  constructor() {
    this.assignmentRepo = new AssignmentRepository();
    this.subjectRepo = new SubjectRepository();
    this.classRepo = new ClassRepository();
    this.staffRepo = new StaffRepository();
  }

  /**
   * Retrieves assignments list for the logged-in student (with their submission status).
   */
  public async getStudentAssignments(
    req: AuthenticatedRequest,
    filters: { subjectId?: string; status?: string; academicYear?: string; semester?: any } = {}
  ): Promise<StudentAssignmentWithSubmission[]> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access this assignments view');
    }

    const student = await this.assignmentRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const rows = await this.assignmentRepo.findAssignmentsForStudent(student.id, {
      subjectId: filters.subjectId,
      status: filters.status,
      academicYear: filters.academicYear,
      semester: filters.semester ? parseInt(filters.semester.toString(), 10) : undefined,
    });

    telemetryService.emit({
      eventType: 'ASSIGNMENT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ASSIGNMENT',
      metadata: {
        student_id: student.id,
        count: rows.length,
      },
    });

    return rows;
  }

  /**
   * Retrieves assignments created by faculty or for authorized classes.
   */
  public async getStaffAssignments(
    req: AuthenticatedRequest,
    filters: AssignmentFilterOptions = {}
  ): Promise<AssignmentWithDetails[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can view staff assignments');
    }

    if (req.user.role === 'ADMIN') {
      const result = await this.assignmentRepo.findAll(filters);
      return result.rows;
    }

    const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
    if (!staff) {
      throw ApiError.forbidden('Faculty profile not found');
    }

    const rows = await this.assignmentRepo.findAssignmentsForStaff(staff.id, filters);

    telemetryService.emit({
      eventType: 'ASSIGNMENT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ASSIGNMENT',
      metadata: {
        staff_id: staff.id,
        count: rows.length,
      },
    });

    return rows;
  }

  /**
   * Retrieves assignments for a class batch.
   */
  public async getClassAssignments(
    classId: string,
    req: AuthenticatedRequest,
    filters: { subjectId?: string; status?: string } = {}
  ): Promise<AssignmentWithDetails[]> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const cls = await this.classRepo.findById(classId);
    if (!cls) throw ApiError.notFound('Class batch not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');
      if (filters.subjectId) {
        const isAssigned = await this.assignmentRepo.isStaffAssignedToSubject(staff.id, filters.subjectId);
        if (!isAssigned) throw ApiError.forbidden('Faculty is not assigned to this course');
      }
    } else if (req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Access denied to class assignments');
    }

    return this.assignmentRepo.findAssignmentsForClass(classId, filters);
  }

  /**
   * Retrieves single assignment by ID.
   */
  public async getAssignmentById(id: string, req: AuthenticatedRequest): Promise<AssignmentWithDetails> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const assignment = await this.assignmentRepo.findById(id);
    if (!assignment) throw ApiError.notFound('Assignment not found');

    if (req.user.role === 'STUDENT') {
      const student = await this.assignmentRepo.findStudentByUserId(req.user.id);
      if (!student || student.class_id !== assignment.class_id) {
        throw ApiError.forbidden('Access denied to assignment for another class');
      }
    }

    telemetryService.emit({
      eventType: 'ASSIGNMENT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ASSIGNMENT',
      resourceId: id,
      metadata: { assignment_id: id, title: assignment.title },
    });

    return assignment;
  }

  /**
   * Create assignment (Staff / Admin).
   */
  public async createAssignment(data: CreateAssignmentDTO, req: AuthenticatedRequest): Promise<AssignmentRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can create assignments');
    }

    if (!data.title || !data.description || !data.class_id || !data.subject_id || !data.due_date) {
      throw ApiError.badRequest('Missing required assignment fields');
    }

    const cls = await this.classRepo.findById(data.class_id);
    if (!cls) throw ApiError.notFound('Target class batch not found');

    const sub = await this.subjectRepo.findById(data.subject_id);
    if (!sub) throw ApiError.notFound('Target course / subject not found');

    let createdById: string;

    if (req.user.role === 'STAFF') {
      const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      const isAssigned = await this.assignmentRepo.isStaffAssignedToSubject(staff.id, data.subject_id);
      if (!isAssigned) {
        throw ApiError.forbidden('Faculty is not assigned to teach this subject');
      }
      createdById = staff.id;
    } else {
      const staffList = await this.staffRepo.findAll();
      createdById = staffList[0]?.staff_id;
      if (!createdById) throw ApiError.badRequest('No faculty available in system');
    }

    const created = await this.assignmentRepo.create({
      ...data,
      created_by: createdById,
      department_id: cls.department_id,
      academic_year: cls.academic_year,
      semester: cls.semester,
      max_marks: data.max_marks || 100.0,
      status: data.status || 'PUBLISHED',
    });

    telemetryService.emit({
      eventType: 'ASSIGNMENT_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ASSIGNMENT',
      resourceId: created.id,
      metadata: {
        assignment_id: created.id,
        title: created.title,
        class_id: created.class_id,
        subject_id: created.subject_id,
        due_date: created.due_date,
      },
    });

    return created;
  }

  /**
   * Update assignment (Staff / Admin).
   */
  public async updateAssignment(id: string, data: UpdateAssignmentDTO, req: AuthenticatedRequest): Promise<AssignmentRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can update assignments');
    }

    const existing = await this.assignmentRepo.findById(id);
    if (!existing) throw ApiError.notFound('Assignment not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
      if (!staff || staff.id !== existing.created_by) {
        throw ApiError.forbidden('Faculty is not authorized to edit this assignment');
      }
    }

    const updated = await this.assignmentRepo.update(id, data);
    if (!updated) throw ApiError.internal('Failed to update assignment');

    telemetryService.emit({
      eventType: 'ASSIGNMENT_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ASSIGNMENT',
      resourceId: id,
      metadata: {
        assignment_id: id,
        new_status: updated.status,
      },
    });

    return updated;
  }

  /**
   * Delete assignment (Staff / Admin).
   */
  public async deleteAssignment(id: string, req: AuthenticatedRequest): Promise<void> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can delete assignments');
    }

    const existing = await this.assignmentRepo.findById(id);
    if (!existing) throw ApiError.notFound('Assignment not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
      if (!staff || staff.id !== existing.created_by) {
        throw ApiError.forbidden('Faculty can only delete their own assignments');
      }
    }

    await this.assignmentRepo.delete(id);

    telemetryService.emit({
      eventType: 'ASSIGNMENT_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ASSIGNMENT',
      resourceId: id,
      metadata: {
        assignment_id: id,
        title: existing.title,
      },
    });
  }

  // ─── Submissions & Grading ──────────────────────────────────

  /**
   * Retrieves student's personal submission for an assignment.
   */
  public async getMySubmission(assignmentId: string, req: AuthenticatedRequest): Promise<SubmissionWithDetails | null> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access their personal submission');
    }

    const student = await this.assignmentRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const submission = await this.assignmentRepo.findStudentSubmission(assignmentId, student.id);
    return submission;
  }

  /**
   * Submit an assignment (Student only).
   */
  public async submitAssignment(
    assignmentId: string,
    input: SubmitAssignmentInput,
    req: AuthenticatedRequest
  ): Promise<SubmissionRow> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can submit assignments');
    }

    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found');

    if (assignment.status === 'CLOSED') {
      throw ApiError.badRequest('This assignment is closed for submissions');
    }

    const student = await this.assignmentRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    // Verify student is in assignment's class
    const inClass = await this.assignmentRepo.isStudentInClass(student.id, assignment.class_id);
    if (!inClass) {
      throw ApiError.forbidden('Student is not enrolled in the class assigned to this task');
    }

    // Determine SUBMITTED vs LATE based on due date
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const submissionStatus = now <= dueDate ? 'SUBMITTED' : 'LATE';

    const submission = await this.assignmentRepo.upsertSubmission({
      assignment_id: assignmentId,
      student_id: student.id,
      status: submissionStatus,
      submission_text: input.submission_text || null,
      attachment_name: input.attachment_name || null,
      attachment_url: input.attachment_url || null,
    });

    telemetryService.emit({
      eventType: 'ASSIGNMENT_SUBMIT',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'SUBMISSION',
      resourceId: submission.id,
      metadata: {
        assignment_id: assignmentId,
        student_id: student.id,
        submission_status: submissionStatus,
        is_late: submissionStatus === 'LATE',
      },
    });

    return submission;
  }

  /**
   * Lists all submissions for an assignment (Staff / Admin).
   */
  public async getAssignmentSubmissions(
    assignmentId: string,
    req: AuthenticatedRequest
  ): Promise<SubmissionWithDetails[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Access denied to assignment submissions');
    }

    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw ApiError.notFound('Assignment not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
      if (!staff || staff.id !== assignment.created_by) {
        const isAssigned = await this.assignmentRepo.isStaffAssignedToSubject(staff?.id || '', assignment.subject_id);
        if (!isAssigned) throw ApiError.forbidden('Faculty not authorized for this course submissions');
      }
    }

    return this.assignmentRepo.findSubmissions(assignmentId);
  }

  /**
   * Get single submission by ID (IDOR protected).
   */
  public async getSubmissionById(submissionId: string, req: AuthenticatedRequest): Promise<SubmissionWithDetails> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const submission = await this.assignmentRepo.findSubmissionById(submissionId);
    if (!submission) throw ApiError.notFound('Submission not found');

    if (req.user.role === 'STUDENT') {
      const student = await this.assignmentRepo.findStudentByUserId(req.user.id);
      if (!student || student.id !== submission.student_id) {
        throw ApiError.forbidden('Access denied to another student submission');
      }
    }

    return submission;
  }

  /**
   * Grade a student submission (Staff / Admin).
   */
  public async gradeSubmission(
    submissionId: string,
    input: GradeSubmissionInput,
    req: AuthenticatedRequest
  ): Promise<SubmissionRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can grade submissions');
    }

    const submission = await this.assignmentRepo.findSubmissionById(submissionId);
    if (!submission) throw ApiError.notFound('Submission not found');

    const assignment = await this.assignmentRepo.findById(submission.assignment_id);
    if (!assignment) throw ApiError.notFound('Associated assignment not found');

    let graderId: string;

    if (req.user.role === 'STAFF') {
      const staff = await this.assignmentRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      const isAssigned = await this.assignmentRepo.isStaffAssignedToSubject(staff.id, assignment.subject_id);
      if (!isAssigned && staff.id !== assignment.created_by) {
        throw ApiError.forbidden('Faculty is not authorized to grade this assignment');
      }
      graderId = staff.id;
    } else {
      const staffList = await this.staffRepo.findAll();
      graderId = staffList[0]?.staff_id;
      if (!graderId) throw ApiError.badRequest('No staff profile available in system');
    }

    // Validate marks
    if (typeof input.marks !== 'number' || input.marks < 0 || input.marks > assignment.max_marks) {
      throw ApiError.badRequest(`Marks must be between 0 and ${assignment.max_marks}`);
    }

    const graded = await this.assignmentRepo.gradeSubmission(submissionId, {
      marks: input.marks,
      feedback: input.feedback || null,
      graded_by: graderId,
    });

    if (!graded) throw ApiError.internal('Failed to record submission grade');

    telemetryService.emit({
      eventType: 'ASSIGNMENT_GRADE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'SUBMISSION',
      resourceId: submissionId,
      metadata: {
        submission_id: submissionId,
        student_id: submission.student_id,
        assignment_id: submission.assignment_id,
        marks: input.marks,
        max_marks: assignment.max_marks,
      },
    });

    return graded;
  }

  /**
   * List all institutional assignments (Admin).
   */
  public async getAllAssignments(
    req: AuthenticatedRequest,
    options: AssignmentFilterOptions = {}
  ): Promise<{ rows: AssignmentWithDetails[]; total: number }> {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only administrators can access all assignment registries');
    }

    return this.assignmentRepo.findAll(options);
  }
}

export const assignmentService = new AssignmentService();
