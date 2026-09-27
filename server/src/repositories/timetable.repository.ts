import { getPool } from '../config/database';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type LectureType = 'THEORY' | 'LAB' | 'TUTORIAL' | 'SEMINAR';

export interface TimetableRow {
  id: string;
  academic_year: string;
  semester: number;
  department_id: string;
  class_id: string;
  division: string;
  subject_id: string;
  staff_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string;
  lecture_type: LectureType;
  created_at: Date;
  updated_at: Date;
}

export interface TimetableWithDetails extends TimetableRow {
  subject_name: string;
  subject_code: string;
  subject_credits: number;
  staff_name: string;
  staff_employee_id: string;
  staff_designation: string;
  class_name: string;
  department_name: string;
  department_code: string;
}

export interface CreateTimetableDTO {
  academic_year: string;
  semester: number;
  department_id: string;
  class_id: string;
  division?: string;
  subject_id: string;
  staff_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string;
  lecture_type?: LectureType;
}

export interface UpdateTimetableDTO {
  academic_year?: string;
  semester?: number;
  department_id?: string;
  class_id?: string;
  division?: string;
  subject_id?: string;
  staff_id?: string;
  day_of_week?: DayOfWeek;
  start_time?: string;
  end_time?: string;
  room?: string;
  lecture_type?: LectureType;
}

export interface TimetableFilterOptions {
  dayOfWeek?: string;
  academicYear?: string;
  semester?: number;
  departmentId?: string;
  classId?: string;
  staffId?: string;
}

export class TimetableRepository {
  /**
   * Retrieves timetable slots for a specific student based on their class enrollment.
   */
  public async findStudentTimetable(
    studentId: string,
    options: { dayOfWeek?: string; academicYear?: string; semester?: number } = {}
  ): Promise<TimetableWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['sc.student_id = $1'];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (options.dayOfWeek) {
      conditions.push(`t.day_of_week = $${paramIdx++}`);
      values.push(options.dayOfWeek.toUpperCase());
    }
    if (options.academicYear) {
      conditions.push(`t.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`t.semester = $${paramIdx++}`);
      values.push(options.semester);
    }

    const query = `
      SELECT 
        t.*,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        CONCAT(u_stf.first_name, ' ', u_stf.last_name) AS staff_name,
        stf.employee_id AS staff_employee_id,
        stf.designation AS staff_designation,
        cls.name AS class_name,
        d.name AS department_name,
        d.code AS department_code
      FROM student_classes sc
      INNER JOIN timetable t ON sc.class_id = t.class_id
      INNER JOIN subjects sub ON t.subject_id = sub.id
      INNER JOIN staff stf ON t.staff_id = stf.id
      INNER JOIN users u_stf ON stf.user_id = u_stf.id
      INNER JOIN classes cls ON t.class_id = cls.id
      INNER JOIN departments d ON t.department_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE t.day_of_week
          WHEN 'MONDAY' THEN 1
          WHEN 'TUESDAY' THEN 2
          WHEN 'WEDNESDAY' THEN 3
          WHEN 'THURSDAY' THEN 4
          WHEN 'FRIDAY' THEN 5
          WHEN 'SATURDAY' THEN 6
          WHEN 'SUNDAY' THEN 7
        END ASC,
        t.start_time ASC;
    `;

    const res = await pool.query<TimetableWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves timetable slots taught by a specific staff member.
   */
  public async findStaffTimetable(
    staffId: string,
    options: { dayOfWeek?: string; academicYear?: string; semester?: number } = {}
  ): Promise<TimetableWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['t.staff_id = $1'];
    const values: unknown[] = [staffId];
    let paramIdx = 2;

    if (options.dayOfWeek) {
      conditions.push(`t.day_of_week = $${paramIdx++}`);
      values.push(options.dayOfWeek.toUpperCase());
    }
    if (options.academicYear) {
      conditions.push(`t.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`t.semester = $${paramIdx++}`);
      values.push(options.semester);
    }

    const query = `
      SELECT 
        t.*,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        CONCAT(u_stf.first_name, ' ', u_stf.last_name) AS staff_name,
        stf.employee_id AS staff_employee_id,
        stf.designation AS staff_designation,
        cls.name AS class_name,
        d.name AS department_name,
        d.code AS department_code
      FROM timetable t
      INNER JOIN subjects sub ON t.subject_id = sub.id
      INNER JOIN staff stf ON t.staff_id = stf.id
      INNER JOIN users u_stf ON stf.user_id = u_stf.id
      INNER JOIN classes cls ON t.class_id = cls.id
      INNER JOIN departments d ON t.department_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE t.day_of_week
          WHEN 'MONDAY' THEN 1
          WHEN 'TUESDAY' THEN 2
          WHEN 'WEDNESDAY' THEN 3
          WHEN 'THURSDAY' THEN 4
          WHEN 'FRIDAY' THEN 5
          WHEN 'SATURDAY' THEN 6
          WHEN 'SUNDAY' THEN 7
        END ASC,
        t.start_time ASC;
    `;

