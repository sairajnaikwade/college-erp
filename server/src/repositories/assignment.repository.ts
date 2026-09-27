import { getPool } from '../config/database';

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type SubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED';

export interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  department_id: string;
  class_id: string;
  subject_id: string;
  created_by: string;
  academic_year: string;
  semester: number;
  due_date: string;
  max_marks: number;
  status: AssignmentStatus;
  attachment_name: string | null;
  attachment_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentWithDetails extends AssignmentRow {
  department_name?: string;
  department_code?: string;
  class_name?: string;
  division?: string;
  subject_name?: string;
  subject_code?: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  faculty_employee_id?: string;
  total_submissions?: number;
  graded_submissions?: number;
}

export interface StudentAssignmentWithSubmission extends AssignmentWithDetails {
  submission_id?: string | null;
  submission_status?: SubmissionStatus;
  submitted_at?: string | null;
  submission_text?: string | null;
  submission_attachment_name?: string | null;
  submission_attachment_url?: string | null;
  marks_obtained?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
  grader_first_name?: string | null;
  grader_last_name?: string | null;
}

export interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at: Date | null;
  status: SubmissionStatus;
  submission_text: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  marks: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubmissionWithDetails extends SubmissionRow {
  student_roll_number?: string;
  enrollment_number?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_email?: string;
  assignment_title?: string;
  assignment_max_marks?: number;
  assignment_due_date?: string;
  grader_first_name?: string | null;
  grader_last_name?: string | null;
}

export interface CreateAssignmentDTO {
  title: string;
  description: string;
  department_id: string;
  class_id: string;
  subject_id: string;
  created_by: string;
  academic_year: string;
  semester: number;
  due_date: string;
  max_marks?: number;
  status?: AssignmentStatus;
  attachment_name?: string | null;
  attachment_url?: string | null;
}

export interface UpdateAssignmentDTO {
  title?: string;
  description?: string;
  due_date?: string;
  max_marks?: number;
  status?: AssignmentStatus;
  attachment_name?: string | null;
  attachment_url?: string | null;
}

export interface UpsertSubmissionDTO {
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  submission_text?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
}

export interface GradeSubmissionDTO {
  marks: number;
  feedback?: string | null;
  graded_by: string;
}

