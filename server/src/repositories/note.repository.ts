import { getPool } from '../config/database';

export type NoteCategory =
  | 'LECTURE_NOTES'
  | 'STUDY_MATERIAL'
  | 'PRACTICAL'
  | 'REFERENCE'
  | 'QUESTION_BANK'
  | 'SYLLABUS'
  | 'OTHER';

export type NoteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface NoteRow {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  class_id: string;
  subject_id: string;
  uploaded_by: string;
  academic_year: string;
  semester: number;
  category: NoteCategory;
  status: NoteStatus;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NoteWithDetails extends NoteRow {
  department_name?: string;
  department_code?: string;
  class_name?: string;
  division?: string;
  subject_name?: string;
  subject_code?: string;
  subject_credits?: number;
  uploader_first_name?: string;
  uploader_last_name?: string;
  uploader_employee_id?: string;
  uploader_designation?: string;
}

export interface CreateNoteDTO {
  title: string;
  description?: string | null;
  department_id: string;
  class_id: string;
  subject_id: string;
  uploaded_by: string;
  academic_year: string;
  semester: number;
  category: NoteCategory;
  status?: NoteStatus;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  published_at?: Date | string | null;
}

export interface UpdateNoteDTO {
  title?: string;
  description?: string | null;
  category?: NoteCategory;
  status?: NoteStatus;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  published_at?: Date | string | null;
}

export interface NoteFilterOptions {
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  uploadedBy?: string;
  category?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export class NoteRepository {
  /**
   * Find published notes for a student's enrolled class.
   */
  public async findForStudent(
    studentId: string,
    filters: { subjectId?: string; category?: string; academicYear?: string; semester?: number; search?: string } = {}
  ): Promise<NoteWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['sc.student_id = $1', "n.status = 'PUBLISHED'"];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`n.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.category) {
      conditions.push(`n.category = $${paramIdx++}`);
      values.push(filters.category.toUpperCase());
    }
    if (filters.academicYear) {
      conditions.push(`n.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`n.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.search) {
      conditions.push(`(n.title ILIKE $${paramIdx} OR n.description ILIKE $${paramIdx} OR sub.name ILIKE $${paramIdx} OR sub.code ILIKE $${paramIdx})`);
      values.push(`%${filters.search}%`);
      paramIdx++;
    }

    const query = `
      SELECT 
        n.id,
        n.title,
        n.description,
        n.department_id,
        n.class_id,
        n.subject_id,
        n.uploaded_by,
        n.academic_year,
        n.semester,
        n.category,
        n.status,
        n.file_name,
        n.file_url,
        n.file_type,
        n.file_size::bigint AS file_size,
        TO_CHAR(n.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS published_at,
        n.created_at,
        n.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        fu.first_name AS uploader_first_name,
        fu.last_name AS uploader_last_name,
        stf.employee_id AS uploader_employee_id,
        stf.designation AS uploader_designation
      FROM notes n
      JOIN student_classes sc ON n.class_id = sc.class_id
      JOIN departments dept ON n.department_id = dept.id
      JOIN classes c ON n.class_id = c.id
      JOIN subjects sub ON n.subject_id = sub.id
      JOIN staff stf ON n.uploaded_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY n.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find notes uploaded by staff member or within authorized scope.
   */
  public async findForStaff(
    staffId: string,
    filters: NoteFilterOptions = {}
  ): Promise<NoteWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['n.uploaded_by = $1'];
    const values: unknown[] = [staffId];
    let paramIdx = 2;

    if (filters.classId) {
      conditions.push(`n.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.subjectId) {
      conditions.push(`n.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.category) {
      conditions.push(`n.category = $${paramIdx++}`);
      values.push(filters.category.toUpperCase());
    }
    if (filters.status) {
      conditions.push(`n.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }
    if (filters.search) {
      conditions.push(`(n.title ILIKE $${paramIdx} OR n.description ILIKE $${paramIdx})`);
      values.push(`%${filters.search}%`);
      paramIdx++;
    }

    const query = `
      SELECT 
        n.id,
        n.title,
        n.description,
        n.department_id,
        n.class_id,
        n.subject_id,
        n.uploaded_by,
        n.academic_year,
        n.semester,
        n.category,
        n.status,
        n.file_name,
        n.file_url,
        n.file_type,
        n.file_size::bigint AS file_size,
        TO_CHAR(n.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS published_at,
        n.created_at,
        n.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        fu.first_name AS uploader_first_name,
        fu.last_name AS uploader_last_name,
        stf.employee_id AS uploader_employee_id,
        stf.designation AS uploader_designation
      FROM notes n
      JOIN departments dept ON n.department_id = dept.id
      JOIN classes c ON n.class_id = c.id
      JOIN subjects sub ON n.subject_id = sub.id
      JOIN staff stf ON n.uploaded_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY n.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find notes for a class batch.
   */
  public async findForClass(
    classId: string,
    filters: { subjectId?: string; category?: string; status?: string } = {}
  ): Promise<NoteWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['n.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`n.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.category) {
      conditions.push(`n.category = $${paramIdx++}`);
      values.push(filters.category.toUpperCase());
    }
    if (filters.status) {
      conditions.push(`n.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }

    const query = `
      SELECT 
        n.id,
        n.title,
        n.description,
        n.department_id,
        n.class_id,
        n.subject_id,
        n.uploaded_by,
        n.academic_year,
        n.semester,
        n.category,
        n.status,
        n.file_name,
        n.file_url,
        n.file_type,
        n.file_size::bigint AS file_size,
        TO_CHAR(n.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS published_at,
        n.created_at,
        n.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        fu.first_name AS uploader_first_name,
        fu.last_name AS uploader_last_name,
        stf.employee_id AS uploader_employee_id
      FROM notes n
      JOIN departments dept ON n.department_id = dept.id
      JOIN classes c ON n.class_id = c.id
      JOIN subjects sub ON n.subject_id = sub.id
      JOIN staff stf ON n.uploaded_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY n.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find single note by ID with full details.
   */
  public async findById(id: string): Promise<NoteWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        n.id,
        n.title,
        n.description,
        n.department_id,
        n.class_id,
        n.subject_id,
        n.uploaded_by,
        n.academic_year,
        n.semester,
        n.category,
        n.status,
        n.file_name,
        n.file_url,
        n.file_type,
        n.file_size::bigint AS file_size,
        TO_CHAR(n.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS published_at,
        n.created_at,
        n.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        fu.first_name AS uploader_first_name,
        fu.last_name AS uploader_last_name,
        stf.employee_id AS uploader_employee_id,
        stf.designation AS uploader_designation
      FROM notes n
      JOIN departments dept ON n.department_id = dept.id
      JOIN classes c ON n.class_id = c.id
      JOIN subjects sub ON n.subject_id = sub.id
      JOIN staff stf ON n.uploaded_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE n.id = $1;
    `;

    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Create a new note.
   */
  public async create(data: CreateNoteDTO): Promise<NoteRow> {
    const pool = getPool();
    const query = `
      INSERT INTO notes (
        title,
        description,
        department_id,
        class_id,
        subject_id,
        uploaded_by,
        academic_year,
        semester,
        category,
        status,
        file_name,
        file_url,
        file_type,
        file_size,
        published_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      data.title,
      data.description || null,
      data.department_id,
      data.class_id,
      data.subject_id,
      data.uploaded_by,
      data.academic_year,
      data.semester,
      data.category,
      data.status || 'PUBLISHED',
      data.file_name || null,
      data.file_url || null,
      data.file_type || null,
      data.file_size || null,
      data.status === 'PUBLISHED' ? data.published_at || new Date() : null,
    ];

    const res = await pool.query(query, values);
    const row = res.rows[0];
    if (row) {
      row.file_size = row.file_size != null ? Number(row.file_size) : null;
    }
    return row;
  }

  /**
   * Update an existing note.
   */
  public async update(id: string, data: UpdateNoteDTO): Promise<NoteRow | null> {
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
    if (data.category !== undefined) {
      setClauses.push(`category = $${paramIdx++}`);
      values.push(data.category);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
      if (data.status === 'PUBLISHED') {
        setClauses.push(`published_at = COALESCE(published_at, NOW())`);
      }
    }
    if (data.file_name !== undefined) {
      setClauses.push(`file_name = $${paramIdx++}`);
      values.push(data.file_name);
    }
    if (data.file_url !== undefined) {
      setClauses.push(`file_url = $${paramIdx++}`);
      values.push(data.file_url);
    }
    if (data.file_type !== undefined) {
      setClauses.push(`file_type = $${paramIdx++}`);
      values.push(data.file_type);
    }
    if (data.file_size !== undefined) {
      setClauses.push(`file_size = $${paramIdx++}`);
      values.push(data.file_size);
    }

    const query = `
      UPDATE notes
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const res = await pool.query(query, values);
    const row = res.rows[0];
    if (row) {
      row.file_size = row.file_size != null ? Number(row.file_size) : null;
    }
    return row || null;
  }


  /**
   * Delete a note.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM notes WHERE id = $1 RETURNING id;`;
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * List all notes across institution (Admin).
   */
  public async findAll(
    options: NoteFilterOptions = {}
  ): Promise<{ rows: NoteWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.classId) {
      conditions.push(`n.class_id = $${paramIdx++}`);
      values.push(options.classId);
    }
    if (options.subjectId) {
      conditions.push(`n.subject_id = $${paramIdx++}`);
      values.push(options.subjectId);
    }
    if (options.departmentId) {
      conditions.push(`n.department_id = $${paramIdx++}`);
      values.push(options.departmentId);
    }
    if (options.category) {
      conditions.push(`n.category = $${paramIdx++}`);
      values.push(options.category.toUpperCase());
    }
    if (options.status) {
      conditions.push(`n.status = $${paramIdx++}`);
      values.push(options.status.toUpperCase());
    }
    if (options.academicYear) {
      conditions.push(`n.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`n.semester = $${paramIdx++}`);
      values.push(options.semester);
    }
    if (options.search) {
      conditions.push(`(n.title ILIKE $${paramIdx} OR n.description ILIKE $${paramIdx} OR sub.name ILIKE $${paramIdx} OR sub.code ILIKE $${paramIdx})`);
      values.push(`%${options.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM notes n
      JOIN subjects sub ON n.subject_id = sub.id
      ${whereClause};
    `;
    const countRes = await pool.query(countQuery, values);
    const total = countRes.rows[0]?.count || 0;

    let query = `
      SELECT 
        n.id,
        n.title,
        n.description,
        n.department_id,
        n.class_id,
        n.subject_id,
        n.uploaded_by,
        n.academic_year,
        n.semester,
        n.category,
        n.status,
        n.file_name,
        n.file_url,
        n.file_type,
        n.file_size::bigint AS file_size,
        TO_CHAR(n.published_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS published_at,
        n.created_at,
        n.updated_at,
        dept.name AS department_name,
        dept.code AS department_code,
        c.name AS class_name,
        c.division,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        fu.first_name AS uploader_first_name,
        fu.last_name AS uploader_last_name,
        stf.employee_id AS uploader_employee_id,
        stf.designation AS uploader_designation
      FROM notes n
      JOIN departments dept ON n.department_id = dept.id
      JOIN classes c ON n.class_id = c.id
      JOIN subjects sub ON n.subject_id = sub.id
      JOIN staff stf ON n.uploaded_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      ${whereClause}
      ORDER BY n.created_at DESC
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

  public async getStats(): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    byCategory: Record<string, number>;
  }> {
    const pool = getPool();
    const statusRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED')::int AS published,
        COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'ARCHIVED')::int AS archived
      FROM notes;
    `);

    const catRes = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM notes
      GROUP BY category;
    `);

    const byCategory: Record<string, number> = {};
    for (const row of catRes.rows) {
      byCategory[row.category] = row.count;
    }

    const row = statusRes.rows[0] || {};
    return {
      total: row.total || 0,
      published: row.published || 0,
      draft: row.draft || 0,
      archived: row.archived || 0,
      byCategory,
    };
  }
}