    const res = await pool.query<TimetableWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves timetable slots for a class.
   */
  public async findByClass(
    classId: string,
    options: { dayOfWeek?: string } = {}
  ): Promise<TimetableWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = ['t.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    if (options.dayOfWeek) {
      conditions.push(`t.day_of_week = $${paramIdx++}`);
      values.push(options.dayOfWeek.toUpperCase());
    }

    const query = `
      SELECT 
        t.*,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        CONCAT(u_stf.first_name, ' ', u_stf.last_name) AS staff_name,
        stf.employee_id AS staff_employee_id,
        stf.designation AS staff_designation,
        cls.name AS class_name,
        d.name AS department_name,
        d.code AS department_code
      FROM timetable t
      INNER JOIN subjects sub ON t.subject_id = sub.id
      INNER JOIN staff stf ON t.staff_id = stf.id
      INNER JOIN users u_stf ON stf.user_id = u_stf.id
      INNER JOIN classes cls ON t.class_id = cls.id
      INNER JOIN departments d ON t.department_id = d.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE t.day_of_week
          WHEN 'MONDAY' THEN 1
          WHEN 'TUESDAY' THEN 2
          WHEN 'WEDNESDAY' THEN 3
          WHEN 'THURSDAY' THEN 4
          WHEN 'FRIDAY' THEN 5
          WHEN 'SATURDAY' THEN 6
          WHEN 'SUNDAY' THEN 7
        END ASC,
        t.start_time ASC;
    `;

