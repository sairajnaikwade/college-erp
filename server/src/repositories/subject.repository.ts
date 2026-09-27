import { getPool } from '../config/database';

export interface SubjectRow {
  id: string;
  department_id: string;
  code: string;
  name: string;
  description: string | null;
  semester: number;
  credits: number;
  created_at: Date;
  updated_at: Date;
}

export interface SubjectWithDetails extends SubjectRow {
  department_name: string;
  department_code: string;
  assigned_staff_count: number;
  assigned_staff?: {
    staff_id: string;
    employee_id: string;
    designation: string;
    first_name: string;
    last_name: string;
    email: string;
  }[];
}

export interface SubjectFilter {
  department_id?: string;
  semester?: number;
}

export interface CreateSubjectDTO {
  department_id: string;
  code: string;
  name: string;
  description?: string;
  semester: number;
  credits?: number;
}

export interface UpdateSubjectDTO {
  department_id?: string;
  code?: string;
  name?: string;
  description?: string;
  semester?: number;
  credits?: number;
}

export class SubjectRepository {
  /**
   * Retrieves all subjects with department info and assigned staff count.
   */
  public async findAll(filter?: SubjectFilter): Promise<SubjectWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter?.department_id) {
      conditions.push(`s.department_id = $${idx++}`);
      values.push(filter.department_id);
    }
    if (filter?.semester) {
      conditions.push(`s.semester = $${idx++}`);
      values.push(filter.semester);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        s.*,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT ss.staff_id)::int AS assigned_staff_count
      FROM subjects s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN staff_subjects ss ON s.id = ss.subject_id
      ${whereClause}
      GROUP BY s.id, d.name, d.code
      ORDER BY s.code ASC;
    `;
    const res = await pool.query<SubjectWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves a subject by ID with assigned staff list.
   */
  public async findById(id: string): Promise<SubjectWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.*,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT ss.staff_id)::int AS assigned_staff_count
      FROM subjects s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN staff_subjects ss ON s.id = ss.subject_id
      WHERE s.id = $1
      GROUP BY s.id, d.name, d.code
      LIMIT 1;
    `;
    const res = await pool.query<SubjectWithDetails>(query, [id]);
    if (!res.rows[0]) return null;

    const subject = res.rows[0];

    // Fetch assigned staff
    const staffQuery = `
      SELECT 
        st.id AS staff_id,
        st.employee_id,
        st.designation,
        u.first_name,
        u.last_name,
        u.email
      FROM staff_subjects ss
      JOIN staff st ON ss.staff_id = st.id
      JOIN users u ON st.user_id = u.id
      WHERE ss.subject_id = $1;
    `;
    const staffRes = await pool.query(staffQuery, [id]);
    subject.assigned_staff = staffRes.rows;

    return subject;
  }

  /**
   * Finds subject by unique subject code.
   */
  public async findByCode(code: string): Promise<SubjectRow | null> {
    const pool = getPool();
    const query = `SELECT * FROM subjects WHERE LOWER(code) = LOWER($1) LIMIT 1;`;
    const res = await pool.query<SubjectRow>(query, [code.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Creates a new subject.
   */
  public async create(dto: CreateSubjectDTO): Promise<SubjectRow> {
    const pool = getPool();
    const query = `
      INSERT INTO subjects (department_id, code, name, description, semester, credits)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await pool.query<SubjectRow>(query, [
      dto.department_id,
      dto.code.trim().toUpperCase(),
      dto.name.trim(),
      dto.description ? dto.description.trim() : null,
      dto.semester,
      dto.credits || 3,
    ]);
    return res.rows[0];
  }

  /**
   * Updates an existing subject.
   */
  public async update(id: string, dto: UpdateSubjectDTO): Promise<SubjectRow | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.department_id !== undefined) {
      fields.push(`department_id = $${idx++}`);
      values.push(dto.department_id);
    }
    if (dto.code !== undefined) {
      fields.push(`code = $${idx++}`);
      values.push(dto.code.trim().toUpperCase());
    }
    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name.trim());
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description ? dto.description.trim() : null);
    }
    if (dto.semester !== undefined) {
      fields.push(`semester = $${idx++}`);
      values.push(dto.semester);
    }
    if (dto.credits !== undefined) {
      fields.push(`credits = $${idx++}`);
      values.push(dto.credits);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE subjects
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await pool.query<SubjectRow>(query, values);
    return res.rows[0] || null;
  }

  /**
   * Deletes a subject.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM subjects WHERE id = $1;`;
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const subjectRepository = new SubjectRepository();
