import { getPool } from '../config/database';

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class ReportsRepository {
  /**
   * Helper to find student info by user_id
   */
  public async findStudentByUserId(userId: string): Promise<{
    id: string;
    student_roll_number: string;
    enrollment_number: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
    department_name: string;
    department_code: string;
    class_id: string;
    class_name: string;
    division: string;
    academic_year: string;
    semester: number;
  } | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id,
        s.student_roll_number,
        s.enrollment_number,
        s.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.department_id,
        d.name AS department_name,
        d.code AS department_code,
        sc.class_id,
        c.name AS class_name,
        c.division,
        c.academic_year,
        c.semester
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      LEFT JOIN student_classes sc ON s.id = sc.student_id
      LEFT JOIN classes c ON sc.class_id = c.id
      WHERE s.user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Helper to find student info by student_id
   */
  public async findStudentById(studentId: string): Promise<{
    id: string;
    student_roll_number: string;
    enrollment_number: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
    department_name: string;
    department_code: string;
    class_id: string;
    class_name: string;
    division: string;
    academic_year: string;
    semester: number;
  } | null> {
    const pool = getPool();
    const query = `
      SELECT 
        s.id,
        s.student_roll_number,
        s.enrollment_number,
        s.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.department_id,
        d.name AS department_name,
        d.code AS department_code,
        sc.class_id,
        c.name AS class_name,
        c.division,
        c.academic_year,
        c.semester
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      LEFT JOIN student_classes sc ON s.id = sc.student_id
      LEFT JOIN classes c ON sc.class_id = c.id
      WHERE s.id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [studentId]);
    return res.rows[0] || null;
  }

  /**
   * Helper to find staff info by user_id
   */
  public async findStaffByUserId(userId: string): Promise<{
    id: string;
    employee_id: string;
    designation: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    department_id: string;
    department_name: string;
    department_code: string;
  } | null> {
    const pool = getPool();
    const query = `
      SELECT 
        st.id,
        st.employee_id,
        st.designation,
        st.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.department_id,
        d.name AS department_name,
        d.code AS department_code
      FROM staff st
      JOIN users u ON st.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      WHERE st.user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Helper to check staff assignment to subject
   */
  public async isStaffAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
    const pool = getPool();
    const query = `SELECT 1 FROM staff_subjects WHERE staff_id = $1 AND subject_id = $2 LIMIT 1;`;
    const res = await pool.query(query, [staffId, subjectId]);
    return (res.rowCount ?? 0) > 0;
  }

  // ─── 1. STUDENT ACADEMIC & SUMMARY REPORTS ───────────────────

  /**
   * Aggregated Student Academic Overview
   */
  public async getStudentAcademicSummary(studentId: string): Promise<{
    profile: any;
    subjects: any[];
    overall_attendance: {
      conducted: number;
      present: number;
      late: number;
      absent: number;
      percentage: number;
    };
    overall_assignments: {
      total: number;
      submitted: number;
      pending: number;
      graded: number;
      late: number;
      submission_rate: number;
    };
    overall_quizzes: {
      total: number;
      attempted: number;
      submitted: number;
      timed_out: number;
      average_score: number;
    };
    overall_results: {
      total_subjects: number;
      published_results: number;
      total_marks: number;
      max_marks: number;
      percentage: number;
      gpa: number;
      grade: string;
      is_passed: boolean;
    };
  }> {
    const pool = getPool();

    // 1. Student Profile & Enrolled Class
    const profileRes = await pool.query(
      `
      SELECT 
        s.id AS student_id,
        s.student_roll_number,
        s.enrollment_number,
        u.first_name,
        u.last_name,
        u.email,
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        c.id AS class_id,
        c.name AS class_name,
        c.division,
        c.academic_year,
        c.semester
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      JOIN student_classes sc ON s.id = sc.student_id
      JOIN classes c ON sc.class_id = c.id
      WHERE s.id = $1
      LIMIT 1;
      `,
      [studentId]
    );

    const profile = profileRes.rows[0] || null;
    const classId = profile?.class_id;
    const academicYear = profile?.academic_year || '2025-2026';
    const semester = profile?.semester || 5;

    // 2. Class Subjects List
    const subjectsRes = await pool.query(
      `
      SELECT 
        sub.id AS subject_id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        sub.credits
      FROM subjects sub
      WHERE sub.department_id = $1 AND sub.semester = $2
      ORDER BY sub.code ASC;
      `,
      [profile?.department_id, semester]
    );
    const subjectRows = subjectsRes.rows;

    // 3. Subject-wise Attendance Aggregation
    const attRes = await pool.query(
      `
      SELECT 
        a.subject_id,
        COUNT(*)::int AS conducted,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END)::int AS present,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int AS late,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END)::int AS absent
      FROM attendance a
      WHERE a.student_id = $1
      GROUP BY a.subject_id;
      `,
      [studentId]
    );
    const attMap = new Map<string, { conducted: number; present: number; late: number; absent: number }>();
    let totalConducted = 0;
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    for (const r of attRes.rows) {
      attMap.set(r.subject_id, {
        conducted: r.conducted,
        present: r.present,
        late: r.late,
        absent: r.absent,
      });
      totalConducted += r.conducted;
      totalPresent += r.present;
      totalLate += r.late;
      totalAbsent += r.absent;
    }

    const overallAttPercentage = totalConducted > 0
      ? Number((((totalPresent + totalLate) / totalConducted) * 100).toFixed(2))
      : 0;

    // 4. Assignments Aggregation
    const assignRes = await pool.query(
      `
      SELECT 
        a.subject_id,
        COUNT(DISTINCT a.id)::int AS total_assignments,
        COUNT(DISTINCT CASE WHEN subm.status IN ('SUBMITTED', 'LATE', 'GRADED') THEN a.id END)::int AS submitted,
        COUNT(DISTINCT CASE WHEN subm.status = 'GRADED' THEN a.id END)::int AS graded,
        COUNT(DISTINCT CASE WHEN subm.status = 'LATE' THEN a.id END)::int AS late
      FROM assignments a
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.student_id = $1
      WHERE a.class_id = $2 AND a.status != 'DRAFT'
      GROUP BY a.subject_id;
      `,
      [studentId, classId]
    );
    const assignMap = new Map<string, { total: number; submitted: number; graded: number; late: number }>();
    let totalAssignments = 0;
    let totalSubmissions = 0;
    let totalGradedAssignments = 0;
    let totalLateAssignments = 0;

    for (const r of assignRes.rows) {
      assignMap.set(r.subject_id, {
        total: r.total_assignments,
        submitted: r.submitted,
        graded: r.graded,
        late: r.late,
      });
      totalAssignments += r.total_assignments;
      totalSubmissions += r.submitted;
      totalGradedAssignments += r.graded;
      totalLateAssignments += r.late;
    }

    // 5. Quizzes Aggregation
    const quizRes = await pool.query(
      `
      SELECT 
        q.subject_id,
        COUNT(DISTINCT q.id)::int AS total_quizzes,
        COUNT(DISTINCT qa.id)::int AS attempted_quizzes,
        COUNT(DISTINCT CASE WHEN qa.status IN ('SUBMITTED', 'GRADED') THEN qa.id END)::int AS submitted_quizzes,
        COUNT(DISTINCT CASE WHEN qa.status = 'TIMED_OUT' THEN qa.id END)::int AS timed_out_quizzes,
        COALESCE(AVG(CASE WHEN qa.status IN ('SUBMITTED', 'GRADED') THEN qa.score END), 0)::float AS avg_score
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
      WHERE q.class_id = $2 AND q.status != 'DRAFT'
      GROUP BY q.subject_id;
      `,
      [studentId, classId]
    );
    const quizMap = new Map<string, { total: number; attempted: number; submitted: number; timed_out: number; avg_score: number }>();
    let totalQuizzes = 0;
    let totalQuizAttempts = 0;
    let totalQuizSubmitted = 0;
    let totalQuizTimedOut = 0;
    let totalQuizScoreSum = 0;
    let quizScoreCount = 0;

    for (const r of quizRes.rows) {
      quizMap.set(r.subject_id, {
        total: r.total_quizzes,
        attempted: r.attempted_quizzes,
        submitted: r.submitted_quizzes,
        timed_out: r.timed_out_quizzes,
        avg_score: Number(r.avg_score.toFixed(2)),
      });
      totalQuizzes += r.total_quizzes;
      totalQuizAttempts += r.attempted_quizzes;
      totalQuizSubmitted += r.submitted_quizzes;
      totalQuizTimedOut += r.timed_out_quizzes;
      if (r.submitted_quizzes > 0) {
        totalQuizScoreSum += r.avg_score * r.submitted_quizzes;
        quizScoreCount += r.submitted_quizzes;
      }
    }

    // 6. Results Aggregation (Published Subject Results)
    const resultsRes = await pool.query(
      `
      SELECT 
        r.subject_id,
        r.total_marks::float AS total_marks,
        r.max_marks::float AS max_marks,
        r.percentage::float AS percentage,
        r.grade,
        r.grade_point::float AS grade_point,
        r.result_status
      FROM student_subject_results r
      WHERE r.student_id = $1 AND r.academic_year = $2 AND r.semester = $3;
      `,
      [studentId, academicYear, semester]
    );
    const resultMap = new Map<string, any>();
    let totalMarksSum = 0;
    let maxMarksSum = 0;
    let totalGradePoints = 0;
    let publishedCount = 0;
    let allPassed = true;

    for (const r of resultsRes.rows) {
      resultMap.set(r.subject_id, r);
      if (r.result_status === 'PUBLISHED') {
        totalMarksSum += r.total_marks;
        maxMarksSum += r.max_marks;
        totalGradePoints += r.grade_point;
        publishedCount += 1;
        if (r.grade === 'F') allPassed = false;
      }
    }

    // Combine into Subject Performance Table
    const subjectsPerformance = subjectRows.map(sub => {
      const att = attMap.get(sub.subject_id) || { conducted: 0, present: 0, late: 0, absent: 0 };
      const attPct = att.conducted > 0
        ? Number((((att.present + att.late) / att.conducted) * 100).toFixed(2))
        : 0;
      const assign = assignMap.get(sub.subject_id) || { total: 0, submitted: 0, graded: 0, late: 0 };
      const qz = quizMap.get(sub.subject_id) || { total: 0, attempted: 0, submitted: 0, timed_out: 0, avg_score: 0 };
      const res = resultMap.get(sub.subject_id);

      return {
        subject_id: sub.subject_id,
        subject_code: sub.subject_code,
        subject_name: sub.subject_name,
        credits: sub.credits,
        marks_obtained: res ? res.total_marks : 0,
        max_marks: res ? res.max_marks : 0,
        percentage: res ? res.percentage : 0,
        grade: res ? res.grade : 'N/A',
        grade_point: res ? res.grade_point : 0,
        result_status: res ? res.result_status : 'PENDING',
        attendance: {
          conducted: att.conducted,
          present: att.present,
          late: att.late,
          absent: att.absent,
          percentage: attPct,
          status: attPct >= 75.0 ? 'ELIGIBLE' : 'SHORTAGE',
        },
        assignments: {
          total: assign.total,
          submitted: assign.submitted,
          graded: assign.graded,
        },
        quizzes: {
          total: qz.total,
          attempted: qz.attempted,
          submitted: qz.submitted,
          avg_score: qz.avg_score,
        },
      };
    });

    const overallPercentage = maxMarksSum > 0
      ? Number(((totalMarksSum / maxMarksSum) * 100).toFixed(2))
      : 0;
    const gpa = publishedCount > 0
      ? Number((totalGradePoints / publishedCount).toFixed(2))
      : 0;

    let overallGrade = 'N/A';
    if (publishedCount > 0) {
      if (overallPercentage >= 90) overallGrade = 'O';
      else if (overallPercentage >= 80) overallGrade = 'A+';
      else if (overallPercentage >= 70) overallGrade = 'A';
      else if (overallPercentage >= 60) overallGrade = 'B+';
      else if (overallPercentage >= 55) overallGrade = 'B';
      else if (overallPercentage >= 50) overallGrade = 'C';
      else if (overallPercentage >= 40) overallGrade = 'P';
      else overallGrade = 'F';
    }

    return {
      profile,
      subjects: subjectsPerformance,
      overall_attendance: {
        conducted: totalConducted,
        present: totalPresent,
        late: totalLate,
        absent: totalAbsent,
        percentage: overallAttPercentage,
      },
      overall_assignments: {
        total: totalAssignments,
        submitted: totalSubmissions,
        pending: Math.max(0, totalAssignments - totalSubmissions),
        graded: totalGradedAssignments,
        late: totalLateAssignments,
        submission_rate: totalAssignments > 0 ? Number(((totalSubmissions / totalAssignments) * 100).toFixed(2)) : 0,
      },
      overall_quizzes: {
        total: totalQuizzes,
        attempted: totalQuizAttempts,
        submitted: totalQuizSubmitted,
        timed_out: totalQuizTimedOut,
        average_score: quizScoreCount > 0 ? Number((totalQuizScoreSum / quizScoreCount).toFixed(2)) : 0,
      },
      overall_results: {
        total_subjects: subjectRows.length,
        published_results: publishedCount,
        total_marks: Number(totalMarksSum.toFixed(2)),
        max_marks: Number(maxMarksSum.toFixed(2)),
        percentage: overallPercentage,
        gpa,
        grade: overallGrade,
        is_passed: publishedCount === subjectRows.length && allPassed && overallPercentage >= 40,
      },
    };
  }

  /**
   * Detailed Student Attendance Report
   */
  public async getStudentAttendanceReport(
    studentId: string,
    filters: DateRangeFilter = {}
  ): Promise<{
    summary: {
      conducted: number;
      present: number;
      late: number;
      absent: number;
      percentage: number;
      status: string;
    };
    by_subject: Array<{
      subject_id: string;
      subject_code: string;
      subject_name: string;
      conducted: number;
      present: number;
      late: number;
      absent: number;
      percentage: number;
      status: string;
    }>;
    recent_logs: Array<{
      id: string;
      subject_code: string;
      subject_name: string;
      date: string;
      status: string;
      remarks: string | null;
    }>;
  }> {
    const pool = getPool();
    const conditions: string[] = ['a.student_id = $1'];
    const values: unknown[] = [studentId];
    let paramIdx = 2;

    if (filters.startDate) {
      conditions.push(`a.attendance_date >= $${paramIdx++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`a.attendance_date <= $${paramIdx++}`);
      values.push(filters.endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 1. By Subject Aggregation
    const subQuery = `
      SELECT 
        sub.id AS subject_id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        COUNT(a.id)::int AS conducted,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END)::int AS present,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int AS late,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END)::int AS absent
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      ${whereClause}
      GROUP BY sub.id, sub.code, sub.name
      ORDER BY sub.code ASC;
    `;
    const subRes = await pool.query(subQuery, values);

    let totalConducted = 0;
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    const bySubject = subRes.rows.map(r => {
      const conducted = r.conducted;
      const present = r.present;
      const late = r.late;
      const absent = r.absent;
      const pct = conducted > 0 ? Number((((present + late) / conducted) * 100).toFixed(2)) : 0;

      totalConducted += conducted;
      totalPresent += present;
      totalLate += late;
      totalAbsent += absent;

      return {
        subject_id: r.subject_id,
        subject_code: r.subject_code,
        subject_name: r.subject_name,
        conducted,
        present,
        late,
        absent,
        percentage: pct,
        status: pct >= 75.0 ? 'ELIGIBLE' : 'SHORTAGE',
      };
    });

    const totalPct = totalConducted > 0
      ? Number((((totalPresent + totalLate) / totalConducted) * 100).toFixed(2))
      : 0;

    // 2. Recent Logs
    const logQuery = `
      SELECT 
        a.id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS date,
        a.status,
        a.remarks
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      ${whereClause}
      ORDER BY a.attendance_date DESC, a.created_at DESC
      LIMIT 50;
    `;
    const logRes = await pool.query(logQuery, values);

    return {
      summary: {
        conducted: totalConducted,
        present: totalPresent,
        late: totalLate,
        absent: totalAbsent,
        percentage: totalPct,
        status: totalPct >= 75.0 ? 'ELIGIBLE' : 'SHORTAGE',
      },
      by_subject: bySubject,
      recent_logs: logRes.rows,
    };
  }

  /**
   * Detailed Student Assignment Report
   */
  public async getStudentAssignmentReport(studentId: string): Promise<{
    summary: {
      total_assignments: number;
      submitted_count: number;
      pending_count: number;
      late_count: number;
      graded_count: number;
      submission_rate: number;
    };
    assignments: Array<{
      id: string;
      title: string;
      subject_code: string;
      subject_name: string;
      due_date: string;
      max_marks: number;
      submission_status: string;
      submitted_at: string | null;
      marks_obtained: number | null;
      feedback: string | null;
    }>;
  }> {
    const pool = getPool();
    const query = `
      SELECT 
        a.id,
        a.title,
        sub.code AS subject_code,
        sub.name AS subject_name,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        COALESCE(subm.status, 'NOT_SUBMITTED') AS submission_status,
        TO_CHAR(subm.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        subm.marks::float AS marks_obtained,
        subm.feedback
      FROM assignments a
      JOIN student_classes sc ON a.class_id = sc.class_id
      JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.student_id = $1
      WHERE sc.student_id = $1 AND a.status != 'DRAFT'
      ORDER BY a.due_date DESC;
    `;
    const res = await pool.query(query, [studentId]);
    const rows = res.rows;

    let submitted = 0;
    let late = 0;
    let graded = 0;

    for (const r of rows) {
      if (r.submission_status === 'SUBMITTED' || r.submission_status === 'GRADED') submitted += 1;
      if (r.submission_status === 'LATE') {
        submitted += 1;
        late += 1;
      }
      if (r.submission_status === 'GRADED') graded += 1;
    }

    const total = rows.length;
    const pending = Math.max(0, total - submitted);
    const submissionRate = total > 0 ? Number(((submitted / total) * 100).toFixed(2)) : 0;

    return {
      summary: {
        total_assignments: total,
        submitted_count: submitted,
        pending_count: pending,
        late_count: late,
        graded_count: graded,
        submission_rate: submissionRate,
      },
      assignments: rows,
    };
  }

  /**
   * Detailed Student Quiz Report
   */
  public async getStudentQuizReport(studentId: string): Promise<{
    summary: {
      total_quizzes: number;
      attempted_count: number;
      submitted_count: number;
      timed_out_count: number;
      average_score: number;
    };
    quizzes: Array<{
      id: string;
      title: string;
      subject_code: string;
      subject_name: string;
      total_marks: number;
      passing_marks: number;
      attempt_status: string;
      started_at: string | null;
      submitted_at: string | null;
      score: number | null;
      percentage: number | null;
      is_passed: boolean | null;
    }>;
  }> {
    const pool = getPool();
    const query = `
      SELECT 
        q.id,
        q.title,
        sub.code AS subject_code,
        sub.name AS subject_name,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        COALESCE(qa.status, 'NOT_ATTEMPTED') AS attempt_status,
        TO_CHAR(qa.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
        TO_CHAR(qa.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS submitted_at,
        qa.score::float AS score,
        qa.percentage::float AS percentage,
        CASE WHEN qa.score IS NOT NULL AND qa.score >= q.passing_marks THEN true 
             WHEN qa.score IS NOT NULL THEN false 
             ELSE NULL END AS is_passed
      FROM quizzes q
      JOIN student_classes sc ON q.class_id = sc.class_id
      JOIN subjects sub ON q.subject_id = sub.id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
      WHERE sc.student_id = $1 AND q.status != 'DRAFT'
      ORDER BY q.created_at DESC;
    `;
    const res = await pool.query(query, [studentId]);
    const rows = res.rows;

    let attempted = 0;
    let submitted = 0;
    let timedOut = 0;
    let scoreSum = 0;
    let scoredCount = 0;

    for (const r of rows) {
      if (r.attempt_status !== 'NOT_ATTEMPTED') attempted += 1;
      if (r.attempt_status === 'SUBMITTED' || r.attempt_status === 'GRADED') submitted += 1;
      if (r.attempt_status === 'TIMED_OUT') timedOut += 1;
      if (r.score !== null) {
        scoreSum += r.score;
        scoredCount += 1;
      }
    }

    const avgScore = scoredCount > 0 ? Number((scoreSum / scoredCount).toFixed(2)) : 0;

    return {
      summary: {
        total_quizzes: rows.length,
        attempted_count: attempted,
        submitted_count: submitted,
        timed_out_count: timedOut,
        average_score: avgScore,
      },
      quizzes: rows,
    };
  }

  // ─── 2. CLASS & SUBJECT REPORTS (Staff / Admin) ──────────────

  /**
   * Class Attendance Report (with 75% threshold)
   */
  public async getClassAttendanceReport(
    classId: string,
    filters: {
      subjectId?: string;
      academicYear?: string;
      semester?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{
    class_info: any;
    summary: {
      total_students: number;
      average_attendance: number;
      eligible_count: number;
      shortage_count: number;
      eligible_percentage: number;
    };
    students: Array<{
      student_id: string;
      roll_number: string;
      first_name: string;
      last_name: string;
      conducted: number;
      present: number;
      late: number;
      absent: number;
      attendance_percentage: number;
      status: string; // 'ELIGIBLE' | 'SHORTAGE'
    }>;
  }> {
    const pool = getPool();

    // 1. Get Class Info
    const classRes = await pool.query(
      `
      SELECT c.id, c.name, c.division, c.academic_year, c.semester, d.name AS department_name, d.code AS department_code
      FROM classes c
      JOIN departments d ON c.department_id = d.id
      WHERE c.id = $1;
      `,
      [classId]
    );
    const classInfo = classRes.rows[0] || null;

    // 2. Query Student-level Attendance
    const conditions: string[] = ['sc.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    let attFilter = '';
    if (filters.subjectId) {
      attFilter += ` AND a.subject_id = $${paramIdx++}`;
      values.push(filters.subjectId);
    }
    if (filters.startDate) {
      attFilter += ` AND a.attendance_date >= $${paramIdx++}`;
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      attFilter += ` AND a.attendance_date <= $${paramIdx++}`;
      values.push(filters.endDate);
    }

    const query = `
      SELECT 
        s.id AS student_id,
        s.student_roll_number AS roll_number,
        u.first_name,
        u.last_name,
        COUNT(a.id)::int AS conducted,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END)::int AS present,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int AS late,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END)::int AS absent
      FROM student_classes sc
      JOIN students s ON sc.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN attendance a ON s.id = a.student_id ${attFilter}
      WHERE ${conditions.join(' AND ')}
      GROUP BY s.id, s.student_roll_number, u.first_name, u.last_name
      ORDER BY s.student_roll_number ASC;
    `;
    const res = await pool.query(query, values);

    let eligibleCount = 0;
    let shortageCount = 0;
    let totalPctSum = 0;

    const studentRows = res.rows.map(r => {
      const conducted = r.conducted;
      const present = r.present;
      const late = r.late;
      const absent = r.absent;
      const pct = conducted > 0 ? Number((((present + late) / conducted) * 100).toFixed(2)) : 0;
      const status = pct >= 75.0 ? 'ELIGIBLE' : 'SHORTAGE';

      if (status === 'ELIGIBLE') eligibleCount += 1;
      else shortageCount += 1;
      totalPctSum += pct;

      return {
        student_id: r.student_id,
        roll_number: r.roll_number,
        first_name: r.first_name,
        last_name: r.last_name,
        conducted,
        present,
        late,
        absent,
        attendance_percentage: pct,
        status,
      };
    });

    const totalStudents = studentRows.length;
    const avgAttendance = totalStudents > 0 ? Number((totalPctSum / totalStudents).toFixed(2)) : 0;
    const eligiblePct = totalStudents > 0 ? Number(((eligibleCount / totalStudents) * 100).toFixed(2)) : 0;

    return {
      class_info: classInfo,
      summary: {
        total_students: totalStudents,
        average_attendance: avgAttendance,
        eligible_count: eligibleCount,
        shortage_count: shortageCount,
        eligible_percentage: eligiblePct,
      },
      students: studentRows,
    };
  }

  /**
   * Class Performance Report (Subject Results Roster & Summary)
   */
  public async getClassPerformanceReport(
    classId: string,
    filters: { subjectId?: string; academicYear?: string; semester?: number } = {}
  ): Promise<{
    class_info: any;
    summary: {
      total_students: number;
      published_results: number;
      average_percentage: number;
      highest_percentage: number;
      lowest_percentage: number;
      pass_count: number;
      fail_count: number;
      pass_rate: number;
    };
    results: Array<{
      result_id: string;
      student_id: string;
      roll_number: string;
      first_name: string;
      last_name: string;
      subject_id: string;
      subject_code: string;
      subject_name: string;
      total_marks: number;
      max_marks: number;
      percentage: number;
      grade: string;
      grade_point: number;
      result_status: string;
    }>;
  }> {
    const pool = getPool();

    const classRes = await pool.query(
      `SELECT c.id, c.name, c.division, c.academic_year, c.semester, d.name AS department_name FROM classes c JOIN departments d ON c.department_id = d.id WHERE c.id = $1;`,
      [classId]
    );
    const classInfo = classRes.rows[0] || null;

    const conditions: string[] = ['r.class_id = $1'];
    const values: unknown[] = [classId];
    let paramIdx = 2;

    if (filters.subjectId) {
      conditions.push(`r.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }
    if (filters.academicYear) {
      conditions.push(`r.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`r.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }

    const query = `
      SELECT 
        r.id AS result_id,
        s.id AS student_id,
        s.student_roll_number AS roll_number,
        u.first_name,
        u.last_name,
        sub.id AS subject_id,
        sub.code AS subject_code,
        sub.name AS subject_name,
        r.total_marks::float AS total_marks,
        r.max_marks::float AS max_marks,
        r.percentage::float AS percentage,
        r.grade,
        r.grade_point::float AS grade_point,
        r.result_status
      FROM student_subject_results r
      JOIN students s ON r.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON r.subject_id = sub.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.student_roll_number ASC, sub.code ASC;
    `;
    const res = await pool.query(query, values);
    const rows = res.rows;

    let publishedCount = 0;
    let passCount = 0;
    let failCount = 0;
    let pctSum = 0;
    let highestPct = 0;
    let lowestPct = 100;

    for (const r of rows) {
      if (r.result_status === 'PUBLISHED') {
        publishedCount += 1;
        pctSum += r.percentage;
        if (r.percentage > highestPct) highestPct = r.percentage;
        if (r.percentage < lowestPct) lowestPct = r.percentage;
        if (r.grade !== 'F' && r.percentage >= 40) passCount += 1;
        else failCount += 1;
      }
    }

    if (publishedCount === 0) {
      lowestPct = 0;
    }

    const avgPct = publishedCount > 0 ? Number((pctSum / publishedCount).toFixed(2)) : 0;
    const passRate = publishedCount > 0 ? Number(((passCount / publishedCount) * 100).toFixed(2)) : 0;

    return {
      class_info: classInfo,
      summary: {
        total_students: rows.length,
        published_results: publishedCount,
        average_percentage: avgPct,
        highest_percentage: Number(highestPct.toFixed(2)),
        lowest_percentage: Number(lowestPct.toFixed(2)),
        pass_count: passCount,
        fail_count: failCount,
        pass_rate: passRate,
      },
      results: rows,
    };
  }

  /**
   * Subject Performance Analytics (Grade Distribution & Metrics)
   */
  public async getSubjectPerformanceReport(
    subjectId: string,
    filters: { classId?: string; academicYear?: string; semester?: number } = {}
  ): Promise<{
    subject_info: any;
    metrics: {
      total_students: number;
      published_count: number;
      average_marks: number;
      maximum_marks: number;
      minimum_marks: number;
      average_percentage: number;
      pass_count: number;
      fail_count: number;
      pass_percentage: number;
    };
    grade_distribution: {
      O: number;
      'A+': number;
      A: number;
      'B+': number;
      B: number;
      C: number;
      P: number;
      F: number;
    };
  }> {
    const pool = getPool();

    const subRes = await pool.query(
      `
      SELECT sub.id, sub.code, sub.name, sub.credits, d.name AS department_name, d.code AS department_code
      FROM subjects sub
      JOIN departments d ON sub.department_id = d.id
      WHERE sub.id = $1;
      `,
      [subjectId]
    );
    const subjectInfo = subRes.rows[0] || null;

    const conditions: string[] = ['r.subject_id = $1'];
    const values: unknown[] = [subjectId];
    let paramIdx = 2;

    if (filters.classId) {
      conditions.push(`r.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.academicYear) {
      conditions.push(`r.academic_year = $${paramIdx++}`);
      values.push(filters.academicYear);
    }
    if (filters.semester) {
      conditions.push(`r.semester = $${paramIdx++}`);
      values.push(filters.semester);
    }

    const query = `
      SELECT 
        r.total_marks::float AS total_marks,
        r.max_marks::float AS max_marks,
        r.percentage::float AS percentage,
        r.grade,
        r.result_status
      FROM student_subject_results r
      WHERE ${conditions.join(' AND ')} AND r.result_status = 'PUBLISHED';
    `;
    const res = await pool.query(query, values);
    const rows = res.rows;

    const gradeDist = {
      O: 0,
      'A+': 0,
      A: 0,
      'B+': 0,
      B: 0,
      C: 0,
      P: 0,
      F: 0,
    };

    let totalMarks = 0;
    let maxMark = 0;
    let minMark = rows.length > 0 ? rows[0].total_marks : 0;
    let pctSum = 0;
    let passCount = 0;
    let failCount = 0;

    for (const r of rows) {
      totalMarks += r.total_marks;
      pctSum += r.percentage;
      if (r.total_marks > maxMark) maxMark = r.total_marks;
      if (r.total_marks < minMark) minMark = r.total_marks;

      if (r.grade in gradeDist) {
        gradeDist[r.grade as keyof typeof gradeDist] += 1;
      }

      if (r.grade !== 'F' && r.percentage >= 40) passCount += 1;
      else failCount += 1;
    }

    const totalCount = rows.length;
    const avgMarks = totalCount > 0 ? Number((totalMarks / totalCount).toFixed(2)) : 0;
    const avgPct = totalCount > 0 ? Number((pctSum / totalCount).toFixed(2)) : 0;
    const passPct = totalCount > 0 ? Number(((passCount / totalCount) * 100).toFixed(2)) : 0;

    return {
      subject_info: subjectInfo,
      metrics: {
        total_students: totalCount,
        published_count: totalCount,
        average_marks: avgMarks,
        maximum_marks: Number(maxMark.toFixed(2)),
        minimum_marks: Number(minMark.toFixed(2)),
        average_percentage: avgPct,
        pass_count: passCount,
        fail_count: failCount,
        pass_percentage: passPct,
      },
      grade_distribution: gradeDist,
    };
  }

  // ─── 3. ASSIGNMENT & QUIZ ANALYTICS (Staff / Admin) ──────────

  /**
   * Assignment Performance Analytics
   */
  public async getAssignmentAnalytics(assignmentId?: string, filters: { classId?: string; subjectId?: string } = {}): Promise<{
    summary: {
      total_assignments: number;
      total_submissions: number;
      submitted_on_time: number;
      late_submissions: number;
      pending_submissions: number;
      graded_submissions: number;
      average_marks: number;
      overall_submission_rate: number;
    };
    assignments: Array<{
      id: string;
      title: string;
      subject_code: string;
      subject_name: string;
      class_name: string;
      due_date: string;
      max_marks: number;
      total_enrolled: number;
      submitted: number;
      late: number;
      pending: number;
      graded: number;
      average_marks: number;
      submission_rate: number;
    }>;
  }> {
    const pool = getPool();
    const conditions: string[] = ["a.status != 'DRAFT'"];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (assignmentId) {
      conditions.push(`a.id = $${paramIdx++}`);
      values.push(assignmentId);
    }
    if (filters.classId) {
      conditions.push(`a.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.subjectId) {
      conditions.push(`a.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT 
        a.id,
        a.title,
        sub.code AS subject_code,
        sub.name AS subject_name,
        c.name AS class_name,
        TO_CHAR(a.due_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_date,
        a.max_marks::float AS max_marks,
        (SELECT COUNT(*)::int FROM student_classes sc WHERE sc.class_id = a.class_id) AS total_enrolled,
        COUNT(CASE WHEN subm.status IN ('SUBMITTED', 'GRADED') THEN 1 END)::int AS submitted_on_time,
        COUNT(CASE WHEN subm.status = 'LATE' THEN 1 END)::int AS late_count,
        COUNT(CASE WHEN subm.status = 'GRADED' THEN 1 END)::int AS graded_count,
        COALESCE(AVG(subm.marks), 0)::float AS average_marks
      FROM assignments a
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN assignment_submissions subm ON a.id = subm.assignment_id AND subm.status IN ('SUBMITTED', 'LATE', 'GRADED')
      ${whereClause}
      GROUP BY a.id, a.title, sub.code, sub.name, c.name, a.due_date, a.max_marks, a.class_id
      ORDER BY a.due_date DESC;
    `;
    const res = await pool.query(query, values);
    const rows = res.rows;

    let totalSubmissions = 0;
    let totalOnTime = 0;
    let totalLate = 0;
    let totalPending = 0;
    let totalGraded = 0;
    let totalMarksSum = 0;
    let gradedCount = 0;
    let totalEnrolledSum = 0;

    const detailedList = rows.map(r => {
      const totalEnrolled = r.total_enrolled;
      const submitted = r.submitted_on_time;
      const late = r.late_count;
      const graded = r.graded_count;
      const totalSub = submitted + late;
      const pending = Math.max(0, totalEnrolled - totalSub);
      const subRate = totalEnrolled > 0 ? Number(((totalSub / totalEnrolled) * 100).toFixed(2)) : 0;
      const avgM = Number(r.average_marks.toFixed(2));

      totalSubmissions += totalSub;
      totalOnTime += submitted;
      totalLate += late;
      totalPending += pending;
      totalGraded += graded;
      totalEnrolledSum += totalEnrolled;
      if (graded > 0) {
        totalMarksSum += avgM * graded;
        gradedCount += graded;
      }

      return {
        id: r.id,
        title: r.title,
        subject_code: r.subject_code,
        subject_name: r.subject_name,
        class_name: r.class_name,
        due_date: r.due_date,
        max_marks: r.max_marks,
        total_enrolled: totalEnrolled,
        submitted: submitted,
        late: late,
        pending: pending,
        graded: graded,
        average_marks: avgM,
        submission_rate: subRate,
      };
    });

    const overallAvgMarks = gradedCount > 0 ? Number((totalMarksSum / gradedCount).toFixed(2)) : 0;
    const overallSubRate = totalEnrolledSum > 0 ? Number(((totalSubmissions / totalEnrolledSum) * 100).toFixed(2)) : 0;

    return {
      summary: {
        total_assignments: rows.length,
        total_submissions: totalSubmissions,
        submitted_on_time: totalOnTime,
        late_submissions: totalLate,
        pending_submissions: totalPending,
        graded_submissions: totalGraded,
        average_marks: overallAvgMarks,
        overall_submission_rate: overallSubRate,
      },
      assignments: detailedList,
    };
  }

  /**
   * Quiz Performance Analytics
   */
  public async getQuizAnalytics(quizId?: string, filters: { classId?: string; subjectId?: string } = {}): Promise<{
    summary: {
      total_quizzes: number;
      published_quizzes: number;
      closed_quizzes: number;
      draft_quizzes: number;
      total_attempts: number;
      submitted_attempts: number;
      timed_out_attempts: number;
      average_score: number;
      overall_pass_rate: number;
    };
    quizzes: Array<{
      id: string;
      title: string;
      subject_code: string;
      subject_name: string;
      class_name: string;
      status: string;
      total_marks: number;
      passing_marks: number;
      total_enrolled: number;
      total_attempts: number;
      submitted: number;
      timed_out: number;
      average_score: number;
      highest_score: number;
      lowest_score: number;
      pass_count: number;
      fail_count: number;
      completion_rate: number;
    }>;
  }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (quizId) {
      conditions.push(`q.id = $${paramIdx++}`);
      values.push(quizId);
    }
    if (filters.classId) {
      conditions.push(`q.class_id = $${paramIdx++}`);
      values.push(filters.classId);
    }
    if (filters.subjectId) {
      conditions.push(`q.subject_id = $${paramIdx++}`);
      values.push(filters.subjectId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        q.id,
        q.title,
        q.status,
        sub.code AS subject_code,
        sub.name AS subject_name,
        c.name AS class_name,
        q.total_marks::float AS total_marks,
        q.passing_marks::float AS passing_marks,
        (SELECT COUNT(*)::int FROM student_classes sc WHERE sc.class_id = q.class_id) AS total_enrolled,
        COUNT(qa.id)::int AS total_attempts,
        COUNT(CASE WHEN qa.status IN ('SUBMITTED', 'GRADED') THEN 1 END)::int AS submitted_count,
        COUNT(CASE WHEN qa.status = 'TIMED_OUT' THEN 1 END)::int AS timed_out_count,
        COALESCE(AVG(CASE WHEN qa.status IN ('SUBMITTED', 'GRADED') THEN qa.score END), 0)::float AS average_score,
        COALESCE(MAX(CASE WHEN qa.status IN ('SUBMITTED', 'GRADED') THEN qa.score END), 0)::float AS highest_score,
        COALESCE(MIN(CASE WHEN qa.status IN ('SUBMITTED', 'GRADED') THEN qa.score END), 0)::float AS lowest_score,
        COUNT(CASE WHEN qa.score >= q.passing_marks THEN 1 END)::int AS pass_count,
        COUNT(CASE WHEN qa.score IS NOT NULL AND qa.score < q.passing_marks THEN 1 END)::int AS fail_count
      FROM quizzes q
      JOIN subjects sub ON q.subject_id = sub.id
      JOIN classes c ON q.class_id = c.id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      ${whereClause}
      GROUP BY q.id, q.title, q.status, sub.code, sub.name, c.name, q.total_marks, q.passing_marks, q.class_id
      ORDER BY q.created_at DESC;
    `;
    const res = await pool.query(query, values);
    const rows = res.rows;

    let publishedCount = 0;
    let closedCount = 0;
    let draftCount = 0;
    let totalAttempts = 0;
    let submittedAttempts = 0;
    let timedOutAttempts = 0;
    let passSum = 0;
    let failSum = 0;
    let scoreSum = 0;
    let scoredCount = 0;

    const quizList = rows.map(r => {
      if (r.status === 'PUBLISHED') publishedCount += 1;
      else if (r.status === 'CLOSED') closedCount += 1;
      else if (r.status === 'DRAFT') draftCount += 1;

      totalAttempts += r.total_attempts;
      submittedAttempts += r.submitted_count;
      timedOutAttempts += r.timed_out_count;
      passSum += r.pass_count;
      failSum += r.fail_count;

      if (r.submitted_count > 0) {
        scoreSum += r.average_score * r.submitted_count;
        scoredCount += r.submitted_count;
      }

      const compRate = r.total_enrolled > 0 ? Number(((r.submitted_count / r.total_enrolled) * 100).toFixed(2)) : 0;

      return {
        id: r.id,
        title: r.title,
        status: r.status,
        subject_code: r.subject_code,
        subject_name: r.subject_name,
        class_name: r.class_name,
        total_marks: r.total_marks,
        passing_marks: r.passing_marks,
        total_enrolled: r.total_enrolled,
        total_attempts: r.total_attempts,
        submitted: r.submitted_count,
        timed_out: r.timed_out_count,
        average_score: Number(r.average_score.toFixed(2)),
        highest_score: Number(r.highest_score.toFixed(2)),
        lowest_score: Number(r.lowest_score.toFixed(2)),
        pass_count: r.pass_count,
        fail_count: r.fail_count,
        completion_rate: compRate,
      };
    });

    const overallAvgScore = scoredCount > 0 ? Number((scoreSum / scoredCount).toFixed(2)) : 0;
    const totalEvals = passSum + failSum;
    const overallPassRate = totalEvals > 0 ? Number(((passSum / totalEvals) * 100).toFixed(2)) : 0;

    return {
      summary: {
        total_quizzes: rows.length,
        published_quizzes: publishedCount,
        closed_quizzes: closedCount,
        draft_quizzes: draftCount,
        total_attempts: totalAttempts,
        submitted_attempts: submittedAttempts,
        timed_out_attempts: timedOutAttempts,
        average_score: overallAvgScore,
        overall_pass_rate: overallPassRate,
      },
      quizzes: quizList,
    };
  }

  // ─── 4. FACULTY ACADEMIC ACTIVITY (Staff / Admin) ────────────

  /**
   * Faculty Personal Academic Activity Summary
   */
  public async getFacultyActivitySummary(staffId: string): Promise<{
    faculty_info: any;
    assigned_subjects: Array<{ id: string; code: string; name: string }>;
    assigned_classes: Array<{ id: string; name: string; division: string }>;
    activity: {
      attendance_sessions_marked: number;
      assignments_created: number;
      assignments_graded: number;
      notes_uploaded: number;
      notes_published: number;
      quizzes_created: number;
      quizzes_published: number;
      mark_components_configured: number;
      student_marks_entered: number;
      results_published: number;
    };
  }> {
    const pool = getPool();

    // 1. Faculty Details
    const staffRes = await pool.query(
      `
      SELECT 
        st.id,
        st.employee_id,
        st.designation,
        u.first_name,
        u.last_name,
        u.email,
        d.name AS department_name,
        d.code AS department_code
      FROM staff st
      JOIN users u ON st.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      WHERE st.id = $1;
      `,
      [staffId]
    );
    const facultyInfo = staffRes.rows[0] || null;

    // 2. Assigned Subjects
    const subRes = await pool.query(
      `
      SELECT s.id, s.code, s.name 
      FROM staff_subjects ss
      JOIN subjects s ON ss.subject_id = s.id
      WHERE ss.staff_id = $1
      ORDER BY s.code ASC;
      `,
      [staffId]
    );

    // 3. Assigned Classes
    const classRes = await pool.query(
      `
      SELECT DISTINCT c.id, c.name, c.division
      FROM staff_subjects ss
      JOIN subjects s ON ss.subject_id = s.id
      JOIN classes c ON c.department_id = s.department_id AND c.semester = s.semester
      WHERE ss.staff_id = $1
      ORDER BY c.name ASC;
      `,
      [staffId]
    );

    // 4. Metrics
    const [
      attRes,
      assignCreatedRes,
      assignGradedRes,
      notesRes,
      quizzesRes,
      componentsRes,
      marksRes,
      resultsRes,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM attendance WHERE marked_by = $1;`, [staffId]),
      pool.query(`SELECT COUNT(*)::int AS count FROM assignments WHERE created_by = $1;`, [staffId]),
      pool.query(`SELECT COUNT(*)::int AS count FROM assignment_submissions WHERE graded_by = $1;`, [staffId]),
      pool.query(
        `SELECT COUNT(*)::int AS total, COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END)::int AS published FROM notes WHERE uploaded_by = $1;`,
        [staffId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total, COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END)::int AS published FROM quizzes WHERE created_by = $1;`,
        [staffId]
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM mark_components WHERE created_by = $1;`, [staffId]),
      pool.query(`SELECT COUNT(*)::int AS count FROM student_marks WHERE entered_by = $1;`, [staffId]),
      pool.query(
        `
        SELECT COUNT(*)::int AS count 
        FROM student_subject_results 
        WHERE subject_id IN (SELECT subject_id FROM staff_subjects WHERE staff_id = $1)
          AND result_status = 'PUBLISHED';
        `,
        [staffId]
      ),
    ]);

    return {
      faculty_info: facultyInfo,
      assigned_subjects: subRes.rows,
      assigned_classes: classRes.rows,
      activity: {
        attendance_sessions_marked: attRes.rows[0]?.count || 0,
        assignments_created: assignCreatedRes.rows[0]?.count || 0,
        assignments_graded: assignGradedRes.rows[0]?.count || 0,
        notes_uploaded: notesRes.rows[0]?.total || 0,
        notes_published: notesRes.rows[0]?.published || 0,
        quizzes_created: quizzesRes.rows[0]?.total || 0,
        quizzes_published: quizzesRes.rows[0]?.published || 0,
        mark_components_configured: componentsRes.rows[0]?.count || 0,
        student_marks_entered: marksRes.rows[0]?.count || 0,
        results_published: resultsRes.rows[0]?.count || 0,
      },
    };
  }

  // ─── 5. DEPARTMENT & INSTITUTIONAL REPORTS (Admin) ───────────

  /**
   * Department Academic Report
   */
  public async getDepartmentAcademicReport(
    departmentId?: string,
    filters: { academicYear?: string; semester?: number } = {}
  ): Promise<{
    departments: Array<{
      department_id: string;
      department_name: string;
      department_code: string;
      total_classes: number;
      total_students: number;
      total_subjects: number;
      total_faculty: number;
      average_attendance: number;
      average_marks_percentage: number;
      published_results: number;
      pass_count: number;
      fail_count: number;
      pass_rate: number;
    }>;
  }> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (departmentId) {
      conditions.push(`d.id = $${paramIdx++}`);
      values.push(departmentId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        (SELECT COUNT(*)::int FROM classes c WHERE c.department_id = d.id) AS total_classes,
        (SELECT COUNT(*)::int FROM students s JOIN users u ON s.user_id = u.id WHERE u.department_id = d.id) AS total_students,
        (SELECT COUNT(*)::int FROM subjects sub WHERE sub.department_id = d.id) AS total_subjects,
        (SELECT COUNT(*)::int FROM staff st JOIN users u ON st.user_id = u.id WHERE u.department_id = d.id) AS total_faculty,
        
        -- Attendance aggregation
        COALESCE(
          (
            SELECT 
              CASE WHEN COUNT(a.id) > 0 THEN
                ROUND((COUNT(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 END)::numeric / COUNT(a.id)::numeric) * 100, 2)
              ELSE 0 END
            FROM attendance a
            JOIN subjects sub ON a.subject_id = sub.id
            WHERE sub.department_id = d.id
          ), 0
        )::float AS average_attendance,

        -- Results aggregation
        COALESCE(
          (
            SELECT 
              CASE WHEN COUNT(r.id) > 0 THEN
                ROUND(AVG(r.percentage), 2)
              ELSE 0 END
            FROM student_subject_results r
            JOIN subjects sub ON r.subject_id = sub.id
            WHERE sub.department_id = d.id AND r.result_status = 'PUBLISHED'
          ), 0
        )::float AS average_marks_percentage,

        COALESCE(
          (
            SELECT COUNT(r.id)::int
            FROM student_subject_results r
            JOIN subjects sub ON r.subject_id = sub.id
            WHERE sub.department_id = d.id AND r.result_status = 'PUBLISHED'
          ), 0
        ) AS published_results,

        COALESCE(
          (
            SELECT COUNT(CASE WHEN r.grade != 'F' AND r.percentage >= 40 THEN 1 END)::int
            FROM student_subject_results r
            JOIN subjects sub ON r.subject_id = sub.id
            WHERE sub.department_id = d.id AND r.result_status = 'PUBLISHED'
          ), 0
        ) AS pass_count,

        COALESCE(
          (
            SELECT COUNT(CASE WHEN r.grade = 'F' OR r.percentage < 40 THEN 1 END)::int
            FROM student_subject_results r
            JOIN subjects sub ON r.subject_id = sub.id
            WHERE sub.department_id = d.id AND r.result_status = 'PUBLISHED'
          ), 0
        ) AS fail_count

      FROM departments d
      ${whereClause}
      ORDER BY d.code ASC;
    `;

    const res = await pool.query(query, values);

    const depts = res.rows.map(r => {
      const pub = r.published_results;
      const pass = r.pass_count;
      const passRate = pub > 0 ? Number(((pass / pub) * 100).toFixed(2)) : 0;

      return {
        department_id: r.department_id,
        department_name: r.department_name,
        department_code: r.department_code,
        total_classes: r.total_classes,
        total_students: r.total_students,
        total_subjects: r.total_subjects,
        total_faculty: r.total_faculty,
        average_attendance: r.average_attendance,
        average_marks_percentage: r.average_marks_percentage,
        published_results: pub,
        pass_count: pass,
        fail_count: r.fail_count,
        pass_rate: passRate,
      };
    });

    return { departments: depts };
  }

  /**
   * Admin Institutional Analytics Summary (Comprehensive KPIs)
   */
  public async getAdminInstitutionalAnalytics(): Promise<{
    counts: {
      total_students: number;
      total_staff: number;
      total_departments: number;
      total_classes: number;
      total_subjects: number;
    };
    academic_performance: {
      published_results: number;
      draft_results: number;
      average_percentage: number;
      pass_count: number;
      fail_count: number;
      overall_pass_rate: number;
    };
    attendance: {
      average_attendance: number;
      students_below_threshold: number; // < 75%
      students_eligible: number;
    };
    assignments: {
      total_assignments: number;
      total_submissions: number;
      submission_rate: number;
      late_submission_rate: number;
    };
    quizzes: {
      total_quizzes: number;
      published_quizzes: number;
      total_attempts: number;
      average_quiz_score: number;
    };
    notes: {
      total_notes: number;
      published_notes: number;
    };
  }> {
    const pool = getPool();

    const [
      countsRes,
      resultsRes,
      attSummaryRes,
      attShortageRes,
      assignRes,
      quizRes,
      notesRes,
    ] = await Promise.all([
      // 1. High level counts
      pool.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM students) AS total_students,
          (SELECT COUNT(*)::int FROM staff) AS total_staff,
          (SELECT COUNT(*)::int FROM departments) AS total_departments,
          (SELECT COUNT(*)::int FROM classes) AS total_classes,
          (SELECT COUNT(*)::int FROM subjects) AS total_subjects;
      `),

      // 2. Results
      pool.query(`
        SELECT 
          COUNT(CASE WHEN result_status = 'PUBLISHED' THEN 1 END)::int AS published_results,
          COUNT(CASE WHEN result_status = 'DRAFT' THEN 1 END)::int AS draft_results,
          COALESCE(AVG(CASE WHEN result_status = 'PUBLISHED' THEN percentage END), 0)::float AS avg_percentage,
          COUNT(CASE WHEN result_status = 'PUBLISHED' AND grade != 'F' AND percentage >= 40 THEN 1 END)::int AS pass_count,
          COUNT(CASE WHEN result_status = 'PUBLISHED' AND (grade = 'F' OR percentage < 40) THEN 1 END)::int AS fail_count
        FROM student_subject_results;
      `),

      // 3. Attendance Avg
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_sessions,
          COUNT(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 END)::int AS present_sessions
        FROM attendance;
      `),

      // 4. Students with Attendance Shortage (< 75%)
      pool.query(`
        SELECT 
          s.id,
          COUNT(a.id)::int AS conducted,
          COUNT(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 END)::int AS attended
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id
        GROUP BY s.id;
      `),

      // 5. Assignments
      pool.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM assignments WHERE status != 'DRAFT') AS total_assignments,
          (SELECT COUNT(*)::int FROM assignment_submissions WHERE status IN ('SUBMITTED', 'LATE', 'GRADED')) AS total_submissions,
          (SELECT COUNT(*)::int FROM assignment_submissions WHERE status = 'LATE') AS late_submissions,
          (SELECT COUNT(*)::int FROM student_classes) AS total_enrollments;
      `),

      // 6. Quizzes
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_quizzes,
          COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END)::int AS published_quizzes,
          (SELECT COUNT(*)::int FROM quiz_attempts) AS total_attempts,
          (SELECT COALESCE(AVG(score), 0)::float FROM quiz_attempts WHERE status IN ('SUBMITTED', 'GRADED')) AS avg_score
        FROM quizzes;
      `),

      // 7. Notes
      pool.query(`
        SELECT 
          COUNT(*)::int AS total_notes,
          COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END)::int AS published_notes
        FROM notes;
      `),
    ]);

    const counts = countsRes.rows[0];
    const results = resultsRes.rows[0];
    const totalPubResults = results.published_results;
    const passCount = results.pass_count;
    const failCount = results.fail_count;
    const passRate = totalPubResults > 0 ? Number(((passCount / totalPubResults) * 100).toFixed(2)) : 0;

    // Attendance Calculations
    const attTot = attSummaryRes.rows[0]?.total_sessions || 0;
    const attPres = attSummaryRes.rows[0]?.present_sessions || 0;
    const avgAttendance = attTot > 0 ? Number(((attPres / attTot) * 100).toFixed(2)) : 0;

    let shortageCount = 0;
    let eligibleCount = 0;
    for (const row of attShortageRes.rows) {
      const cond = row.conducted;
      const att = row.attended;
      const pct = cond > 0 ? (att / cond) * 100 : 0;
      if (pct < 75.0) shortageCount += 1;
      else eligibleCount += 1;
    }

    // Assignment Calculations
    const assign = assignRes.rows[0];
    const totalAssign = assign.total_assignments;
    const totalSub = assign.total_submissions;
    const lateSub = assign.late_submissions;
    const enrollments = assign.total_enrollments;
    const maxPossibleSubmissions = totalAssign * enrollments;
    const subRate = maxPossibleSubmissions > 0 ? Number(((totalSub / maxPossibleSubmissions) * 100).toFixed(2)) : 0;
    const lateRate = totalSub > 0 ? Number(((lateSub / totalSub) * 100).toFixed(2)) : 0;

    // Quiz Calculations
    const qz = quizRes.rows[0];

    // Notes Calculations
    const nt = notesRes.rows[0];

    return {
      counts: {
        total_students: counts.total_students,
        total_staff: counts.total_staff,
        total_departments: counts.total_departments,
        total_classes: counts.total_classes,
        total_subjects: counts.total_subjects,
      },
      academic_performance: {
        published_results: totalPubResults,
        draft_results: results.draft_results,
        average_percentage: Number(results.avg_percentage.toFixed(2)),
        pass_count: passCount,
        fail_count: failCount,
        overall_pass_rate: passRate,
      },
      attendance: {
        average_attendance: avgAttendance,
        students_below_threshold: shortageCount,
        students_eligible: eligibleCount,
      },
      assignments: {
        total_assignments: totalAssign,
        total_submissions: totalSub,
        submission_rate: subRate,
        late_submission_rate: lateRate,
      },
      quizzes: {
        total_quizzes: qz.total_quizzes,
        published_quizzes: qz.published_quizzes,
        total_attempts: qz.total_attempts,
        average_quiz_score: Number(qz.avg_score.toFixed(2)),
      },
      notes: {
        total_notes: nt.total_notes,
        published_notes: nt.published_notes,
      },
    };
  }
}

export const reportsRepository = new ReportsRepository();
