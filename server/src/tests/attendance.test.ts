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

async function runAttendanceTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4.4 ATTENDANCE TEST SUITE');
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
    // 1. Authenticate Admin
    const adminLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'admin@college.edu', password: 'Admin@123' }
    );
    assert(adminLogin.status === 200, 'Admin login succeeded');
    const adminToken = adminLogin.body?.data?.token;

    // 2. Authenticate Student (Alex Morgan, CSE)
    const studentLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'alex.morgan@college.edu', password: 'Student@123' }
    );
    assert(studentLogin.status === 200, 'Student Alex login succeeded');
    const studentToken = studentLogin.body?.data?.token;

    // 3. Authenticate Staff (Dr. Sarah Jenkins, CSE - teaches CS501, CS504, CS506)
    const staffJenkinsLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.jenkins@college.edu', password: 'Staff@123' }
    );
    assert(staffJenkinsLogin.status === 200, 'Staff Jenkins login succeeded');
    const staffJenkinsToken = staffJenkinsLogin.body?.data?.token;

    // 4. Authenticate Staff (Prof. Robert Kahn, ECE - teaches EC501)
    const staffKahnLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.kahn@college.edu', password: 'Staff@123' }
    );
    assert(staffKahnLogin.status === 200, 'Staff Kahn login succeeded');
    const staffKahnToken = staffKahnLogin.body?.data?.token;

    // 5. Unauthenticated Access -> 401
    const unauthRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/student',
      method: 'GET',
    });
    assert(unauthRes.status === 401, 'Unauthenticated access returns 401 Unauthorized');

    // 6. Student retrieves own attendance summary & logs
    const studentAttRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAttRes.status === 200, 'Student successfully retrieves own attendance');
    assert(
      typeof studentAttRes.body?.data?.overall?.overall_percentage === 'number',
      'Dynamic overall attendance percentage is computed'
    );
    assert(
      Array.isArray(studentAttRes.body?.data?.subjects) && studentAttRes.body.data.subjects.length > 0,
      'Dynamic subject-wise attendance breakdown is returned'
    );
    assert(
      Array.isArray(studentAttRes.body?.data?.records) && studentAttRes.body.data.records.length > 0,
      'Individual session attendance logs are returned'
    );

    // 7. Student cannot access staff class attendance endpoint (RBAC 403)
    const studentForbiddenClass = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance/class/00000000-0000-0000-0000-000000000000',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentForbiddenClass.status === 403, 'Student cannot access /api/attendance/class/:id (403 Forbidden)');

    // 8. Student cannot mark attendance (RBAC 403)
    const studentForbiddenMark = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/attendance',
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      },
      { class_id: 'abc', subject_id: 'def', attendance_date: '2026-09-23', records: [] }
    );
    assert(studentForbiddenMark.status === 403, 'Student cannot mark attendance (403 Forbidden)');

    // 9. Student cannot update attendance (RBAC 403)
    const studentForbiddenUpdate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/attendance/00000000-0000-0000-0000-000000000000',
        method: 'PUT',
        headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
      },
      { status: 'PRESENT' }
    );
    assert(studentForbiddenUpdate.status === 403, 'Student cannot update attendance (403 Forbidden)');

    // 10. Fetch Classes & Subjects to test staff/admin workflows
    const classListRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/classes',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(classListRes.status === 200, 'Admin can list classes');
    const cseClass = classListRes.body?.data?.find((c: any) => c.name.includes('CSE - Year 3'));
    assert(!!cseClass, 'CSE Year 3 class batch exists');

    const subjectListRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/subjects',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(subjectListRes.status === 200, 'Admin can list subjects');
    const dbmsSubject = subjectListRes.body?.data?.find((s: any) => s.code === 'CS501');
    const dspSubject = subjectListRes.body?.data?.find((s: any) => s.code === 'EC501');
    assert(!!dbmsSubject, 'CS501 (DBMS) subject exists');
    assert(!!dspSubject, 'EC501 (DSP) subject exists');

    const studentListRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const alexStudent = studentListRes.body?.data?.find((s: any) => s.email === 'alex.morgan@college.edu');
    assert(!!alexStudent, 'Alex Morgan student record exists');
    const alexStudentId = alexStudent.student_id || alexStudent.id;

    // 11. Staff Jenkins retrieves class attendance for CSE Year 3
    const staffClassAtt = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/attendance/class/${cseClass.id}?subjectId=${dbmsSubject.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffClassAtt.status === 200, 'Staff Jenkins can retrieve assigned class attendance');
    assert(Array.isArray(staffClassAtt.body?.data), 'Class attendance records array returned');

    // 12. Staff Kahn (ECE) attempts to access CSE class subject (CS501) attendance -> 403 Forbidden
    const unauthStaffSubject = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/attendance/class/${cseClass.id}?subjectId=${dbmsSubject.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(unauthStaffSubject.status === 403, 'Staff Kahn is forbidden from accessing unassigned subject CS501 (403)');

    // 13. Staff Jenkins records new attendance session (bulk)
    const testDate = '2026-09-24';
    const markRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/attendance',
        method: 'POST',
        headers: { Authorization: `Bearer ${staffJenkinsToken}`, 'Content-Type': 'application/json' },
      },
      {
        class_id: cseClass.id,
        subject_id: dbmsSubject.id,
        attendance_date: testDate,
        records: [
          {
            student_id: alexStudentId,
            status: 'PRESENT',
            remarks: 'Integration Test Session - Transaction Verification',
          },
        ],
      }
    );
    assert(markRes.status === 201, 'Staff Jenkins successfully marked attendance for CS501');
    const createdRecord = markRes.body?.data?.[0];
    assert(!!createdRecord?.id, 'Created attendance record has valid UUID');

    // 14. Duplicate attendance is upserted/updated cleanly without corrupting uniqueness
    const duplicateRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/attendance',
        method: 'POST',
        headers: { Authorization: `Bearer ${staffJenkinsToken}`, 'Content-Type': 'application/json' },
      },
      {
        class_id: cseClass.id,
        subject_id: dbmsSubject.id,
        attendance_date: testDate,
        records: [
          {
            student_id: alexStudentId,
            status: 'LATE',
            remarks: 'Updated to LATE on same date',
          },
        ],
      }
    );
    assert(duplicateRes.status === 201, 'Duplicate attendance on same date upserted safely');
    assert(duplicateRes.body?.data?.[0]?.status === 'LATE', 'Upserted record reflects updated status LATE');

    // 15. Staff Jenkins updates the record
    const updateRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/attendance/${createdRecord.id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffJenkinsToken}`, 'Content-Type': 'application/json' },
      },
      {
        status: 'PRESENT',
        remarks: 'Rectified status back to PRESENT',
      }
    );
    assert(updateRes.status === 200, 'Staff Jenkins successfully updated attendance record');
    assert(updateRes.body?.data?.status === 'PRESENT', 'Updated status is PRESENT');

    // 16. Staff Kahn cannot update Staff Jenkins record
    const unauthUpdateRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/attendance/${createdRecord.id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${staffKahnToken}`, 'Content-Type': 'application/json' },
      },
      { status: 'ABSENT' }
    );
    assert(unauthUpdateRes.status === 403, 'Unauthorized staff cannot update record (403)');

    // 17. Invalid status rejected (400)
    const invalidStatusRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/attendance/${createdRecord.id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      },
      { status: 'INVALID_STATUS' }
    );
    assert(invalidStatusRes.status === 400, 'Invalid attendance status rejected (400 Bad Request)');

    // 18. Invalid date format rejected (400)
    const invalidDateRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/attendance',
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      },
      {
        class_id: cseClass.id,
        subject_id: dbmsSubject.id,
        attendance_date: 'invalid-date-format',
        records: [{ student_id: alexStudentId, status: 'PRESENT' }],
      }
    );
    assert(invalidDateRes.status === 400, 'Invalid date format rejected (400 Bad Request)');

    // 19. Admin lists all attendance records with pagination & filters
    const adminAllAtt = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/attendance?limit=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllAtt.status === 200, 'Admin can list all attendance records');
    assert(Array.isArray(adminAllAtt.body?.data), 'Admin received array of attendance records');
    assert(typeof adminAllAtt.body?.pagination?.total === 'number', 'Total count returned in pagination');

    // 20. Admin deletes test attendance record
    const deleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/attendance/${createdRecord.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteRes.status === 200, 'Admin successfully deleted test attendance record');

    // 21. Non-admin cannot delete attendance (403)
    const staffDeleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/attendance/${createdRecord.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffDeleteRes.status === 403, 'Staff cannot delete attendance record (403 Forbidden)');

    // 22. Deleted record cannot be found -> 404
    const notFoundRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/attendance/${createdRecord.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(notFoundRes.status === 404, 'Deleted attendance record returns 404 Not Found');

    console.log('\n=====================================================');
    console.log(`  PHASE 4.4 ATTENDANCE TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

// Execute tests
runAttendanceTests();
