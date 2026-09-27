import { getPool } from '../config/database';

export interface NoticeRow {
  id: string;
  title: string;
  description: string;
  category: 'ACADEMIC' | 'ADMINISTRATIVE' | 'EXAMINATION' | 'EVENT' | 'GENERAL' | 'URGENT';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  published_by: string | null;
  published_at: Date;
  expires_at: Date | null;
  target_role: 'ALL' | 'STUDENT' | 'STAFF' | 'ADMIN';
  department_id: string | null;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NoticeWithDetails extends NoticeRow {
  published_by_name: string | null;
  published_by_role: string | null;
  department_name: string | null;
  department_code: string | null;
}

export interface FindNoticesOptions {
  userRole?: 'STUDENT' | 'STAFF' | 'ADMIN';
  departmentId?: string | null;
  targetRole?: string;
  category?: string;
  priority?: string;
  isPublished?: boolean;
  includeExpired?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateNoticeDTO {
  title: string;
  description: string;
  category?: 'ACADEMIC' | 'ADMINISTRATIVE' | 'EXAMINATION' | 'EVENT' | 'GENERAL' | 'URGENT';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  published_by?: string | null;
  published_at?: Date | string;
  expires_at?: Date | string | null;
  target_role?: 'ALL' | 'STUDENT' | 'STAFF' | 'ADMIN';
  department_id?: string | null;
  is_published?: boolean;
}

export interface UpdateNoticeDTO {
  title?: string;
  description?: string;
  category?: 'ACADEMIC' | 'ADMINISTRATIVE' | 'EXAMINATION' | 'EVENT' | 'GENERAL' | 'URGENT';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expires_at?: Date | string | null;
  target_role?: 'ALL' | 'STUDENT' | 'STAFF' | 'ADMIN';
  department_id?: string | null;
  is_published?: boolean;
}

export class NoticeRepository {
  /**
   * Retrieves notices based on user role, targeting, category, and expiry filters.
   */
  public async findAll(options: FindNoticesOptions = {}): Promise<NoticeWithDetails[]> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    // 1. Role-based Audience Filtering
    if (options.userRole && options.userRole !== 'ADMIN') {
      conditions.push(`(n.target_role = 'ALL' OR n.target_role = $${paramIdx})`);
      values.push(options.userRole);
      paramIdx++;

      // Regular users only see published notices
      conditions.push(`n.is_published = TRUE`);

      // Regular users only see non-expired notices
      if (!options.includeExpired) {
        conditions.push(`(n.expires_at IS NULL OR n.expires_at > NOW())`);
      }

      // If user belongs to department, show notices that are either general (NULL) or match their department
      if (options.departmentId) {
        conditions.push(`(n.department_id IS NULL OR n.department_id = $${paramIdx})`);
        values.push(options.departmentId);
        paramIdx++;
      } else {
        // If user has no department, only show general institutional notices
        conditions.push(`n.department_id IS NULL`);
      }
    } else {
      // For ADMIN: can explicitly filter by isPublished or includeExpired
      if (options.isPublished !== undefined) {
        conditions.push(`n.is_published = $${paramIdx}`);
        values.push(options.isPublished);
        paramIdx++;
      }
      if (options.targetRole) {
        conditions.push(`n.target_role = $${paramIdx}`);
        values.push(options.targetRole);
        paramIdx++;
      }
      if (!options.includeExpired) {
        conditions.push(`(n.expires_at IS NULL OR n.expires_at > NOW())`);
      }
      if (options.departmentId) {
        conditions.push(`n.department_id = $${paramIdx}`);
        values.push(options.departmentId);
        paramIdx++;
      }
    }

    // 2. Category filter
    if (options.category) {
      conditions.push(`n.category = $${paramIdx}`);
      values.push(options.category.toUpperCase());
      paramIdx++;
    }

