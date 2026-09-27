import { getPool } from '../config/database';

export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentWithStats extends DepartmentRow {
  student_count: number;
  staff_count: number;
  subject_count: number;
  class_count: number;
}

export interface CreateDepartmentDTO {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateDepartmentDTO {
  name?: string;
  code?: string;
  description?: string;
}

export class DepartmentRepository {
  /**
   * Retrieves all departments with aggregated counts.
   */
  public async findAll(): Promise<DepartmentWithStats[]> {
    const pool = getPool();
    const query = `
      SELECT 
        d.*,
        COUNT(DISTINCT u_stu.id)::int AS student_count,
        COUNT(DISTINCT u_stf.id)::int AS staff_count,
        COUNT(DISTINCT sub.id)::int AS subject_count,
        COUNT(DISTINCT cls.id)::int AS class_count
      FROM departments d
      LEFT JOIN users u_stu ON d.id = u_stu.department_id AND u_stu.role = 'STUDENT'
      LEFT JOIN users u_stf ON d.id = u_stf.department_id AND u_stf.role = 'STAFF'
      LEFT JOIN subjects sub ON d.id = sub.department_id
      LEFT JOIN classes cls ON d.id = cls.department_id
      GROUP BY d.id
      ORDER BY d.name ASC;
    `;
    const res = await pool.query<DepartmentWithStats>(query);
    return res.rows;
  }

  /**
   * Retrieves department by ID with stats.
   */
  public async findById(id: string): Promise<DepartmentWithStats | null> {
    const pool = getPool();
    const query = `
      SELECT 
        d.*,
        COUNT(DISTINCT u_stu.id)::int AS student_count,
        COUNT(DISTINCT u_stf.id)::int AS staff_count,
        COUNT(DISTINCT sub.id)::int AS subject_count,
        COUNT(DISTINCT cls.id)::int AS class_count
      FROM departments d
      LEFT JOIN users u_stu ON d.id = u_stu.department_id AND u_stu.role = 'STUDENT'
      LEFT JOIN users u_stf ON d.id = u_stf.department_id AND u_stf.role = 'STAFF'
      LEFT JOIN subjects sub ON d.id = sub.department_id
      LEFT JOIN classes cls ON d.id = cls.department_id
      WHERE d.id = $1
      GROUP BY d.id
      LIMIT 1;
    `;
    const res = await pool.query<DepartmentWithStats>(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Finds department by unique code.
   */
  public async findByCode(code: string): Promise<DepartmentRow | null> {
    const pool = getPool();
    const query = `SELECT * FROM departments WHERE LOWER(code) = LOWER($1) LIMIT 1;`;
    const res = await pool.query<DepartmentRow>(query, [code.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Creates a new department.
   */
  public async create(dto: CreateDepartmentDTO): Promise<DepartmentRow> {
    const pool = getPool();
    const query = `
      INSERT INTO departments (name, code, description)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const res = await pool.query<DepartmentRow>(query, [
      dto.name.trim(),
      dto.code.trim().toUpperCase(),
      dto.description ? dto.description.trim() : null,
    ]);
    return res.rows[0];
  }

  /**
   * Updates an existing department.
   */
  public async update(id: string, dto: UpdateDepartmentDTO): Promise<DepartmentRow | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name.trim());
    }
    if (dto.code !== undefined) {
      fields.push(`code = $${idx++}`);
      values.push(dto.code.trim().toUpperCase());
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description ? dto.description.trim() : null);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE departments
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await pool.query<DepartmentRow>(query, values);
    return res.rows[0] || null;
  }

  /**
   * Deletes department by ID.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM departments WHERE id = $1;`;
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const departmentRepository = new DepartmentRepository();
