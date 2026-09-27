import { getPool } from '../config/database';

export interface AdminOverviewStats {
  total_students: number;
  total_staff: number;
  total_departments: number;
  total_subjects: number;
  total_classes: number;
  active_sessions: number;
}

export class OverviewRepository {
  /**
   * Retrieves aggregated system-wide academic & user counts.
   */
  public async getAdminOverview(): Promise<AdminOverviewStats> {
    const pool = getPool();
    const query = `
      SELECT 
        (SELECT COUNT(*)::int FROM students) AS total_students,
        (SELECT COUNT(*)::int FROM staff) AS total_staff,
        (SELECT COUNT(*)::int FROM departments) AS total_departments,
        (SELECT COUNT(*)::int FROM subjects) AS total_subjects,
        (SELECT COUNT(*)::int FROM classes) AS total_classes,
        (SELECT COUNT(*)::int FROM sessions WHERE revoked_at IS NULL AND expires_at > NOW()) AS active_sessions;
    `;
    const res = await pool.query<AdminOverviewStats>(query);
    return res.rows[0];
  }
}

export const overviewRepository = new OverviewRepository();
