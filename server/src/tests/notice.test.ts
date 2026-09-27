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

async function runNoticeTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4.2 NOTICES & BULLETINS TEST SUITE');
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
    assert(staffLogin.status === 200, 'Staff login succeeded');
    const staffToken = staffLogin.body?.data?.token;

    // 4. Test Unauthenticated Access to Notices -> 401
    const unauthRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notices',
      method: 'GET',
    });
    assert(unauthRes.status === 401, 'Unauthenticated request to GET /api/notices returns 401');

    // 5. Test Student Notice Retrieval & Audience Scoping
    const studentNotices = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notices',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentNotices.status === 200, 'Student GET /api/notices returns 200 OK');
    const studentItems = studentNotices.body?.data || [];
    assert(studentItems.length >= 4, `Student sees expected notices (count: ${studentItems.length})`);
    const hasStaffOnly = studentItems.some((n: any) => n.target_role === 'STAFF');
    assert(!hasStaffOnly, 'Student does NOT receive STAFF-only target notices');
    const hasStudentOrAll = studentItems.every((n: any) => n.target_role === 'ALL' || n.target_role === 'STUDENT');
    assert(hasStudentOrAll, 'All student-received notices are targeted to ALL or STUDENT');

    // 6. Test Staff Notice Retrieval & Audience Scoping
    const staffNotices = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notices',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffNotices.status === 200, 'Staff GET /api/notices returns 200 OK');
    const staffItems = staffNotices.body?.data || [];
    const hasStudentOnly = staffItems.some((n: any) => n.target_role === 'STUDENT');
    assert(!hasStudentOnly, 'Staff does NOT receive STUDENT-only target notices');
    const staffHasStaffNotice = staffItems.some((n: any) => n.title.includes('Faculty Senate'));
    assert(staffHasStaffNotice, 'Staff receives Faculty Senate administrative notice');

    // 7. Test Admin Notice Retrieval (all published/targeted notices)
    const adminNotices = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notices',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminNotices.status === 200, 'Admin GET /api/notices returns 200 OK');
    const adminItems = adminNotices.body?.data || [];
    assert(adminItems.length >= 6, `Admin sees all notices (count: ${adminItems.length})`);

    // 8. Test Query Filters (Category & Priority)
    const examNotices = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notices?category=EXAMINATION',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(examNotices.status === 200, 'Filter by category=EXAMINATION returns 200');
    assert(
      examNotices.body?.data?.every((n: any) => n.category === 'EXAMINATION'),
      'All returned notices match category EXAMINATION'
    );

    // 9. Test Notice Creation - Student Forbidden (403)
    const studentCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notices',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      },
      {
        title: 'Unauthorized Student Notice',
        description: 'Should be rejected by RBAC.',
      }
    );
    assert(studentCreate.status === 403, 'Student creating notice is blocked with 403 Forbidden');

    // 10. Test Notice Creation - Staff Succeeded (201)
    const staffCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notices',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      {
        title: 'DBMS Project Submission Portal Active',
        description: 'Submission links are active on the portal for CS501 Phase-2 schema design.',
        category: 'ACADEMIC',
        priority: 'HIGH',
        target_role: 'STUDENT',
      }
    );
    assert(staffCreate.status === 201, 'Staff creating notice returns 201 Created');
    const staffCreatedId = staffCreate.body?.data?.id;

    // 11. Test Notice Creation - Admin Succeeded (201)
    const adminCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notices',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        title: 'Emergency Power Backup Test',
        description: 'Campus microgrid simulation test this Saturday 2:00 PM.',
        category: 'GENERAL',
        priority: 'LOW',
        target_role: 'ALL',
      }
    );
    assert(adminCreate.status === 201, 'Admin creating notice returns 201 Created');
    const adminCreatedId = adminCreate.body?.data?.id;

    // 12. Test Notice Update - Student Forbidden (403)
    const studentUpdate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notices/${adminCreatedId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      },
      { title: 'Hacked Title Attempt' }
    );
    assert(studentUpdate.status === 403, 'Student updating notice returns 403 Forbidden');

    // 13. Test Notice Update - Staff updating someone else notice -> 403 Forbidden
    const staffUpdateOther = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notices/${adminCreatedId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      { title: 'Staff Editing Admin Notice' }
    );
    assert(staffUpdateOther.status === 403, 'Staff updating unauthored notice returns 403 Forbidden');

    // 14. Test Notice Update - Staff updating own notice -> 200 OK
    const staffUpdateOwn = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notices/${staffCreatedId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      { title: 'DBMS Project Submission Portal Active [EXTENDED]' }
    );
    assert(staffUpdateOwn.status === 200, 'Staff updating own notice returns 200 OK');

    // 15. Test Notice Update - Admin updating any notice -> 200 OK
    const adminUpdate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notices/${staffCreatedId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      { priority: 'URGENT' }
    );
    assert(adminUpdate.status === 200, 'Admin updating any notice returns 200 OK');

    // 16. Test Notice Delete - Student & Staff Forbidden (403)
    const studentDelete = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notices/${adminCreatedId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDelete.status === 403, 'Student deleting notice returns 403 Forbidden');

    const staffDelete = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notices/${adminCreatedId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffDelete.status === 403, 'Staff deleting notice returns 403 Forbidden');

    // 17. Test Notice Delete - Admin Succeeded (200)
    const adminDelete1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notices/${adminCreatedId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDelete1.status === 200, 'Admin deleting notice returns 200 OK');

    const adminDelete2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notices/${staffCreatedId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDelete2.status === 200, 'Admin deleting staff notice returns 200 OK');

    // 18. Validation Tests - Missing required fields
    const invalidCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notices',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      { title: '', description: '' }
    );
    assert(invalidCreate.status === 400, 'Empty notice title & description returns 400 Bad Request');

  } catch (err) {
    console.error('Test run error:', err);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`  NOTICES TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runNoticeTests();
}
