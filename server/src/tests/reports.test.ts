import http from 'http';

interface TestRequestOptions extends http.RequestOptions {
  body?: any;
}

function request(options: TestRequestOptions, bodyData?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode || 0, body: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`[FAIL] ${message}`);
  }
}

async function login(identifier: string, password: string): Promise<string> {
  const res = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier, password }
  );
  return res.body?.data?.token || '';
}

export async function runReportTests() {
  console.log('\n=====================================================');
  console.log('  STARTING PHASE 4.9 REPORTS & ANALYTICS TEST SUITE');
  console.log('=====================================================\n');

  try {
    // 1. Authenticate users
    const adminToken = await login('admin@college.edu', 'Admin@123');
    const staffJenkinsToken = await login('staff.jenkins@college.edu', 'Staff@123');
    const staffKahnToken = await login('staff.kahn@college.edu', 'Staff@123');
    const studentAlexToken = await login('alex.morgan@college.edu', 'Student@123');
    const studentAishaToken = await login('aisha.khan@college.edu', 'Student@123');

    assert(!!adminToken, 'Admin login succeeded (200)');
    assert(!!staffJenkinsToken, 'Staff Dr. Sarah Jenkins login succeeded (200)');
    assert(!!staffKahnToken, 'Staff Prof. Robert Kahn login succeeded (200)');
    assert(!!studentAlexToken, 'Student Alex Morgan login succeeded (200)');
    assert(!!studentAishaToken, 'Student Aisha Khan (ECE) login succeeded (200)');

    // 2. Unauthenticated Access Protection
    const unauthSummaryRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/summary',
      method: 'GET',
    });
    assert(unauthSummaryRes.status === 401, 'Unauthenticated access to /api/reports/student/summary blocked with 401');

    const unauthAdminRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/admin/summary',
      method: 'GET',
    });
    assert(unauthAdminRes.status === 401, 'Unauthenticated access to /api/reports/admin/summary blocked with 401');

    // ─── 3. STUDENT REPORTS ─────────────────────────────────────

    // Student Academic Summary
    const studentSummaryRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    if (studentSummaryRes.status !== 200) {
      console.log('STUDENT SUMMARY FAILED:', studentSummaryRes.status, studentSummaryRes.body);
    }
    assert(studentSummaryRes.status === 200, 'Student Alex retrieves academic summary (200 OK)');
    const summaryData = studentSummaryRes.body?.data;
    assert(!!summaryData?.profile?.student_roll_number, 'Summary contains student roll number (2024CS001)');
    assert(summaryData?.profile?.department_code === 'CSE', 'Student profile department is CSE');
    assert(Array.isArray(summaryData?.subjects), 'Summary contains subject-wise performance array');
    assert(summaryData?.subjects?.length > 0, `Student has ${summaryData?.subjects?.length} subjects evaluated`);
    assert(summaryData?.overall_attendance?.percentage !== undefined, 'Summary contains dynamic attendance percentage');
    assert(summaryData?.overall_assignments?.total !== undefined, 'Summary contains assignments overview');
    assert(summaryData?.overall_quizzes?.total !== undefined, 'Summary contains quizzes overview');
    assert(summaryData?.overall_results?.percentage !== undefined, 'Summary contains overall results percentage');
    assert(summaryData?.overall_results?.gpa !== undefined, 'Summary contains semester GPA');

    // Student Attendance Report
    const studentAttRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/attendance',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentAttRes.status === 200, 'Student Alex retrieves attendance report (200 OK)');
    const attData = studentAttRes.body?.data;
    assert(attData?.summary?.conducted > 0, `Total attendance sessions conducted: ${attData?.summary?.conducted}`);
    assert(Array.isArray(attData?.by_subject), 'Attendance report contains subject-wise breakdown');
    assert(attData?.by_subject[0]?.status === 'ELIGIBLE' || attData?.by_subject[0]?.status === 'SHORTAGE', 'Subject attendance status uses ELIGIBLE/SHORTAGE');

    // Student Attendance Date Range Filter
    const filteredAttRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/attendance?startDate=2026-09-01&endDate=2026-09-30',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(filteredAttRes.status === 200, 'Student attendance with valid date range filter returns 200 OK');

    // Student Attendance Invalid Date Range (startDate > endDate) -> 400
    const invalidDateAttRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/attendance?startDate=2026-10-01&endDate=2026-09-01',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(invalidDateAttRes.status === 400, 'Invalid date range (startDate > endDate) rejected with 400 Bad Request');

    // Student Assignment Report
    const studentAssignRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/assignments',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentAssignRes.status === 200, 'Student Alex retrieves assignment report (200 OK)');
    const assignData = studentAssignRes.body?.data;
    assert(assignData?.summary?.total_assignments > 0, `Total assignments retrieved: ${assignData?.summary?.total_assignments}`);
    assert(Array.isArray(assignData?.assignments), 'Assignment report includes detailed submissions list');
    assert(assignData?.summary?.submission_rate >= 0, 'Assignment summary includes valid submission rate %');

    // Student Quiz Report
    const studentQuizRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/quizzes',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentQuizRes.status === 200, 'Student Alex retrieves quiz report (200 OK)');
    const quizData = studentQuizRes.body?.data;
    assert(quizData?.summary?.total_quizzes > 0, `Total class quizzes retrieved: ${quizData?.summary?.total_quizzes}`);
    assert(Array.isArray(quizData?.quizzes), 'Quiz report includes detailed quiz attempts list');

    // Student Full Academic Report
    const studentAcademicRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/student/academic',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentAcademicRes.status === 200, 'Student Alex retrieves full academic report (200 OK)');

    // ─── 4. IDOR PROTECTION & RBAC BOUNDARIES ───────────────────

    // Student Aisha (ECE) attempts to access Student Alex (CSE) report -> 403 Forbidden
    const alexStudentId = summaryData?.profile?.student_id;
    const crossStudentIdorRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/student/${alexStudentId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAishaToken}` },
    });
    assert(crossStudentIdorRes.status === 403, 'Cross-student academic report access rejected with 403 Forbidden');

    // Student attempting to access staff endpoints -> 403 Forbidden
    const studentAccessStaffRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/class/22222222-2222-2222-2222-222222222221/attendance',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentAccessStaffRes.status === 403, 'Student access to /api/reports/class/:id/attendance blocked with 403');

    const studentAccessAdminRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/admin/summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentAccessAdminRes.status === 403, 'Student access to /api/reports/admin/summary blocked with 403');

    // Fetch Classes & Subjects to test staff/admin workflows
    const classListRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/classes',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const cseClass = classListRes.body?.data?.find(
      (c: any) => (c.name.includes('Year 3') && c.name.includes('CSE')) || (c.semester === 5 && (c.name?.includes('CSE') || c.department_name?.includes('Computer')))
    );
    const eceClass = classListRes.body?.data?.find(
      (c: any) => (c.name.includes('Year 3') && c.name.includes('ECE')) || (c.semester === 5 && (c.name?.includes('ECE') || c.department_name?.includes('Electronics')))
    );
    const cseClassId = cseClass?.id;
    const eceClassId = eceClass?.id;

    const subjectListRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/subjects',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const cs501Subject = subjectListRes.body?.data?.find((s: any) => s.code === 'CS501');
    const cs501SubjectId = cs501Subject?.id;

    const staffListRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const staffKahnObj = staffListRes.body?.data?.find((st: any) => st.email?.includes('kahn') || st.first_name?.includes('Robert'));
    const staffKahnId = staffKahnObj?.id;

    // Staff Jenkins accesses CSE Class Attendance Report -> 200 OK
    const classAttRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/class/${cseClassId}/attendance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(classAttRes.status === 200, 'Staff Jenkins retrieves CSE Class Attendance Report (200 OK)');
    const classAttData = classAttRes.body?.data;
    assert(classAttData?.summary?.total_students > 0, `Class has ${classAttData?.summary?.total_students} enrolled students`);
    assert(classAttData?.summary?.average_attendance >= 0, `Average class attendance is ${classAttData?.summary?.average_attendance}%`);
    assert(classAttData?.summary?.eligible_count >= 0, 'Class attendance summary includes eligible count (>= 75%)');
    assert(classAttData?.summary?.shortage_count >= 0, 'Class attendance summary includes shortage count (< 75%)');
    assert(Array.isArray(classAttData?.students), 'Class attendance report includes student roster');

    // Attendance 75% threshold correctness test
    if (classAttData?.students?.length > 0) {
      const student1 = classAttData.students[0];
      const calculatedExpectedStatus = student1.attendance_percentage >= 75.0 ? 'ELIGIBLE' : 'SHORTAGE';
      assert(student1.status === calculatedExpectedStatus, `75% threshold correctly assigned status ${student1.status} for ${student1.attendance_percentage}%`);
    }

    // Staff Jenkins accesses CSE Class Performance Report -> 200 OK
    const classPerfRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/class/${cseClassId}/performance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(classPerfRes.status === 200, 'Staff Jenkins retrieves CSE Class Performance Report (200 OK)');
    const classPerfData = classPerfRes.body?.data;
    assert(classPerfData?.summary?.published_results >= 0, `Class has ${classPerfData?.summary?.published_results} published results`);
    assert(classPerfData?.summary?.pass_rate >= 0, `Class pass rate is ${classPerfData?.summary?.pass_rate}%`);
    assert(Array.isArray(classPerfData?.results), 'Class performance report returns results array');

    // Staff Jenkins accesses CS501 Subject Performance Report -> 200 OK
    const subjectPerfRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/subject/${cs501SubjectId}/performance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(subjectPerfRes.status === 200, 'Staff Jenkins retrieves CS501 Subject Performance Report (200 OK)');
    const subPerfData = subjectPerfRes.body?.data;
    assert(subPerfData?.subject_info?.code === 'CS501', 'Subject info matches CS501');
    assert(subPerfData?.metrics?.average_percentage >= 0, `CS501 Average percentage: ${subPerfData?.metrics?.average_percentage}%`);
    assert(subPerfData?.grade_distribution?.O !== undefined, 'Grade distribution includes Grade O count');
    assert(subPerfData?.grade_distribution?.F !== undefined, 'Grade distribution includes Grade F count');

    // Staff RBAC Guard: Staff Kahn (ECE) accessing CSE Class -> 403 Forbidden
    const kahnAccessCseClass = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/class/${cseClassId}/attendance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(kahnAccessCseClass.status === 403, 'Staff Kahn (ECE) forbidden from CSE Class Attendance Report (403)');

    // Staff RBAC Guard: Staff Kahn (ECE) accessing CS501 (CSE) -> 403 Forbidden
    const kahnAccessCs501 = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/subject/${cs501SubjectId}/performance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(kahnAccessCs501.status === 403, 'Staff Kahn (ECE) forbidden from CS501 Subject Performance Report (403)');

    // ─── 6. ASSIGNMENT & QUIZ ANALYTICS ─────────────────────────

    // Staff Assignment Analytics Overview -> 200 OK
    const assignAnalyticsRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/assignments/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(assignAnalyticsRes.status === 200, 'Staff retrieves assignment analytics overview (200 OK)');
    const assignAnalytics = assignAnalyticsRes.body?.data;
    assert(assignAnalytics?.summary?.total_assignments > 0, `Total course assignments: ${assignAnalytics?.summary?.total_assignments}`);
    assert(assignAnalytics?.summary?.overall_submission_rate >= 0, `Overall assignment submission rate: ${assignAnalytics?.summary?.overall_submission_rate}%`);
    assert(Array.isArray(assignAnalytics?.assignments), 'Assignment analytics contains list of assignments');

    // Staff Quiz Analytics Overview -> 200 OK
    const quizAnalyticsRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/quizzes/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(quizAnalyticsRes.status === 200, 'Staff retrieves quiz analytics overview (200 OK)');
    const quizAnalytics = quizAnalyticsRes.body?.data;
    assert(quizAnalytics?.summary?.total_quizzes > 0, `Total quizzes in analytics: ${quizAnalytics?.summary?.total_quizzes}`);
    assert(quizAnalytics?.summary?.overall_pass_rate >= 0, `Overall quiz pass rate: ${quizAnalytics?.summary?.overall_pass_rate}%`);
    assert(Array.isArray(quizAnalytics?.quizzes), 'Quiz analytics contains list of quizzes');

    // ─── 7. FACULTY PERSONAL ACTIVITY SUMMARY ───────────────────

    // Staff Jenkins retrieves personal activity summary -> 200 OK
    const staffActivityRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/staff/activity',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffActivityRes.status === 200, 'Staff Jenkins retrieves personal academic activity (200 OK)');
    const activityData = staffActivityRes.body?.data;
    assert(activityData?.faculty_info?.employee_id === 'EMP-CSE-001', 'Faculty info employee ID is EMP-CSE-001');
    assert(Array.isArray(activityData?.assigned_subjects), 'Activity summary includes assigned subjects list');
    assert(activityData?.activity?.assignments_created >= 0, `Assignments created: ${activityData?.activity?.assignments_created}`);
    assert(activityData?.activity?.notes_published >= 0, `Notes published: ${activityData?.activity?.notes_published}`);
    assert(activityData?.activity?.quizzes_created >= 0, `Quizzes created: ${activityData?.activity?.quizzes_created}`);
    assert(activityData?.activity?.results_published >= 0, `Results published: ${activityData?.activity?.results_published}`);

    // Staff Jenkins attempting to access another staff's activity with ID parameter -> 403 Forbidden
    const staffCrossActivityRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/staff/${staffKahnId}/activity`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffCrossActivityRes.status === 403, 'Staff forbidden from accessing another staff activity (403)');

    // ─── 8. ADMIN INSTITUTIONAL & DEPARTMENT REPORTS ────────────

    // Staff forbidden from Admin Department Report -> 403 Forbidden
    const staffAccessDeptRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/admin/department',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffAccessDeptRes.status === 403, 'Staff forbidden from /api/reports/admin/department (403)');

    // Admin accesses Department Academic Report -> 200 OK
    const adminDeptRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/admin/department',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDeptRes.status === 200, 'Admin retrieves Department Academic Report (200 OK)');
    const deptData = adminDeptRes.body?.data;
    assert(Array.isArray(deptData?.departments), 'Department report contains departments array');
    assert(deptData?.departments?.length >= 4, `Institution has ${deptData?.departments?.length} departments (CSE, ECE, IT, MECH)`);
    assert(deptData?.departments[0]?.average_attendance >= 0, 'Department report contains average attendance %');
    assert(deptData?.departments[0]?.average_marks_percentage >= 0, 'Department report contains average marks %');

    // Admin Institutional Analytics Summary -> 200 OK
    const adminSummaryRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/admin/summary',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSummaryRes.status === 200, 'Admin retrieves Institutional Analytics Summary (200 OK)');
    const adminKpis = adminSummaryRes.body?.data;
    assert(adminKpis?.counts?.total_students >= 6, `Total institution students: ${adminKpis?.counts?.total_students}`);
    assert(adminKpis?.counts?.total_staff >= 3, `Total institution staff: ${adminKpis?.counts?.total_staff}`);
    assert(adminKpis?.counts?.total_departments >= 4, `Total departments: ${adminKpis?.counts?.total_departments}`);
    assert(adminKpis?.academic_performance?.published_results >= 0, `Total published results: ${adminKpis?.academic_performance?.published_results}`);
    assert(adminKpis?.attendance?.average_attendance >= 0, `Institution avg attendance: ${adminKpis?.attendance?.average_attendance}%`);
    assert(adminKpis?.attendance?.students_below_threshold >= 0, `Students below 75% attendance: ${adminKpis?.attendance?.students_below_threshold}`);
    assert(adminKpis?.assignments?.total_assignments > 0, `Total assignments: ${adminKpis?.assignments?.total_assignments}`);
    assert(adminKpis?.quizzes?.total_quizzes > 0, `Total quizzes: ${adminKpis?.quizzes?.total_quizzes}`);
    assert(adminKpis?.notes?.total_notes > 0, `Total notes: ${adminKpis?.notes?.total_notes}`);

    // Admin can view any student's academic report
    const adminViewStudentRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/student/${alexStudentId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminViewStudentRes.status === 200, 'Admin can view any student academic report (200 OK)');

    // Admin can view any faculty's activity report
    const adminViewFacultyRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/staff/activity',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminViewFacultyRes.status === 200, 'Admin can view faculty activity report (200 OK)');

    // ─── 9. ERROR & EDGE CASE VALIDATIONS ───────────────────────

    // Non-existent Class ID -> 404 Not Found
    const nonExistentClassRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/class/99999999-9999-9999-9999-999999999999/attendance',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(nonExistentClassRes.status === 404, 'Non-existent class ID returns 404 Not Found');

    // Non-existent Subject ID -> 404 Not Found
    const nonExistentSubRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/subject/99999999-9999-9999-9999-999999999999/performance',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(nonExistentSubRes.status === 404, 'Non-existent subject ID returns 404 Not Found');

    // ECE Class Attendance Report for Staff Kahn -> 200 OK
    const eceAttRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/reports/class/${eceClassId}/attendance`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(eceAttRes.status === 200, 'Staff Kahn accesses authorized ECE Class Attendance Report (200 OK)');

  } catch (err) {
    console.error('Report test execution error:', err);
    failedCount++;
  }

  console.log('\n=====================================================');
  console.log(`  PHASE 4.9 REPORTS & ANALYTICS TESTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runReportTests();
}
