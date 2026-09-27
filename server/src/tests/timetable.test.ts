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

async function runTimetableTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4.3 TIMETABLE TEST SUITE');
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
    assert(studentLogin.status === 200, 'Student login succeeded');
    const studentToken = studentLogin.body?.data?.token;

    // 3. Authenticate Staff (Dr. Sarah Jenkins, CSE)
    const staffLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.jenkins@college.edu', password: 'Staff@123' }
    );
    assert(staffLogin.status === 200, 'Staff Jenkins login succeeded');
    const staffToken = staffLogin.body?.data?.token;

    // 4. Authenticate Staff (Prof. Alan Turing, CSE)
    const turingLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.turing@college.edu', password: 'Staff@123' }
    );
    assert(turingLogin.status === 200, 'Staff Turing login succeeded');
    const turingToken = turingLogin.body?.data?.token;

    // 5. Unauthenticated Access -> 401
    const unauthRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/student',
      method: 'GET',
    });
    assert(unauthRes.status === 401, 'Unauthenticated request to GET /api/timetable/student returns 401');

    // 6. Student retrieves own class timetable
    const studentTt = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentTt.status === 200, 'Student GET /api/timetable/student returns 200 OK');
    const studentSlots = studentTt.body?.data || [];
    assert(studentSlots.length >= 20, `Student retrieved full weekly schedule (${studentSlots.length} slots)`);

    // 7. Student filters by day_of_week
    const studentMon = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/student?day_of_week=MONDAY',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentMon.status === 200, 'Student GET /api/timetable/student?day_of_week=MONDAY returns 200');
    assert(
      studentMon.body?.data?.every((s: any) => s.day_of_week === 'MONDAY'),
      'All returned slots are for MONDAY'
    );
    assert(studentMon.body?.data?.length === 4, 'Monday has exactly 4 scheduled sessions');

    // 8. Staff Jenkins retrieves own teaching schedule
    const jenkinsTt = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(jenkinsTt.status === 200, 'Staff Jenkins GET /api/timetable/staff returns 200 OK');
    const jenkinsSlots = jenkinsTt.body?.data || [];
    assert(
      jenkinsSlots.every((s: any) => s.staff_employee_id === 'EMP-CSE-001'),
      'All slots taught by Dr. Sarah Jenkins (EMP-CSE-001)'
    );

    // 9. Staff Turing retrieves own teaching schedule
    const turingTt = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${turingToken}` },
    });
    assert(turingTt.status === 200, 'Staff Turing GET /api/timetable/staff returns 200 OK');
    const turingSlots = turingTt.body?.data || [];
    assert(
      turingSlots.every((s: any) => s.staff_employee_id === 'EMP-CSE-002'),
      'All slots taught by Prof. Alan Turing (EMP-CSE-002)'
    );

    // 10. RBAC: Student forbidden from Staff endpoint
    const studentForbiddenStaff = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentForbiddenStaff.status === 403, 'Student is forbidden from /api/timetable/staff (403)');

    // 11. RBAC: Staff forbidden from Student endpoint
    const staffForbiddenStudent = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffForbiddenStudent.status === 403, 'Staff is forbidden from /api/timetable/student (403)');

    // 12. Admin lists all timetable entries
    const adminTt = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminTt.status === 200, 'Admin GET /api/timetable returns 200 OK');
    assert(adminTt.body?.data?.length >= 21, `Admin sees all timetable entries (${adminTt.body?.data?.length})`);

    // Fetch references for CRUD testing
    const sampleSlot = studentSlots[0];
    const deptId = sampleSlot.department_id;
    const classId = sampleSlot.class_id;
    const subjectId = sampleSlot.subject_id;
    const staffId = sampleSlot.staff_id;

    // 13. Student cannot create timetable entry
    const studentCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/timetable',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      },
      { academic_year: '2025-2026', semester: 5 }
    );
    assert(studentCreate.status === 403, 'Student cannot create timetable entry (403 Forbidden)');

    // 14. Staff cannot create timetable entry
    const staffCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/timetable',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      { academic_year: '2025-2026', semester: 5 }
    );
    assert(staffCreate.status === 403, 'Staff cannot create timetable entry (403 Forbidden)');

    // 15. Invalid time range (start_time >= end_time) returns 400
    const invalidTime = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/timetable',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        academic_year: '2025-2026',
        semester: 5,
        department_id: deptId,
        class_id: classId,
        subject_id: subjectId,
        staff_id: staffId,
        day_of_week: 'SUNDAY',
        start_time: '14:00:00',
        end_time: '13:00:00',
        room: 'Room C-301',
      }
    );
    assert(invalidTime.status === 400, 'Invalid time range (start >= end) rejected with 400');

    // 16. Admin creates valid Sunday extra session
    const adminCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/timetable',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        academic_year: '2025-2026',
        semester: 5,
        department_id: deptId,
        class_id: classId,
        division: 'A',
        subject_id: subjectId,
        staff_id: staffId,
        day_of_week: 'SUNDAY',
        start_time: '10:00:00',
        end_time: '12:00:00',
        room: 'Seminar Hall A',
        lecture_type: 'SEMINAR',
      }
    );
    assert(adminCreate.status === 201, 'Admin created Sunday seminar session (201 Created)');
    const createdSlotId = adminCreate.body?.data?.id;

    // 17. Duplicate slot conflict (same class, day, overlapping time) returns 409
    const duplicateSlot = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/timetable',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        academic_year: '2025-2026',
        semester: 5,
        department_id: deptId,
        class_id: classId,
        division: 'A',
        subject_id: subjectId,
        staff_id: staffId,
        day_of_week: 'SUNDAY',
        start_time: '11:00:00',
        end_time: '13:00:00',
        room: 'Room C-301',
      }
    );
    assert(duplicateSlot.status === 409, 'Overlapping class time conflict rejected with 409 Conflict');

    // 18. Admin updates created slot room
    const adminUpdate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/timetable/${createdSlotId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      { room: 'Main Auditorium' }
    );
    assert(adminUpdate.status === 200, 'Admin updated timetable slot room (200 OK)');
    assert(adminUpdate.body?.data?.room === 'Main Auditorium', 'Room successfully updated to Main Auditorium');

    // 19. Student & Staff cannot delete slot
    const studentDelete = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/timetable/${createdSlotId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDelete.status === 403, 'Student deleting timetable slot returns 403 Forbidden');

    const staffDelete = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/timetable/${createdSlotId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffDelete.status === 403, 'Staff deleting timetable slot returns 403 Forbidden');

    // 20. Admin deletes created slot
    const adminDelete = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/timetable/${createdSlotId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDelete.status === 200, 'Admin deleted test timetable slot (200 OK)');

  } catch (err) {
    console.error('Timetable test error:', err);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`  TIMETABLE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTimetableTests();
}