    // 3. Priority filter
    if (options.priority) {
      conditions.push(`n.priority = $${paramIdx}`);
      values.push(options.priority.toUpperCase());
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let paginationClause = '';
    if (options.limit) {
      paginationClause += ` LIMIT $${paramIdx}`;
      values.push(options.limit);
      paramIdx++;
    }
    if (options.offset) {
      paginationClause += ` OFFSET $${paramIdx}`;
      values.push(options.offset);
      paramIdx++;
    }

    const query = `
      SELECT 
        n.*,
        CASE 
          WHEN u.id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE 'Academic Administration'
        END AS published_by_name,
        u.role AS published_by_role,
        d.name AS department_name,
        d.code AS department_code
      FROM notices n
      LEFT JOIN users u ON n.published_by = u.id
      LEFT JOIN departments d ON n.department_id = d.id
      ${whereClause}
      ORDER BY 
        CASE n.priority 
          WHEN 'URGENT' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'NORMAL' THEN 3 
          WHEN 'LOW' THEN 4 
          ELSE 5 
        END ASC,
        n.published_at DESC
      ${paginationClause};
    `;

    const res = await pool.query<NoticeWithDetails>(query, values);
    return res.rows;
  }

  /**
   * Retrieves single notice by ID with author and department details.
   */
  public async findById(id: string): Promise<NoticeWithDetails | null> {
    const pool = getPool();
    const query = `
      SELECT 
        n.*,
        CASE 
          WHEN u.id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
          ELSE 'Academic Administration'
        END AS published_by_name,
        u.role AS published_by_role,
        d.name AS department_name,
        d.code AS department_code
      FROM notices n
      LEFT JOIN users u ON n.published_by = u.id
      LEFT JOIN departments d ON n.department_id = d.id
      WHERE n.id = $1;
    `;
    const res = await pool.query<NoticeWithDetails>(query, [id]);
    return res.rows[0] || null;
  }

  /**
   * Creates a new campus notice.
   */
  public async create(dto: CreateNoticeDTO): Promise<NoticeRow> {
    const pool = getPool();
    const query = `
      INSERT INTO notices (
        title,
        description,
        category,
        priority,
        published_by,
        published_at,
        expires_at,
        target_role,
        department_id,
        is_published
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), $7, $8, $9, COALESCE($10, TRUE))
      RETURNING *;
    `;
    const res = await pool.query<NoticeRow>(query, [
      dto.title,
      dto.description,
      dto.category || 'GENERAL',
      dto.priority || 'NORMAL',
      dto.published_by || null,
      dto.published_at || null,
      dto.expires_at || null,
      dto.target_role || 'ALL',
      dto.department_id || null,
      dto.is_published !== undefined ? dto.is_published : true,
    ]);
    return res.rows[0];
  }

  /**
   * Updates an existing notice.
   */
  public async update(id: string, dto: UpdateNoticeDTO): Promise<NoticeRow | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (dto.title !== undefined) {
      fields.push(`title = $${paramIdx++}`);
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${paramIdx++}`);
      values.push(dto.description);
    }
    if (dto.category !== undefined) {
      fields.push(`category = $${paramIdx++}`);
      values.push(dto.category);
    }
    if (dto.priority !== undefined) {
      fields.push(`priority = $${paramIdx++}`);
      values.push(dto.priority);
    }
    if (dto.expires_at !== undefined) {
      fields.push(`expires_at = $${paramIdx++}`);
      values.push(dto.expires_at);
    }
    if (dto.target_role !== undefined) {
      fields.push(`target_role = $${paramIdx++}`);
      values.push(dto.target_role);
    }
    if (dto.department_id !== undefined) {
      fields.push(`department_id = $${paramIdx++}`);
      values.push(dto.department_id);
    }
    if (dto.is_published !== undefined) {
      fields.push(`is_published = $${paramIdx++}`);
      values.push(dto.is_published);
    }

    if (fields.length === 0) {
      const current = await this.findById(id);
      return current;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE notices
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *;
    `;

    const res = await pool.query<NoticeRow>(query, values);
    return res.rows[0] || null;
  }

  /**
   * Deletes a notice.
   */
  public async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const res = await pool.query('DELETE FROM notices WHERE id = $1 RETURNING id;', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const noticeRepository = new NoticeRepository();
