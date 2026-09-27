import { MarksRepository, MarkComponentWithDetails, StudentMarkWithDetails, StudentSubjectResultWithDetails, ComponentType, MarkStatus, ResultStatus } from '../repositories/marks.repository';
import { SubjectRepository } from '../repositories/subject.repository';
import { ClassRepository } from '../repositories/class.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest } from '../types/common';
import { telemetryService } from './telemetry.service';
import { getPool } from '../config/database';

export interface GradeEvaluation {
  grade: string;
  grade_point: number;
  is_passed: boolean;
}

export function calculateGrade(percentage: number): GradeEvaluation {
  if (percentage >= 90) return { grade: 'O', grade_point: 10, is_passed: true };
  if (percentage >= 80) return { grade: 'A+', grade_point: 9, is_passed: true };
  if (percentage >= 70) return { grade: 'A', grade_point: 8, is_passed: true };
  if (percentage >= 60) return { grade: 'B+', grade_point: 7, is_passed: true };
  if (percentage >= 55) return { grade: 'B', grade_point: 6, is_passed: true };
  if (percentage >= 50) return { grade: 'C', grade_point: 5, is_passed: true };
  if (percentage >= 40) return { grade: 'P', grade_point: 4, is_passed: true };
  return { grade: 'F', grade_point: 0, is_passed: false };
}

export class MarksService {
  private marksRepo: MarksRepository;
  private subjectRepo: SubjectRepository;
  private classRepo: ClassRepository;
  private staffRepo: StaffRepository;

  constructor() {
    this.marksRepo = new MarksRepository();
    this.subjectRepo = new SubjectRepository();
    this.classRepo = new ClassRepository();
    this.staffRepo = new StaffRepository();
  }

  // ─── Mark Component Management ───────────────────────────────

  public async createComponent(
    payload: {
      name: string;
      code: string;
      description?: string | null;
      department_id?: string;
      subject_id: string;
      class_id?: string;
      academic_year?: string;
      semester?: number;
      max_marks: number;
      weightage?: number | null;
      component_type: ComponentType;
    },
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or administrator authorization required');
    }

    if (!payload.name || !payload.name.trim()) throw ApiError.badRequest('Component name is required');
    if (!payload.code || !payload.code.trim()) throw ApiError.badRequest('Component code is required');
    if (!payload.subject_id) throw ApiError.badRequest('Subject ID is required');
    if (!payload.max_marks || payload.max_marks <= 0) throw ApiError.badRequest('Max marks must be greater than 0');

    const validTypes: ComponentType[] = ['ASSIGNMENT', 'QUIZ', 'INTERNAL', 'PRACTICAL', 'PROJECT', 'OTHER'];
    if (!payload.component_type || !validTypes.includes(payload.component_type)) {
      throw ApiError.badRequest(`Invalid component type. Must be one of: ${validTypes.join(', ')}`);
    }

