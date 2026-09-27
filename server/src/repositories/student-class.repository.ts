import { getPool } from '../config/database';

export interface StudentClassRow {
  id: string;
  student_id: string;
  class_id: string;
  academic_year: string;
  joined_at: Date;
  created_at: Date;
}

export class StudentClassRepository {
  /**
   * Assigns a student to a class.
   */
  public async assign(
    studentId: string,
    classId: string,
    academicYear = '2025-2026'
  ): Promise<StudentClassRow> {
    const pool = getPool();
    const query = `
      INSERT INTO student_classes (student_id, class_id, academic_year)
      VALUES ($1, $2, $3)
      ON CONFLICT (student_id, class_id, academic_year) DO UPDATE SET joined_at = NOW()
      RETURNING *;
    `;
    const res = await pool.query<StudentClassRow>(query, [
      studentId,
      classId,
      academicYear,
    ]);
    return res.rows[0];
  }

  /**
   * Removes student from a class.
   */
  public async remove(studentId: string, classId: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM student_classes WHERE student_id = $1 AND class_id = $2;`;
    const res = await pool.query(query, [studentId, classId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Gets current class history for a student.
   */
  public async findByStudent(studentId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        sc.id,
        sc.academic_year,
        sc.joined_at,
        c.id AS class_id,
        c.name AS class_name,
        c.year,
        c.semester,
        c.division,
        d.name AS department_name
      FROM student_classes sc
      JOIN classes c ON sc.class_id = c.id
      JOIN departments d ON c.department_id = d.id
      WHERE sc.student_id = $1
      ORDER BY sc.created_at DESC;
    `;
    const res = await pool.query(query, [studentId]);
    return res.rows;
  }

  /**
   * Gets all students in a class.
   */
  public async findStudentsByClass(classId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id AS student_id,
        s.student_roll_number,
        s.enrollment_number,
        u.first_name,
        u.last_name,
        u.email,
        u.account_status,
        sc.academic_year,
        sc.joined_at
      FROM student_classes sc
      JOIN students s ON sc.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE sc.class_id = $1
      ORDER BY s.student_roll_number ASC;
    `;
    const res = await pool.query(query, [classId]);
    return res.rows;
  }
}

export const studentClassRepository = new StudentClassRepository();
