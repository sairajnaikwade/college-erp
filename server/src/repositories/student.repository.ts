import { getPool } from '../config/database';
import { AccountStatus } from '../types/common';
import { hashPassword } from '../utils/password';

export interface StudentWithFullProfile {
  student_id: string;
  user_id: string;
  username: string;
  email: string;
  account_status: AccountStatus;
  first_name: string;
  last_name: string;
  phone: string | null;
  department_id: string | null;
  department_name: string | null;
  department_code: string | null;
  profile_photo_url: string | null;
  student_roll_number: string;
  enrollment_number: string;
  year: number;
  semester: number;
  division: string;
  current_class_id?: string | null;
  current_class_name?: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudentFilter {
  search?: string;
  department_id?: string;
  year?: number;
  division?: string;
  account_status?: AccountStatus;
}

export interface CreateStudentDTO {
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department_id: string;
  student_roll_number: string;
  enrollment_number: string;
  year: number;
  semester: number;
  division?: string;
  class_id?: string;
}

export interface UpdateStudentDTO {
  first_name?: string;
  last_name?: string;
  phone?: string;
  department_id?: string;
  student_roll_number?: string;
  enrollment_number?: string;
  year?: number;
  semester?: number;
  division?: string;
  account_status?: AccountStatus;
}

export class StudentRepository {
  /**
   * Retrieves all students with joined user, department, and class details.
   */
  public async findAll(filter?: StudentFilter): Promise<StudentWithFullProfile[]> {
    const pool = getPool();
    const conditions: string[] = ["u.role = 'STUDENT'"];
    const values: any[] = [];
    let idx = 1;

    if (filter?.search) {
      conditions.push(
        `(LOWER(u.first_name) LIKE $${idx} OR LOWER(u.last_name) LIKE $${idx} OR LOWER(u.email) LIKE $${idx} OR LOWER(s.student_roll_number) LIKE $${idx} OR LOWER(s.enrollment_number) LIKE $${idx})`
      );
      values.push(`%${filter.search.toLowerCase()}%`);
      idx++;
    }

    if (filter?.department_id) {
      conditions.push(`u.department_id = $${idx++}`);
      values.push(filter.department_id);
    }

    if (filter?.year) {
      conditions.push(`s.year = $${idx++}`);
      values.push(filter.year);
    }

    if (filter?.division) {
      conditions.push(`s.division = $${idx++}`);
      values.push(filter.division.toUpperCase());
    }

    if (filter?.account_status) {
      conditions.push(`u.account_status = $${idx++}`);
      values.push(filter.account_status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT 
        s.id AS student_id,
        u.id AS user_id,
        u.username,
        u.email,
        u.account_status,
        u.first_name,
        u.last_name,
        u.phone,
        u.department_id,
        d.name AS department_name,
        d.code AS department_code,
        u.profile_photo_url,
        s.student_roll_number,
        s.enrollment_number,
        s.year,
        s.semester,
        s.division,
        cls.id AS current_class_id,
        cls.name AS current_class_name,
        u.last_login_at,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN (
        SELECT DISTINCT ON (student_id) student_id, class_id
        FROM student_classes
        ORDER BY student_id, created_at DESC
      ) active_sc ON s.id = active_sc.student_id
      LEFT JOIN classes cls ON active_sc.class_id = cls.id
      ${whereClause}
      ORDER BY s.student_roll_number ASC;
    `;
    const res = await pool.query<StudentWithFullProfile>(query, values);
    return res.rows;
  }

  /**
   * Retrieves student by student_id.
   */
  public async findById(studentId: string): Promise<StudentWithFullProfile | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id AS student_id,
        u.id AS user_id,
        u.username,
        u.email,
        u.account_status,
        u.first_name,
        u.last_name,
        u.phone,
        u.department_id,
        d.name AS department_name,
        d.code AS department_code,
        u.profile_photo_url,
        s.student_roll_number,
        s.enrollment_number,
        s.year,
        s.semester,
        s.division,
        cls.id AS current_class_id,
        cls.name AS current_class_name,
        u.last_login_at,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN (
        SELECT DISTINCT ON (student_id) student_id, class_id
        FROM student_classes
        ORDER BY student_id, created_at DESC
      ) active_sc ON s.id = active_sc.student_id
      LEFT JOIN classes cls ON active_sc.class_id = cls.id
      WHERE s.id = $1
      LIMIT 1;
    `;
    const res = await pool.query<StudentWithFullProfile>(query, [studentId]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves student by user_id.
   */
  public async findByUserId(userId: string): Promise<StudentWithFullProfile | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id AS student_id,
        u.id AS user_id,
        u.username,
        u.email,
        u.account_status,
        u.first_name,
        u.last_name,
        u.phone,
        u.department_id,
        d.name AS department_name,
        d.code AS department_code,
        u.profile_photo_url,
        s.student_roll_number,
        s.enrollment_number,
        s.year,
        s.semester,
        s.division,
        cls.id AS current_class_id,
        cls.name AS current_class_name,
        u.last_login_at,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN (
        SELECT DISTINCT ON (student_id) student_id, class_id
        FROM student_classes
        ORDER BY student_id, created_at DESC
      ) active_sc ON s.id = active_sc.student_id
      LEFT JOIN classes cls ON active_sc.class_id = cls.id
      WHERE u.id = $1
      LIMIT 1;
    `;
    const res = await pool.query<StudentWithFullProfile>(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Creates a student record with corresponding user account inside a transaction.
   */
  public async createWithUser(dto: CreateStudentDTO): Promise<StudentWithFullProfile> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const passwordPlain = dto.password || 'Student@123';
      const passwordHash = await hashPassword(passwordPlain);

      // 1. Insert User
      const userQuery = `
        INSERT INTO users (username, email, password_hash, role, account_status, first_name, last_name, phone, department_id)
        VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', $4, $5, $6, $7)
        RETURNING id;
      `;
      const userRes = await client.query(userQuery, [
        dto.username.trim(),
        dto.email.trim().toLowerCase(),
        passwordHash,
        dto.first_name.trim(),
        dto.last_name.trim(),
        dto.phone ? dto.phone.trim() : null,
        dto.department_id,
      ]);
      const userId = userRes.rows[0].id;

      // 2. Insert Student
      const studentQuery = `
        INSERT INTO students (user_id, student_roll_number, enrollment_number, year, semester, division)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `;
      const studentRes = await client.query(studentQuery, [
        userId,
        dto.student_roll_number.trim().toUpperCase(),
        dto.enrollment_number.trim().toUpperCase(),
        dto.year,
        dto.semester,
        (dto.division || 'A').trim().toUpperCase(),
      ]);
      const studentId = studentRes.rows[0].id;

      // 3. Optional Class Assignment
      if (dto.class_id) {
        const scQuery = `
          INSERT INTO student_classes (student_id, class_id, academic_year)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING;
        `;
        await client.query(scQuery, [studentId, dto.class_id, '2025-2026']);
      }

      await client.query('COMMIT');
      const student = await this.findById(studentId);
      return student!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates student information in users and students tables.
   */
  public async update(studentId: string, dto: UpdateStudentDTO): Promise<StudentWithFullProfile | null> {
    const pool = getPool();
    const existing = await this.findById(studentId);
    if (!existing) return null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update users table
      const userFields: string[] = [];
      const userValues: any[] = [];
      let uIdx = 1;

      if (dto.first_name !== undefined) {
        userFields.push(`first_name = $${uIdx++}`);
        userValues.push(dto.first_name.trim());
      }
      if (dto.last_name !== undefined) {
        userFields.push(`last_name = $${uIdx++}`);
        userValues.push(dto.last_name.trim());
      }
      if (dto.phone !== undefined) {
        userFields.push(`phone = $${uIdx++}`);
        userValues.push(dto.phone ? dto.phone.trim() : null);
      }
      if (dto.department_id !== undefined) {
        userFields.push(`department_id = $${uIdx++}`);
        userValues.push(dto.department_id);
      }
      if (dto.account_status !== undefined) {
        userFields.push(`account_status = $${uIdx++}`);
        userValues.push(dto.account_status);
      }

      if (userFields.length > 0) {
        userFields.push(`updated_at = NOW()`);
        userValues.push(existing.user_id);
        const userQuery = `UPDATE users SET ${userFields.join(', ')} WHERE id = $${uIdx};`;
        await client.query(userQuery, userValues);
      }

      // Update students table
      const stuFields: string[] = [];
      const stuValues: any[] = [];
      let sIdx = 1;

      if (dto.student_roll_number !== undefined) {
        stuFields.push(`student_roll_number = $${sIdx++}`);
        stuValues.push(dto.student_roll_number.trim().toUpperCase());
      }
      if (dto.enrollment_number !== undefined) {
        stuFields.push(`enrollment_number = $${sIdx++}`);
        stuValues.push(dto.enrollment_number.trim().toUpperCase());
      }
      if (dto.year !== undefined) {
        stuFields.push(`year = $${sIdx++}`);
        stuValues.push(dto.year);
      }
      if (dto.semester !== undefined) {
        stuFields.push(`semester = $${sIdx++}`);
        stuValues.push(dto.semester);
      }
      if (dto.division !== undefined) {
        stuFields.push(`division = $${sIdx++}`);
        stuValues.push(dto.division.trim().toUpperCase());
      }

      if (stuFields.length > 0) {
        stuFields.push(`updated_at = NOW()`);
        stuValues.push(studentId);
        const stuQuery = `UPDATE students SET ${stuFields.join(', ')} WHERE id = $${sIdx};`;
        await client.query(stuQuery, stuValues);
      }

      await client.query('COMMIT');
      return this.findById(studentId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates student account status (ACTIVE, DISABLED, LOCKED).
   */
  public async updateStatus(studentId: string, status: AccountStatus): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE users
      SET account_status = $1, updated_at = NOW()
      WHERE id = (SELECT user_id FROM students WHERE id = $2);
    `;
    const res = await pool.query(query, [status, studentId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Gets subjects enrolled for a student based on department & semester.
   */
  public async getEnrolledSubjects(studentId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        sub.id,
        sub.code,
        sub.name,
        sub.semester,
        sub.credits,
        sub.description
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON u.department_id = sub.department_id AND s.semester = sub.semester
      WHERE s.id = $1
      ORDER BY sub.code ASC;
    `;
    const res = await pool.query(query, [studentId]);
    return res.rows;
  }
}

export const studentRepository = new StudentRepository();