    const res = await pool.query<TimetableWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves all timetable entries with arbitrary filtering (Admin).
   */
  public async findAll(options: TimetableFilterOptions = {}): Promise<TimetableWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.departmentId) {
      conditions.push(`t.department_id = $${paramIdx++}`);
      values.push(options.departmentId);
    }
    if (options.classId) {
      conditions.push(`t.class_id = $${paramIdx++}`);
      values.push(options.classId);
    }
    if (options.staffId) {
      conditions.push(`t.staff_id = $${paramIdx++}`);
      values.push(options.staffId);
    }
    if (options.dayOfWeek) {
      conditions.push(`t.day_of_week = $${paramIdx++}`);
      values.push(options.dayOfWeek.toUpperCase());
    }
    if (options.academicYear) {
      conditions.push(`t.academic_year = $${paramIdx++}`);
      values.push(options.academicYear);
    }
    if (options.semester) {
      conditions.push(`t.semester = $${paramIdx++}`);
      values.push(options.semester);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        t.*,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        CONCAT(u_stf.first_name, ' ', u_stf.last_name) AS staff_name,
        stf.employee_id AS staff_employee_id,
        stf.designation AS staff_designation,
        cls.name AS class_name,
        d.name AS department_name,
        d.code AS department_code
      FROM timetable t
      INNER JOIN subjects sub ON t.subject_id = sub.id
      INNER JOIN staff stf ON t.staff_id = stf.id
      INNER JOIN users u_stf ON stf.user_id = u_stf.id
      INNER JOIN classes cls ON t.class_id = cls.id
      INNER JOIN departments d ON t.department_id = d.id
      ${whereClause}
      ORDER BY 
        CASE t.day_of_week
          WHEN 'MONDAY' THEN 1
          WHEN 'TUESDAY' THEN 2
          WHEN 'WEDNESDAY' THEN 3
          WHEN 'THURSDAY' THEN 4
          WHEN 'FRIDAY' THEN 5
          WHEN 'SATURDAY' THEN 6
          WHEN 'SUNDAY' THEN 7
        END ASC,
        t.start_time ASC;
    `;

    const res = await pool.query<TimetableWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves single timetable slot by ID.
   */
  public async findById(id: string): Promise<TimetableWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        t.*,
        sub.name AS subject_name,
        sub.code AS subject_code,
        sub.credits AS subject_credits,
        CONCAT(u_stf.first_name, ' ', u_stf.last_name) AS staff_name,
        stf.employee_id AS staff_employee_id,
        stf.designation AS staff_designation,
        cls.name AS class_name,
        d.name AS department_name,
        d.code AS department_code
      FROM timetable t
      INNER JOIN subjects sub ON t.subject_id = sub.id
      INNER JOIN staff stf ON t.staff_id = stf.id
      INNER JOIN users u_stf ON stf.user_id = u_stf.id
      INNER JOIN classes cls ON t.class_id = cls.id
      INNER JOIN departments d ON t.department_id = d.id
      WHERE t.id = $1;
    `;
    const res = await pool.query<TimetableWithDetails>(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Check slot collision for class or staff member.
   */
  public async findConflicts(
    classId: string,
    staffId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<{ classConflict: boolean; staffConflict: boolean }> {
    const pool = getPool();
    let excludeSql = '';
    const values: unknown[] = [classId, staffId, dayOfWeek.toUpperCase(), startTime, endTime];

    if (excludeId) {
      excludeSql = `AND id != $6`;
      values.push(excludeId);
    }

    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE class_id = $1 AND (start_time < $5 AND end_time > $4))::int AS class_conflicts,
        COUNT(*) FILTER (WHERE staff_id = $2 AND (start_time < $5 AND end_time > $4))::int AS staff_conflicts
      FROM timetable
      WHERE day_of_week = $3 ${excludeSql};
    `;

    const res = await pool.query<{ class_conflicts: number; staff_conflicts: number }>(query, values);
    const row = res.rows[0];
    return {
      classConflict: (row?.class_conflicts || 0) > 0,
      staffConflict: (row?.staff_conflicts || 0) > 0,
    };
  }

  /**
   * Creates a new timetable slot.
   */
  public async create(dto: CreateTimetableDTO): Promise<TimetableRow> {
    const pool = getPool();
    const query = `
      INSERT INTO timetable (
        academic_year,
        semester,
        department_id,
        class_id,
        division,
        subject_id,
        staff_id,
        day_of_week,
        start_time,
        end_time,
        room,
        lecture_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const res = await pool.query<TimetableRow>(query, [
      dto.academic_year,
      dto.semester,
      dto.department_id,
      dto.class_id,
      dto.division || 'A',
      dto.subject_id,
      dto.staff_id,
      dto.day_of_week.toUpperCase(),
      dto.start_time,
      dto.end_time,
      dto.room,
      dto.lecture_type || 'THEORY',
    ]);
    return res.rows[0];
  }

  /**
   * Updates an existing timetable slot.
   */
  public async update(id: string, dto: UpdateTimetableDTO): Promise<TimetableRow | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (dto.academic_year !== undefined) {
      fields.push(`academic_year = $${paramIdx++}`);
      values.push(dto.academic_year);
    }
    if (dto.semester !== undefined) {
      fields.push(`semester = $${paramIdx++}`);
      values.push(dto.semester);
    }
    if (dto.department_id !== undefined) {
      fields.push(`department_id = $${paramIdx++}`);
      values.push(dto.department_id);
    }
    if (dto.class_id !== undefined) {
      fields.push(`class_id = $${paramIdx++}`);
      values.push(dto.class_id);
    }
    if (dto.division !== undefined) {
      fields.push(`division = $${paramIdx++}`);
      values.push(dto.division);
    }
    if (dto.subject_id !== undefined) {
      fields.push(`subject_id = $${paramIdx++}`);
      values.push(dto.subject_id);
    }
    if (dto.staff_id !== undefined) {
      fields.push(`staff_id = $${paramIdx++}`);
      values.push(dto.staff_id);
    }
    if (dto.day_of_week !== undefined) {
      fields.push(`day_of_week = $${paramIdx++}`);
      values.push(dto.day_of_week.toUpperCase());
    }
    if (dto.start_time !== undefined) {
      fields.push(`start_time = $${paramIdx++}`);
      values.push(dto.start_time);
    }
    if (dto.end_time !== undefined) {
      fields.push(`end_time = $${paramIdx++}`);
      values.push(dto.end_time);
    }
    if (dto.room !== undefined) {
      fields.push(`room = $${paramIdx++}`);
      values.push(dto.room);
    }
    if (dto.lecture_type !== undefined) {
      fields.push(`lecture_type = $${paramIdx++}`);
      values.push(dto.lecture_type);
    }

    if (fields.length === 0) {
      const current = await this.findById(id);
      return current;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE timetable
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *;
    `;

    const res = await pool.query<TimetableRow>(query, values);
    return res.rows[0] || null;
  }

  /**
   * Deletes a timetable slot.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query('DELETE FROM timetable WHERE id = $1 RETURNING id;', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const timetableRepository = new TimetableRepository();
