import { PoolClient } from 'pg';
import { getPool } from '../config/database';

export type ComponentType = 'ASSIGNMENT' | 'QUIZ' | 'INTERNAL' | 'PRACTICAL' | 'PROJECT' | 'OTHER';
export type MarkStatus = 'DRAFT' | 'PUBLISHED';
export type ResultStatus = 'DRAFT' | 'PUBLISHED';

export interface MarkComponentRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string;
  subject_id: string;
  class_id: string;
  academic_year: string;
  semester: number;
  max_marks: number;
  weightage: number | null;
  component_type: ComponentType;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface MarkComponentWithDetails extends MarkComponentRow {
  department_name?: string;
  department_code?: string;
  class_name?: string;
  division?: string;
  subject_name?: string;
  subject_code?: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  marks_count?: number;
  published_marks_count?: number;
}

export interface StudentMarkRow {
  id: string;
  student_id: string;
  component_id: string;
  marks_obtained: number;
  status: MarkStatus;
  remarks: string | null;
  entered_by: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentMarkWithDetails extends StudentMarkRow {
  component_name?: string;
  component_code?: string;
  component_type?: ComponentType;
  max_marks?: number;
  weightage?: number | null;
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  class_id?: string;
  class_name?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_roll_number?: string;
  enrollment_number?: string;
}

export interface StudentSubjectResultRow {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  academic_year: string;
  semester: number;
  total_marks: number;
  max_marks: number;
  percentage: number;
  grade: string | null;
  grade_point: number | null;
  result_status: ResultStatus;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentSubjectResultWithDetails extends StudentSubjectResultRow {
  subject_name?: string;
  subject_code?: string;
  class_name?: string;
  division?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_roll_number?: string;
  enrollment_number?: string;
}

export class MarksRepository {
  // ─── Mark Components ──────────────────────────────────────────

  public async createComponent(data: {
    name: string;
    code: string;
    description?: string | null;
    department_id: string;
    subject_id: string;
    class_id: string;
    academic_year: string;
    semester: number;
    max_marks: number;
    weightage?: number | null;
    component_type: ComponentType;
    created_by: string;
  }, client?: PoolClient): Promise<MarkComponentRow> {
    const db = client || getPool();
    const query = `
      INSERT INTO mark_components (
        name, code, description, department_id, subject_id, class_id,
        academic_year, semester, max_marks, weightage, component_type, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, code, description, department_id, subject_id, class_id,
                academic_year, semester, max_marks::float AS max_marks,
                weightage::float AS weightage, component_type, created_by, created_at, updated_at;
    `;
    const values = [
      data.name,
      data.code.toUpperCase(),
      data.description || null,
      data.department_id,
      data.subject_id,
      data.class_id,
      data.academic_year,
      data.semester,
      data.max_marks,
      data.weightage || null,
      data.component_type,
      data.created_by,
    ];
    const res = await db.query(query, values);
    return res.rows[0];
  }

