import { getPool } from '../config/database';
import { AccountStatus } from '../types/common';
import { hashPassword } from '../utils/password';

export interface StaffWithFullProfile {
  staff_id: string;
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
  employee_id: string;
  designation: string;
  assigned_subject_count: number;
  assigned_subjects?: {
    id: string;
    code: string;
    name: string;
    semester: number;
    credits: number;
  }[];
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StaffFilter {
  search?: string;
  department_id?: string;
  account_status?: AccountStatus;
}

export interface CreateStaffDTO {
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department_id: string;
  employee_id: string;
  designation: string;
  subject_ids?: string[];
}

export interface UpdateStaffDTO {
  first_name?: string;
  last_name?: string;
  phone?: string;
  department_id?: string;
  employee_id?: string;
  designation?: string;
  account_status?: AccountStatus;
}

export class StaffRepository {
  /**
   * Retrieves all staff with joined user, department, and assigned subjects count.
   */
  public async findAll(filter?: StaffFilter): Promise<StaffWithFullProfile[]> {
    const pool = getPool();
    const conditions: string[] = ["u.role = 'STAFF'"];
    const values: any[] = [];
    let idx = 1;

    if (filter?.search) {
      conditions.push(
        `(LOWER(u.first_name) LIKE $${idx} OR LOWER(u.last_name) LIKE $${idx} OR LOWER(u.email) LIKE $${idx} OR LOWER(st.employee_id) LIKE $${idx})`
      );
      values.push(`%${filter.search.toLowerCase()}%`);
      idx++;
    }

    if (filter?.department_id) {
      conditions.push(`u.department_id = $${idx++}`);
      values.push(filter.department_id);
    }

    if (filter?.account_status) {
      conditions.push(`u.account_status = $${idx++}`);
      values.push(filter.account_status);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT 
        st.id AS staff_id,
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
        st.employee_id,
        st.designation,
        COUNT(DISTINCT ss.subject_id)::int AS assigned_subject_count,
        u.last_login_at,
        st.created_at,
        st.updated_at
      FROM staff st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN staff_subjects ss ON st.id = ss.staff_id
      ${whereClause}
      GROUP BY st.id, u.id, d.name, d.code
      ORDER BY st.employee_id ASC;
    `;
    const res = await pool.query<StaffWithFullProfile>(query, values);
    return res.rows;
  }

  /**
   * Retrieves staff by staff_id with assigned subjects list.
   */
  public async findById(staffId: string): Promise<StaffWithFullProfile | null> {
    const pool = getPool();
    const query = `
      SELECT 
        st.id AS staff_id,
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
        st.employee_id,
        st.designation,
        COUNT(DISTINCT ss.subject_id)::int AS assigned_subject_count,
        u.last_login_at,
        st.created_at,
        st.updated_at
      FROM staff st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN staff_subjects ss ON st.id = ss.staff_id
      WHERE st.id = $1
      GROUP BY st.id, u.id, d.name, d.code
      LIMIT 1;
    `;
    const res = await pool.query<StaffWithFullProfile>(query, [staffId]);
    if (!res.rows[0]) return null;

    const staff = res.rows[0];
    staff.assigned_subjects = await this.getAssignedSubjects(staffId);
    return staff;
  }

  /**
   * Retrieves staff by user_id.
   */
  public async findByUserId(userId: string): Promise<StaffWithFullProfile | null> {
    const pool = getPool();
    const query = `
      SELECT 
        st.id AS staff_id,
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
        st.employee_id,
        st.designation,
        COUNT(DISTINCT ss.subject_id)::int AS assigned_subject_count,
        u.last_login_at,
        st.created_at,
        st.updated_at
      FROM staff st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN staff_subjects ss ON st.id = ss.staff_id
      WHERE u.id = $1
      GROUP BY st.id, u.id, d.name, d.code
      LIMIT 1;
    `;
    const res = await pool.query<StaffWithFullProfile>(query, [userId]);
    if (!res.rows[0]) return null;

    const staff = res.rows[0];
    staff.assigned_subjects = await this.getAssignedSubjects(staff.staff_id);
    return staff;
  }

  /**
   * Creates a staff member with user account in a transaction.
   */
  public async createWithUser(dto: CreateStaffDTO): Promise<StaffWithFullProfile> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const passwordPlain = dto.password || 'Staff@123';
      const passwordHash = await hashPassword(passwordPlain);

      // 1. Insert User
      const userQuery = `
        INSERT INTO users (username, email, password_hash, role, account_status, first_name, last_name, phone, department_id)
        VALUES ($1, $2, $3, 'STAFF', 'ACTIVE', $4, $5, $6, $7)
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

      // 2. Insert Staff
      const staffQuery = `
        INSERT INTO staff (user_id, employee_id, designation)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const staffRes = await client.query(staffQuery, [
        userId,
        dto.employee_id.trim().toUpperCase(),
        dto.designation.trim(),
      ]);
      const staffId = staffRes.rows[0].id;

      // 3. Optional Subject assignments
      if (dto.subject_ids && dto.subject_ids.length > 0) {
        for (const subId of dto.subject_ids) {
          await client.query(
            `INSERT INTO staff_subjects (staff_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
            [staffId, subId]
          );
        }
      }

      await client.query('COMMIT');
      const staff = await this.findById(staffId);
      return staff!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates staff information in users and staff tables.
   */
  public async update(staffId: string, dto: UpdateStaffDTO): Promise<StaffWithFullProfile | null> {
    const pool = getPool();
    const existing = await this.findById(staffId);
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

      // Update staff table
      const stfFields: string[] = [];
      const stfValues: any[] = [];
      let sIdx = 1;

      if (dto.employee_id !== undefined) {
        stfFields.push(`employee_id = $${sIdx++}`);
        stfValues.push(dto.employee_id.trim().toUpperCase());
      }
      if (dto.designation !== undefined) {
        stfFields.push(`designation = $${sIdx++}`);
        stfValues.push(dto.designation.trim());
      }

      if (stfFields.length > 0) {
        stfFields.push(`updated_at = NOW()`);
        stfValues.push(staffId);
        const stfQuery = `UPDATE staff SET ${stfFields.join(', ')} WHERE id = $${sIdx};`;
        await client.query(stfQuery, stfValues);
      }

      await client.query('COMMIT');
      return this.findById(staffId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates staff account status.
   */
  public async updateStatus(staffId: string, status: AccountStatus): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE users
      SET account_status = $1, updated_at = NOW()
      WHERE id = (SELECT user_id FROM staff WHERE id = $2);
    `;
    const res = await pool.query(query, [status, staffId]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Retrieves subjects assigned to this staff member.
   */
  public async getAssignedSubjects(staffId: string): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        sub.id,
        sub.code,
        sub.name,
        sub.semester,
        sub.credits,
        d.name AS department_name
      FROM staff_subjects ss
      JOIN subjects sub ON ss.subject_id = sub.id
      JOIN departments d ON sub.department_id = d.id
      WHERE ss.staff_id = $1
      ORDER BY sub.code ASC;
    `;
    const res = await pool.query(query, [staffId]);
    return res.rows;
  }
}

export const staffRepository = new StaffRepository();
