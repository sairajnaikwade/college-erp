import { getPool } from '../config/database';

export interface StaffSubjectRow {
  id: string;
  staff_id: string;
  subject_id: string;
  assigned_at: Date;
  created_at: Date;
}

export class StaffSubjectRepository {
  /**
   * Assigns a staff member to a subject.
   */
  public async assign(staffId: string, subjectId: string): Promise<StaffSubjectRow> {
    const pool = getPool();
    const query = `
      INSERT INTO staff_subjects (staff_id, subject_id)
      VALUES ($1, $2)
      ON CONFLICT (staff_id, subject_id) DO UPDATE SET assigned_at = NOW()
      RETURNING *;
    `;
    const res = await pool.query<StaffSubjectRow>(query, [staffId, subjectId]);
    return res.rows[0];
  }

  /**
   * Removes assignment of a staff member from a subject.
   */
  public async remove(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2;`;
    const res = await pool.query(query, [staffId, subjectId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Checks if staff member is assigned to a subject.
   */
  public async isAssigned(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const query = `SELECT 1 FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2 LIMIT 1;`;
    const res = await pool.query(query, [staffId, subjectId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Finds all staff assigned to a subject.
   */
  public async findBySubject(subjectId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        st.id AS staff_id,
        st.employee_id,
        st.designation,
        u.first_name,
        u.last_name,
        u.email,
        ss.assigned_at
      FROM staff_subjects ss
      JOIN staff st ON ss.staff_id = st.id
      JOIN users u ON st.user_id = u.id
      WHERE ss.subject_id = $1
      ORDER BY u.first_name ASC;
    `;
    const res = await pool.query(query, [subjectId]);
    return res.rows;
  }
}

export const staffSubjectRepository = new StaffSubjectRepository();