  public async updateComponent(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      description: string | null;
      max_marks: number;
      weightage: number | null;
      component_type: ComponentType;
    }>,
    client?: PoolClient
  ): Promise<MarkComponentRow | null> {
    const db = client || getPool();
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [id];
    let paramIdx = 2;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      setClauses.push(`code = $${paramIdx++}`);
      values.push(data.code.toUpperCase());
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIdx++}`);
      values.push(data.description);
    }
    if (data.max_marks !== undefined) {
      setClauses.push(`max_marks = $${paramIdx++}`);
      values.push(data.max_marks);
    }
    if (data.weightage !== undefined) {
      setClauses.push(`weightage = $${paramIdx++}`);
      values.push(data.weightage);
    }
    if (data.component_type !== undefined) {
      setClauses.push(`component_type = $${paramIdx++}`);
      values.push(data.component_type);
    }

    const query = `
      UPDATE mark_components
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, name, code, description, department_id, subject_id, class_id,
                academic_year, semester, max_marks::float AS max_marks,
                weightage::float AS weightage, component_type, created_by, created_at, updated_at;
    `;
    const res = await db.query(query, values);
    return res.rows[0] || null;
  }

  public async deleteComponent(id: string, client?: PoolClient): Promise<boolean> {
    const db = client || getPool();
    const res = await db.query('DELETE FROM mark_components WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async findComponentById(id: string): Promise<MarkComponentWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        mc.id, mc.name, mc.code, mc.description, mc.department_id, mc.subject_id, mc.class_id,
        mc.academic_year, mc.semester, mc.max_marks::float AS max_marks,
        mc.weightage::float AS weightage, mc.component_type, mc.created_by, mc.created_at, mc.updated_at,
        dept.name AS department_name, dept.code AS department_code,
        c.name AS class_name, c.division,
        sub.name AS subject_name, sub.code AS subject_code,
        fu.first_name AS faculty_first_name, fu.last_name AS faculty_last_name
      FROM mark_components mc
      JOIN departments dept ON mc.department_id = dept.id
      JOIN classes c ON mc.class_id = c.id
      JOIN subjects sub ON mc.subject_id = sub.id
      JOIN staff stf ON mc.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE mc.id = $1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  public async findComponentsBySubjectAndClass(
    subjectId: string,
    classId: string,
    academicYear?: string,
    semester?: number
  ): Promise<MarkComponentWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['mc.subject_id = $1', 'mc.class_id = $2'];
    const values: unknown[] = [subjectId, classId];
    let paramIdx = 3;

    if (academicYear) {
      conditions.push(`mc.academic_year = $${paramIdx++}`);
      values.push(academicYear);
    }
    if (semester) {
      conditions.push(`mc.semester = $${paramIdx++}`);
      values.push(semester);
    }

    const query = `
      SELECT 
        mc.id, mc.name, mc.code, mc.description, mc.department_id, mc.subject_id, mc.class_id,
        mc.academic_year, mc.semester, mc.max_marks::float AS max_marks,
        mc.weightage::float AS weightage, mc.component_type, mc.created_by, mc.created_at, mc.updated_at,
        sub.name AS subject_name, sub.code AS subject_code,
        c.name AS class_name, c.division,
        (SELECT COUNT(*)::int FROM student_marks sm WHERE sm.component_id = mc.id) AS marks_count,
        (SELECT COUNT(*)::int FROM student_marks sm WHERE sm.component_id = mc.id AND sm.status = 'PUBLISHED') AS published_marks_count
      FROM mark_components mc
      JOIN subjects sub ON mc.subject_id = sub.id
      JOIN classes c ON mc.class_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY mc.created_at ASC;
    `;
    const res = await pool.query(query, values);
    return res.rows;
  }

  public async findComponentsForStaff(
    staffId: string,
    filters: { subjectId?: string; classId?: string; academicYear?: string; semester?: number; componentType?: string } = {}
  ): Promise<MarkComponentWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [
      '(mc.created_by = $1 OR mc.subject_id IN (SELECT subject_id FROM staff_subjects WHERE staff_id = $1))'
    ];
    const values: unknown[] = [staffId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`mc.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.classId) {
      conditions.push(`mc.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.academicYear) {
      conditions.push(`mc.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`mc.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.componentType) {
      conditions.push(`mc.component_type = $${paramIdx++}`);
      values.push(filters.componentType.toUpperCase());
    }

    const query = `
      SELECT 
        mc.id, mc.name, mc.code, mc.description, mc.department_id, mc.subject_id, mc.class_id,
        mc.academic_year, mc.semester, mc.max_marks::float AS max_marks,
        mc.weightage::float AS weightage, mc.component_type, mc.created_by, mc.created_at, mc.updated_at,
        dept.name AS department_name, dept.code AS department_code,
        c.name AS class_name, c.division,
        sub.name AS subject_name, sub.code AS subject_code,
        fu.first_name AS faculty_first_name, fu.last_name AS faculty_last_name,
        (SELECT COUNT(*)::int FROM student_marks sm WHERE sm.component_id = mc.id) AS marks_count,
        (SELECT COUNT(*)::int FROM student_marks sm WHERE sm.component_id = mc.id AND sm.status = 'PUBLISHED') AS published_marks_count
      FROM mark_components mc
      JOIN departments dept ON mc.department_id = dept.id
      JOIN classes c ON mc.class_id = c.id
      JOIN subjects sub ON mc.subject_id = sub.id
      JOIN staff stf ON mc.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY mc.created_at DESC;
    `;
    const res = await pool.query(query, values);
    return res.rows;
  }

  public async findAllComponents(
    filters: { departmentId?: string; subjectId?: string; classId?: string; academicYear?: string; semester?: number; componentType?: string } = {}
  ): Promise<MarkComponentWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (filters.departmentId) {
      conditions.push(`mc.department_id = $${paramIdx++}`);
      values.push(filters.departmentId);
    }
    if (filters.subjectId) {
      conditions.push(`mc.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.classId) {
      conditions.push(`mc.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.academicYear) {
      conditions.push(`mc.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`mc.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.componentType) {
      conditions.push(`mc.component_type = $${paramIdx++}`);
      values.push(filters.componentType.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT 
        mc.id, mc.name, mc.code, mc.description, mc.department_id, mc.subject_id, mc.class_id,
        mc.academic_year, mc.semester, mc.max_marks::float AS max_marks,
        mc.weightage::float AS weightage, mc.component_type, mc.created_by, mc.created_at, mc.updated_at,
        dept.name AS department_name, dept.code AS department_code,
        c.name AS class_name, c.division,
        sub.name AS subject_name, sub.code AS subject_code,
        fu.first_name AS faculty_first_name, fu.last_name AS faculty_last_name,
        (SELECT COUNT(*)::int FROM student_marks sm WHERE sm.component_id = mc.id) AS marks_count,
        (SELECT COUNT(*)::int FROM student_marks sm WHERE sm.component_id = mc.id AND sm.status = 'PUBLISHED') AS published_marks_count
      FROM mark_components mc
      JOIN departments dept ON mc.department_id = dept.id
      JOIN classes c ON mc.class_id = c.id
      JOIN subjects sub ON mc.subject_id = sub.id
      JOIN staff stf ON mc.created_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      ${whereClause}
      ORDER BY mc.created_at DESC;
    `;
    const res = await pool.query(query, values);
    return res.rows;
  }

  // ─── Student Marks ────────────────────────────────────────────

  public async upsertStudentMark(data: {
    student_id: string;
    component_id: string;
    marks_obtained: number;
    status?: MarkStatus;
    remarks?: string | null;
    entered_by: string;
    published_at?: Date | null;
  }, client?: PoolClient): Promise<StudentMarkRow> {
    const db = client || getPool();
    const query = `
      INSERT INTO student_marks (
        student_id, component_id, marks_obtained, status, remarks, entered_by, published_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (student_id, component_id)
      DO UPDATE SET
        marks_obtained = EXCLUDED.marks_obtained,
        status = EXCLUDED.status,
        remarks = EXCLUDED.remarks,
        entered_by = EXCLUDED.entered_by,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
      RETURNING id, student_id, component_id, marks_obtained::float AS marks_obtained,
                status, remarks, entered_by, published_at, created_at, updated_at;
    `;
    const values = [
      data.student_id,
      data.component_id,
      data.marks_obtained,
      data.status || 'DRAFT',
      data.remarks || null,
      data.entered_by,
      data.published_at || (data.status === 'PUBLISHED' ? new Date() : null),
    ];
    const res = await db.query(query, values);
    return res.rows[0];
  }

  public async findMarkById(id: string): Promise<StudentMarkWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        sm.id, sm.student_id, sm.component_id, sm.marks_obtained::float AS marks_obtained,
        sm.status, sm.remarks, sm.entered_by, sm.published_at, sm.created_at, sm.updated_at,
        mc.name AS component_name, mc.code AS component_code, mc.component_type,
        mc.max_marks::float AS max_marks, mc.weightage::float AS weightage,
        mc.subject_id, sub.name AS subject_name, sub.code AS subject_code,
        mc.class_id, c.name AS class_name,
        u.first_name AS student_first_name, u.last_name AS student_last_name,
        s.student_roll_number, s.enrollment_number
      FROM student_marks sm
      JOIN mark_components mc ON sm.component_id = mc.id
      JOIN subjects sub ON mc.subject_id = sub.id
      JOIN classes c ON mc.class_id = c.id
      JOIN students s ON sm.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE sm.id = $1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  public async updateMark(
    id: string,
    data: Partial<{ marks_obtained: number; remarks: string | null; status: MarkStatus }>,
    client?: PoolClient
  ): Promise<StudentMarkRow | null> {
    const db = client || getPool();
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [id];
    let paramIdx = 2;

    if (data.marks_obtained !== undefined) {
      setClauses.push(`marks_obtained = $${paramIdx++}`);
      values.push(data.marks_obtained);
    }
    if (data.remarks !== undefined) {
      setClauses.push(`remarks = $${paramIdx++}`);
      values.push(data.remarks);
    }
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
      if (data.status === 'PUBLISHED') {
        setClauses.push('published_at = NOW()');
      }
    }

    const query = `
      UPDATE student_marks
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, student_id, component_id, marks_obtained::float AS marks_obtained,
                status, remarks, entered_by, published_at, created_at, updated_at;
    `;
    const res = await db.query(query, values);
    return res.rows[0] || null;
  }

  public async publishMark(id: string, client?: PoolClient): Promise<StudentMarkRow | null> {
    const db = client || getPool();
    const query = `
      UPDATE student_marks
      SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id, student_id, component_id, marks_obtained::float AS marks_obtained,
                status, remarks, entered_by, published_at, created_at, updated_at;
    `;
    const res = await db.query(query, [id]);
    return res.rows[0] || null;
  }

  public async findMarksByComponent(componentId: string): Promise<StudentMarkWithDetails[]> {
    const pool = getPool();
    const query = `
      SELECT 
        sm.id, sm.student_id, sm.component_id, sm.marks_obtained::float AS marks_obtained,
        sm.status, sm.remarks, sm.entered_by, sm.published_at, sm.created_at, sm.updated_at,
        u.first_name AS student_first_name, u.last_name AS student_last_name,
        s.student_roll_number, s.enrollment_number
      FROM student_marks sm
      JOIN students s ON sm.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE sm.component_id = $1
      ORDER BY s.student_roll_number ASC;
    `;
    const res = await pool.query(query, [componentId]);
    return res.rows;
  }

  public async findMarksForStudent(
    studentId: string,
    onlyPublished: boolean = true,
    subjectId?: string
  ): Promise<StudentMarkWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['sm.student_id = $1'];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (onlyPublished) {
      conditions.push("sm.status = 'PUBLISHED'");
    }
    if (subjectId) {
      conditions.push(`mc.subject_id = $${paramIdx++}`);
      values.push(subjectId);
    }

    const query = `
      SELECT 
        sm.id, sm.student_id, sm.component_id, sm.marks_obtained::float AS marks_obtained,
        sm.status, sm.remarks, sm.entered_by, sm.published_at, sm.created_at, sm.updated_at,
        mc.name AS component_name, mc.code AS component_code, mc.component_type,
        mc.max_marks::float AS max_marks, mc.weightage::float AS weightage,
        mc.subject_id, sub.name AS subject_name, sub.code AS subject_code
      FROM student_marks sm
      JOIN mark_components mc ON sm.component_id = mc.id
      JOIN subjects sub ON mc.subject_id = sub.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY mc.created_at ASC;
    `;
    const res = await pool.query(query, values);
    return res.rows;
  }

