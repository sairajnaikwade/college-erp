import {
  QuizRepository,
  QuizRow,
  QuizWithDetails,
  StudentQuizWithAttempt,
  QuizQuestionRow,
  QuizOptionRow,
  QuizAttemptRow,
  QuizAnalytics,
  QuizFilterOptions,
  QuizStatus,
  QuestionType,
} from '../repositories/quiz.repository';
import { SubjectRepository } from '../repositories/subject.repository';
import { ClassRepository } from '../repositories/class.repository';
import { StaffRepository } from '../repositories/staff.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { telemetryService } from './telemetry.service';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest } from '../types/common';
import { getPool } from '../config/database';

export class QuizService {
  private quizRepo: QuizRepository;
  private subjectRepo: SubjectRepository;
  private classRepo: ClassRepository;
  private staffRepo: StaffRepository;
  private departmentRepo: DepartmentRepository;

  constructor() {
    this.quizRepo = new QuizRepository();
    this.subjectRepo = new SubjectRepository();
    this.classRepo = new ClassRepository();
    this.staffRepo = new StaffRepository();
    this.departmentRepo = new DepartmentRepository();
  }

  // ─── Student Operations ─────────────────────────────────────

  /**
   * Retrieves available quizzes for the logged-in student's enrolled class.
   */
  public async getStudentQuizzes(
    req: AuthenticatedRequest,
    filters: { subjectId?: string; status?: string; academicYear?: string; semester?: any; search?: string } = {}
  ): Promise<StudentQuizWithAttempt[]> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access student quiz views');
    }

    const student = await this.quizRepo.findStudentByUserId(req.user.id);
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }

    const rows = await this.quizRepo.findForStudent(student.id, {
      subjectId: filters.subjectId,
      status: filters.status,
      academicYear: filters.academicYear,
      semester: filters.semester ? parseInt(filters.semester.toString(), 10) : undefined,
      search: filters.search,
    });

    telemetryService.emit({
      eventType: 'QUIZ_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      metadata: {
        student_id: student.id,
        count: rows.length,
      },
    });

    return rows;
  }

  /**
   * View single quiz info for student before starting. (No questions/answers leaked).
   */
  public async getStudentQuizById(quizId: string, req: AuthenticatedRequest): Promise<QuizWithDetails> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can access this endpoint');
    }

    const student = await this.quizRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (quiz.status !== 'PUBLISHED' && quiz.status !== 'CLOSED') {
      throw ApiError.forbidden('Quiz is not currently available');
    }

    const isEnrolled = await this.quizRepo.isStudentEnrolledInClass(student.id, quiz.class_id);
    if (!isEnrolled) {
      throw ApiError.forbidden('You are not enrolled in the class for this quiz');
    }

    return quiz;
  }

  /**
   * Start a quiz attempt. Returns questions without correct answers.
   */
  public async startQuiz(quizId: string, req: AuthenticatedRequest): Promise<{
    attempt_id: string;
    quiz_id: string;
    started_at: string;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    questions: any[];
  }> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can attempt quizzes');
    }

    const student = await this.quizRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (quiz.status !== 'PUBLISHED') {
      throw ApiError.badRequest('Quiz is not open for attempts');
    }

    const isEnrolled = await this.quizRepo.isStudentEnrolledInClass(student.id, quiz.class_id);
    if (!isEnrolled) {
      throw ApiError.forbidden('You are not enrolled in the class for this quiz');
    }

    // Check availability window
    const now = new Date();
    if (quiz.start_at && now < new Date(quiz.start_at)) {
      throw ApiError.badRequest('Quiz has not started yet');
    }
    if (quiz.end_at && now > new Date(quiz.end_at)) {
      throw ApiError.badRequest('Quiz submission deadline has passed');
    }

    // Check for existing active attempt
    let attempt = await this.quizRepo.findActiveAttempt(quiz.id, student.id);
    if (!attempt) {
      // Check if student already submitted an attempt
      const attempts = await this.quizRepo.findStudentAttempts(student.id);
      const pastAttempt = attempts.find(a => a.quiz_id === quiz.id);
      if (pastAttempt) {
        throw ApiError.badRequest('You have already completed this quiz');
      }

      attempt = await this.quizRepo.createAttempt(quiz.id, student.id);
    }

    // Fetch questions without correct answers
    const questions = await this.quizRepo.findQuestionsByQuizId(quiz.id, false);

    telemetryService.emit({
      eventType: 'QUIZ_START',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTEMPT',
      resourceId: attempt.id,
      metadata: {
        quiz_id: quiz.id,
        duration_minutes: quiz.duration_minutes,
        question_count: questions.length,
      },
    });

    return {
      attempt_id: attempt.id,
      quiz_id: quiz.id,
      started_at: new Date(attempt.started_at).toISOString(),
      duration_minutes: quiz.duration_minutes,
      total_marks: quiz.total_marks,
      passing_marks: quiz.passing_marks,
      questions,
    };
  }

  /**
   * Get student's own active attempt data.
   */
  public async getAttempt(attemptId: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const attempt = await this.quizRepo.findAttemptById(attemptId);
    if (!attempt) throw ApiError.notFound('Quiz attempt not found');

    const quiz = await this.quizRepo.findById(attempt.quiz_id);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    // IDOR Protection: student can only access own attempt; staff/admin can view if authorized
    if (req.user.role === 'STUDENT') {
      const student = await this.quizRepo.findStudentByUserId(req.user.id);
      if (!student || student.id !== attempt.student_id) {
        throw ApiError.forbidden('Access denied to this quiz attempt');
      }

      // Check timer expiration on the server
      if (attempt.status === 'IN_PROGRESS') {
        const elapsedMinutes = (Date.now() - new Date(attempt.started_at).getTime()) / (1000 * 60);
        const deadlineExpired = quiz.end_at && Date.now() > new Date(quiz.end_at).getTime();

        if (elapsedMinutes > quiz.duration_minutes || deadlineExpired) {
          // Auto finalize attempt
          await this.evaluateAndFinalizeAttempt(attempt.id, quiz, 'TIMED_OUT');
          attempt.status = 'TIMED_OUT';
        }
      }

      const questions = await this.quizRepo.findQuestionsByQuizId(quiz.id, false);
      const answers = await this.quizRepo.findAnswersByAttemptId(attempt.id);

      return {
        attempt,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          duration_minutes: quiz.duration_minutes,
          total_marks: quiz.total_marks,
          passing_marks: quiz.passing_marks,
          subject_name: quiz.subject_name,
          subject_code: quiz.subject_code,
        },
        questions,
        answers,
      };
    }

    // Staff / Admin view
    const answers = await this.quizRepo.findAnswersByAttemptId(attempt.id);
    const questions = await this.quizRepo.findQuestionsByQuizId(quiz.id, true);

    return {
      attempt,
      quiz,
      questions,
      answers,
    };
  }

  /**
   * Save or update an answer for an active attempt.
   */
  public async saveAnswer(
    attemptId: string,
    payload: { question_id: string; selected_option_id?: string | null; answer_text?: string | null },
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can record answers');
    }

    const student = await this.quizRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const attempt = await this.quizRepo.findAttemptById(attemptId);
    if (!attempt) throw ApiError.notFound('Quiz attempt not found');

    if (attempt.student_id !== student.id) {
      throw ApiError.forbidden('You do not own this quiz attempt');
    }

    const quiz = await this.quizRepo.findById(attempt.quiz_id);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    // Check timer expiration
    const elapsedMinutes = (Date.now() - new Date(attempt.started_at).getTime()) / (1000 * 60);
    const deadlineExpired = quiz.end_at && Date.now() > new Date(quiz.end_at).getTime();

    if (attempt.status !== 'IN_PROGRESS' || elapsedMinutes > quiz.duration_minutes || deadlineExpired) {
      if (attempt.status === 'IN_PROGRESS') {
        await this.evaluateAndFinalizeAttempt(attempt.id, quiz, 'TIMED_OUT');
      }
      throw ApiError.badRequest('Quiz time limit has expired or attempt is closed');
    }

    // Validate question belongs to quiz
    const question = await this.quizRepo.findQuestionById(payload.question_id);
    if (!question || question.quiz_id !== quiz.id) {
      throw ApiError.badRequest('Question does not belong to this quiz');
    }

    // Validate selected option belongs to question
    if (payload.selected_option_id) {
      const option = await this.quizRepo.findOptionById(payload.selected_option_id);
      if (!option || option.question_id !== question.id) {
        throw ApiError.badRequest('Selected option does not belong to this question');
      }
    }

    const saved = await this.quizRepo.saveAnswer(
      attempt.id,
      payload.question_id,
      payload.selected_option_id,
      payload.answer_text
    );

    telemetryService.emit({
      eventType: 'QUIZ_ANSWER_SUBMIT',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ANSWER',
      resourceId: saved.id,
      metadata: {
        attempt_id: attempt.id,
        question_id: payload.question_id,
      },
    });

    return saved;
  }

  /**
   * Final submission and server-side scoring of a quiz attempt.
   */
  public async submitQuiz(attemptId: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user || req.user.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students can submit quiz attempts');
    }

    const student = await this.quizRepo.findStudentByUserId(req.user.id);
    if (!student) throw ApiError.notFound('Student profile not found');

    const attempt = await this.quizRepo.findAttemptById(attemptId);
    if (!attempt) throw ApiError.notFound('Quiz attempt not found');

    if (attempt.student_id !== student.id) {
      throw ApiError.forbidden('You do not own this quiz attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw ApiError.badRequest(`Attempt has already been finalized with status: ${attempt.status}`);
    }

    const quiz = await this.quizRepo.findById(attempt.quiz_id);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    const elapsedMinutes = (Date.now() - new Date(attempt.started_at).getTime()) / (1000 * 60);
    const deadlineExpired = quiz.end_at && Date.now() > new Date(quiz.end_at).getTime();
    const finalStatus = (elapsedMinutes > quiz.duration_minutes || deadlineExpired) ? 'TIMED_OUT' : 'SUBMITTED';

    const result = await this.evaluateAndFinalizeAttempt(attempt.id, quiz, finalStatus);

    telemetryService.emit({
      eventType: finalStatus === 'TIMED_OUT' ? 'QUIZ_TIMEOUT' : 'QUIZ_SUBMIT',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTEMPT',
      resourceId: attempt.id,
      metadata: {
        quiz_id: quiz.id,
        score: result.score,
        percentage: result.percentage,
        is_passed: result.is_passed,
        status: finalStatus,
      },
    });

    return result;
  }

  /**
   * Internal evaluator that scores answers against correct options in a transaction.
   */
  private async evaluateAndFinalizeAttempt(
    attemptId: string,
    quiz: QuizWithDetails,
    finalStatus: 'SUBMITTED' | 'TIMED_OUT'
  ): Promise<{
    attempt_id: string;
    score: number;
    total_marks: number;
    passing_marks: number;
    percentage: number;
    is_passed: boolean;
    status: string;
    submitted_at: string;
  }> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Load all questions with correct answers
      const questionsQuery = `
        SELECT 
          qq.id, qq.marks::float AS marks, qq.question_type,
          qo.id AS correct_option_id
        FROM quiz_questions qq
        LEFT JOIN quiz_options qo ON qq.id = qo.question_id AND qo.is_correct = TRUE
        WHERE qq.quiz_id = $1;
      `;
      const qRes = await client.query(questionsQuery, [quiz.id]);
      const questions = qRes.rows;

      // Load all student answers
      const aRes = await client.query('SELECT * FROM quiz_answers WHERE attempt_id = $1', [attemptId]);
      const answers = aRes.rows;
      const answerMap = new Map<string, any>(answers.map(a => [a.question_id, a]));

      let totalScore = 0;

      for (const q of questions) {
        const ans = answerMap.get(q.id);
        let isCorrect = false;
        let marksAwarded = 0;

        if (ans && ans.selected_option_id && q.correct_option_id) {
          if (ans.selected_option_id === q.correct_option_id) {
            isCorrect = true;
            marksAwarded = q.marks;
          }
        }

        totalScore += marksAwarded;

        if (ans) {
          await client.query(
            'UPDATE quiz_answers SET is_correct = $1, marks_awarded = $2, updated_at = NOW() WHERE id = $3',
            [isCorrect, marksAwarded, ans.id]
          );
        }
      }

      const totalMarks = quiz.total_marks > 0 ? quiz.total_marks : 1;
      const percentage = parseFloat(((totalScore / totalMarks) * 100).toFixed(2));
      const submittedAt = new Date();

      await client.query(
        `UPDATE quiz_attempts 
         SET status = $1, score = $2, percentage = $3, submitted_at = $4, updated_at = NOW()
         WHERE id = $5`,
        [finalStatus, totalScore, percentage, submittedAt, attemptId]
      );

      await client.query('COMMIT');

      return {
        attempt_id: attemptId,
        score: totalScore,
        total_marks: quiz.total_marks,
        passing_marks: quiz.passing_marks,
        percentage,
        is_passed: totalScore >= quiz.passing_marks,
        status: finalStatus,
        submitted_at: submittedAt.toISOString(),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * View submitted attempt result.
   */
  public async getAttemptResult(attemptId: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const attempt = await this.quizRepo.findAttemptById(attemptId);
    if (!attempt) throw ApiError.notFound('Quiz attempt not found');

    if (attempt.status === 'IN_PROGRESS') {
      throw ApiError.badRequest('Quiz attempt has not been submitted yet');
    }

    const quiz = await this.quizRepo.findById(attempt.quiz_id);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STUDENT') {
      const student = await this.quizRepo.findStudentByUserId(req.user.id);
      if (!student || student.id !== attempt.student_id) {
        throw ApiError.forbidden('Access denied to this quiz result');
      }
    }

    const answers = await this.quizRepo.findAnswersByAttemptId(attempt.id);

    telemetryService.emit({
      eventType: 'QUIZ_RESULT_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'ATTEMPT',
      resourceId: attempt.id,
      metadata: {
        quiz_id: quiz.id,
        score: attempt.score,
        percentage: attempt.percentage,
      },
    });

    return {
      attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        total_marks: quiz.total_marks,
        passing_marks: quiz.passing_marks,
        duration_minutes: quiz.duration_minutes,
        subject_name: quiz.subject_name,
        subject_code: quiz.subject_code,
      },
      answers_count: answers.length,
      correct_answers_count: answers.filter(a => a.is_correct === true).length,
      is_passed: (attempt.score ?? 0) >= quiz.passing_marks,
    };
  }

  // ─── Staff & Admin Operations ───────────────────────────────

  /**
   * Retrieves faculty course quizzes.
   */
  public async getStaffQuizzes(
    req: AuthenticatedRequest,
    filters: QuizFilterOptions = {}
  ): Promise<QuizWithDetails[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    let staffId: string;
    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.notFound('Faculty profile not found');
      staffId = staff.id;
    } else {
      const staffMembers = await this.staffRepo.findAll();
      staffId = staffMembers[0]?.staff_id;
    }

    return this.quizRepo.findForStaff(staffId, filters);
  }

  /**
   * Retrieves all institution quizzes (Admin).
   */
  public async getAllQuizzes(
    req: AuthenticatedRequest,
    filters: QuizFilterOptions = {}
  ): Promise<{ rows: QuizWithDetails[]; total: number }> {
    if (!req.user || req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Administrator access required');
    }
    return this.quizRepo.findAll(filters);
  }

  /**
   * Get single quiz with full questions and correct options (Staff / Admin).
   */
  public async getQuizById(id: string, req: AuthenticatedRequest): Promise<any> {
    if (!req.user) throw ApiError.unauthorized('Authentication required');

    const quiz = await this.quizRepo.findById(id);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');

      const isCreator = quiz.created_by === staff.id;
      const isAssigned = await this.quizRepo.isStaffAssignedToSubject(staff.id, quiz.subject_id);

      if (!isCreator && !isAssigned) {
        throw ApiError.forbidden('You are not authorized to view this course quiz');
      }
    } else if (req.user.role === 'STUDENT') {
      return this.getStudentQuizById(id, req);
    }

    const questions = await this.quizRepo.findQuestionsByQuizId(quiz.id, true);

    telemetryService.emit({
      eventType: 'QUIZ_VIEW',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      resourceId: quiz.id,
      metadata: {
        title: quiz.title,
        status: quiz.status,
      },
    });

    return {
      ...quiz,
      questions,
    };
  }

  /**
   * Create a new draft quiz (Staff / Admin).
   */
  public async createQuiz(
    payload: {
      title: string;
      description?: string | null;
      department_id?: string;
      class_id?: string;
      subject_id: string;
      academic_year?: string;
      semester?: number;
      duration_minutes: number;
      passing_marks?: number;
      start_at?: string | null;
      end_at?: string | null;
    },
    req: AuthenticatedRequest
  ): Promise<QuizRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Only faculty and administrators can create quizzes');
    }

    if (!payload.title || !payload.title.trim()) {
      throw ApiError.badRequest('Quiz title is required');
    }
    if (!payload.subject_id) {
      throw ApiError.badRequest('Course subject ID is required');
    }
    if (!payload.duration_minutes || payload.duration_minutes <= 0) {
      throw ApiError.badRequest('Duration must be greater than 0 minutes');
    }

    const sub = await this.subjectRepo.findById(payload.subject_id);
    if (!sub) throw ApiError.notFound('Course subject not found');

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
    if (!cls) throw ApiError.notFound('Target class batch not found');

    let staffId: string;
    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff) throw ApiError.forbidden('Faculty profile not found');
      staffId = staff.id;

      const isAssigned = await this.quizRepo.isStaffAssignedToSubject(staffId, payload.subject_id);
      if (!isAssigned) {
        throw ApiError.forbidden('You are not authorized to create quizzes for this course subject');
      }
    } else {
      const staffMembers = await this.staffRepo.findAll();
      staffId = staffMembers[0]?.staff_id;
      if (!staffId) throw ApiError.badRequest('No staff members registered in institution');
    }

    if (payload.start_at && payload.end_at) {
      if (new Date(payload.start_at) >= new Date(payload.end_at)) {
        throw ApiError.badRequest('Quiz start time must be before end time');
      }
    }

    const created = await this.quizRepo.create({
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : null,
      department_id: payload.department_id || sub.department_id,
      class_id: classId,
      subject_id: payload.subject_id,
      created_by: staffId,
      academic_year: payload.academic_year || cls.academic_year || '2025-2026',
      semester: payload.semester || cls.semester || sub.semester || 5,
      duration_minutes: payload.duration_minutes,
      passing_marks: payload.passing_marks || 0,
      status: 'DRAFT',
      start_at: payload.start_at || null,
      end_at: payload.end_at || null,
    });

    telemetryService.emit({
      eventType: 'QUIZ_CREATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      resourceId: created.id,
      metadata: {
        title: created.title,
        subject_id: created.subject_id,
        class_id: created.class_id,
      },
    });

    return created;
  }

  /**
   * Update draft quiz metadata.
   */
  public async updateQuiz(
    quizId: string,
    payload: Partial<{
      title: string;
      description: string | null;
      duration_minutes: number;
      passing_marks: number;
      start_at: string | null;
      end_at: string | null;
    }>,
    req: AuthenticatedRequest
  ): Promise<QuizRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff || (quiz.created_by !== staff.id && !(await this.quizRepo.isStaffAssignedToSubject(staff.id, quiz.subject_id)))) {
        throw ApiError.forbidden('You are not authorized to modify this quiz');
      }
    }

    if (payload.start_at && payload.end_at) {
      if (new Date(payload.start_at) >= new Date(payload.end_at)) {
        throw ApiError.badRequest('Quiz start time must be before end time');
      }
    }

    const updated = await this.quizRepo.update(quizId, {
      title: payload.title ? payload.title.trim() : undefined,
      description: payload.description,
      duration_minutes: payload.duration_minutes,
      passing_marks: payload.passing_marks,
      start_at: payload.start_at,
      end_at: payload.end_at,
    });

    if (!updated) throw ApiError.notFound('Quiz update failed');

    telemetryService.emit({
      eventType: 'QUIZ_UPDATE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      resourceId: quiz.id,
      metadata: {
        title: updated.title,
      },
    });

    return updated;
  }

  /**
   * Delete a quiz.
   */
  public async deleteQuiz(quizId: string, req: AuthenticatedRequest): Promise<void> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff || (quiz.created_by !== staff.id && !(await this.quizRepo.isStaffAssignedToSubject(staff.id, quiz.subject_id)))) {
        throw ApiError.forbidden('You are not authorized to delete this quiz');
      }
    }

    await this.quizRepo.delete(quizId);

    telemetryService.emit({
      eventType: 'QUIZ_DELETE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      resourceId: quizId,
      metadata: {
        title: quiz.title,
      },
    });
  }

  /**
   * Publish a quiz (validates questions, correct options, recalculates total marks).
   */
  public async publishQuiz(quizId: string, req: AuthenticatedRequest): Promise<QuizRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff || (quiz.created_by !== staff.id && !(await this.quizRepo.isStaffAssignedToSubject(staff.id, quiz.subject_id)))) {
        throw ApiError.forbidden('You are not authorized to publish this quiz');
      }
    }

    const questions = await this.quizRepo.findQuestionsByQuizId(quiz.id, true);
    if (questions.length === 0) {
      throw ApiError.badRequest('Cannot publish quiz without questions');
    }

    // Validate each question
    for (const q of questions) {
      if (!q.options || q.options.length < 2) {
        throw ApiError.badRequest(`Question #${q.question_order} must have at least 2 options`);
      }
      const correctOptions = q.options.filter((o: any) => o.is_correct === true);
      if (correctOptions.length !== 1) {
        throw ApiError.badRequest(`Question #${q.question_order} must have exactly one correct option set`);
      }
    }

    // Recalculate total marks from questions
    const totalMarks = await this.quizRepo.recalculateTotalMarks(quiz.id);
    if (totalMarks <= 0) {
      throw ApiError.badRequest('Quiz total marks must be greater than 0');
    }

    if (quiz.passing_marks > totalMarks) {
      throw ApiError.badRequest(`Passing marks (${quiz.passing_marks}) cannot exceed total marks (${totalMarks})`);
    }

    const updated = await this.quizRepo.update(quiz.id, {
      status: 'PUBLISHED',
      total_marks: totalMarks,
    });

    if (!updated) throw ApiError.internal('Failed to update quiz status');

    telemetryService.emit({
      eventType: 'QUIZ_PUBLISH',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      resourceId: quiz.id,
      metadata: {
        title: updated.title,
        total_marks: totalMarks,
        question_count: questions.length,
      },
    });

    return updated;
  }

  /**
   * Close a quiz.
   */
  public async closeQuiz(quizId: string, req: AuthenticatedRequest): Promise<QuizRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff || (quiz.created_by !== staff.id && !(await this.quizRepo.isStaffAssignedToSubject(staff.id, quiz.subject_id)))) {
        throw ApiError.forbidden('You are not authorized to close this quiz');
      }
    }

    const updated = await this.quizRepo.update(quiz.id, { status: 'CLOSED' });
    if (!updated) throw ApiError.internal('Failed to close quiz');

    telemetryService.emit({
      eventType: 'QUIZ_CLOSE',
      result: 'SUCCESS',
      req,
      userId: req.user.id,
      userRole: req.user.role,
      resourceType: 'QUIZ',
      resourceId: quiz.id,
      metadata: {
        title: updated.title,
      },
    });

    return updated;
  }

  // ─── Question & Option CRUD (Faculty / Admin) ───────────────

  /**
   * Add question with options to a quiz (atomic transaction).
   */
  public async addQuestion(
    quizId: string,
    payload: {
      question_text: string;
      question_type: QuestionType;
      marks: number;
      question_order?: number;
      explanation?: string | null;
      options: Array<{ option_text: string; option_order?: number; is_correct?: boolean }>;
    },
    req: AuthenticatedRequest
  ): Promise<any> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    if (req.user.role === 'STAFF') {
      const staff = await this.quizRepo.findStaffByUserId(req.user.id);
      if (!staff || (quiz.created_by !== staff.id && !(await this.quizRepo.isStaffAssignedToSubject(staff.id, quiz.subject_id)))) {
        throw ApiError.forbidden('You are not authorized to add questions to this quiz');
      }
    }

    if (!payload.question_text || !payload.question_text.trim()) {
      throw ApiError.badRequest('Question text is required');
    }
    if (!payload.marks || payload.marks <= 0) {
      throw ApiError.badRequest('Question marks must be greater than 0');
    }
    if (!payload.options || payload.options.length < 2) {
      throw ApiError.badRequest('Question must have at least 2 options');
    }

    const correctCount = payload.options.filter(o => o.is_correct === true).length;
    if (correctCount !== 1) {
      throw ApiError.badRequest('Question must have exactly one correct option');
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Resolve question order
      let order = payload.question_order;
      if (order === undefined || order === null) {
        const orderRes = await client.query('SELECT COALESCE(MAX(question_order), 0) + 1 AS next_order FROM quiz_questions WHERE quiz_id = $1', [quiz.id]);
        order = orderRes.rows[0]?.next_order || 1;
      }

      const q = await this.quizRepo.createQuestion({
        quiz_id: quiz.id,
        question_text: payload.question_text.trim(),
        question_type: payload.question_type || 'MCQ',
        marks: payload.marks,
        question_order: order ?? 1,
        explanation: payload.explanation,
      }, client);

      const createdOptions: QuizOptionRow[] = [];
      for (let i = 0; i < payload.options.length; i++) {
        const opt = payload.options[i];
        const optRow = await this.quizRepo.createOption({
          question_id: q.id,
          option_text: opt.option_text.trim(),
          option_order: opt.option_order || (i + 1),
          is_correct: opt.is_correct || false,
        }, client);
        createdOptions.push(optRow);
      }

      await this.quizRepo.recalculateTotalMarks(quiz.id, client);

      await client.query('COMMIT');

      return {
        ...q,
        options: createdOptions,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update question text, marks, explanation.
   */
  public async updateQuestion(
    questionId: string,
    payload: Partial<{
      question_text: string;
      question_type: QuestionType;
      marks: number;
      question_order: number;
      explanation: string | null;
    }>,
    req: AuthenticatedRequest
  ): Promise<QuizQuestionRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const question = await this.quizRepo.findQuestionById(questionId);
    if (!question) throw ApiError.notFound('Question not found');

    const updated = await this.quizRepo.updateQuestion(questionId, payload);
    if (!updated) throw ApiError.notFound('Question update failed');

    if (payload.marks !== undefined) {
      await this.quizRepo.recalculateTotalMarks(question.quiz_id);
    }

    return updated;
  }

  /**
   * Delete question.
   */
  public async deleteQuestion(questionId: string, req: AuthenticatedRequest): Promise<void> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const question = await this.quizRepo.findQuestionById(questionId);
    if (!question) throw ApiError.notFound('Question not found');

    await this.quizRepo.deleteQuestion(questionId);
    await this.quizRepo.recalculateTotalMarks(question.quiz_id);
  }

  /**
   * Add option to question.
   */
  public async addOption(
    questionId: string,
    payload: { option_text: string; option_order?: number; is_correct?: boolean },
    req: AuthenticatedRequest
  ): Promise<QuizOptionRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const question = await this.quizRepo.findQuestionById(questionId);
    if (!question) throw ApiError.notFound('Question not found');

    const pool = getPool();
    let order = payload.option_order;
    if (order === undefined || order === null) {
      const orderRes = await pool.query('SELECT COALESCE(MAX(option_order), 0) + 1 AS next_order FROM quiz_options WHERE question_id = $1', [questionId]);
      order = orderRes.rows[0]?.next_order || 1;
    }

    return this.quizRepo.createOption({
      question_id: questionId,
      option_text: payload.option_text.trim(),
      option_order: order ?? 1,
      is_correct: payload.is_correct || false,
    });
  }

  /**
   * Update option.
   */
  public async updateOption(
    optionId: string,
    payload: Partial<{ option_text: string; option_order: number; is_correct: boolean }>,
    req: AuthenticatedRequest
  ): Promise<QuizOptionRow> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const option = await this.quizRepo.findOptionById(optionId);
    if (!option) throw ApiError.notFound('Option not found');

    const updated = await this.quizRepo.updateOption(optionId, payload);
    if (!updated) throw ApiError.notFound('Option update failed');

    return updated;
  }

  /**
   * Delete option.
   */
  public async deleteOption(optionId: string, req: AuthenticatedRequest): Promise<void> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const option = await this.quizRepo.findOptionById(optionId);
    if (!option) throw ApiError.notFound('Option not found');

    await this.quizRepo.deleteOption(optionId);
  }

  // ─── Faculty Analytics & Global Stats ───────────────────────

  /**
   * Retrieve all attempts for a quiz.
   */
  public async getQuizAttempts(quizId: string, req: AuthenticatedRequest): Promise<any[]> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    return this.quizRepo.findAttemptsByQuizId(quizId);
  }

  /**
   * Retrieve aggregate performance analytics for a quiz.
   */
  public async getQuizAnalytics(quizId: string, req: AuthenticatedRequest): Promise<{ quiz: QuizWithDetails; analytics: QuizAnalytics; attempts: any[] }> {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      throw ApiError.forbidden('Faculty or admin authorization required');
    }

    const quiz = await this.quizRepo.findById(quizId);
    if (!quiz) throw ApiError.notFound('Quiz not found');

    const analytics = await this.quizRepo.getAnalytics(quizId);
    const attempts = await this.quizRepo.findAttemptsByQuizId(quizId);

    return {
      quiz,
      analytics,
      attempts,
    };
  }

  /**
   * Retrieve overall quiz statistics for admin dashboard.
   */
  public async getStats(req: AuthenticatedRequest): Promise<{
    total: number;
    published: number;
    draft: number;
    closed: number;
    total_attempts: number;
  }> {
    return this.quizRepo.getStats();
  }
}
