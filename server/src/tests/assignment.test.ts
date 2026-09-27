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

async function runAssignmentTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4.5 ASSIGNMENTS TEST SUITE');
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

    // 2. Authenticate Student (Alex Morgan, CSE Year 3 Sem 5 Div A)
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

    // 3. Authenticate Student (Aisha Khan, ECE Year 3 Sem 5 Div A)
    const aishaLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'aisha.khan@college.edu', password: 'Student@123' }
    );
    assert(aishaLogin.status === 200, 'Student Aisha (ECE) login succeeded');
    const aishaToken = aishaLogin.body?.data?.token;

    // 4. Authenticate Staff (Dr. Sarah Jenkins, CSE - teaches CS501, CS504, CS506)
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

    // 5. Authenticate Staff (Prof. Robert Kahn, ECE - teaches EC501)
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

    // 6. Unauthenticated Access -> 401
    const unauthRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/assignments/student',
      method: 'GET',
    });
    assert(unauthRes.status === 401, 'Unauthenticated student access rejected with 401');

    // 7. Student Alex retrieves assignments -> 200
    const studentAssignRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/assignments/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAssignRes.status === 200, 'Student Alex retrieves assigned coursework with 200 OK');
    assert(Array.isArray(studentAssignRes.body?.data), 'Student assignments response data is an array');
    const alexAssignments = studentAssignRes.body?.data || [];
    assert(alexAssignments.length >= 6, `Student Alex received ${alexAssignments.length} class assignments (expected >= 6)`);

    // Verify submission join data in student view
    const gradedItem = alexAssignments.find((a: any) => a.submission_status === 'GRADED');
    assert(!!gradedItem, 'Student Alex assignments list contains GRADED item');
    assert(gradedItem?.marks_obtained !== undefined, 'Graded assignment includes marks_obtained');
    assert(!!gradedItem?.feedback, 'Graded assignment includes faculty feedback');

    // 8. Student Alex filters assignments by subject
    const dbmsAssign = alexAssignments.find((a: any) => a.subject_code === 'CS501');
    assert(!!dbmsAssign, 'Found CS501 assignment for Student Alex');

    const filteredStudentRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/assignments/student?subjectId=${dbmsAssign?.subject_id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(filteredStudentRes.status === 200, 'Student filtered assignments by subject with 200 OK');
    assert(
      filteredStudentRes.body?.data?.every((a: any) => a.subject_id === dbmsAssign?.subject_id),
      'All returned assignments match filtered subject ID'
    );

    // 9. Student RBAC: Student cannot view staff assignments endpoint -> 403
    const studentStaffEndpointRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/assignments/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentStaffEndpointRes.status === 403, 'Student denied access to /api/assignments/staff with 403');

    // 10. Student submits work for an open assignment
    const upcomingAssignment = alexAssignments.find((a: any) => a.submission_status === 'NOT_SUBMITTED' && a.status === 'PUBLISHED');
    assert(!!upcomingAssignment, 'Found open unsubmitted assignment for Student Alex');

    if (upcomingAssignment) {
      const submitRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/${upcomingAssignment.id}/submit`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`,
          },
        },
        {
          submission_text: 'Alex Morgan coursework submission with full SQL DDL script and normalization diagram.',
          attachment_name: 'alex_ddl_solution.sql',
          attachment_url: '/uploads/assignments/alex_ddl_solution.sql',
        }
      );
      assert(submitRes.status === 200 || submitRes.status === 201, 'Student successfully submits assignment work (200/201)');
      assert(submitRes.body?.data?.status === 'SUBMITTED', 'Submission status recorded as SUBMITTED');
      assert(!!submitRes.body?.data?.submitted_at, 'Submission recorded valid timestamp');
    }

    // 11. Student cannot submit to a CLOSED assignment
    const closedAssignment = alexAssignments.find((a: any) => a.status === 'CLOSED');
    assert(!!closedAssignment, 'Found CLOSED assignment in database');
    if (closedAssignment) {
      const closedSubmitRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/${closedAssignment.id}/submit`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`,
          },
        },
        {
          submission_text: 'Attempting submission to closed assignment',
        }
      );
      assert(closedSubmitRes.status === 400, 'Submission to CLOSED assignment rejected with 400 Bad Request');
    }

    // 12. Class isolation: Aisha (ECE) cannot submit to CSE assignment
    if (upcomingAssignment) {
      const eceSubmitToCseRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/${upcomingAssignment.id}/submit`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aishaToken}`,
          },
        },
        {
          submission_text: 'Unauthorized student attempting submission',
        }
      );
      assert(eceSubmitToCseRes.status === 403, 'Cross-class assignment submission blocked with 403 Forbidden');
    }

    // 13. Staff Jenkins retrieves staff assignments -> 200
    const staffAssignRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/assignments/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffAssignRes.status === 200, 'Staff Jenkins retrieves course assignments with 200 OK');
    const jenkinsAssignments = staffAssignRes.body?.data || [];
    assert(jenkinsAssignments.length >= 4, `Staff Jenkins has ${jenkinsAssignments.length} course assignments`);
    assert(jenkinsAssignments[0]?.total_submissions !== undefined, 'Staff assignment includes total_submissions count');

    // 14. Staff Jenkins retrieves submissions for an assignment
    const targetAssign = jenkinsAssignments.find((a: any) => a.subject_code === 'CS501') || jenkinsAssignments[0];
    const submissionsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/assignments/${targetAssign.id}/submissions`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(submissionsRes.status === 200, 'Staff Jenkins views assignment submissions with 200 OK');
    assert(Array.isArray(submissionsRes.body?.data), 'Submissions response is an array');

    // 15. Staff Kahn (ECE) cannot view submissions for Sarah Jenkins (CSE) assignment -> 403
    const kahnViewJenkinsSubmissions = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/assignments/${targetAssign.id}/submissions`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(kahnViewJenkinsSubmissions.status === 403, 'Unauthorized staff access to assignment submissions rejected with 403');

    // 16. Staff Jenkins grades a submission
    const targetSubmission = submissionsRes.body?.data?.find((s: any) => s.status === 'SUBMITTED' || s.status === 'LATE');
    if (targetSubmission) {
      const gradeRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/submissions/${targetSubmission.id}/grade`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffJenkinsToken}`,
          },
        },
        {
          marks: 24.5,
          feedback: 'Outstanding normalization schema and clear SQL constraint definitions.',
        }
      );
      assert(gradeRes.status === 200, 'Staff Jenkins successfully graded submission with 200 OK');
      assert(gradeRes.body?.data?.status === 'GRADED', 'Submission status updated to GRADED');
      assert(gradeRes.body?.data?.marks === 24.5, 'Submission marks correctly recorded');
    }

    // 17. Grading validation: Marks > max_marks -> 400
    if (targetSubmission) {
      const invalidHighGradeRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/submissions/${targetSubmission.id}/grade`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffJenkinsToken}`,
          },
        },
        {
          marks: 9999, // Exceeds max marks
          feedback: 'Invalid marks test',
        }
      );
      assert(invalidHighGradeRes.status === 400, 'Grading marks exceeding max_marks rejected with 400 Bad Request');

      const invalidNegativeGradeRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/submissions/${targetSubmission.id}/grade`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffJenkinsToken}`,
          },
        },
        {
          marks: -5,
          feedback: 'Negative marks test',
        }
      );
      assert(invalidNegativeGradeRes.status === 400, 'Grading with negative marks rejected with 400 Bad Request');
    }

    // 18. Staff creates a new assignment
    const newAssignmentRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/assignments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffJenkinsToken}`,
        },
      },
      {
        title: 'Automated Test Assignment: Concurrency & Locks',
        description: 'Implement two-phase locking (2PL) protocol simulation in Node.js/TypeScript.',
        class_id: targetAssign.class_id,
        subject_id: targetAssign.subject_id,
        academic_year: '2025-2026',
        semester: 5,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        max_marks: 30,
        status: 'PUBLISHED',
      }
    );
    assert(newAssignmentRes.status === 201, 'Staff Jenkins creates assignment with 201 Created');
    const createdAssignmentId = newAssignmentRes.body?.data?.id;
    assert(!!createdAssignmentId, 'Created assignment returned valid UUID');

    // 19. Staff updates created assignment
    if (createdAssignmentId) {
      const updateAssignRes = await request(
        {
          hostname: 'localhost',
          port: 5000,
          path: `/api/assignments/${createdAssignmentId}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffJenkinsToken}`,
          },
        },
        {
          title: 'Automated Test Assignment: Concurrency & Locks (Updated)',
          max_marks: 35,
        }
      );
      assert(updateAssignRes.status === 200, 'Staff Jenkins updates assignment with 200 OK');
      assert(updateAssignRes.body?.data?.title.includes('(Updated)'), 'Assignment title successfully updated');
    }

    // 20. Student cannot create or delete assignments -> 403
    const studentCreateAttempt = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/assignments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
      },
      {
        title: 'Hacker Assignment',
        description: 'Should fail',
        class_id: targetAssign.class_id,
        subject_id: targetAssign.subject_id,
        due_date: new Date().toISOString(),
      }
    );
    assert(studentCreateAttempt.status === 403, 'Student forbidden from creating assignments (403)');

    // 21. Admin retrieves all institution assignments -> 200
    const adminAssignmentsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/assignments',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAssignmentsRes.status === 200, 'Admin retrieves all institution assignments with 200 OK');
    assert(Array.isArray(adminAssignmentsRes.body?.data), 'Admin assignments response is an array');

    // 22. Admin deletes test assignment -> 200
    if (createdAssignmentId) {
      const adminDeleteRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/assignments/${createdAssignmentId}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(adminDeleteRes.status === 200, 'Admin successfully deleted test assignment with 200 OK');
    }

    console.log('\n=====================================================');
    console.log(`  PHASE 4.5 ASSIGNMENT TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Assignment test execution error:', error);
    process.exit(1);
  }
}

runAssignmentTests();