export interface AssignmentFilterOptions {
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  createdBy?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export class AssignmentRepository {
  /**
   * Find assignments for a student's enrolled class, joined with their personal submission status.
   */
  public async findAssignmentsForStudent(
    studentId: string,
    filters: { subjectId?: string; status?: string; academicYear?: string; semester?: number } = {}
  ): Promise<StudentAssignmentWithSubmission[]> {
    const pool = getPool();
    const conditions: string[] = ['sc.student_id = $1', "a.status != 'DRAFT'"];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.academicYear) {
      conditions.push(`a.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`a.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }

    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.department_id,
        a.class_id,
        a.subject_id,
        a.created_by,
        a.academic_year,
        a.semester,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        a.status,
        a.attachment_name,
        a.attachment_url,
        a.created_at,
        a.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        subm.id AS submission_id,
        COALESCE(subm.status, 'NOT_SUBMITTED') AS submission_status,
        TO_CHAR(subm.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        subm.submission_text,
        subm.attachment_name AS submission_attachment_name,
        subm.attachment_url AS submission_attachment_url,
        subm.marks::float AS marks_obtained,
        subm.feedback,
        TO_CHAR(subm.graded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS graded_at,
        gu.first_name AS grader_first_name,
        gu.last_name AS grader_last_name
      FROM assignments a
      JOIN student_classes sc ON a.class_id = sc.class_id
      JOIN departments dept ON a.department_id = dept.id
      JOIN classes c ON a.class_id = c.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN staff stf ON a.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.student_id = $1
      LEFT JOIN staff gstf ON subm.graded_by = gstf.id
      LEFT JOIN users gu ON gstf.user_id = gu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.due_date ASC, a.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find assignments created by staff member.
   */
  public async findAssignmentsForStaff(
    staffId: string,
    filters: AssignmentFilterOptions = {}
  ): Promise<AssignmentWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['a.created_by = $1'];
    const values: unknown[] = [staffId];
    let paramIdx = 2;

    if (filters.classId) {
      conditions.push(`a.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }

    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.department_id,
        a.class_id,
        a.subject_id,
        a.created_by,
        a.academic_year,
        a.semester,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        a.status,
        a.attachment_name,
        a.attachment_url,
        a.created_at,
        a.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        COUNT(subm.id)::int AS total_submissions,
        COUNT(CASE WHEN subm.status = 'GRADED' THEN 1 END)::int AS graded_submissions
      FROM assignments a
      JOIN departments dept ON a.department_id = dept.id
      JOIN classes c ON a.class_id = c.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN staff stf ON a.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.status IN ('SUBMITTED', 'LATE', 'GRADED')
      WHERE ${conditions.join(' AND ')}
      GROUP BY a.id, dept.name, dept.code, c.name, c.division, sub.name, sub.code, fu.first_name, fu.last_name, stf.employee_id
      ORDER BY a.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find assignments for a specific class batch.
   */
  public async findAssignmentsForClass(
    classId: string,
    filters: { subjectId?: string; status?: string } = {}
  ): Promise<AssignmentWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['a.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }

    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.department_id,
        a.class_id,
        a.subject_id,
        a.created_by,
        a.academic_year,
        a.semester,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        a.status,
        a.attachment_name,
        a.attachment_url,
        a.created_at,
        a.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id
      FROM assignments a
      JOIN departments dept ON a.department_id = dept.id
      JOIN classes c ON a.class_id = c.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN staff stf ON a.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.due_date ASC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find single assignment by ID with full details.
   */
  public async findById(id: string): Promise<AssignmentWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.department_id,
        a.class_id,
        a.subject_id,
        a.created_by,
        a.academic_year,
        a.semester,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        a.status,
        a.attachment_name,
        a.attachment_url,
        a.created_at,
        a.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        COUNT(subm.id)::int AS total_submissions,
        COUNT(CASE WHEN subm.status = 'GRADED' THEN 1 END)::int AS graded_submissions
      FROM assignments a
      JOIN departments dept ON a.department_id = dept.id
      JOIN classes c ON a.class_id = c.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN staff stf ON a.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.status IN ('SUBMITTED', 'LATE', 'GRADED')
      WHERE a.id = $1
      GROUP BY a.id, dept.name, dept.code, c.name, c.division, sub.name, sub.code, fu.first_name, fu.last_name, stf.employee_id;
    `;

    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Create assignment.
   */
  public async create(data: CreateAssignmentDTO): Promise<AssignmentRow> {
    const pool = getPool();
    const query = `
      INSERT INTO assignments (
        title,
        description,
        department_id,
        class_id,
        subject_id,
        created_by,
        academic_year,
        semester,
        due_date,
        max_marks,
        status,
        attachment_name,
        attachment_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const values = [
      data.title,
      data.description,
      data.department_id,
      data.class_id,
      data.subject_id,
      data.created_by,
      data.academic_year,
      data.semester,
      data.due_date,
      data.max_marks || 100.0,
      data.status || 'PUBLISHED',
      data.attachment_name || null,
      data.attachment_url || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  /**
   * Update assignment.
   */
  public async update(id: string, data: UpdateAssignmentDTO): Promise<AssignmentRow | null> {
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
    if (data.due_date !== undefined) {
      setClauses.push(`due_date = $${paramIdx++}`);
      values.push(data.due_date);
    }
    if (data.max_marks !== undefined) {
      setClauses.push(`max_marks = $${paramIdx++}`);
      values.push(data.max_marks);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
    }
    if (data.attachment_name !== undefined) {
      setClauses.push(`attachment_name = $${paramIdx++}`);
      values.push(data.attachment_name);
    }
    if (data.attachment_url !== undefined) {
      setClauses.push(`attachment_url = $${paramIdx++}`);
      values.push(data.attachment_url);
    }

    const query = `
      UPDATE assignments
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  /**
   * Delete assignment.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM assignments WHERE id = $1 RETURNING id;`;
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * List all assignments across institution (Admin).
   */
  public async findAll(
    options: AssignmentFilterOptions = {}
  ): Promise<{ rows: AssignmentWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.classId) {
      conditions.push(`a.class_id = $${paramIdx++}`);
      values.push(options.classId);
    }
    if (options.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(options.subjectId);
    }
    if (options.departmentId) {
      conditions.push(`a.department_id = $${paramIdx++}`);
      values.push(options.departmentId);
    }
    if (options.status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(options.status.toUpperCase());
    }
    if (options.academicYear) {
      conditions.push(`a.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`a.semester = $${paramIdx++}`);
      values.push(options.semester);
    }
    if (options.search) {
      conditions.push(`(a.title ILIKE $${paramIdx} OR a.description ILIKE $${paramIdx})`);
      values.push(`%${options.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS count FROM assignments a ${whereClause};`;
    const countRes = await pool.query(countQuery, values);
    const total = countRes.rows[0]?.count || 0;

    let query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.department_id,
        a.class_id,
        a.subject_id,
        a.created_by,
        a.academic_year,
        a.semester,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        a.status,
        a.attachment_name,
        a.attachment_url,
        a.created_at,
        a.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id,
        COUNT(subm.id)::int AS total_submissions,
        COUNT(CASE WHEN subm.status = 'GRADED' THEN 1 END)::int AS graded_submissions
      FROM assignments a
      JOIN departments dept ON a.department_id = dept.id
      JOIN classes c ON a.class_id = c.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN staff stf ON a.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.status IN ('SUBMITTED', 'LATE', 'GRADED')
      ${whereClause}
      GROUP BY a.id, dept.name, dept.code, c.name, c.division, sub.name, sub.code, fu.first_name, fu.last_name, stf.employee_id
      ORDER BY a.created_at DESC
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

  // ─── Submissions Operations ─────────────────────────────────

  /**
   * Find all submissions for an assignment.
   */
  public async findSubmissions(assignmentId: string): Promise<SubmissionWithDetails[]> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id,
        s.assignment_id,
        s.student_id,
        TO_CHAR(s.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        s.status,
        s.submission_text,
        s.attachment_name,
        s.attachment_url,
        s.marks::float AS marks,
        s.feedback,
        s.graded_by,
        TO_CHAR(s.graded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS graded_at,
        s.created_at,
        s.updated_at,
        stu.student_roll_number,
        stu.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        su.email AS student_email,
        a.title AS assignment_title,
        a.max_marks::float AS assignment_max_marks,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS assignment_due_date,
        gu.first_name AS grader_first_name,
        gu.last_name AS grader_last_name
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN students stu ON s.student_id = stu.id
      JOIN users su ON stu.user_id = su.id
      LEFT JOIN staff gstf ON s.graded_by = gstf.id
      LEFT JOIN users gu ON gstf.user_id = gu.id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at ASC NULLS LAST, stu.student_roll_number ASC;
    `;

    const res = await pool.query(query, [assignmentId]);
    return res.rows;
  }

  /**
   * Find single submission by submission ID.
   */
  public async findSubmissionById(submissionId: string): Promise<SubmissionWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id,
        s.assignment_id,
        s.student_id,
        TO_CHAR(s.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        s.status,
        s.submission_text,
        s.attachment_name,
        s.attachment_url,
        s.marks::float AS marks,
        s.feedback,
        s.graded_by,
        TO_CHAR(s.graded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS graded_at,
        s.created_at,
        s.updated_at,
        stu.student_roll_number,
        stu.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        su.email AS student_email,
        a.title AS assignment_title,
        a.max_marks::float AS assignment_max_marks,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS assignment_due_date,
        gu.first_name AS grader_first_name,
        gu.last_name AS grader_last_name
      FROM assignment_submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN students stu ON s.student_id = stu.id
      JOIN users su ON stu.user_id = su.id
      LEFT JOIN staff gstf ON s.graded_by = gstf.id
      LEFT JOIN users gu ON gstf.user_id = gu.id
      WHERE s.id = $1;
    `;

    const res = await pool.query(query, [submissionId]);
    return res.rows[0] || null;
  }

  /**
   * Find student's submission for an assignment.
   */
  public async findStudentSubmission(
    assignmentId: string,
    studentId: string
  ): Promise<SubmissionWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id,
        s.assignment_id,
        s.student_id,
        TO_CHAR(s.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        s.status,
        s.submission_text,
        s.attachment_name,
        s.attachment_url,
        s.marks::float AS marks,
        s.feedback,
        s.graded_by,
        TO_CHAR(s.graded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS graded_at,
        s.created_at,
        s.updated_at,
        stu.student_roll_number,
        stu.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        gu.first_name AS grader_first_name,
        gu.last_name AS grader_last_name
      FROM assignment_submissions s
      JOIN students stu ON s.student_id = stu.id
      JOIN users su ON stu.user_id = su.id
      LEFT JOIN staff gstf ON s.graded_by = gstf.id
      LEFT JOIN users gu ON gstf.user_id = gu.id
      WHERE s.assignment_id = $1 AND s.student_id = $2;
    `;

    const res = await pool.query(query, [assignmentId, studentId]);
    return res.rows[0] || null;
  }

  /**
   * Upsert a student's submission (create or update work).
   */
  public async upsertSubmission(data: UpsertSubmissionDTO): Promise<SubmissionRow> {
    const pool = getPool();
    const query = `
      INSERT INTO assignment_submissions (
        assignment_id,
        student_id,
        submitted_at,
        status,
        submission_text,
        attachment_name,
        attachment_url
      )
      VALUES ($1, $2, NOW(), $3, $4, $5, $6)
      ON CONFLICT ON CONSTRAINT uq_assignment_submission
      DO UPDATE SET
        submitted_at = NOW(),
        status = EXCLUDED.status,
        submission_text = EXCLUDED.submission_text,
        attachment_name = EXCLUDED.attachment_name,
        attachment_url = EXCLUDED.attachment_url,
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [
      data.assignment_id,
      data.student_id,
      data.status,
      data.submission_text || null,
      data.attachment_name || null,
      data.attachment_url || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  /**
   * Grade a submission (Staff / Admin).
   */
  public async gradeSubmission(submissionId: string, data: GradeSubmissionDTO): Promise<SubmissionRow | null> {
    const pool = getPool();
    const query = `
      UPDATE assignment_submissions
      SET 
        status = 'GRADED',
        marks = $1,
        feedback = $2,
        graded_by = $3,
        graded_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;
    const values = [data.marks, data.feedback || null, data.graded_by, submissionId];

    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  // ─── Helpers ────────────────────────────────────────────────

  public async findStaffByUserId(userId: string): Promise<{ id: string; employee_id: string; department_id?: string } | null> {
    const pool = getPool();
    const query = `
      SELECT s.id, s.employee_id, u.department_id 
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = $1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  public async findStudentByUserId(userId: string): Promise<{ id: string; student_roll_number: string; class_id?: string } | null> {
    const pool = getPool();
    const query = `
      SELECT s.id, s.student_roll_number, sc.class_id
      FROM students s
      LEFT JOIN student_classes sc ON s.id = sc.student_id
      WHERE s.user_id = $1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  public async isStaffAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const query = `SELECT 1 FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2;`;
    const res = await pool.query(query, [staffId, subjectId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async isStudentInClass(studentId: string, classId: string): Promise<boolean> {
    const pool = getPool();
    const query = `SELECT 1 FROM student_classes WHERE student_id = $1 AND class_id = $2;`;
    const res = await pool.query(query, [studentId, classId]);
    return (res.rowCount ?? 0) > 0;
  }
}
