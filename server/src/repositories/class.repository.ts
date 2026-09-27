import { getPool } from '../config/database';

export interface ClassRow {
  id: string;
  department_id: string;
  name: string;
  year: number;
  semester: number;
  division: string;
  academic_year: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClassWithDetails extends ClassRow {
  department_name: string;
  department_code: string;
  student_count: number;
}

export interface ClassFilter {
  department_id?: string;
  year?: number;
  semester?: number;
  academic_year?: string;
}

export interface CreateClassDTO {
  department_id: string;
  name: string;
  year: number;
  semester: number;
  division?: string;
  academic_year: string;
}

export interface UpdateClassDTO {
  department_id?: string;
  name?: string;
  year?: number;
  semester?: number;
  division?: string;
  academic_year?: string;
}

export class ClassRepository {
  /**
   * Retrieves all classes matching optional filters with department info and student count.
   */
  public async findAll(filter?: ClassFilter): Promise<ClassWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter?.department_id) {
      conditions.push(`c.department_id = $${idx++}`);
      values.push(filter.department_id);
    }
    if (filter?.year) {
      conditions.push(`c.year = $${idx++}`);
      values.push(filter.year);
    }
    if (filter?.semester) {
      conditions.push(`c.semester = $${idx++}`);
      values.push(filter.semester);
    }
    if (filter?.academic_year) {
      conditions.push(`c.academic_year = $${idx++}`);
      values.push(filter.academic_year);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        c.*,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT sc.student_id)::int AS student_count
      FROM classes c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN student_classes sc ON c.id = sc.class_id
      ${whereClause}
      GROUP BY c.id, d.name, d.code
      ORDER BY d.code ASC, c.year ASC, c.semester ASC, c.division ASC;
    `;
    const res = await pool.query<ClassWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves a single class by ID.
   */
  public async findById(id: string): Promise<ClassWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        c.*,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT sc.student_id)::int AS student_count
      FROM classes c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN student_classes sc ON c.id = sc.class_id
      WHERE c.id = $1
      GROUP BY c.id, d.name, d.code
      LIMIT 1;
    `;
    const res = await pool.query<ClassWithDetails>(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Creates a new class.
   */
  public async create(dto: CreateClassDTO): Promise<ClassRow> {
    const pool = getPool();
    const query = `
      INSERT INTO classes (department_id, name, year, semester, division, academic_year)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await pool.query<ClassRow>(query, [
      dto.department_id,
      dto.name.trim(),
      dto.year,
      dto.semester,
      (dto.division || 'A').trim().toUpperCase(),
      dto.academic_year.trim(),
    ]);
    return res.rows[0];
  }

  /**
   * Updates an existing class.
   */
  public async update(id: string, dto: UpdateClassDTO): Promise<ClassRow | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.department_id !== undefined) {
      fields.push(`department_id = $${idx++}`);
      values.push(dto.department_id);
    }
    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name.trim());
    }
    if (dto.year !== undefined) {
      fields.push(`year = $${idx++}`);
      values.push(dto.year);
    }
    if (dto.semester !== undefined) {
      fields.push(`semester = $${idx++}`);
      values.push(dto.semester);
    }
    if (dto.division !== undefined) {
      fields.push(`division = $${idx++}`);
      values.push(dto.division.trim().toUpperCase());
    }
    if (dto.academic_year !== undefined) {
      fields.push(`academic_year = $${idx++}`);
      values.push(dto.academic_year.trim());
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE classes
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await pool.query<ClassRow>(query, values);
    return res.rows[0] || null;
  }

  /**
   * Deletes a class.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM classes WHERE id = $1;`;
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const classRepository = new ClassRepository();