  // ─── Student Subject Results ──────────────────────────────────

  public async upsertSubjectResult(data: {
    student_id: string;
    subject_id: string;
    class_id: string;
    academic_year: string;
    semester: number;
    total_marks: number;
    max_marks: number;
    percentage: number;
    grade?: string | null;
    grade_point?: number | null;
    result_status?: ResultStatus;
    published_at?: Date | null;
  }, client?: PoolClient): Promise<StudentSubjectResultRow> {
    const db = client || getPool();
    const query = `
      INSERT INTO student_subject_results (
        student_id, subject_id, class_id, academic_year, semester,
        total_marks, max_marks, percentage, grade, grade_point,
        result_status, published_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (student_id, subject_id, academic_year, semester)
      DO UPDATE SET
        class_id = EXCLUDED.class_id,
        total_marks = EXCLUDED.total_marks,
        max_marks = EXCLUDED.max_marks,
        percentage = EXCLUDED.percentage,
        grade = EXCLUDED.grade,
        grade_point = EXCLUDED.grade_point,
        result_status = EXCLUDED.result_status,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
      RETURNING id, student_id, subject_id, class_id, academic_year, semester,
                total_marks::float AS total_marks, max_marks::float AS max_marks,
                percentage::float AS percentage, grade, grade_point::float AS grade_point,
                result_status, published_at, created_at, updated_at;
    `;
    const values = [
      data.student_id,
      data.subject_id,
      data.class_id,
      data.academic_year,
      data.semester,
      data.total_marks,
      data.max_marks,
      data.percentage,
      data.grade || null,
      data.grade_point !== undefined ? data.grade_point : null,
      data.result_status || 'DRAFT',
      data.published_at || (data.result_status === 'PUBLISHED' ? new Date() : null),
    ];
    const res = await db.query(query, values);
    return res.rows[0];
  }

