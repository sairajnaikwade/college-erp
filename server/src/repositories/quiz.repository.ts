import { getPool } from '../config/database';
import { PoolClient } from 'pg';

export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT' | 'GRADED';

export interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  class_id: string;
  subject_id: string;
  created_by: string;
  academic_year: string;
  semester: number;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  status: QuizStatus;
  start_at: string | null;
  end_at: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuizWithDetails extends QuizRow {
  department_name?: string;
  department_code?: string;
  class_name?: string;
  division?: string;
  subject_name?: string;
  subject_code?: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  faculty_employee_id?: string;
  total_questions?: number;
  total_attempts?: number;
}

export interface StudentQuizWithAttempt extends QuizWithDetails {
  attempt_id?: string | null;
  attempt_status?: AttemptStatus | null;
  started_at?: string | null;
  submitted_at?: string | null;
  score?: number | null;
  percentage?: number | null;
}

export interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  question_order: number;
  explanation: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuizOptionRow {
  id: string;
  question_id: string;
  option_text: string;
  option_order: number;
  is_correct: boolean;
  created_at: Date;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: Date | string;
  submitted_at: Date | string | null;
  status: AttemptStatus;
  score: number | null;
  percentage: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuizAnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  answer_text: string | null;
  is_correct: boolean | null;
  marks_awarded: number | null;
  answered_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface QuizAnalytics {
  total_students: number;
  started_count: number;
  submitted_count: number;
  timed_out_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_count: number;
  fail_count: number;
  completion_percentage: number;
}

export interface QuizFilterOptions {
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  createdBy?: string;
  category?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export class QuizRepository {
  // ─── Quiz Listing & Detail Queries ─────────────────────────

  /**
   * Find quizzes available to a student (enrolled class + published/closed + attempt status).
   */
  public async findForStudent(
    studentId: string,
    filters: { subjectId?: string; status?: string; academicYear?: string; semester?: number; search?: string } = {}
  ): Promise<StudentQuizWithAttempt[]> {
    const pool = getPool();
    const conditions: string[] = ['sc.student_id = $1', "q.status IN ('PUBLISHED', 'CLOSED')"];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`q.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.status) {
      conditions.push(`q.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }
    if (filters.academicYear) {
      conditions.push(`q.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`q.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.search) {
      conditions.push(`(q.title ILIKE $${paramIdx} OR q.description ILIKE $${paramIdx} OR sub.name ILIKE $${paramIdx} OR sub.code ILIKE $${paramIdx})`);
      values.push(`%${filters.search}%`);
      paramIdx++;
    }

    const query = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.department_id,
        q.class_id,
        q.subject_id,
        q.created_by,
        q.academic_year,
        q.semester,
        q.duration_minutes,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        q.status,
        TO_CHAR(q.start_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_at,
        TO_CHAR(q.end_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_at,
        q.created_at,
        q.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        (SELECT COUNT(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
        qa.id AS attempt_id,
        qa.status AS attempt_status,
        TO_CHAR(qa.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
        TO_CHAR(qa.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        qa.score::float AS score,
        qa.percentage::float AS percentage
      FROM quizzes q
      JOIN student_classes sc ON q.class_id = sc.class_id
      JOIN departments dept ON q.department_id = dept.id
      JOIN classes c ON q.class_id = c.id
      JOIN subjects sub ON q.subject_id = sub.id
      JOIN staff stf ON q.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      LEFT JOIN LATERAL (
        SELECT id, status, started_at, submitted_at, score, percentage
        FROM quiz_attempts
        WHERE quiz_id = q.id AND student_id = sc.student_id
        ORDER BY created_at DESC
        LIMIT 1
      ) qa ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY q.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find quizzes for staff member or assigned courses.
   */
  public async findForStaff(
    staffId: string,
    filters: QuizFilterOptions = {}
  ): Promise<QuizWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [
      `(q.created_by = $1 OR q.subject_id IN (SELECT subject_id FROM staff_subjects WHERE staff_id = $1))`
    ];
    const values: unknown[] = [staffId];
    let paramIdx = 2;

    if (filters.classId) {
      conditions.push(`q.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.subjectId) {
      conditions.push(`q.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.status) {
      conditions.push(`q.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }
    if (filters.academicYear) {
      conditions.push(`q.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`q.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.search) {
      conditions.push(`(q.title ILIKE $${paramIdx} OR q.description ILIKE $${paramIdx} OR sub.name ILIKE $${paramIdx} OR sub.code ILIKE $${paramIdx})`);
      values.push(`%${filters.search}%`);
      paramIdx++;
    }

    const query = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.department_id,
        q.class_id,
        q.subject_id,
        q.created_by,
        q.academic_year,
        q.semester,
        q.duration_minutes,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        q.status,
        TO_CHAR(q.start_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_at,
        TO_CHAR(q.end_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_at,
        q.created_at,
        q.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        (SELECT COUNT(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
        (SELECT COUNT(*)::int FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS total_attempts
      FROM quizzes q
      JOIN departments dept ON q.department_id = dept.id
      JOIN classes c ON q.class_id = c.id
      JOIN subjects sub ON q.subject_id = sub.id
      JOIN staff stf ON q.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY q.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find single quiz by ID with full details.
   */
  public async findById(id: string): Promise<QuizWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.department_id,
        q.class_id,
        q.subject_id,
        q.created_by,
        q.academic_year,
        q.semester,
        q.duration_minutes,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        q.status,
        TO_CHAR(q.start_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_at,
        TO_CHAR(q.end_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_at,
        q.created_at,
        q.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        (SELECT COUNT(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
        (SELECT COUNT(*)::int FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS total_attempts
      FROM quizzes q
      JOIN departments dept ON q.department_id = dept.id
      JOIN classes c ON q.class_id = c.id
      JOIN subjects sub ON q.subject_id = sub.id
      JOIN staff stf ON q.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE q.id = $1;
    `;

    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Admin global list with pagination and multi-filter support.
   */
  public async findAll(options: QuizFilterOptions = {}): Promise<{ rows: QuizWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.departmentId) {
      conditions.push(`q.department_id = $${paramIdx++}`);
      values.push(options.departmentId);
    }
    if (options.classId) {
      conditions.push(`q.class_id = $${paramIdx++}`);
      values.push(options.classId);
    }
    if (options.subjectId) {
      conditions.push(`q.subject_id = $${paramIdx++}`);
      values.push(options.subjectId);
    }
    if (options.createdBy) {
      conditions.push(`q.created_by = $${paramIdx++}`);
      values.push(options.createdBy);
    }
    if (options.status) {
      conditions.push(`q.status = $${paramIdx++}`);
      values.push(options.status.toUpperCase());
    }
    if (options.academicYear) {
      conditions.push(`q.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`q.semester = $${paramIdx++}`);
      values.push(options.semester);
    }
    if (options.search) {
      conditions.push(`(q.title ILIKE $${paramIdx} OR q.description ILIKE $${paramIdx} OR sub.name ILIKE $${paramIdx} OR sub.code ILIKE $${paramIdx})`);
      values.push(`%${options.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM quizzes q
      JOIN subjects sub ON q.subject_id = sub.id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, values);
    const total = countRes.rows[0]?.count || 0;

    let query = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.department_id,
        q.class_id,
        q.subject_id,
        q.created_by,
        q.academic_year,
        q.semester,
        q.duration_minutes,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        q.status,
        TO_CHAR(q.start_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS start_at,
        TO_CHAR(q.end_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS end_at,
        q.created_at,
        q.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        (SELECT COUNT(*)::int FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS total_questions,
        (SELECT COUNT(*)::int FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS total_attempts
      FROM quizzes q
      JOIN departments dept ON q.department_id = dept.id
      JOIN classes c ON q.class_id = c.id
      JOIN subjects sub ON q.subject_id = sub.id
      JOIN staff stf ON q.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      ${whereClause}
      ORDER BY q.created_at DESC
    `;

    if (options.limit) {
      query += ` LIMIT $${paramIdx++}`;
      values.push(options.limit);
    }
    if (options.offset) {
      query += ` OFFSET $${paramIdx++}`;
      values.push(options.offset);
    }

    const res = await pool.query(query, values);
    return { rows: res.rows, total };
  }

  // ─── Quiz CRUD Operations ───────────────────────────────────

  public async create(data: {
    title: string;
    description?: string | null;
    department_id: string;
    class_id: string;
    subject_id: string;
    created_by: string;
    academic_year: string;
    semester: number;
    duration_minutes: number;
    total_marks?: number;
    passing_marks?: number;
    status?: QuizStatus;
    start_at?: Date | string | null;
    end_at?: Date | string | null;
  }): Promise<QuizRow> {
    const pool = getPool();
    const query = `
      INSERT INTO quizzes (
        title, description, department_id, class_id, subject_id, created_by,
        academic_year, semester, duration_minutes, total_marks, passing_marks,
        status, start_at, end_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;
    const values = [
      data.title,
      data.description || null,
      data.department_id,
      data.class_id,
      data.subject_id,
      data.created_by,
      data.academic_year,
      data.semester,
      data.duration_minutes,
      data.total_marks || 0,
      data.passing_marks || 0,
      data.status || 'DRAFT',
      data.start_at || null,
      data.end_at || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  public async update(id: string, data: Partial<{
    title: string;
    description: string | null;
    department_id: string;
    class_id: string;
    subject_id: string;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    status: QuizStatus;
    start_at: Date | string | null;
    end_at: Date | string | null;
  }>): Promise<QuizRow | null> {
    const pool = getPool();
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [id];
    let paramIdx = 2;

    if (data.title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(data.description);
    }
    if (data.department_id !== undefined) {
      setClauses.push(`department_id = $${paramIdx++}`);
      values.push(data.department_id);
    }
    if (data.class_id !== undefined) {
      setClauses.push(`class_id = $${paramIdx++}`);
      values.push(data.class_id);
    }
    if (data.subject_id !== undefined) {
      setClauses.push(`subject_id = $${paramIdx++}`);
      values.push(data.subject_id);
    }
    if (data.duration_minutes !== undefined) {
      setClauses.push(`duration_minutes = $${paramIdx++}`);
      values.push(data.duration_minutes);
    }
    if (data.total_marks !== undefined) {
      setClauses.push(`total_marks = $${paramIdx++}`);
      values.push(data.total_marks);
    }
    if (data.passing_marks !== undefined) {
      setClauses.push(`passing_marks = $${paramIdx++}`);
      values.push(data.passing_marks);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
    }
    if (data.start_at !== undefined) {
      setClauses.push(`start_at = $${paramIdx++}`);
      values.push(data.start_at);
    }
    if (data.end_at !== undefined) {
      setClauses.push(`end_at = $${paramIdx++}`);
      values.push(data.end_at);
    }

    const query = `
      UPDATE quizzes
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query('DELETE FROM quizzes WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Recalculates total_marks for a quiz from the sum of its question marks.
   */
  public async recalculateTotalMarks(quizId: string, client?: PoolClient): Promise<number> {
    const db = client || getPool();
    const sumRes = await db.query(
      'SELECT COALESCE(SUM(marks), 0)::float AS total FROM quiz_questions WHERE quiz_id = $1',
      [quizId]
    );
    const total = sumRes.rows[0]?.total || 0;
    await db.query('UPDATE quizzes SET total_marks = $1, updated_at = NOW() WHERE id = $2', [total, quizId]);
    return total;
  }

  // ─── Question & Option Operations ──────────────────────────

  /**
   * Fetch questions for a quiz.
   * If includeCorrectAnswer is false (Student), is_correct is NOT returned in options and explanation is hidden.
   */
  public async findQuestionsByQuizId(quizId: string, includeCorrectAnswer: boolean): Promise<any[]> {
    const pool = getPool();
    const questionsQuery = `
      SELECT 
        id, quiz_id, question_text, question_type, marks::float AS marks, question_order,
        ${includeCorrectAnswer ? 'explanation' : 'NULL AS explanation'},
        created_at, updated_at
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY question_order ASC;
    `;
    const questionsRes = await pool.query(questionsQuery, [quizId]);
    const questions = questionsRes.rows;

    if (questions.length === 0) return [];

    const questionIds = questions.map(q => q.id);
    const optionsQuery = `
      SELECT 
        id, question_id, option_text, option_order,
        ${includeCorrectAnswer ? 'is_correct' : 'FALSE AS is_correct'},
        created_at
      FROM quiz_options
      WHERE question_id = ANY($1::uuid[])
      ORDER BY option_order ASC;
    `;
    const optionsRes = await pool.query(optionsQuery, [questionIds]);
    const options = optionsRes.rows;

    // Group options by question_id
    const optionsMap = new Map<string, any[]>();
    for (const opt of options) {
      if (!optionsMap.has(opt.question_id)) {
        optionsMap.set(opt.question_id, []);
      }
      if (!includeCorrectAnswer) {
        delete opt.is_correct;
      }
      optionsMap.get(opt.question_id)!.push(opt);
    }

    return questions.map(q => ({
      ...q,
      options: optionsMap.get(q.id) || [],
    }));
  }

  public async findQuestionById(questionId: string): Promise<QuizQuestionRow | null> {
    const pool = getPool();
    const res = await pool.query(
      'SELECT id, quiz_id, question_text, question_type, marks::float AS marks, question_order, explanation, created_at, updated_at FROM quiz_questions WHERE id = $1',
      [questionId]
    );
    return res.rows[0] || null;
  }

  public async createQuestion(data: {
    quiz_id: string;
    question_text: string;
    question_type: QuestionType;
    marks: number;
    question_order: number;
    explanation?: string | null;
  }, client?: PoolClient): Promise<QuizQuestionRow> {
    const db = client || getPool();
    const query = `
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, marks, question_order, explanation)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, quiz_id, question_text, question_type, marks::float AS marks, question_order, explanation, created_at, updated_at;
    `;
    const res = await db.query(query, [
      data.quiz_id,
      data.question_text,
      data.question_type,
      data.marks,
      data.question_order,
      data.explanation || null,
    ]);
    return res.rows[0];
  }

  public async updateQuestion(questionId: string, data: Partial<{
    question_text: string;
    question_type: QuestionType;
    marks: number;
    question_order: number;
    explanation: string | null;
  }>, client?: PoolClient): Promise<QuizQuestionRow | null> {
    const db = client || getPool();
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [questionId];
    let paramIdx = 2;

    if (data.question_text !== undefined) {
      setClauses.push(`question_text = $${paramIdx++}`);
      values.push(data.question_text);
    }
    if (data.question_type !== undefined) {
      setClauses.push(`question_type = $${paramIdx++}`);
      values.push(data.question_type);
    }
    if (data.marks !== undefined) {
      setClauses.push(`marks = $${paramIdx++}`);
      values.push(data.marks);
    }
    if (data.question_order !== undefined) {
      setClauses.push(`question_order = $${paramIdx++}`);
      values.push(data.question_order);
    }
    if (data.explanation !== undefined) {
      setClauses.push(`explanation = $${paramIdx++}`);
      values.push(data.explanation);
    }

    const query = `
      UPDATE quiz_questions
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, quiz_id, question_text, question_type, marks::float AS marks, question_order, explanation, created_at, updated_at;
    `;
    const res = await db.query(query, values);
    return res.rows[0] || null;
  }

  public async deleteQuestion(questionId: string, client?: PoolClient): Promise<boolean> {
    const db = client || getPool();
    const res = await db.query('DELETE FROM quiz_questions WHERE id = $1', [questionId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async findOptionsByQuestionId(questionId: string, includeCorrectAnswer: boolean): Promise<QuizOptionRow[]> {
    const pool = getPool();
    const query = `
      SELECT id, question_id, option_text, option_order, ${includeCorrectAnswer ? 'is_correct' : 'FALSE AS is_correct'}, created_at
      FROM quiz_options
      WHERE question_id = $1
      ORDER BY option_order ASC;
    `;
    const res = await pool.query(query, [questionId]);
    return res.rows;
  }

  public async findOptionById(optionId: string): Promise<QuizOptionRow | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM quiz_options WHERE id = $1', [optionId]);
    return res.rows[0] || null;
  }

  public async createOption(data: {
    question_id: string;
    option_text: string;
    option_order: number;
    is_correct: boolean;
  }, client?: PoolClient): Promise<QuizOptionRow> {
    const db = client || getPool();
    const query = `
      INSERT INTO quiz_options (question_id, option_text, option_order, is_correct)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const res = await db.query(query, [
      data.question_id,
      data.option_text,
      data.option_order,
      data.is_correct || false,
    ]);
    return res.rows[0];
  }

  public async updateOption(optionId: string, data: Partial<{
    option_text: string;
    option_order: number;
    is_correct: boolean;
  }>, client?: PoolClient): Promise<QuizOptionRow | null> {
    const db = client || getPool();
    const setClauses: string[] = [];
    const values: unknown[] = [optionId];
    let paramIdx = 2;

    if (data.option_text !== undefined) {
      setClauses.push(`option_text = $${paramIdx++}`);
      values.push(data.option_text);
    }
    if (data.option_order !== undefined) {
      setClauses.push(`option_order = $${paramIdx++}`);
      values.push(data.option_order);
    }
    if (data.is_correct !== undefined) {
      setClauses.push(`is_correct = $${paramIdx++}`);
      values.push(data.is_correct);
    }

    if (setClauses.length === 0) return this.findOptionById(optionId);

    const query = `
      UPDATE quiz_options
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;
    const res = await db.query(query, values);
    return res.rows[0] || null;
  }

  public async deleteOption(optionId: string, client?: PoolClient): Promise<boolean> {
    const db = client || getPool();
    const res = await db.query('DELETE FROM quiz_options WHERE id = $1', [optionId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async setCorrectOption(questionId: string, correctOptionId: string, client?: PoolClient): Promise<void> {
    const db = client || getPool();
    await db.query('UPDATE quiz_options SET is_correct = FALSE WHERE question_id = $1', [questionId]);
    await db.query('UPDATE quiz_options SET is_correct = TRUE WHERE id = $1 AND question_id = $2', [correctOptionId, questionId]);
  }

  // ─── Attempt & Answer Operations ────────────────────────────

  public async findActiveAttempt(quizId: string, studentId: string): Promise<QuizAttemptRow | null> {
    const pool = getPool();
    const query = `
      SELECT id, quiz_id, student_id, started_at, submitted_at, status, score::float AS score, percentage::float AS percentage, created_at, updated_at
      FROM quiz_attempts
      WHERE quiz_id = $1 AND student_id = $2 AND status = 'IN_PROGRESS'
      LIMIT 1;
    `;
    const res = await pool.query(query, [quizId, studentId]);
    return res.rows[0] || null;
  }

  public async findAttemptById(attemptId: string): Promise<QuizAttemptRow | null> {
    const pool = getPool();
    const query = `
      SELECT id, quiz_id, student_id, started_at, submitted_at, status, score::float AS score, percentage::float AS percentage, created_at, updated_at
      FROM quiz_attempts
      WHERE id = $1;
    `;
    const res = await pool.query(query, [attemptId]);
    return res.rows[0] || null;
  }

  public async findAttemptsByQuizId(quizId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        qa.id,
        qa.quiz_id,
        qa.student_id,
        TO_CHAR(qa.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
        TO_CHAR(qa.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        qa.status,
        qa.score::float AS score,
        qa.percentage::float AS percentage,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        u.first_name AS student_first_name,
        u.last_name AS student_last_name,
        s.student_roll_number AS roll_number,
        s.enrollment_number,
        (qa.score >= q.passing_marks) AS is_passed
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN students s ON qa.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE qa.quiz_id = $1
      ORDER BY qa.created_at DESC;
    `;
    const res = await pool.query(query, [quizId]);
    return res.rows;
  }

  public async findStudentAttempts(studentId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        qa.id,
        qa.quiz_id,
        qa.student_id,
        TO_CHAR(qa.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
        TO_CHAR(qa.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        qa.status,
        qa.score::float AS score,
        qa.percentage::float AS percentage,
        q.title AS quiz_title,
        q.duration_minutes,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        sub.name AS subject_name,
        sub.code AS subject_code
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN subjects sub ON q.subject_id = sub.id
      WHERE qa.student_id = $1
      ORDER BY qa.created_at DESC;
    `;
    const res = await pool.query(query, [studentId]);
    return res.rows;
  }

  public async createAttempt(quizId: string, studentId: string): Promise<QuizAttemptRow> {
    const pool = getPool();
    const query = `
      INSERT INTO quiz_attempts (quiz_id, student_id, started_at, status)
      VALUES ($1, $2, NOW(), 'IN_PROGRESS')
      RETURNING id, quiz_id, student_id, started_at, submitted_at, status, score::float AS score, percentage::float AS percentage, created_at, updated_at;
    `;
    const res = await pool.query(query, [quizId, studentId]);
    return res.rows[0];
  }

  public async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionId?: string | null,
    answerText?: string | null
  ): Promise<QuizAnswerRow> {
    const pool = getPool();
    const query = `
      INSERT INTO quiz_answers (attempt_id, question_id, selected_option_id, answer_text, answered_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        selected_option_id = EXCLUDED.selected_option_id,
        answer_text = EXCLUDED.answer_text,
        answered_at = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;
    const res = await pool.query(query, [attemptId, questionId, selectedOptionId || null, answerText || null]);
    return res.rows[0];
  }

  public async findAnswersByAttemptId(attemptId: string): Promise<QuizAnswerRow[]> {
    const pool = getPool();
    const query = `
      SELECT id, attempt_id, question_id, selected_option_id, answer_text, is_correct, marks_awarded::float AS marks_awarded, answered_at, created_at, updated_at
      FROM quiz_answers
      WHERE attempt_id = $1;
    `;
    const res = await pool.query(query, [attemptId]);
    return res.rows;
  }

  public async updateAttempt(
    attemptId: string,
    data: Partial<QuizAttemptRow>,
    client?: PoolClient
  ): Promise<QuizAttemptRow | null> {
    const db = client || getPool();
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [attemptId];
    let paramIdx = 2;

    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
    }
    if (data.submitted_at !== undefined) {
      setClauses.push(`submitted_at = $${paramIdx++}`);
      values.push(data.submitted_at);
    }
    if (data.score !== undefined) {
      setClauses.push(`score = $${paramIdx++}`);
      values.push(data.score);
    }
    if (data.percentage !== undefined) {
      setClauses.push(`percentage = $${paramIdx++}`);
      values.push(data.percentage);
    }

    const query = `
      UPDATE quiz_attempts
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, quiz_id, student_id, started_at, submitted_at, status, score::float AS score, percentage::float AS percentage, created_at, updated_at;
    `;
    const res = await db.query(query, values);
    return res.rows[0] || null;
  }

  public async updateAnswerEvaluation(
    answerId: string,
    isCorrect: boolean,
    marksAwarded: number,
    client?: PoolClient
  ): Promise<void> {
    const db = client || getPool();
    await db.query(
      'UPDATE quiz_answers SET is_correct = $1, marks_awarded = $2, updated_at = NOW() WHERE id = $3',
      [isCorrect, marksAwarded, answerId]
    );
  }

  // ─── Analytics & Statistics ─────────────────────────────────

  public async getAnalytics(quizId: string): Promise<QuizAnalytics> {
    const pool = getPool();
    
    // Total enrolled students in target class
    const studentCountRes = await pool.query(`
      SELECT COUNT(DISTINCT sc.student_id)::int AS total
      FROM quizzes q
      JOIN student_classes sc ON q.class_id = sc.class_id
      WHERE q.id = $1;
    `, [quizId]);
    const totalStudents = studentCountRes.rows[0]?.total || 0;

    // Status counts and score metrics
    const metricsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_attempts,
        COUNT(*) FILTER (WHERE qa.status = 'IN_PROGRESS')::int AS started_count,
        COUNT(*) FILTER (WHERE qa.status IN ('SUBMITTED', 'GRADED'))::int AS submitted_count,
        COUNT(*) FILTER (WHERE qa.status = 'TIMED_OUT')::int AS timed_out_count,
        COALESCE(AVG(qa.score) FILTER (WHERE qa.status IN ('SUBMITTED', 'GRADED', 'TIMED_OUT')), 0)::float AS average_score,
        COALESCE(MAX(qa.score) FILTER (WHERE qa.status IN ('SUBMITTED', 'GRADED', 'TIMED_OUT')), 0)::float AS highest_score,
        COALESCE(MIN(qa.score) FILTER (WHERE qa.status IN ('SUBMITTED', 'GRADED', 'TIMED_OUT')), 0)::float AS lowest_score,
        COUNT(*) FILTER (WHERE qa.status IN ('SUBMITTED', 'GRADED', 'TIMED_OUT') AND qa.score >= q.passing_marks)::int AS pass_count,
        COUNT(*) FILTER (WHERE qa.status IN ('SUBMITTED', 'GRADED', 'TIMED_OUT') AND qa.score < q.passing_marks)::int AS fail_count
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      WHERE q.id = $1
      GROUP BY q.id;
    `, [quizId]);

    const row = metricsRes.rows[0] || {};
    const submittedCount = row.submitted_count || 0;
    const completionPercentage = totalStudents > 0 ? parseFloat(((submittedCount / totalStudents) * 100).toFixed(1)) : 0;

    return {
      total_students: totalStudents,
      started_count: row.started_count || 0,
      submitted_count: submittedCount,
      timed_out_count: row.timed_out_count || 0,
      average_score: parseFloat((row.average_score || 0).toFixed(2)),
      highest_score: row.highest_score || 0,
      lowest_score: row.lowest_score || 0,
      pass_count: row.pass_count || 0,
      fail_count: row.fail_count || 0,
      completion_percentage: completionPercentage,
    };
  }

  public async getStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    closed: number;
    total_attempts: number;
  }> {
    const pool = getPool();
    const res = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int AS published,
        COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS closed,
        (SELECT COUNT(*)::int FROM quiz_attempts) AS total_attempts
      FROM quizzes;
    `);
    const row = res.rows[0] || {};
    return {
      total: row.total || 0,
      published: row.published || 0,
      draft: row.draft || 0,
      closed: row.closed || 0,
      total_attempts: row.total_attempts || 0,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  public async findStudentByUserId(userId: string): Promise<{ id: string; user_id: string; year: number; semester: number; division: string } | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM students WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
  }

  public async findStaffByUserId(userId: string): Promise<{ id: string; user_id: string; employee_id: string; designation: string } | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM staff WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
  }

  public async isStaffAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query(
      'SELECT 1 FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2',
      [staffId, subjectId]
    );
    return res.rows.length > 0;
  }

  public async isStudentEnrolledInClass(studentId: string, classId: string): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query(
      'SELECT 1 FROM student_classes WHERE student_id = $1 AND class_id = $2',
      [studentId, classId]
    );
    return res.rows.length > 0;
  }
}
