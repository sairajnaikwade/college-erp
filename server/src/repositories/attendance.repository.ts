import { getPool } from '../config/database';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface AttendanceRow {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  marked_by: string;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceWithDetails extends AttendanceRow {
  student_roll_number?: string;
  enrollment_number?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_email?: string;
  subject_name?: string;
  subject_code?: string;
  subject_credits?: number;
  class_name?: string;
  division?: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  faculty_employee_id?: string;
}

export interface SubjectAttendanceSummary {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  faculty_name: string;
  faculty_code: string;
  total_sessions: number;
  attended_sessions: number;
  absent_sessions: number;
  late_sessions: number;
  percentage: number;
}

export interface OverallAttendanceSummary {
  total_conducted: number;
  total_attended: number;
  total_absent: number;
  total_late: number;
  overall_percentage: number;
  is_eligible: boolean;
}

export interface StudentAttendanceFullResponse {
  overall: OverallAttendanceSummary;
  subjects: SubjectAttendanceSummary[];
  records: AttendanceWithDetails[];
}

export interface CreateAttendanceDTO {
  student_id: string;
  class_id: string;
  subject_id: string;
  marked_by: string;
  attendance_date: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface UpdateAttendanceDTO {
  status?: AttendanceStatus;
  remarks?: string | null;
}

export interface AttendanceFilterOptions {
  studentId?: string;
  classId?: string;
  subjectId?: string;
  markedBy?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class AttendanceRepository {
  /**
   * Find attendance records for a specific student with joined metadata.
   */
  public async findStudentAttendance(
    studentId: string,
    filters: { subjectId?: string; startDate?: string; endDate?: string; status?: string } = {}
  ): Promise<AttendanceWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['a.student_id = $1'];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.startDate) {
      conditions.push(`a.attendance_date >= $${paramIdx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`a.attendance_date <= $${paramIdx++}`);
      values.push(filters.endDate);
    }
    if (filters.status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }

    const query = `
      SELECT 
        a.id,
        a.student_id,
        a.class_id,
        a.subject_id,
        a.marked_by,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        c.name AS class_name,
        c.division,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      JOIN staff stf ON a.marked_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.attendance_date DESC, a.created_at DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Computes dynamic attendance percentage and subject breakdown for a student.
   */
  public async getStudentAttendanceSummary(
    studentId: string,
    options: { academicYear?: string; semester?: number } = {}
  ): Promise<{ overall: OverallAttendanceSummary; subjects: SubjectAttendanceSummary[] }> {
    const pool = getPool();
    const conditions: string[] = ['a.student_id = $1'];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (options.academicYear) {
      conditions.push(`c.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`c.semester = $${paramIdx++}`);
      values.push(options.semester);
    }

    const query = `
      SELECT 
        sub.id AS subject_id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        COALESCE(MAX(fu.first_name || ' ' || fu.last_name), 'Faculty') AS faculty_name,
        COALESCE(MAX(stf.employee_id), 'N/A') AS faculty_code,
        COUNT(a.id)::int AS total_sessions,
        COUNT(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 END)::int AS attended_sessions,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END)::int AS absent_sessions,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int AS late_sessions
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN staff stf ON a.marked_by = stf.id
      LEFT JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY sub.id, sub.code, sub.name
      ORDER BY sub.code ASC;
    `;

    const res = await pool.query(query, values);

    let totalConducted = 0;
    let totalAttended = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    const subjects: SubjectAttendanceSummary[] = res.rows.map((r) => {
      const total = Number(r.total_sessions);
      const attended = Number(r.attended_sessions);
      const absent = Number(r.absent_sessions);
      const late = Number(r.late_sessions);
      const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(2)) : 100.0;

      totalConducted += total;
      totalAttended += attended;
      totalAbsent += absent;
      totalLate += late;

      return {
        subject_id: r.subject_id,
        subject_code: r.subject_code,
        subject_name: r.subject_name,
        faculty_name: r.faculty_name,
        faculty_code: r.faculty_code,
        total_sessions: total,
        attended_sessions: attended,
        absent_sessions: absent,
        late_sessions: late,
        percentage: pct,
      };
    });

    const overallPct =
      totalConducted > 0 ? parseFloat(((totalAttended / totalConducted) * 100).toFixed(2)) : 100.0;

    const overall: OverallAttendanceSummary = {
      total_conducted: totalConducted,
      total_attended: totalAttended,
      total_absent: totalAbsent,
      total_late: totalLate,
      overall_percentage: overallPct,
      is_eligible: overallPct >= 75.0,
    };

    return { overall, subjects };
  }

  /**
   * Find class attendance records for staff or admin.
   */
  public async findClassAttendance(
    classId: string,
    filters: { subjectId?: string; date?: string; status?: string } = {}
  ): Promise<AttendanceWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['a.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.date) {
      conditions.push(`a.attendance_date = $${paramIdx++}`);
      values.push(filters.date);
    }
    if (filters.status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(filters.status.toUpperCase());
    }

    const query = `
      SELECT 
        a.id,
        a.student_id,
        a.class_id,
        a.subject_id,
        a.marked_by,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at,
        s.student_roll_number,
        s.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        su.email AS student_email,
        sub.name AS subject_name,
        sub.code AS subject_code,
        c.name AS class_name,
        c.division,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users su ON s.user_id = su.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      JOIN staff stf ON a.marked_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.student_roll_number ASC, a.attendance_date DESC;
    `;

    const res = await pool.query(query, values);
    return res.rows;
  }

  /**
   * Find attendance for a specific class, subject, and date.
   */
  public async findAttendanceByDate(
    classId: string,
    subjectId: string,
    date: string
  ): Promise<AttendanceWithDetails[]> {
    const pool = getPool();
    const query = `
      SELECT 
        a.id,
        a.student_id,
        a.class_id,
        a.subject_id,
        a.marked_by,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at,
        s.student_roll_number,
        s.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        su.email AS student_email,
        sub.name AS subject_name,
        sub.code AS subject_code,
        c.name AS class_name,
        c.division
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users su ON s.user_id = su.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      WHERE a.class_id = $1 AND a.subject_id = $2 AND a.attendance_date = $3
      ORDER BY s.student_roll_number ASC;
    `;
    const res = await pool.query(query, [classId, subjectId, date]);
    return res.rows;
  }

  /**
   * Find single attendance record by ID.
   */
  public async findById(id: string): Promise<AttendanceWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        a.id,
        a.student_id,
        a.class_id,
        a.subject_id,
        a.marked_by,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at,
        s.student_roll_number,
        s.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        sub.name AS subject_name,
        sub.code AS subject_code,
        c.name AS class_name,
        c.division,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users su ON s.user_id = su.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      JOIN staff stf ON a.marked_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      WHERE a.id = $1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Check for existing duplicate attendance record.
   */
  public async findDuplicate(
    studentId: string,
    subjectId: string,
    attendanceDate: string,
    excludeId?: string
  ): Promise<AttendanceRow | null> {
    const pool = getPool();
    let query = `
      SELECT * FROM attendance
      WHERE student_id = $1 AND subject_id = $2 AND attendance_date = $3
    `;
    const values: unknown[] = [studentId, subjectId, attendanceDate];

    if (excludeId) {
      query += ` AND id != $4`;
      values.push(excludeId);
    }

    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  /**
   * Create single attendance record.
   */
  public async create(data: CreateAttendanceDTO): Promise<AttendanceRow> {
    const pool = getPool();
    const query = `
      INSERT INTO attendance (
        student_id,
        class_id,
        subject_id,
        marked_by,
        attendance_date,
        status,
        remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      data.student_id,
      data.class_id,
      data.subject_id,
      data.marked_by,
      data.attendance_date,
      data.status,
      data.remarks || null,
    ];
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  /**
   * Bulk create attendance records atomically within a transaction.
   */
  public async createBulk(records: CreateAttendanceDTO[]): Promise<AttendanceRow[]> {
    if (records.length === 0) return [];
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const results: AttendanceRow[] = [];

      for (const rec of records) {
        const query = `
          INSERT INTO attendance (
            student_id,
            class_id,
            subject_id,
            marked_by,
            attendance_date,
            status,
            remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT ON CONSTRAINT uq_attendance_student_subject_date
          DO UPDATE SET 
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            marked_by = EXCLUDED.marked_by,
            updated_at = NOW()
          RETURNING *;
        `;
        const values = [
          rec.student_id,
          rec.class_id,
          rec.subject_id,
          rec.marked_by,
          rec.attendance_date,
          rec.status,
          rec.remarks || null,
        ];
        const res = await client.query(query, values);
        results.push(res.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing attendance record.
   */
  public async update(id: string, data: UpdateAttendanceDTO): Promise<AttendanceRow | null> {
    const pool = getPool();
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [id];
    let paramIdx = 2;

    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      values.push(data.status);
    }
    if (data.remarks !== undefined) {
      setClauses.push(`remarks = $${paramIdx++}`);
      values.push(data.remarks);
    }

    const query = `
      UPDATE attendance
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  /**
   * Delete an attendance record.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM attendance WHERE id = $1 RETURNING id;`;
    const res = await pool.query(query, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * List all attendance records with pagination & filter options (for admin).
   */
  public async findAll(
    options: AttendanceFilterOptions = {}
  ): Promise<{ rows: AttendanceWithDetails[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.studentId) {
      conditions.push(`a.student_id = $${paramIdx++}`);
      values.push(options.studentId);
    }
    if (options.classId) {
      conditions.push(`a.class_id = $${paramIdx++}`);
      values.push(options.classId);
    }
    if (options.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(options.subjectId);
    }
    if (options.markedBy) {
      conditions.push(`a.marked_by = $${paramIdx++}`);
      values.push(options.markedBy);
    }
    if (options.startDate) {
      conditions.push(`a.attendance_date >= $${paramIdx++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`a.attendance_date <= $${paramIdx++}`);
      values.push(options.endDate);
    }
    if (options.status) {
      conditions.push(`a.status = $${paramIdx++}`);
      values.push(options.status.toUpperCase());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS count FROM attendance a ${whereClause};`;
    const countRes = await pool.query(countQuery, values);
    const total = countRes.rows[0]?.count || 0;

    let query = `
      SELECT 
        a.id,
        a.student_id,
        a.class_id,
        a.subject_id,
        a.marked_by,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.status,
        a.remarks,
        a.created_at,
        a.updated_at,
        s.student_roll_number,
        s.enrollment_number,
        su.first_name AS student_first_name,
        su.last_name AS student_last_name,
        su.email AS student_email,
        sub.name AS subject_name,
        sub.code AS subject_code,
        c.name AS class_name,
        c.division,
        fu.first_name AS faculty_first_name,
        fu.last_name AS faculty_last_name,
        stf.employee_id AS faculty_employee_id
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users su ON s.user_id = su.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      JOIN staff stf ON a.marked_by = stf.id
      JOIN users fu ON stf.user_id = fu.id
      ${whereClause}
      ORDER BY a.attendance_date DESC, a.created_at DESC
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

  /**
   * Find staff member by user ID.
   */
  public async findStaffByUserId(userId: string): Promise<{ id: string; employee_id: string } | null> {
    const pool = getPool();
    const query = `SELECT id, employee_id FROM staff WHERE user_id = $1;`;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Find student member by user ID.
   */
  public async findStudentByUserId(userId: string): Promise<{ id: string; student_roll_number: string } | null> {
    const pool = getPool();
    const query = `SELECT id, student_roll_number FROM students WHERE user_id = $1;`;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Validate if staff is assigned to teach a subject.
   */
  public async isStaffAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      SELECT 1 FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2;
    `;
    const res = await pool.query(query, [staffId, subjectId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Validate if student belongs to class.
   */
  public async isStudentInClass(studentId: string, classId: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      SELECT 1 FROM student_classes WHERE student_id = $1 AND class_id = $2;
    `;
    const res = await pool.query(query, [studentId, classId]);
    return (res.rowCount ?? 0) > 0;
  }
}