    const sub = await this.subjectRepo.findById(payload.subject_id);
    if (!sub) throw ApiError.notFound('Subject not found');

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
          throw ApiError.badRequest('Target class ID is required');
        }
      }
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) throw ApiError.notFound('Class not found');

    let staffId: string;
    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      staffId = staff.id;

      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staffId, payload.subject_id);
      if (!isAssigned) {
        throw ApiError.forbidden('You are not authorized to configure mark components for this subject');
      }
    } else {
      const staffMembers = await this.staffRepo.findAll();
      staffId = staffMembers[0]?.staff_id;
      if (!staffId) throw ApiError.badRequest('No staff registered');
    }

    const created = await this.marksRepo.createComponent({
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      description: payload.description ? payload.description.trim() : null,
      department_id: payload.department_id || sub.department_id,
      subject_id: payload.subject_id,
      class_id: classId,
      academic_year: payload.academic_year || cls.academic_year || '2025-2026',
      semester: payload.semester || cls.semester || sub.semester || 5,
      max_marks: payload.max_marks,
      weightage: payload.weightage || null,
      component_type: payload.component_type,
      created_by: staffId,
    });

    telemetryService.emit({
      eventType: 'MARK_COMPONENT_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'MARK_COMPONENT',
      resourceId: created.id,
      metadata: {
        code: created.code,
        name: created.name,
        subject_id: created.subject_id,
        max_marks: created.max_marks,
      },
    });

    return created;
  }

  public async updateComponent(
    id: string,
    payload: Partial<{
      name: string;
      code: string;
      description: string | null;
      max_marks: number;
      weightage: number | null;
      component_type: ComponentType;
    }>,
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or administrator authorization required');
    }

    const component = await this.marksRepo.findComponentById(id);
    if (!component) throw ApiError.notFound('Mark component not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, component.subject_id);
      if (component.created_by !== staff.id && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to modify this component');
      }
    }

    if (payload.max_marks !== undefined && payload.max_marks <= 0) {
      throw ApiError.badRequest('Max marks must be greater than 0');
    }

    const updated = await this.marksRepo.updateComponent(id, payload);

    telemetryService.emit({
      eventType: 'MARK_COMPONENT_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'MARK_COMPONENT',
      resourceId: id,
      metadata: payload,
    });

    return updated;
  }

  public async deleteComponent(id: string, req: AuthenticatedRequest): Promise<void> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or administrator authorization required');
    }

    const component = await this.marksRepo.findComponentById(id);
    if (!component) throw ApiError.notFound('Mark component not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, component.subject_id);
      if (component.created_by !== staff.id && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to delete this component');
      }
    }

    // Check if published marks exist
    const marks = await this.marksRepo.findMarksByComponent(id);
    const hasPublished = marks.some(m => m.status === 'PUBLISHED');
    if (hasPublished) {
      throw ApiError.badRequest('Cannot delete component with published student marks');
    }

    await this.marksRepo.deleteComponent(id);

    telemetryService.emit({
      eventType: 'MARK_COMPONENT_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'MARK_COMPONENT',
      resourceId: id,
    });
  }

  public async getComponents(
    req: AuthenticatedRequest,
    filters: { subjectId?: string; classId?: string; academicYear?: string; semester?: number; componentType?: string; departmentId?: string } = {}
  ): Promise<MarkComponentWithDetails[]> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    if (req.user.role === 'ADMIN') {
      return this.marksRepo.findAllComponents(filters);
    } else if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.notFound('Staff profile not found');
      return this.marksRepo.findComponentsForStaff(staff.id, filters);
    } else {
      // Student - view components for their class
      const student = await this.marksRepo.findStudentByUserId(req.user.id);
      if (!student || !student.class_id) throw ApiError.notFound('Student class enrollment not found');
      return this.marksRepo.findAllComponents({ ...filters, classId: student.class_id });
    }
  }

  public async getComponentStudents(componentId: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or administrator authorization required');
    }

    const component = await this.marksRepo.findComponentById(componentId);
    if (!component) throw ApiError.notFound('Mark component not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, component.subject_id);
      if (component.created_by !== staff.id && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to view students for this component');
      }
    }

    const students = await this.marksRepo.findStudentsByClassId(component.class_id);
    const existingMarks = await this.marksRepo.findMarksByComponent(componentId);
    const markMap = new Map<string, any>(existingMarks.map(m => [m.student_id, m]));

    const rows = students.map(s => {
      const mark = markMap.get(s.id);
      return {
        student_id: s.id,
        student_roll_number: s.student_roll_number,
        enrollment_number: s.enrollment_number,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        mark_id: mark?.id || null,
        marks_obtained: mark?.marks_obtained !== undefined ? mark.marks_obtained : null,
        status: mark?.status || 'NOT_ENTERED',
        remarks: mark?.remarks || null,
        published_at: mark?.published_at || null,
      };
    });

    return {
      component,
      students: rows,
    };
  }

  // ─── Mark Entry & Publishing ─────────────────────────────────

  public async enterMarks(
    payload: {
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
    },
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can enter marks');
    }

    const component = await this.marksRepo.findComponentById(payload.component_id);
    if (!component) throw ApiError.notFound('Mark component not found');

    let staffId: string;
    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      staffId = staff.id;

      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staffId, component.subject_id);
      if (component.created_by !== staff.id && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to enter marks for this subject');
      }
    } else {
      const staffMembers = await this.staffRepo.findAll();
      staffId = staffMembers[0]?.staff_id;
      if (!staffId) throw ApiError.badRequest('No staff registered');
    }

    const entriesToProcess = payload.entries || (payload.student_id !== undefined && payload.marks_obtained !== undefined ? [
      {
        student_id: payload.student_id,
        marks_obtained: payload.marks_obtained,
        remarks: payload.remarks,
        status: payload.status || 'DRAFT',
      }
    ] : []);

    if (entriesToProcess.length === 0) {
      throw ApiError.badRequest('No mark entries provided');
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];

      for (const entry of entriesToProcess) {
        if (entry.marks_obtained < 0) {
          throw ApiError.badRequest('Marks obtained cannot be negative');
        }
        if (entry.marks_obtained > component.max_marks) {
          throw ApiError.badRequest(`Marks obtained (${entry.marks_obtained}) exceeds component max marks (${component.max_marks})`);
        }

        const student = await this.marksRepo.findStudentById(entry.student_id);
        if (!student) {
          throw ApiError.notFound(`Student ${entry.student_id} not found`);
        }
        if (student.class_id !== component.class_id) {
          throw ApiError.badRequest(`Student does not belong to component class`);
        }

        const saved = await this.marksRepo.upsertStudentMark({
          student_id: entry.student_id,
          component_id: component.id,
          marks_obtained: entry.marks_obtained,
          status: entry.status || 'DRAFT',
          remarks: entry.remarks || null,
          entered_by: staffId,
          published_at: entry.status === 'PUBLISHED' ? new Date() : null,
        }, client);

        results.push(saved);
      }

      await client.query('COMMIT');

      telemetryService.emit({
        eventType: 'MARK_CREATE',
        result: 'SUCCESS',
        req,
        userId: req.user.id,
        userRole: req.user.role,
        resourceType: 'MARK',
        metadata: {
          component_id: component.id,
          count: results.length,
        },
      });

      return payload.entries ? results : results[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateMark(
    id: string,
    payload: { marks_obtained?: number; remarks?: string | null; status?: MarkStatus },
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can update marks');
    }

    const mark = await this.marksRepo.findMarkById(id);
    if (!mark) throw ApiError.notFound('Student mark record not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, mark.subject_id!);
      if (mark.entered_by !== staff.id && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to modify this mark record');
      }
    }

    if (payload.marks_obtained !== undefined) {
      if (payload.marks_obtained < 0) {
        throw ApiError.badRequest('Marks obtained cannot be negative');
      }
      if (mark.max_marks !== undefined && payload.marks_obtained > mark.max_marks) {
        throw ApiError.badRequest(`Marks obtained cannot exceed max marks (${mark.max_marks})`);
      }
    }

    const updated = await this.marksRepo.updateMark(id, payload);

    telemetryService.emit({
      eventType: 'MARK_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'MARK',
      resourceId: id,
      metadata: payload,
    });

    return updated;
  }

  public async publishMark(id: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can publish marks');
    }

    const mark = await this.marksRepo.findMarkById(id);
    if (!mark) throw ApiError.notFound('Student mark record not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, mark.subject_id!);
      if (mark.entered_by !== staff.id && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to publish this mark record');
      }
    }

    const published = await this.marksRepo.publishMark(id);

    telemetryService.emit({
      eventType: 'MARK_PUBLISH',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'MARK',
      resourceId: id,
    });

    return published;
  }

  public async getStudentMarks(req: AuthenticatedRequest, subjectId?: string): Promise<StudentMarkWithDetails[]> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Student access only');
    }

    const student = await this.marksRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const marks = await this.marksRepo.findMarksForStudent(student.id, true, subjectId);

    telemetryService.emit({
      eventType: 'MARK_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'MARK',
      metadata: { count: marks.length, subjectId },
    });

    return marks;
  }

  public async getMarksForStudentByStaff(studentId: string, req: AuthenticatedRequest): Promise<StudentMarkWithDetails[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const student = await this.marksRepo.findStudentById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    return this.marksRepo.findMarksForStudent(studentId, false);
  }

  // ─── Subject Result Calculation & Publishing ────────────────

  public async calculateSubjectResult(
    studentId: string,
    subjectId: string,
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can calculate subject results');
    }

    const student = await this.marksRepo.findStudentById(studentId);
    if (!student || !student.class_id) {
      throw ApiError.notFound('Student or student class enrollment not found');
    }

    const sub = await this.subjectRepo.findById(subjectId);
    if (!sub) throw ApiError.notFound('Subject not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, subjectId);
      if (!isAssigned) {
        throw ApiError.forbidden('You are not authorized to calculate results for this subject');
      }
    }

    const components = await this.marksRepo.findComponentsBySubjectAndClass(
      subjectId,
      student.class_id,
      student.academic_year,
      student.semester
    );

    if (components.length === 0) {
      throw ApiError.badRequest('No mark components configured for this subject and class');
    }

    // Load manual marks entered for this student
    const existingMarks = await this.marksRepo.findMarksForStudent(studentId, false, subjectId);
    const manualMarkMap = new Map<string, StudentMarkWithDetails>(
      existingMarks.map(m => [m.component_id, m])
    );

    // Load assignments & submissions if needed
    const assignmentMarks = await this.marksRepo.findAssignmentMarksForStudent(studentId, subjectId);
    // Load quiz attempts if needed
    const quizScores = await this.marksRepo.findQuizScoreForStudent(studentId, subjectId);

    let totalObtained = 0;
    let totalMax = 0;
    const componentBreakdowns: Array<{
      component_id: string;
      name: string;
      code: string;
      component_type: ComponentType;
      max_marks: number;
      marks_obtained: number;
      source: string;
      status: string;
    }> = [];

    for (const comp of components) {
      totalMax += comp.max_marks;
      let obtained = 0;
      let source = 'MANUAL';
      let status = 'DRAFT';

      const manualMark = manualMarkMap.get(comp.id);
      if (manualMark) {
        obtained = manualMark.marks_obtained;
        status = manualMark.status;
        source = 'MANUAL_ENTRY';
      } else if (comp.component_type === 'ASSIGNMENT' && assignmentMarks.length > 0) {
        // Look for matching assignment by name or code, else average / first assignment
        const matched = assignmentMarks.find(a => 
          a.title?.toLowerCase().includes(comp.name.toLowerCase()) || 
          comp.name.toLowerCase().includes('assignment')
        ) || assignmentMarks[0];
        if (matched && matched.marks_obtained !== null && matched.marks_obtained !== undefined) {
          obtained = Math.min(matched.marks_obtained, comp.max_marks);
          source = 'ASSIGNMENT_SUBMISSION';
          status = 'PUBLISHED';
        }
      } else if (comp.component_type === 'QUIZ' && quizScores.length > 0) {
        const matchedQuiz = quizScores.find(q =>
          q.title?.toLowerCase().includes(comp.name.toLowerCase()) ||
          comp.name.toLowerCase().includes('quiz')
        ) || quizScores[0];
        if (matchedQuiz && matchedQuiz.score !== null && matchedQuiz.score !== undefined) {
          obtained = Math.min(matchedQuiz.score, comp.max_marks);
          source = 'QUIZ_ATTEMPT';
          status = 'PUBLISHED';
        }
      }

      totalObtained += obtained;
      componentBreakdowns.push({
        component_id: comp.id,
        name: comp.name,
        code: comp.code,
        component_type: comp.component_type,
        max_marks: comp.max_marks,
        marks_obtained: obtained,
        source,
        status,
      });
    }

    const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const { grade, grade_point, is_passed } = calculateGrade(percentage);

    // Save/update student_subject_results in DRAFT status
    const resultRecord = await this.marksRepo.upsertSubjectResult({
      student_id: studentId,
      subject_id: subjectId,
      class_id: student.class_id,
      academic_year: student.academic_year || '2025-2026',
      semester: student.semester || 5,
      total_marks: totalObtained,
      max_marks: totalMax,
      percentage,
      grade,
      grade_point,
      result_status: 'DRAFT',
    });

    telemetryService.emit({
      eventType: 'RESULT_CALCULATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'RESULT',
      resourceId: resultRecord.id,
      metadata: {
        student_id: studentId,
        subject_id: subjectId,
        total_marks: totalObtained,
        max_marks: totalMax,
        percentage,
        grade,
      },
    });

    return {
      result: resultRecord,
      components: componentBreakdowns,
      is_passed,
    };
  }

  public async publishSubjectResult(
    studentId: string,
    subjectId: string,
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can publish results');
    }

    const student = await this.marksRepo.findStudentById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.marksRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Staff profile not found');
      const isAssigned = await this.marksRepo.isStaffAssignedToSubject(staff.id, subjectId);
      if (!isAssigned) {
        throw ApiError.forbidden('You are not authorized to publish results for this subject');
      }
    }

    const existingResult = await this.marksRepo.findSubjectResult(
      studentId,
      subjectId,
      student.academic_year || '2025-2026',
      student.semester || 5
    );

    if (!existingResult) {
      throw ApiError.badRequest('No calculated result found for this student and subject. Please calculate result first.');
    }

    const published = await this.marksRepo.upsertSubjectResult({
      student_id: studentId,
      subject_id: subjectId,
      class_id: existingResult.class_id,
      academic_year: existingResult.academic_year,
      semester: existingResult.semester,
      total_marks: existingResult.total_marks,
      max_marks: existingResult.max_marks,
      percentage: existingResult.percentage,
      grade: existingResult.grade,
      grade_point: existingResult.grade_point,
      result_status: 'PUBLISHED',
      published_at: new Date(),
    });

    telemetryService.emit({
      eventType: 'RESULT_PUBLISH',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'RESULT',
      resourceId: published.id,
      metadata: {
        student_id: studentId,
        subject_id: subjectId,
        grade: published.grade,
      },
    });

    return published;
  }

  public async getStudentResults(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Student access only');
    }

    const student = await this.marksRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const results = await this.marksRepo.findSubjectResultsForStudent(student.id, true);

    let totalObtained = 0;
    let totalMax = 0;
    let totalGradePoints = 0;
    let subjectsCount = results.length;

    for (const r of results) {
      totalObtained += r.total_marks;
      totalMax += r.max_marks;
      totalGradePoints += r.grade_point || 0;
    }

    const overallPercentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    const gpa = subjectsCount > 0 ? parseFloat((totalGradePoints / subjectsCount).toFixed(2)) : 0;
    const { grade: overallGrade, is_passed: overallPassed } = calculateGrade(overallPercentage);

    telemetryService.emit({
      eventType: 'RESULT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'RESULT',
      metadata: {
        results_count: results.length,
        overallPercentage,
        overallGrade,
      },
    });

    return {
      academic_year: student.academic_year || '2025-2026',
      semester: student.semester || 5,
      overall: {
        total_marks: totalObtained,
        max_marks: totalMax,
        percentage: overallPercentage,
        grade: overallGrade,
        gpa,
        is_passed: overallPassed,
      },
      subjects: results,
    };
  }

  public async getStudentSubjectResultDetails(subjectId: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Student access only');
    }

    const student = await this.marksRepo.findStudentByUserId(req.user.id);
    if (!student || !student.class_id) throw ApiError.notFound('Student profile not found');

    const sub = await this.subjectRepo.findById(subjectId);
    if (!sub) throw ApiError.notFound('Subject not found');

    const result = await this.marksRepo.findSubjectResult(
      student.id,
      subjectId,
      student.academic_year || '2025-2026',
      student.semester || 5
    );

    if (!result || result.result_status !== 'PUBLISHED') {
      throw ApiError.notFound('Published result not available for this course subject');
    }

    const components = await this.marksRepo.findComponentsBySubjectAndClass(
      subjectId,
      student.class_id,
      student.academic_year,
      student.semester
    );

    const publishedMarks = await this.marksRepo.findMarksForStudent(student.id, true, subjectId);
    const markMap = new Map<string, any>(publishedMarks.map(m => [m.component_id, m]));

    const componentBreakdown = components.map(c => {
      const m = markMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        component_type: c.component_type,
        max_marks: c.max_marks,
        weightage: c.weightage,
        marks_obtained: m?.marks_obtained !== undefined ? m.marks_obtained : null,
        remarks: m?.remarks || null,
        status: m?.status || 'PENDING',
      };
    });

    return {
      subject: {
        id: sub.id,
        name: sub.name,
        code: sub.code,
      },
      result,
      components: componentBreakdown,
    };
  }

  public async getClassResults(
    classId: string,
    req: AuthenticatedRequest,
    filters: { subjectId?: string; academicYear?: string; semester?: number; resultStatus?: string } = {}
  ): Promise<StudentSubjectResultWithDetails[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or administrator authorization required');
    }

    return this.marksRepo.findSubjectResultsByClass(classId, filters);
  }

  public async getResultsForStudentByStaff(studentId: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or administrator authorization required');
    }

    const student = await this.marksRepo.findStudentById(studentId);
    if (!student) throw ApiError.notFound('Student not found');

    const results = await this.marksRepo.findSubjectResultsForStudent(studentId, false);
    return {
      student,
      results,
    };
  }

  public async getAllResults(
    req: AuthenticatedRequest,
    filters: { departmentId?: string; classId?: string; subjectId?: string; academicYear?: string; semester?: number; grade?: string; resultStatus?: string; limit?: number; offset?: number } = {}
  ): Promise<{ rows: StudentSubjectResultWithDetails[]; total: number }> {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Administrator access required');
    }
    return this.marksRepo.findAllResults(filters);
  }

  public async getMarksStats(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }
    return this.marksRepo.getMarksStats();
  }

  public async getResultsStats(req: AuthenticatedRequest): Promise<any> {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'STAFF')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }
    return this.marksRepo.getResultsStats();
  }
}