  public async findSubjectResult(
    studentId: string,
    subjectId: string,
    academicYear: string,
    semester: number
  ): Promise<StudentSubjectResultWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        ssr.id, ssr.student_id, ssr.subject_id, ssr.class_id, ssr.academic_year, ssr.semester,
        ssr.total_marks::float AS total_marks, ssr.max_marks::float AS max_marks,
        ssr.percentage::float AS percentage, ssr.grade, ssr.grade_point::float AS grade_point,
        ssr.result_status, ssr.published_at, ssr.created_at, ssr.updated_at,
        sub.name AS subject_name, sub.code AS subject_code,
        c.name AS class_name, c.division,
        u.first_name AS student_first_name, u.last_name AS student_last_name,
        s.student_roll_number, s.enrollment_number
      FROM student_subject_results ssr
      JOIN subjects sub ON ssr.subject_id = sub.id
      JOIN classes c ON ssr.class_id = c.id
      JOIN students s ON ssr.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ssr.student_id = $1 AND ssr.subject_id = $2 AND ssr.academic_year = $3 AND ssr.semester = $4;
    `;
    const res = await pool.query(query, [studentId, subjectId, academicYear, semester]);
    return res.rows[0] || null;
  }

  public async findSubjectResultsForStudent(
    studentId: string,
    onlyPublished: boolean = true
  ): Promise<StudentSubjectResultWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['ssr.student_id = $1'];
    const values: unknown[] = [studentId];

    if (onlyPublished) {
      conditions.push("ssr.result_status = 'PUBLISHED'");
    }

    const query = `
      SELECT 
        ssr.id, ssr.student_id, ssr.subject_id, ssr.class_id, ssr.academic_year, ssr.semester,
        ssr.total_marks::float AS total_marks, ssr.max_marks::float AS max_marks,
        ssr.percentage::float AS percentage, ssr.grade, ssr.grade_point::float AS grade_point,
        ssr.result_status, ssr.published_at, ssr.created_at, ssr.updated_at,
        sub.name AS subject_name, sub.code AS subject_code,
        c.name AS class_name, c.division
      FROM student_subject_results ssr
      JOIN subjects sub ON ssr.subject_id = sub.id
      JOIN classes c ON ssr.class_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY sub.code ASC;
    `;
    const res = await pool.query(query, values);
    return res.rows;
  }

  public async findSubjectResultsByClass(
    classId: string,
    filters: { subjectId?: string; academicYear?: string; semester?: number; resultStatus?: string } = {}
  ): Promise<StudentSubjectResultWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['ssr.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`ssr.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.academicYear) {
      conditions.push(`ssr.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`ssr.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.resultStatus) {
      conditions.push(`ssr.result_status = $${paramIdx++}`);
      values.push(filters.resultStatus.toUpperCase());
    }

    const query = `
      SELECT 
        ssr.id, ssr.student_id, ssr.subject_id, ssr.class_id, ssr.academic_year, ssr.semester,
        ssr.total_marks::float AS total_marks, ssr.max_marks::float AS max_marks,
        ssr.percentage::float AS percentage, ssr.grade, ssr.grade_point::float AS grade_point,
        ssr.result_status, ssr.published_at, ssr.created_at, ssr.updated_at,
        sub.name AS subject_name, sub.code AS subject_code,
        c.name AS class_name, c.division,
        u.first_name AS student_first_name, u.last_name AS student_last_name,
        s.student_roll_number, s.enrollment_number
      FROM student_subject_results ssr
      JOIN subjects sub ON ssr.subject_id = sub.id
      JOIN classes c ON ssr.class_id = c.id
      JOIN students s ON ssr.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.student_roll_number ASC, sub.code ASC;
    `;
    const res = await pool.query(query, values);
    return res.rows;
  }

  public async findAllResults(
    filters: { departmentId?: string; classId?: string; subjectId?: string; academicYear?: string; semester?: number; grade?: string; resultStatus?: string; limit?: number; offset?: number } = {}
  ): Promise<{ rows: StudentSubjectResultWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (filters.departmentId) {
      conditions.push(`c.department_id = $${paramIdx++}`);
      values.push(filters.departmentId);
    }
    if (filters.classId) {
      conditions.push(`ssr.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.subjectId) {
      conditions.push(`ssr.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.academicYear) {
      conditions.push(`ssr.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`ssr.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }
    if (filters.grade) {
      conditions.push(`ssr.grade = $${paramIdx++}`);
      values.push(filters.grade.toUpperCase());
    }
    if (filters.resultStatus) {
      conditions.push(`ssr.result_status = $${paramIdx++}`);
      values.push(filters.resultStatus.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM student_subject_results ssr JOIN classes c ON ssr.class_id = c.id ${whereClause}`,
      values
    );
    const total = countRes.rows[0]?.total || 0;

    let limitClause = '';
    if (filters.limit) {
      limitClause += ` LIMIT $${paramIdx++}`;
      values.push(filters.limit);
      if (filters.offset) {
        limitClause += ` OFFSET $${paramIdx++}`;
        values.push(filters.offset);
      }
    }

    const query = `
      SELECT 
        ssr.id, ssr.student_id, ssr.subject_id, ssr.class_id, ssr.academic_year, ssr.semester,
        ssr.total_marks::float AS total_marks, ssr.max_marks::float AS max_marks,
        ssr.percentage::float AS percentage, ssr.grade, ssr.grade_point::float AS grade_point,
        ssr.result_status, ssr.published_at, ssr.created_at, ssr.updated_at,
        sub.name AS subject_name, sub.code AS subject_code,
        c.name AS class_name, c.division,
        u.first_name AS student_first_name, u.last_name AS student_last_name,
        s.student_roll_number, s.enrollment_number
      FROM student_subject_results ssr
      JOIN subjects sub ON ssr.subject_id = sub.id
      JOIN classes c ON ssr.class_id = c.id
      JOIN students s ON ssr.student_id = s.id
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY ssr.created_at DESC
      ${limitClause};
    `;
    const res = await pool.query(query, values);
    return { rows: res.rows, total };
  }

  public async getMarksStats(): Promise<{
    total_components: number;
    total_marks_entered: number;
    published_marks: number;
    draft_marks: number;
  }> {
    const pool = getPool();
    const query = `
      SELECT 
        (SELECT COUNT(*)::int FROM mark_components) AS total_components,
        (SELECT COUNT(*)::int FROM student_marks) AS total_marks_entered,
        (SELECT COUNT(*)::int FROM student_marks WHERE status = 'PUBLISHED') AS published_marks,
        (SELECT COUNT(*)::int FROM student_marks WHERE status = 'DRAFT') AS draft_marks;
    `;
    const res = await pool.query(query);
    return res.rows[0] || { total_components: 0, total_marks_entered: 0, published_marks: 0, draft_marks: 0 };
  }

  public async getResultsStats(): Promise<{
    total_results: number;
    published_results: number;
    draft_results: number;
    students_with_results: number;
    average_percentage: number;
    pass_count: number;
    fail_count: number;
  }> {
    const pool = getPool();
    const query = `
      SELECT 
        COUNT(*)::int AS total_results,
        COUNT(*) FILTER (WHERE result_status = 'PUBLISHED')::int AS published_results,
        COUNT(*) FILTER (WHERE result_status = 'DRAFT')::int AS draft_results,
        COUNT(DISTINCT student_id)::int AS students_with_results,
        COALESCE(AVG(percentage), 0)::float AS average_percentage,
        COUNT(*) FILTER (WHERE percentage >= 40)::int AS pass_count,
        COUNT(*) FILTER (WHERE percentage < 40)::int AS fail_count
      FROM student_subject_results;
    `;
    const res = await pool.query(query);
    const row = res.rows[0] || {};
    return {
      total_results: row.total_results || 0,
      published_results: row.published_results || 0,
      draft_results: row.draft_results || 0,
      students_with_results: row.students_with_results || 0,
      average_percentage: parseFloat((row.average_percentage || 0).toFixed(2)),
      pass_count: row.pass_count || 0,
      fail_count: row.fail_count || 0,
    };
  }

  // ─── Auxiliary Relationship Helpers ───────────────────────────

  public async findStudentByUserId(userId: string): Promise<any | null> {
    const pool = getPool();
    const query = `
      SELECT s.id, s.user_id, s.student_roll_number, s.enrollment_number, s.year, s.semester, s.division,
             sc.class_id, c.name AS class_name, c.department_id, c.academic_year
      FROM students s
      LEFT JOIN student_classes sc ON s.id = sc.student_id
      LEFT JOIN classes c ON sc.class_id = c.id
      WHERE s.user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  public async findStudentById(studentId: string): Promise<any | null> {
    const pool = getPool();
    const query = `
      SELECT s.id, s.user_id, s.student_roll_number, s.enrollment_number, s.year, s.semester, s.division,
             sc.class_id, c.name AS class_name, c.department_id, c.academic_year
      FROM students s
      LEFT JOIN student_classes sc ON s.id = sc.student_id
      LEFT JOIN classes c ON sc.class_id = c.id
      WHERE s.id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [studentId]);
    return res.rows[0] || null;
  }

  public async findStaffByUserId(userId: string): Promise<any | null> {
    const pool = getPool();
    const query = 'SELECT id, user_id, employee_id, designation FROM staff WHERE user_id = $1';
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  public async isStaffAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const query = 'SELECT 1 FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2';
    const res = await pool.query(query, [staffId, subjectId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async findStudentsByClassId(classId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT s.id, s.user_id, s.student_roll_number, s.enrollment_number, s.year, s.semester, s.division,
             u.first_name, u.last_name, u.email
      FROM student_classes sc
      JOIN students s ON sc.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE sc.class_id = $1
      ORDER BY s.student_roll_number ASC;
    `;
    const res = await pool.query(query, [classId]);
    return res.rows;
  }

  public async findAssignmentMarksForStudent(studentId: string, subjectId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        a.id AS assignment_id, a.title, a.max_marks::float AS max_marks,
        sub.id AS submission_id, sub.marks::float AS marks_obtained, sub.status AS submission_status
      FROM assignments a
      LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = $1
      WHERE a.subject_id = $2;
    `;
    const res = await pool.query(query, [studentId, subjectId]);
    return res.rows;
  }

  public async findQuizScoreForStudent(studentId: string, subjectId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        q.id AS quiz_id, q.title, q.total_marks::float AS max_marks,
        qa.id AS attempt_id, qa.score::float AS score, qa.percentage::float AS percentage, qa.status AS attempt_status
      FROM quizzes q
      LEFT JOIN LATERAL (
        SELECT id, score, percentage, status
        FROM quiz_attempts
        WHERE quiz_id = q.id AND student_id = $1
        ORDER BY score DESC NULLS LAST
        LIMIT 1
      ) qa ON TRUE
      WHERE q.subject_id = $2 AND q.status IN ('PUBLISHED', 'CLOSED');
    `;
    const res = await pool.query(query, [studentId, subjectId]);
    return res.rows;
  }
}
