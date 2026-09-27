import http from 'http';

function request(options: http.RequestOptions, data?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode || 500, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 3 ACADEMIC & RBAC TEST SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 0. Comprehensive Portal Role Verification Matrix (All 9 Combinations + Invalid Role)
    console.log('--- Testing Portal Role Consistency Matrix (9 Combinations) ---');

    // Valid Combination 1: STUDENT + Student Credentials -> 200
    const validStudentLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'alex.morgan@college.edu', password: 'Student@123', role: 'STUDENT' }
    );
    assert(validStudentLogin.status === 200, '1. STUDENT role + Student credentials -> 200 OK');
    assert(validStudentLogin.body?.data?.user?.role === 'STUDENT', '1. Authenticated user role is STUDENT');
    assert(!!validStudentLogin.body?.data?.token, '1. Issued JWT for valid STUDENT');

    // Valid Combination 2: STAFF + Staff Credentials -> 200
    const validStaffLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.jenkins@college.edu', password: 'Staff@123', role: 'STAFF' }
    );
    assert(validStaffLogin.status === 200, '2. STAFF role + Staff credentials -> 200 OK');
    assert(validStaffLogin.body?.data?.user?.role === 'STAFF', '2. Authenticated user role is STAFF');
    assert(!!validStaffLogin.body?.data?.token, '2. Issued JWT for valid STAFF');

    // Valid Combination 3: ADMIN + Admin Credentials -> 200
    const validAdminLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@college.edu', password: 'Admin@123', role: 'ADMIN' }
    );
    assert(validAdminLogin.status === 200, '3. ADMIN role + Admin credentials -> 200 OK');
    assert(validAdminLogin.body?.data?.user?.role === 'ADMIN', '3. Authenticated user role is ADMIN');
    assert(!!validAdminLogin.body?.data?.token, '3. Issued JWT for valid ADMIN');

    // Invalid Combination 4: STUDENT + Staff Credentials -> 401
    const invalidStudStaff = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.jenkins@college.edu', password: 'Staff@123', role: 'STUDENT' }
    );
    assert(invalidStudStaff.status === 401, '4. STUDENT role + Staff credentials -> 401 Unauthorized');
    assert(!invalidStudStaff.body?.data?.token, '4. No JWT issued on role mismatch');
    assert(invalidStudStaff.body?.message === 'Invalid email/username or password.', '4. Generic error without role leakage');

    // Invalid Combination 5: STUDENT + Admin Credentials -> 401
    const invalidStudAdmin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@college.edu', password: 'Admin@123', role: 'STUDENT' }
    );
    assert(invalidStudAdmin.status === 401, '5. STUDENT role + Admin credentials -> 401 Unauthorized');
    assert(!invalidStudAdmin.body?.data?.token, '5. No JWT issued on role mismatch');
    assert(invalidStudAdmin.body?.message === 'Invalid email/username or password.', '5. Generic error without role leakage');

    // Invalid Combination 6: STAFF + Student Credentials -> 401
    const invalidStaffStud = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'alex.morgan@college.edu', password: 'Student@123', role: 'STAFF' }
    );
    assert(invalidStaffStud.status === 401, '6. STAFF role + Student credentials -> 401 Unauthorized');
    assert(!invalidStaffStud.body?.data?.token, '6. No JWT issued on role mismatch');
    assert(invalidStaffStud.body?.message === 'Invalid email/username or password.', '6. Generic error without role leakage');

    // Invalid Combination 7: STAFF + Admin Credentials -> 401
    const invalidStaffAdmin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@college.edu', password: 'Admin@123', role: 'STAFF' }
    );
    assert(invalidStaffAdmin.status === 401, '7. STAFF role + Admin credentials -> 401 Unauthorized');
    assert(!invalidStaffAdmin.body?.data?.token, '7. No JWT issued on role mismatch');
    assert(invalidStaffAdmin.body?.message === 'Invalid email/username or password.', '7. Generic error without role leakage');

    // Invalid Combination 8: ADMIN + Student Credentials -> 401
    const invalidAdminStud = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'alex.morgan@college.edu', password: 'Student@123', role: 'ADMIN' }
    );
    assert(invalidAdminStud.status === 401, '8. ADMIN role + Student credentials -> 401 Unauthorized');
    assert(!invalidAdminStud.body?.data?.token, '8. No JWT issued on role mismatch');
    assert(invalidAdminStud.body?.message === 'Invalid email/username or password.', '8. Generic error without role leakage');

    // Invalid Combination 9: ADMIN + Staff Credentials -> 401
    const invalidAdminStaff = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.jenkins@college.edu', password: 'Staff@123', role: 'ADMIN' }
    );
    assert(invalidAdminStaff.status === 401, '9. ADMIN role + Staff credentials -> 401 Unauthorized');
    assert(!invalidAdminStaff.body?.data?.token, '9. No JWT issued on role mismatch');
    assert(invalidAdminStaff.body?.message === 'Invalid email/username or password.', '9. Generic error without role leakage');

    // 10. Invalid requestedRole value -> 400 Bad Request
    const invalidRoleValue = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@college.edu', password: 'Admin@123', role: 'SUPERUSER' }
    );
    assert(invalidRoleValue.status === 400, '10. Invalid role value (SUPERUSER) -> 400 Bad Request');

    console.log('--- Baseline RBAC & Module Flow Tests ---');

    // 1. Authenticate as Admin
    const adminLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@college.edu', password: 'Admin@123', role: 'ADMIN' }
    );
    assert(adminLogin.status === 200, 'Admin login succeeded');
    const adminToken = adminLogin.body?.data?.token;

    // 2. Authenticate as Student
    const studentLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'alex.morgan@college.edu', password: 'Student@123', role: 'STUDENT' }
    );
    assert(studentLogin.status === 200, 'Student login succeeded');
    const studentToken = studentLogin.body?.data?.token;

    // 3. Authenticate as Staff
    const staffLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.jenkins@college.edu', password: 'Staff@123', role: 'STAFF' }
    );
    assert(staffLogin.status === 200, 'Staff login succeeded');
    const staffToken = staffLogin.body?.data?.token;

    // 4. Test Admin Overview (/api/admin/overview)
    const overviewRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/overview',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(overviewRes.status === 200, 'Admin overview returned 200 OK');
    assert(
      overviewRes.body?.data?.total_departments >= 4,
      `Overview has departments count >= 4 (actual: ${overviewRes.body?.data?.total_departments})`
    );
    assert(
      overviewRes.body?.data?.total_students >= 6,
      `Overview has students count >= 6 (actual: ${overviewRes.body?.data?.total_students})`
    );
    assert(
      overviewRes.body?.data?.total_staff >= 3,
      `Overview has staff count >= 3 (actual: ${overviewRes.body?.data?.total_staff})`
    );
    assert(
      overviewRes.body?.data?.total_subjects >= 8,
      `Overview has subjects count >= 8 (actual: ${overviewRes.body?.data?.total_subjects})`
    );

    // 5. Test Department CRUD
    const deptList = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/departments',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deptList.status === 200, 'GET /api/departments succeeded');
    const cseDept = deptList.body?.data?.find((d: any) => d.code === 'CSE');
    const eceDept = deptList.body?.data?.find((d: any) => d.code === 'ECE');
    assert(!!cseDept, 'CSE department found in database');

    // Create a temporary department
    const createDept = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/departments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      { name: 'Civil Engineering Test', code: 'CIVIL_TEST', description: 'Testing dept' }
    );
    assert(createDept.status === 201, 'POST /api/departments created new department');
    const testDeptId = createDept.body?.data?.id;

    // Delete temporary department
    const deleteDept = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/departments/${testDeptId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteDept.status === 200, 'DELETE /api/departments/:id succeeded');

    // 6. Test Class CRUD & Constraint: Department existence
    const classList = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/classes',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(classList.status === 200, 'GET /api/classes succeeded');
    const cseClass = classList.body?.data?.find((c: any) => c.department_code === 'CSE');
    assert(!!cseClass, 'CSE class found');

    // 7. Test Subject CRUD & Constraint: Duplicate subject code rejected
    const dupSubject = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/subjects',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        department_id: cseDept.id,
        code: 'CS501', // Already exists in seed
        name: 'Duplicate DBMS',
        semester: 5,
        credits: 4,
      }
    );
    assert(dupSubject.status === 409, 'Duplicate subject code rejected with 409 Conflict');

    // 8. Test Student Self Profile (GET /api/students/me)
    const studentMe = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentMe.status === 200, 'GET /api/students/me succeeded for student');
    assert(
      studentMe.body?.data?.student_roll_number === '2024CS089',
      'Student profile returned roll number 2024CS089'
    );
    assert(
      Array.isArray(studentMe.body?.data?.enrolled_subjects),
      'Student profile includes enrolled subjects list'
    );

    // 9. Test Staff Self Profile (GET /api/staff/me)
    const staffMe = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/staff/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffMe.status === 200, 'GET /api/staff/me succeeded for staff');
    assert(
      staffMe.body?.data?.employee_id === 'EMP-CSE-001',
      'Staff profile returned employee ID EMP-CSE-001'
    );

    // 10. Test RBAC: Student blocked from Admin routes (expect 403)
    const studentAdminAccess = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/overview',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAdminAccess.status === 403,
      'Student forbidden from /api/admin/overview with 403'
    );

    const studentCreateDept = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/departments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      },
      { name: 'Hacker Dept', code: 'HACK' }
    );
    assert(
      studentCreateDept.status === 403,
      'Student forbidden from creating departments with 403'
    );

    // 11. Test Constraint 2: Student department must match assigned class department
    const studentList = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(studentList.status === 200, 'Admin retrieved student list');
    const cseStudent = studentList.body?.data?.find((s: any) => s.department_code === 'CSE');
    const eceClass = classList.body?.data?.find((c: any) => c.department_code === 'ECE');

    const invalidClassAssign = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/students/${cseStudent.student_id}/class`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      { class_id: eceClass.id, academic_year: '2025-2026' }
    );
    assert(
      invalidClassAssign.status === 400,
      'Assigning CSE student to ECE class rejected with 400 (Department Mismatch)'
    );

    // 12. Test Constraint 3: Staff department must match subject department
    const staffList = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const cseStaff = staffList.body?.data?.find((st: any) => st.department_code === 'CSE');
    const subjectList = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/subjects',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const eceSubject = subjectList.body?.data?.find((sub: any) => sub.department_code === 'ECE');

    const invalidSubjectAssign = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/staff/${cseStaff.staff_id}/subjects/${eceSubject.id}`,
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert(
      invalidSubjectAssign.status === 400,
      'Assigning CSE staff to ECE subject rejected with 400 (Department Mismatch)'
    );

    console.log('\n=====================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
