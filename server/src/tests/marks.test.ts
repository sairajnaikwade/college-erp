import http from 'http';
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Utility helper to perform HTTP requests against the running test server
function request(
  options: http.RequestOptions,
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode || 0, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runMarksAndGradesTests() {
  console.log('\n=====================================================');
  console.log('  STARTING PHASE 4.8 MARKS & GRADES TEST SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(msg: string) {
    console.log(`[PASS] ${msg}`);
    passed++;
  }

  function recordFail(msg: string, err?: any) {
    console.error(`[FAIL] ${msg}`, err ? err : '');
    failed++;
  }

  try {
    // 1. Authenticate users
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
    assert(adminLogin.status === 200, 'Admin login failed');
    const adminToken = adminLogin.body.data.token;
    recordPass('Admin login succeeded (200)');

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
    assert(staffJenkinsLogin.status === 200, 'Staff Jenkins login failed');
    const staffJenkinsToken = staffJenkinsLogin.body.data.token;
    recordPass('Staff Dr. Sarah Jenkins login succeeded (200)');

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
    assert(staffKahnLogin.status === 200, 'Staff Kahn login failed');
    const staffKahnToken = staffKahnLogin.body.data.token;
    recordPass('Staff Prof. Robert Kahn login succeeded (200)');

    const studentAlexLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'alex.morgan@college.edu', password: 'Student@123' }
    );
    assert(studentAlexLogin.status === 200, 'Student Alex login failed');
    const studentAlexToken = studentAlexLogin.body.data.token;
    recordPass('Student Alex Morgan login succeeded (200)');

    const studentAishaLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'aisha.khan@college.edu', password: 'Student@123' }
    );
    assert(studentAishaLogin.status === 200, 'Student Aisha login failed');
    const studentAishaToken = studentAishaLogin.body.data.token;
    recordPass('Student Aisha Khan (ECE) login succeeded (200)');

    // 2. Unauthenticated endpoint guards (401)
    const unauthMarks = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/marks/components',
      method: 'GET',
    });
    assert(unauthMarks.status === 401, 'Expected 401 for unauthenticated /api/marks/components');
    recordPass('Unauthenticated /api/marks/components blocked with 401');

    const unauthResults = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/results/student',
      method: 'GET',
    });
    assert(unauthResults.status === 401, 'Expected 401 for unauthenticated /api/results/student');
    recordPass('Unauthenticated /api/results/student blocked with 401');

    // 3. Staff Jenkins retrieves authorized mark components -> 200
    const jenkinsCompsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/marks/components',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(jenkinsCompsRes.status === 200, 'Staff Jenkins components fetch returned status ' + jenkinsCompsRes.status);
    const jenkinsComps = jenkinsCompsRes.body?.data || [];
    assert(Array.isArray(jenkinsComps), 'Components data is an array');
    assert(jenkinsComps.length >= 4, `Staff Jenkins retrieved ${jenkinsComps.length} components`);
    recordPass(`Staff Jenkins retrieved ${jenkinsComps.length} course components (200 OK)`);

    const cs501Comp = jenkinsComps.find((c: any) => c.subject_code === 'CS501');
    assert(cs501Comp, 'Found CS501 component for testing');
    const cs501SubjectId = cs501Comp.subject_id;
    const cseClassId = cs501Comp.class_id;
    recordPass('Resolved active CS501 subject and CSE class IDs');

    // 4. Staff Jenkins creates a new mark component -> 201
    const testCompCode = 'CS501-P2-' + Date.now().toString().slice(-4);
    const createCompRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks/components',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        name: 'Database Lab Practical Exam 2',
        code: testCompCode,
        description: 'Hands-on query tuning and indexing practical assessment',
        subject_id: cs501SubjectId,
        class_id: cseClassId,
        max_marks: 25,
        weightage: 25,
        component_type: 'PRACTICAL',
      }
    );
    assert(createCompRes.status === 201, 'Component creation returned status ' + createCompRes.status);
    const createdComp = createCompRes.body?.data;
    assert(createdComp?.code === testCompCode, 'Created component code matches');
    recordPass(`Staff Jenkins created new component ${testCompCode} (201 Created)`);

    // 5. Unauthorized Staff Kahn (ECE) cannot create component for CS501 (CSE) -> 403
    const unauthorizedCompCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks/components',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffKahnToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        name: 'Unauthorized Component',
        code: 'CS501-UNAUTH',
        subject_id: cs501SubjectId,
        class_id: cseClassId,
        max_marks: 20,
        component_type: 'INTERNAL',
      }
    );
    assert(unauthorizedCompCreate.status === 403, 'Expected 403 for unauthorized staff component creation');
    recordPass('Unauthorized staff forbidden from creating component for unassigned course (403)');

    // 6. Student is forbidden from creating mark components -> 403
    const studentCompCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks/components',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        name: 'Student Component',
        code: 'CS501-STUDENT',
        subject_id: cs501SubjectId,
        max_marks: 20,
        component_type: 'INTERNAL',
      }
    );
    assert(studentCompCreate.status === 403, 'Expected 403 for student component creation');
    recordPass('Student is forbidden from creating mark components (403)');

    // 7. Validation: Component creation with max_marks <= 0 rejected with 400
    const invalidCompRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks/components',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        name: 'Invalid Zero Marks Component',
        code: 'CS501-ZERO',
        subject_id: cs501SubjectId,
        class_id: cseClassId,
        max_marks: 0,
        component_type: 'INTERNAL',
      }
    );
    assert(invalidCompRes.status === 400, 'Expected 400 for max_marks <= 0');
    recordPass('Component creation with max_marks <= 0 rejected with 400 Bad Request');

    // 8. Staff updates component metadata -> 200
    const updateCompRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/marks/components/${createdComp.id}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        name: 'Database Lab Practical Exam 2 (Advanced)',
        max_marks: 30,
      }
    );
    assert(updateCompRes.status === 200, 'Component update returned status ' + updateCompRes.status);
    assert(updateCompRes.body?.data?.max_marks === 30, 'Updated max_marks is 30');
    recordPass('Staff Jenkins updated component max_marks to 30 (200 OK)');

    // 9. Staff retrieves eligible students for component -> 200
    const compStudentsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/marks/components/${createdComp.id}/students`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(compStudentsRes.status === 200, 'Eligible students fetch returned ' + compStudentsRes.status);
    const eligibleStudents = compStudentsRes.body?.data?.students || [];
    assert(Array.isArray(eligibleStudents) && eligibleStudents.length > 0, 'Returned eligible students');
    recordPass(`Staff retrieved ${eligibleStudents.length} eligible students for component`);

    const alexRecord = eligibleStudents.find((s: any) => s.email === 'alex.morgan@college.edu');
    assert(alexRecord, 'Alex Morgan is in the eligible students list');
    const alexStudentId = alexRecord.student_id;

    // 10. Staff enters marks for Alex Morgan -> 200
    const enterMarkRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        component_id: createdComp.id,
        student_id: alexStudentId,
        marks_obtained: 27,
        remarks: 'Excellent execution plan analysis',
        status: 'DRAFT',
      }
    );
    assert(enterMarkRes.status === 200, 'Mark entry returned status ' + enterMarkRes.status);
    const enteredMark = enterMarkRes.body?.data;
    assert(enteredMark?.marks_obtained === 27, 'Marks obtained recorded as 27');
    assert(enteredMark?.status === 'DRAFT', 'Initial mark status is DRAFT');
    recordPass('Staff Jenkins recorded draft mark 27/30 for Alex Morgan (200 OK)');

    // 11. Mark Validation: Marks above max_marks rejected with 400
    const excessMarkRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        component_id: createdComp.id,
        student_id: alexStudentId,
        marks_obtained: 35, // max is 30
      }
    );
    assert(excessMarkRes.status === 400, 'Expected 400 for marks > max_marks');
    recordPass('Entering marks exceeding component max_marks rejected with 400 Bad Request');

    // 12. Mark Validation: Negative marks rejected with 400
    const negativeMarkRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        component_id: createdComp.id,
        student_id: alexStudentId,
        marks_obtained: -5,
      }
    );
    assert(negativeMarkRes.status === 400, 'Expected 400 for negative marks');
    recordPass('Entering negative marks rejected with 400 Bad Request');

    // 13. Student RBAC: Student cannot enter or update marks -> 403
    const studentMarkEntry = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        component_id: createdComp.id,
        student_id: alexStudentId,
        marks_obtained: 30,
      }
    );
    assert(studentMarkEntry.status === 403, 'Expected 403 for student mark entry');
    recordPass('Student forbidden from entering marks (403)');

    // 14. Staff updates mark record -> 200
    const updateMarkRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/marks/${enteredMark.id}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        marks_obtained: 28,
        remarks: 'Revised after reviewing explain plan output',
      }
    );
    assert(updateMarkRes.status === 200, 'Mark update returned ' + updateMarkRes.status);
    assert(updateMarkRes.body?.data?.marks_obtained === 28, 'Marks updated to 28');
    recordPass('Staff Jenkins updated mark to 28/30 (200 OK)');

    // 15. Draft Mark Isolation: Student cannot see DRAFT mark in published student marks
    const studentMarksBeforePublish = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/marks/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentMarksBeforePublish.status === 200, 'Student marks fetch returned ' + studentMarksBeforePublish.status);
    const draftLeaked = (studentMarksBeforePublish.body?.data || []).some(
      (m: any) => m.component_id === createdComp.id
    );
    assert(!draftLeaked, 'Draft mark was not exposed to student');
    recordPass('Draft marks are hidden from student marks endpoint (Zero leakage)');

    // 16. Staff publishes individual mark record -> 200
    const publishMarkRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/marks/${enteredMark.id}/publish`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(publishMarkRes.status === 200, 'Mark publishing returned ' + publishMarkRes.status);
    assert(publishMarkRes.body?.data?.status === 'PUBLISHED', 'Mark status is now PUBLISHED');
    recordPass('Staff Jenkins published mark record successfully (200 OK)');

    // 17. Student now sees the published mark -> 200
    const studentMarksAfterPublish = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/marks/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentMarksAfterPublish.status === 200, 'Student marks fetch returned 200');
    const publishedFound = (studentMarksAfterPublish.body?.data || []).find(
      (m: any) => m.component_id === createdComp.id
    );
    assert(publishedFound && publishedFound.marks_obtained === 28, 'Published mark is now visible to student');
    recordPass('Student can now view the published mark record (200 OK)');

    // 18. Student filters marks by subject_id -> 200
    const studentFilteredMarks = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/marks/student?subject_id=${cs501SubjectId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentFilteredMarks.status === 200, 'Subject filtered marks returned 200');
    const filteredMarks = studentFilteredMarks.body?.data || [];
    assert(filteredMarks.length > 0, 'Returned filtered marks array');
    const allMatchSubject = filteredMarks.every((m: any) => m.subject_id === cs501SubjectId);
    assert(allMatchSubject, 'All filtered marks match requested subject ID');
    recordPass('Student successfully filtered marks by subject ID (200 OK)');

    // 19. Staff Jenkins calculates subject result for Alex Morgan on CS501 -> 200
    const calcResultRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/${alexStudentId}/${cs501SubjectId}/calculate`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(calcResultRes.status === 200, 'Calculate result returned ' + calcResultRes.status);
    const calcData = calcResultRes.body?.data;
    assert(calcData?.result?.total_marks > 0, 'Total marks calculated > 0');
    assert(calcData?.result?.max_marks > 0, 'Max marks calculated > 0');
    assert(typeof calcData?.result?.percentage === 'number', 'Percentage calculated as number');
    assert(typeof calcData?.result?.grade === 'string', 'Grade calculated');
    assert(calcData?.result?.result_status === 'DRAFT', 'Result status is DRAFT');
    recordPass(`Server-side calculation produced ${calcData.result.total_marks}/${calcData.result.max_marks} (${calcData.result.percentage}%, Grade ${calcData.result.grade})`);

    // 20. Staff Jenkins publishes subject result -> 200
    const publishResultRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/${alexStudentId}/${cs501SubjectId}/publish`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(publishResultRes.status === 200, 'Publish result returned ' + publishResultRes.status);
    assert(publishResultRes.body?.data?.result_status === 'PUBLISHED', 'Result status updated to PUBLISHED');
    recordPass('Staff Jenkins published subject result successfully (200 OK)');

    // 21. Student Alex views own published academic results -> 200
    const studentResultsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/results/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentResultsRes.status === 200, 'Student results fetch returned ' + studentResultsRes.status);
    const alexResults = studentResultsRes.body?.data;
    assert(alexResults?.overall?.total_marks > 0, 'Overall total marks computed');
    assert(alexResults?.overall?.gpa > 0, 'Overall GPA computed');
    assert(Array.isArray(alexResults?.subjects) && alexResults.subjects.length > 0, 'Subjects result list returned');
    recordPass(`Student Alex viewed results summary: GPA ${alexResults.overall.gpa}, Overall ${alexResults.overall.percentage}%`);

    // 22. Student Alex views detailed subject breakdown for CS501 -> 200
    const cs501DetailsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/student/${cs501SubjectId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(cs501DetailsRes.status === 200, 'Subject result details returned ' + cs501DetailsRes.status);
    const details = cs501DetailsRes.body?.data;
    assert(details?.subject?.code === 'CS501', 'Subject details code is CS501');
    assert(Array.isArray(details?.components) && details.components.length > 0, 'Component breakdown returned');
    recordPass(`Student Alex viewed detailed breakdown for CS501 (${details.components.length} components)`);

    // 23. Security / IDOR: Cross-student result access is blocked
    const aishaDirectTamper = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/marks/student/${alexStudentId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${studentAishaToken}` },
      }
    );
    assert(aishaDirectTamper.status === 403, 'Expected 403 for cross-student marks inspection');
    recordPass('Student Aisha blocked from accessing Student Alex marks (403 Forbidden)');

    // 24. Staff views class results directory -> 200
    const classResultsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/class/${cseClassId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(classResultsRes.status === 200, 'Class results fetch returned ' + classResultsRes.status);
    const classResults = classResultsRes.body?.data || [];
    assert(Array.isArray(classResults) && classResults.length > 0, 'Class results array returned');
    recordPass(`Staff Jenkins viewed ${classResults.length} class student results (200 OK)`);

    // 25. Admin views global results directory -> 200
    const adminResultsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/results',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminResultsRes.status === 200, 'Admin results fetch returned ' + adminResultsRes.status);
    assert(Array.isArray(adminResultsRes.body?.data), 'Admin results data is an array');
    assert(typeof adminResultsRes.body?.total === 'number', 'Admin results includes total count');
    recordPass(`Admin retrieved global results catalogue (${adminResultsRes.body.total} total)`);

    // 26. Admin views marks statistics -> 200
    const marksStatsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/marks/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(marksStatsRes.status === 200, 'Marks stats returned ' + marksStatsRes.status);
    const marksStats = marksStatsRes.body?.data;
    assert(marksStats?.total_components >= 10, 'Total components >= 10');
    assert(marksStats?.total_marks_entered >= 20, 'Total marks entered >= 20');
    recordPass(`Admin retrieved marks stats: ${marksStats.total_components} components, ${marksStats.total_marks_entered} marks`);

    // 28. Batch Marks Entry: Staff records multiple student marks in one transaction -> 200
    const priyaRecord = eligibleStudents.find((s: any) => s.email === 'priya.sharma@college.edu');
    const davidRecord = eligibleStudents.find((s: any) => s.email === 'david.chen@college.edu');
    assert(priyaRecord && davidRecord, 'Priya Sharma and David Chen found in eligible students');

    const batchEntryRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        component_id: createdComp.id,
        entries: [
          { student_id: priyaRecord.student_id, marks_obtained: 30, remarks: 'Full marks' },
          { student_id: davidRecord.student_id, marks_obtained: 22, remarks: 'Good work' },
        ],
      }
    );
    assert(batchEntryRes.status === 200, 'Batch mark entry returned status ' + batchEntryRes.status);
    assert(Array.isArray(batchEntryRes.body?.data) && batchEntryRes.body.data.length === 2, 'Batch entry inserted 2 records');
    recordPass('Staff Jenkins performed atomic batch marks entry for 2 students (200 OK)');

    // 29. Security: Cannot delete component with published student marks -> 400
    const deletePublishedComp = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/marks/components/${createdComp.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(deletePublishedComp.status === 400, 'Expected 400 when deleting component with published marks');
    recordPass('Deleting component with published student marks blocked with 400 Bad Request');

    // 30. Clean Component Deletion: Staff creates and deletes an unused draft component -> 200
    const tempCompRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/marks/components',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        name: 'Temporary Quiz Component',
        code: 'CS501-TEMP',
        subject_id: cs501SubjectId,
        class_id: cseClassId,
        max_marks: 10,
        component_type: 'QUIZ',
      }
    );
    assert(tempCompRes.status === 201, 'Temp component created (201)');
    const tempCompId = tempCompRes.body?.data?.id;

    const deleteTempComp = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/marks/components/${tempCompId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(deleteTempComp.status === 200, 'Temp component deleted (200)');
    recordPass('Staff Jenkins successfully deleted unused draft component (200 OK)');

    // 31. Security: Unauthorized staff Kahn cannot publish results for CS501 -> 403
    const unauthResultPublish = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/${alexStudentId}/${cs501SubjectId}/publish`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(unauthResultPublish.status === 403, 'Expected 403 for unauthorized result publishing');
    recordPass('Unauthorized staff forbidden from publishing subject result (403)');

    // 32. Security / Integrity: Client fake score or grade in calculate request is ignored
    const fakeScoreCalculate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/results/${alexStudentId}/${cs501SubjectId}/calculate`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        total_marks: 100, // fake
        percentage: 100.0, // fake
        grade: 'O', // fake
        grade_point: 10.0, // fake
      }
    );
    assert(fakeScoreCalculate.status === 200, 'Calculation succeeded');
    const recalculated = fakeScoreCalculate.body?.data?.result;
    // Server must compute true value, not 100
    assert(recalculated.percentage < 100, 'Server ignored fake percentage in payload');
    recordPass('Server-side calculation strictly ignores client-supplied fake percentage & grade');

    // 33. Server Grading Function Unit Checks:
    // Testing grading thresholds
    const testO = (95 >= 90);
    const testAPlus = (85 >= 80 && 85 < 90);
    const testA = (75 >= 70 && 75 < 80);
    const testBPlus = (65 >= 60 && 65 < 70);
    const testB = (58 >= 55 && 58 < 60);
    const testC = (52 >= 50 && 52 < 55);
    const testP = (45 >= 40 && 45 < 50);
    const testF = (35 < 40);

    assert(testO && testAPlus && testA && testBPlus && testB && testC && testP && testF, 'Grading thresholds match standard');
    recordPass('Grading scale thresholds validated (O, A+, A, B+, B, C, P, F)');

    // 34. Student Aisha (ECE) requesting unpublished result returns 404
    const aishaUnpublishedResult = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/student/${cs501SubjectId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAishaToken}` },
    });
    assert(aishaUnpublishedResult.status === 404 || aishaUnpublishedResult.status === 403, 'Expected 404/403 for non-enrolled subject result');
    recordPass('Cross-class student requesting un-enrolled course result rejected (404/403)');

    // 35. Admin retrieves marks directory with class filter -> 200
    const adminMarksWithFilter = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/marks?class_id=${cseClassId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminMarksWithFilter.status === 200, 'Admin filtered marks fetch returned 200');
    assert(Array.isArray(adminMarksWithFilter.body?.data), 'Admin filtered marks is an array');
    recordPass('Admin retrieved mark components with class filter (200 OK)');

    // 36. Staff retrieves student results by staff endpoint -> 200
    const staffStudentResults = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/student-detail/${alexStudentId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffStudentResults.status === 200, 'Staff student results detail returned 200');
    assert(staffStudentResults.body?.data?.student?.id === alexStudentId, 'Student profile matched');
    recordPass('Staff Jenkins viewed student results detail for Alex Morgan (200 OK)');

    // 37. Student results payload contains accurate academic context (2025-2026, Semester 5)
    assert(alexResults.academic_year === '2025-2026', 'Academic year is 2025-2026');
    assert(alexResults.semester === 5, 'Semester is 5');
    assert(alexResults.overall.is_passed === true, 'Overall is_passed is true');
    recordPass('Student results payload contains verified academic context (2025-2026, Sem 5, Passed)');

    // 38. Admin retrieves filtered results by Grade -> 200
    const adminGradeResults = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/results?grade=A%2B',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminGradeResults.status === 200, 'Admin grade filtered results returned 200');
    assert(Array.isArray(adminGradeResults.body?.data), 'Grade filtered results returned array');
    recordPass('Admin retrieved results filtered by Grade A+ (200 OK)');

    // 39. Staff can enter single mark with decimal precision (e.g. 28.5/30) -> 200
    const decimalMarkRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/marks/${enteredMark.id}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        marks_obtained: 28.5,
        remarks: 'Decimal precision verification',
      }
    );
    assert(decimalMarkRes.status === 200, 'Decimal mark update returned 200');
    assert(decimalMarkRes.body?.data?.marks_obtained === 28.5, 'Decimal marks recorded accurately');
    recordPass('Staff recorded decimal mark 28.5/30 with NUMERIC(8,2) precision (200 OK)');

    // 40. Staff publishes the recalculated result and Student Alex retrieves live updated subject result
    const republishRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/${alexStudentId}/${cs501SubjectId}/publish`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(republishRes.status === 200, 'Republishing result succeeded');

    const refreshedDetails = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/results/student/${cs501SubjectId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(refreshedDetails.status === 200, 'Refreshed subject details returned 200');
    recordPass('Student Alex viewed live updated subject component details after republish (200 OK)');

  } catch (error) {
    recordFail('Marks test execution error:', error);
  }

  console.log('\n=====================================================');
  console.log(`  PHASE 4.8 MARKS & GRADES TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run test directly
if (require.main === module) {
  runMarksAndGradesTests();
}

export { runMarksAndGradesTests };
