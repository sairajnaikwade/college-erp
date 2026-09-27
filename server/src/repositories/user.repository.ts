import { getPool } from '../config/database';
import { AccountStatus } from '../types/common';
import { UserRole } from '../types/security-events';

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  account_status: AccountStatus;
  first_name: string;
  last_name: string;
  phone: string | null;
  department_id: string | null;
  profile_photo_url: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithProfile extends Omit<UserRow, 'password_hash'> {
  department_name?: string;
  department_code?: string;
  // Student specific
  student_roll_number?: string;
  enrollment_number?: string;
  year?: number;
  semester?: number;
  division?: string;
  // Staff specific
  employee_id?: string;
  designation?: string;
}

export class UserRepository {
  /**
   * Finds user by email or username (for login lookup).
   */
  public async findByEmailOrUsername(identifier: string): Promise<UserRow | null> {
    const pool = getPool();
    const query = `
      SELECT *
      FROM users
      WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
      LIMIT 1;
    `;
    const res = await pool.query<UserRow>(query, [identifier.trim()]);
    return res.rows[0] || null;
  }

  /**
   * Finds user by ID.
   */
  public async findById(id: string): Promise<UserRow | null> {
    const pool = getPool();
    const query = `SELECT * FROM users WHERE id = $1 LIMIT 1;`;
    const res = await pool.query<UserRow>(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Finds user with full department & role-specific profile (student/staff).
   */
  public async findWithProfileById(id: string): Promise<UserWithProfile | null> {
    const pool = getPool();
    const query = `
      SELECT 
        u.id, u.username, u.email, u.role, u.account_status,
        u.first_name, u.last_name, u.phone, u.department_id,
        u.profile_photo_url, u.last_login_at, u.created_at, u.updated_at,
        d.name AS department_name, d.code AS department_code,
        s.student_roll_number, s.enrollment_number, s.year, s.semester, s.division,
        st.employee_id, st.designation
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN staff st ON u.id = st.user_id
      WHERE u.id = $1
      LIMIT 1;
    `;
    const res = await pool.query<UserWithProfile>(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Updates user's last_login_at timestamp.
   */
  public async updateLastLogin(id: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1;`,
      [id]
    );
  }

  /**
   * Updates user account status (ACTIVE, DISABLED, LOCKED).
   */
  public async updateStatus(id: string, status: AccountStatus): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET account_status = $1, updated_at = NOW() WHERE id = $2;`,
      [status, id]
    );
  }
}

export const userRepository = new UserRepository();
