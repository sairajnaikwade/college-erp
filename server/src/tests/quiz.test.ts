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

async function runQuizTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4.7 QUIZZES & ONLINE TESTS SUITE');
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
    assert(adminLogin.status === 200, 'Admin login succeeded (200)');
    const adminToken = adminLogin.body?.data?.token;

    // 2. Authenticate Staff (Dr. Sarah Jenkins - CSE)
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
    assert(staffJenkinsLogin.status === 200, 'Staff Dr. Sarah Jenkins login succeeded (200)');
    const staffJenkinsToken = staffJenkinsLogin.body?.data?.token;

    // 3. Authenticate Staff (Prof. Robert Kahn - ECE)
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
    assert(staffKahnLogin.status === 200, 'Staff Prof. Robert Kahn login succeeded (200)');
    const staffKahnToken = staffKahnLogin.body?.data?.token;

    // 4. Authenticate Student (Alex Morgan - CSE Sem 5)
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
    assert(studentAlexLogin.status === 200, 'Student Alex Morgan login succeeded (200)');
    const studentAlexToken = studentAlexLogin.body?.data?.token;

    // 5. Authenticate Student (Aisha Khan - ECE Sem 5)
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
    assert(studentAishaLogin.status === 200, 'Student Aisha Khan login succeeded (200)');
    const studentAishaToken = studentAishaLogin.body?.data?.token;

    // 6. Security: Unauthenticated requests return 401
    const unauthQuizzes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/quizzes',
      method: 'GET',
    });
    assert(unauthQuizzes.status === 401, 'Unauthenticated /api/quizzes blocked with 401');

    const unauthStudent = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/quizzes/student',
      method: 'GET',
    });
    assert(unauthStudent.status === 401, 'Unauthenticated /api/quizzes/student blocked with 401');

    // 7. Student retrieves available class quizzes via /api/quizzes/student -> 200
    const studentQuizzesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/quizzes/student',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentQuizzesRes.status === 200, 'Student retrieves available class quizzes (200)');
    const studentQuizzes = studentQuizzesRes.body?.data || [];
    assert(Array.isArray(studentQuizzes), 'Student quizzes response data is an array');
    assert(studentQuizzes.length > 0, `Student Alex retrieved ${studentQuizzes.length} quizzes`);

    // 8. Privacy: Student only sees PUBLISHED or CLOSED quizzes (0 DRAFT quizzes exposed)
    const draftQuizzesExposed = studentQuizzes.filter((q: any) => q.status === 'DRAFT');
    assert(draftQuizzesExposed.length === 0, 'Zero DRAFT quizzes exposed to student');

    // 9. Student retrieves single published quiz by ID
    const samplePublishedQuiz = studentQuizzes.find((q: any) => q.status === 'PUBLISHED') || studentQuizzes[0];
    const singleQuizRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/student/${samplePublishedQuiz.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(singleQuizRes.status === 200, 'Student retrieves single quiz info (200)');
    assert(singleQuizRes.body?.data?.id === samplePublishedQuiz.id, 'Retrieved quiz ID matches');

    // 10. Cross-Class Isolation: ECE Student cannot access CSE class quiz -> 403
    const eceStudentCSEAccess = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/student/${samplePublishedQuiz.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAishaToken}` },
    });
    assert(
      eceStudentCSEAccess.status === 403 || eceStudentCSEAccess.status === 404,
      `Cross-department student forbidden from accessing CSE quiz (status ${eceStudentCSEAccess.status})`
    );

    // 11. Staff Dr. Sarah Jenkins retrieves authored/assigned quizzes via /api/quizzes/staff -> 200
    const staffQuizzesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/quizzes/staff',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffQuizzesRes.status === 200, 'Staff Jenkins retrieves course quizzes (200)');
    const staffQuizzes = staffQuizzesRes.body?.data || [];
    assert(Array.isArray(staffQuizzes), 'Staff quizzes response data is an array');
    assert(staffQuizzes.length > 0, `Staff Jenkins retrieved ${staffQuizzes.length} course quizzes`);

    // 12. Staff creates a new DRAFT quiz for assigned subject (CS501) -> 201
    const sarahQuiz = staffQuizzes.find((q: any) => q.subject_code === 'CS501') || staffQuizzes[0];
    const sarahSubjectId = sarahQuiz.subject_id;
    const createDraftQuizRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/quizzes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'CS501 Midterm Lab Test: Advanced Indexing & Query Plans',
        description: 'Timed assessment evaluating B+ Tree query execution and join optimization algorithms.',
        subject_id: sarahSubjectId,
        duration_minutes: 25,
        passing_marks: 8,
      }
    );
    assert(createDraftQuizRes.status === 201, 'Staff Jenkins creates DRAFT quiz with 201 Created');
    const createdQuiz = createDraftQuizRes.body?.data;
    assert(createdQuiz?.status === 'DRAFT', 'Created quiz has initial status DRAFT');
    const testQuizId = createdQuiz?.id;

    // 13. Staff RBAC Check: Staff Kahn (ECE) cannot create quiz for CS501 (CSE) -> 403
    const unauthorizedStaffCreate = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/quizzes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffKahnToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'Unauthorized CS501 Quiz',
        subject_id: sarahSubjectId,
        duration_minutes: 30,
        passing_marks: 10,
      }
    );
    assert(unauthorizedStaffCreate.status === 403, 'Unauthorized staff forbidden from creating quiz for unassigned course (403)');

    // 14. Student RBAC Check: Student cannot create quiz -> 403
    const studentCreateAttempt = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/quizzes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'Student Created Quiz',
        subject_id: samplePublishedQuiz.subject_id,
        duration_minutes: 30,
      }
    );
    assert(studentCreateAttempt.status === 403, 'Student is forbidden from creating quizzes (403)');

    // 15. Validation: Missing title or duration <= 0 rejected with 400
    const invalidQuizRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/quizzes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: '',
        subject_id: samplePublishedQuiz.subject_id,
        duration_minutes: 0,
      }
    );
    assert(invalidQuizRes.status === 400, 'Quiz creation with invalid title or duration rejected with 400');

    // 16. Staff adds MCQ question with 4 options to the quiz -> 201
    const addMcqRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/${testQuizId}/questions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_text: 'Which index structure guarantees all leaf nodes are at the exact same depth?',
        question_type: 'MCQ',
        marks: 5,
        explanation: 'B+ Trees maintain balanced depth across all leaf nodes.',
        options: [
          { option_text: 'Binary Search Tree', is_correct: false },
          { option_text: 'B+ Tree', is_correct: true },
          { option_text: 'Hash Index', is_correct: false },
          { option_text: 'Trie Index', is_correct: false },
        ],
      }
    );
    assert(addMcqRes.status === 201, 'Staff adds MCQ question with options (201 Created)');
    const q1 = addMcqRes.body?.data;
    assert(Array.isArray(q1?.options) && q1.options.length === 4, 'MCQ Question has 4 options created');
    const q1CorrectOption = q1.options.find((o: any) => o.is_correct === true);
    assert(q1CorrectOption?.option_text === 'B+ Tree', 'Option "B+ Tree" is set as correct');

    // 17. Staff adds TRUE_FALSE question to the quiz -> 201
    const addTfRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/${testQuizId}/questions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_text: 'PostgreSQL uses Multi-Version Concurrency Control (MVCC) to provide transaction isolation.',
        question_type: 'TRUE_FALSE',
        marks: 5,
        explanation: 'PostgreSQL implements snapshot isolation via MVCC.',
        options: [
          { option_text: 'True', is_correct: true },
          { option_text: 'False', is_correct: false },
        ],
      }
    );
    assert(addTfRes.status === 201, 'Staff adds TRUE_FALSE question (201 Created)');
    const q2 = addTfRes.body?.data;
    assert(Array.isArray(q2?.options) && q2.options.length === 2, 'TRUE_FALSE Question has 2 options created');
    const q2CorrectOption = q2.options.find((o: any) => o.is_correct === true);

    // 18. Validation: Question creation fails if 0 options marked correct -> 400
    const zeroCorrectRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/${testQuizId}/questions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_text: 'Invalid Question with zero correct answers',
        question_type: 'MCQ',
        marks: 5,
        options: [
          { option_text: 'Opt A', is_correct: false },
          { option_text: 'Opt B', is_correct: false },
        ],
      }
    );
    assert(zeroCorrectRes.status === 400, 'Question creation with 0 correct options rejected with 400');

    // 19. Validation: Question creation fails if multiple options marked correct for single MCQ -> 400
    const multiCorrectRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/${testQuizId}/questions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_text: 'Invalid Question with multiple correct answers',
        question_type: 'MCQ',
        marks: 5,
        options: [
          { option_text: 'Opt A', is_correct: true },
          { option_text: 'Opt B', is_correct: true },
        ],
      }
    );
    assert(multiCorrectRes.status === 400, 'Question creation with multiple correct options rejected with 400');

    // 20. Total marks check: Quiz total_marks updated to 10 (5 + 5)
    const testQuizDetails = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(testQuizDetails.body?.data?.total_marks === 10, 'Quiz total_marks dynamically recalculated to 10 (5 + 5)');

    // 21. Validation: Publishing fails if passing_marks > total_marks
    await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/${testQuizId}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      { passing_marks: 50 } // total_marks is 10
    );
    const publishExcessivePass = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/publish`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(publishExcessivePass.status === 400, 'Publishing rejected when passing_marks > total_marks (400)');

    // 22. Staff updates passing_marks to 8 and publishes quiz -> 200
    await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/${testQuizId}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffJenkinsToken}`,
          'Content-Type': 'application/json',
        },
      },
      { passing_marks: 8 }
    );
    const publishRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/publish`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(publishRes.status === 200, 'Staff publishes quiz successfully (200 OK)');
    assert(publishRes.body?.data?.status === 'PUBLISHED', 'Quiz status changed to PUBLISHED');

    // 23. Student Alex views newly published quiz -> 200
    const studentViewPublished = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/student/${testQuizId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentViewPublished.status === 200, 'Student Alex can view the newly published quiz (200)');

    // 24. Student Alex starts quiz attempt -> 201
    const startAttemptRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/start`,
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(startAttemptRes.status === 201, 'Student Alex starts quiz attempt (201 Created)');
    const attemptData = startAttemptRes.body?.data;
    assert(typeof attemptData?.attempt_id === 'string', 'Received valid attempt_id');
    const testAttemptId = attemptData?.attempt_id;
    assert(Array.isArray(attemptData?.questions) && attemptData.questions.length === 2, 'Received 2 quiz questions');

    // 25. Security Check: is_correct is NOT leaked to student questions
    const leakedIsCorrect = attemptData.questions.some((q: any) =>
      q.options.some((o: any) => o.is_correct !== undefined)
    );
    assert(!leakedIsCorrect, 'Zero is_correct fields leaked in student question payloads');

    // 26. Duplicate active attempt check: Calling start again returns same active attempt
    const duplicateStartRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/start`,
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(duplicateStartRes.body?.data?.attempt_id === testAttemptId, 'Starting active quiz again safely resumes existing attempt');

    // 27. Student records answer for Question 1 -> 200
    const answerQ1Res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/attempts/${testAttemptId}/answers`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_id: q1.id,
        selected_option_id: q1CorrectOption.id,
      }
    );
    assert(answerQ1Res.status === 200, 'Student records answer for Question 1 (200 OK)');

    // 28. Student records answer for Question 2 -> 200
    const answerQ2Res = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/attempts/${testAttemptId}/answers`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_id: q2.id,
        selected_option_id: q2CorrectOption.id,
      }
    );
    assert(answerQ2Res.status === 200, 'Student records answer for Question 2 (200 OK)');

    // 29. Security / IDOR: Student Aisha cannot view / update Student Alex attempt -> 403
    const aishaAttemptTamper = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/attempts/${testAttemptId}/answers`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAishaToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_id: q1.id,
        selected_option_id: q1CorrectOption.id,
      }
    );
    assert(aishaAttemptTamper.status === 403, 'Cross-student attempt tampering blocked with 403 Forbidden');

    // 30. Security: Student cannot submit answer with invalid question ID -> 400
    const invalidQuestionAnswer = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/attempts/${testAttemptId}/answers`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_id: '00000000-0000-0000-0000-000000000000',
        selected_option_id: q1CorrectOption.id,
      }
    );
    assert(invalidQuestionAnswer.status === 400, 'Submitting answer for invalid question ID rejected with 400');

    // 31. Security: Student cannot submit option ID belonging to another question -> 400
    const mismatchedOptionAnswer = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/quizzes/attempts/${testAttemptId}/answers`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentAlexToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        question_id: q1.id,
        selected_option_id: q2CorrectOption.id, // option belongs to q2, not q1
      }
    );
    assert(mismatchedOptionAnswer.status === 400, 'Submitting option ID from mismatched question rejected with 400');

    // 32. Student Alex submits quiz attempt -> 200
    const submitQuizRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/attempts/${testAttemptId}/submit`,
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(submitQuizRes.status === 200, 'Student Alex submits quiz attempt with 200 OK');
    const evalResult = submitQuizRes.body?.data;
    assert(evalResult?.score === 10, 'Server-side evaluation scored 10 points (5 + 5)');
    assert(evalResult?.percentage === 100, 'Server-side percentage calculated as 100%');
    assert(evalResult?.is_passed === true, 'Server-side pass/fail verdict is PASSED');
    assert(evalResult?.status === 'SUBMITTED', 'Attempt status updated to SUBMITTED');

    // 33. Student views their submitted result summary -> 200
    const resultViewRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/attempts/${testAttemptId}/result`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(resultViewRes.status === 200, 'Student views completed quiz result (200 OK)');
    assert(resultViewRes.body?.data?.correct_answers_count === 2, 'Result summary shows 2 correct answers');

    // 34. Security: Cannot resubmit already finalized attempt -> 400
    const resubmitAttempt = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/attempts/${testAttemptId}/submit`,
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(resubmitAttempt.status === 400, 'Resubmission of finalized attempt rejected with 400 Bad Request');

    // 35. Staff views quiz attempts list -> 200
    const staffAttemptsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/attempts`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(staffAttemptsRes.status === 200, 'Staff Jenkins retrieves quiz attempts list (200 OK)');
    const attemptsList = staffAttemptsRes.body?.data || [];
    assert(Array.isArray(attemptsList) && attemptsList.length >= 1, 'Attempts list contains recorded student attempt');

    // 36. Staff views quiz performance analytics -> 200
    const analyticsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/analytics`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(analyticsRes.status === 200, 'Staff Jenkins retrieves quiz analytics (200 OK)');
    const metrics = analyticsRes.body?.data?.analytics;
    assert(metrics?.submitted_count >= 1, 'Analytics correctly reflects submitted count >= 1');
    assert(metrics?.pass_count >= 1, 'Analytics correctly reflects pass count >= 1');
    assert(metrics?.average_score === 10, 'Analytics correctly computes average score');

    // 37. Staff B (Kahn) cannot view / delete Staff A's (Jenkins) quiz -> 403
    const unauthorizedStaffDelete = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffKahnToken}` },
    });
    assert(unauthorizedStaffDelete.status === 403, 'Unauthorized staff forbidden from deleting another staff quiz (403)');

    // 38. Admin retrieves global quizzes catalogue -> 200
    const adminAllQuizzesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/quizzes',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllQuizzesRes.status === 200, 'Admin retrieves global quiz catalogue with 200 OK');
    assert(Array.isArray(adminAllQuizzesRes.body?.data), 'Admin quizzes response data is an array');

    // 39. Admin retrieves quiz statistics -> 200
    const adminStatsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/quizzes/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, 'Admin retrieves quiz statistics (200 OK)');
    assert(typeof adminStatsRes.body?.data?.total === 'number', 'Total quizzes statistic is a valid number');

    // 40. Staff closes the quiz -> 200
    const closeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/close`,
      method: 'POST',
      headers: { Authorization: `Bearer ${staffJenkinsToken}` },
    });
    assert(closeRes.status === 200, 'Staff closes the quiz with 200 OK');
    assert(closeRes.body?.data?.status === 'CLOSED', 'Quiz status updated to CLOSED');

    // 41. Student cannot start CLOSED quiz -> 400
    const studentStartClosed = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}/start`,
      method: 'POST',
      headers: { Authorization: `Bearer ${studentAlexToken}` },
    });
    assert(studentStartClosed.status === 400, 'Student attempt to start CLOSED quiz rejected with 400');

    // 42. Admin successfully deletes the test quiz -> 200
    const adminDeleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDeleteRes.status === 200, 'Admin successfully deleted test quiz (200 OK)');

    // 43. Verify deletion: GET on deleted quiz ID returns 404
    const verifyDeleted = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/quizzes/${testQuizId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(verifyDeleted.status === 404, 'Deleted quiz returns 404 Not Found');

    console.log('\n=====================================================');
    console.log(`  PHASE 4.7 QUIZ TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Quiz test execution error:', error);
    process.exit(1);
  }
}

runQuizTests();
