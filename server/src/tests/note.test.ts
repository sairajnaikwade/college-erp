import http from 'http';
import fs from 'fs';
import path from 'path';

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

function uploadPdfRequest(
  options: http.RequestOptions,
  fields: Record<string, string>,
  fileContent: Buffer | string,
  fileName: string = 'test.pdf',
  mimeType: string = 'application/pdf'
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';

    const bodyBuffers: Buffer[] = [];

    // Form fields
    for (const [key, value] of Object.entries(fields)) {
      bodyBuffers.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
        )
      );
    }

    // File
    bodyBuffers.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="${fileName}"${crlf}Content-Type: ${mimeType}${crlf}${crlf}`
      )
    );
    bodyBuffers.push(
      Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent)
    );
    bodyBuffers.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

    const fullBody = Buffer.concat(bodyBuffers);

    const reqOptions: http.RequestOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length.toString(),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode || 500, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}


async function runNoteTests() {
  console.log('=====================================================');
  console.log('  STARTING PHASE 4.6 NOTES & STUDY MATERIAL TEST SUITE');
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
    assert(staffLogin.status === 200, 'Staff Dr. Sarah Jenkins login succeeded (200)');
    const staffToken = staffLogin.body?.data?.token;

    // 3. Authenticate Staff (Prof. Robert Kahn - ECE)
    const eceStaffLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'staff.kahn@college.edu', password: 'Staff@123' }
    );
    assert(eceStaffLogin.status === 200, 'Staff Prof. Robert Kahn login succeeded (200)');
    const eceStaffToken = eceStaffLogin.body?.data?.token;

    // 4. Authenticate Student (Alex Morgan - CSE Sem 5)
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
    assert(studentLogin.status === 200, 'Student Alex Morgan login succeeded (200)');
    const studentToken = studentLogin.body?.data?.token;

    // 5. Authenticate Student (Aisha Khan - ECE Sem 5)
    const eceStudentLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { identifier: 'aisha.khan@college.edu', password: 'Student@123' }
    );
    assert(eceStudentLogin.status === 200, 'Student Aisha Khan login succeeded (200)');
    const eceStudentToken = eceStudentLogin.body?.data?.token;

    // 6. Security: Unauthenticated request to /api/notes -> 401
    const unauthAll = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes',
      method: 'GET',
    });
    assert(unauthAll.status === 401, 'Unauthenticated access to /api/notes blocked with 401');

    // 7. Security: Unauthenticated request to /api/notes/my -> 401
    const unauthMy = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes/my',
      method: 'GET',
    });
    assert(unauthMy.status === 401, 'Unauthenticated access to /api/notes/my blocked with 401');

    // 8. Student retrieves notes for their enrolled class via /api/notes/my -> 200
    const studentNotesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentNotesRes.status === 200, 'Student retrieves enrolled class notes (200)');
    const studentNotes = studentNotesRes.body?.data || [];
    assert(Array.isArray(studentNotes), 'Student notes response is an array');
    assert(studentNotes.length > 0, `Student retrieved ${studentNotes.length} notes`);

    // 9. Student only sees PUBLISHED notes (no DRAFT or ARCHIVED)
    const nonPublishedNotes = studentNotes.filter((n: any) => n.status !== 'PUBLISHED');
    assert(nonPublishedNotes.length === 0, 'Student receives only PUBLISHED notes (0 draft/archived notes exposed)');

    // 10. Student retrieves single published note by ID -> 200
    const sampleNote = studentNotes[0];
    const singleNoteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${sampleNote.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(singleNoteRes.status === 200, 'Student accesses single published note by ID (200)');
    assert(singleNoteRes.body?.data?.id === sampleNote.id, 'Single note ID matches requested ID');

    // 11. Student filters notes by subject_id -> 200
    const subjectFilterRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/my?subject_id=${sampleNote.subject_id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(subjectFilterRes.status === 200, 'Student filters notes by subject_id (200)');
    const filteredBySubject = subjectFilterRes.body?.data || [];
    const allMatchSubject = filteredBySubject.every((n: any) => n.subject_id === sampleNote.subject_id);
    assert(allMatchSubject, 'All filtered notes match requested subject_id');

    // 12. Student filters notes by category -> 200
    const categoryFilterRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/my?category=LECTURE_NOTES`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(categoryFilterRes.status === 200, 'Student filters notes by category (200)');
    const filteredByCategory = categoryFilterRes.body?.data || [];
    const allMatchCategory = filteredByCategory.every((n: any) => n.category === 'LECTURE_NOTES');
    assert(allMatchCategory, 'All category-filtered notes have category LECTURE_NOTES');

    // 13. Student searches notes by query -> 200
    const searchFilterRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/my?search=Architecture`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(searchFilterRes.status === 200, 'Student searches notes by keyword query (200)');

    // 14. Student RBAC: Student forbidden from creating note -> 403
    const studentCreateAttempt = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'Hacked Note',
        subject_id: sampleNote.subject_id,
        category: 'LECTURE_NOTES',
        file_url: 'https://example.com/hacked.pdf',
      }
    );
    assert(studentCreateAttempt.status === 403, 'Student is forbidden from creating notes (403)');

    // 15. Student RBAC: Student forbidden from updating note -> 403
    const studentUpdateAttempt = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notes/${sampleNote.id}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
      },
      { title: 'Defaced Note Title' }
    );
    assert(studentUpdateAttempt.status === 403, 'Student is forbidden from updating notes (403)');

    // 16. Student RBAC: Student forbidden from deleting note -> 403
    const studentDeleteAttempt = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${sampleNote.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentDeleteAttempt.status === 403, 'Student is forbidden from deleting notes (403)');

    // 17. Staff retrieves their authored notes via /api/notes/my -> 200
    const staffNotesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffNotesRes.status === 200, 'Staff Dr. Sarah Jenkins retrieves their notes (200)');
    const staffNotes = staffNotesRes.body?.data || [];
    assert(Array.isArray(staffNotes), 'Staff notes response is an array');
    assert(staffNotes.length > 0, `Staff retrieved ${staffNotes.length} created notes`);

    // 18. Staff creates a new DRAFT note for assigned subject -> 201
    const createDraftRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'Draft Unit 5: Distributed File Systems Deep Dive',
        description: 'Comprehensive study guide and reading list for GFS and HDFS.',
        subject_id: sampleNote.subject_id,
        category: 'STUDY_MATERIAL',
        unit: 'Unit 5',
        file_url: 'https://storage.college.edu/notes/cse501_unit5_draft.pdf',
        file_name: 'cse501_unit5_draft.pdf',
        file_size: '3.4 MB',
        file_type: 'application/pdf',
        tags: ['Draft', 'Distributed Systems', 'GFS'],
        status: 'DRAFT',
      }
    );
    assert(createDraftRes.status === 201, 'Staff creates new DRAFT note with 201 Created');
    const createdNote = createDraftRes.body?.data;
    assert(createdNote?.status === 'DRAFT', 'Created note has status DRAFT');
    const createdNoteId = createdNote?.id;

    // 19. Staff accesses their draft note by ID -> 200
    const staffGetDraft = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffGetDraft.status === 200, 'Authoring staff can view their own DRAFT note (200)');

    // 20. IDOR / Privacy Check: Student CANNOT view staff DRAFT note -> 403 / 404
    const studentGetDraft = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentGetDraft.status === 403 || studentGetDraft.status === 404,
      `Student blocked from viewing DRAFT note (status ${studentGetDraft.status})`
    );

    // 21. Staff updates DRAFT note to PUBLISHED -> 200
    const updateToPublishedRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notes/${createdNoteId}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        status: 'PUBLISHED',
        title: 'Unit 5: Distributed File Systems Deep Dive (Published)',
      }
    );
    assert(updateToPublishedRes.status === 200, 'Staff publishes note with 200 OK');
    assert(updateToPublishedRes.body?.data?.status === 'PUBLISHED', 'Note status changed to PUBLISHED');

    // 22. Student can now access the newly published note -> 200
    const studentGetPublished = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentGetPublished.status === 200, 'Student can now access the published note (200)');

    // 23. Authorization check: Staff B cannot edit Staff A note -> 403
    const otherStaffUpdateRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notes/${createdNoteId}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${eceStaffToken}`,
          'Content-Type': 'application/json',
        },
      },
      { title: 'Unauthorized Modification' }
    );
    assert(otherStaffUpdateRes.status === 403, 'Other staff member forbidden from editing note (403)');

    // 24. Authorization check: Staff B cannot delete Staff A note -> 403
    const otherStaffDeleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${eceStaffToken}` },
    });
    assert(otherStaffDeleteRes.status === 403, 'Other staff member forbidden from deleting note (403)');

    // 25. Validation: Missing title or required fields returns 400
    const invalidNoteRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        description: 'Missing title and file_url',
      }
    );
    assert(invalidNoteRes.status === 400, 'Note creation with missing required fields returns 400 Bad Request');

    // 26. Validation: Invalid category returns 400
    const invalidCatRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
      },
      {
        title: 'Invalid Category Note',
        subject_id: sampleNote.subject_id,
        category: 'NON_EXISTENT_CATEGORY',
        file_url: 'https://example.com/test.pdf',
      }
    );
    assert(invalidCatRes.status === 400, 'Note creation with invalid category returns 400 Bad Request');

    // 27. Cross-Class Isolation: ECE Student cannot access CSE class note
    const eceStudentCSEAccess = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${sampleNote.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${eceStudentToken}` },
    });
    assert(
      eceStudentCSEAccess.status === 403 || eceStudentCSEAccess.status === 404,
      `Cross-department student forbidden from accessing CSE note (status ${eceStudentCSEAccess.status})`
    );

    // 28. Admin retrieves all institution notes -> 200
    const adminAllNotesRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllNotesRes.status === 200, 'Admin retrieves all institution notes with 200 OK');
    assert(Array.isArray(adminAllNotesRes.body?.data), 'Admin notes response is an array');

    // 29. Admin retrieves notes statistics -> 200
    const adminStatsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notes/stats',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, 'Admin retrieves note statistics (200)');
    assert(typeof adminStatsRes.body?.data?.total === 'number', 'Total notes stat is a valid number');

    // 30. Admin can update any note -> 200
    const adminUpdateRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/notes/${createdNoteId}`,
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      },
      { title: 'Admin Reviewed Note Title' }
    );
    assert(adminUpdateRes.status === 200, 'Admin updates note with 200 OK');

    // 31. Admin deletes the test note -> 200
    const adminDeleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDeleteRes.status === 200, 'Admin successfully deletes test note (200)');

    // 32. Verify note is deleted -> 404
    const verifyDeleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${createdNoteId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(verifyDeleteRes.status === 404, 'Deleted note returns 404 Not Found');

    // =========================================================================
    // REAL PDF UPLOAD & RETRIEVAL WORKFLOW TESTS
    // =========================================================================

    const VALID_PDF_SAMPLE = Buffer.from(
      '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \n0000000125 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n193\n%%EOF'
    );

    // 33. Staff uploads valid real PDF file via multipart/form-data -> 201 Created
    const uploadRes = await uploadPdfRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      },
      {
        title: 'Real PDF Lecture: Database Indexing B-Trees',
        description: 'Detailed analysis of B-Tree indexing algorithms and disk access patterns.',
        subject_id: sampleNote.subject_id,
        class_id: sampleNote.class_id,
        category: 'LECTURE_NOTES',
        status: 'PUBLISHED',
      },
      VALID_PDF_SAMPLE,
      'dbms_btree_indexing_notes.pdf',
      'application/pdf'
    );
    assert(uploadRes.status === 201, 'Staff uploads real PDF via multipart/form-data with 201 Created');
    const uploadedNote = uploadRes.body?.data;
    const uploadedNoteId = uploadedNote?.id;

    // 34. Verify uploaded note metadata in DB
    assert(uploadedNote?.file_name === 'dbms_btree_indexing_notes.pdf', 'Uploaded note has original filename');
    assert(uploadedNote?.file_type === 'application/pdf', 'Uploaded note has file_type application/pdf');
    assert(typeof uploadedNote?.file_size === 'number' && uploadedNote?.file_size > 0, 'Uploaded note has valid file_size');
    assert(uploadedNote?.file_url === `/api/notes/${uploadedNoteId}/file`, 'Uploaded note file_url points to secure download endpoint');

    // 35. Verify uploaded PDF exists in server disk storage
    const uploadsDir = path.resolve(__dirname, '../../uploads/notes');
    const diskFilePath = path.join(uploadsDir, `${uploadedNoteId}.pdf`);
    assert(fs.existsSync(diskFilePath), `Uploaded PDF exists on disk at safe UUID path: ${diskFilePath}`);

    // 36. Student retrieves PDF file via authenticated endpoint -> 200 with Content-Type: application/pdf
    const studentFileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}/file`,
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentFileRes.status === 200, 'Authorized student retrieves uploaded PDF file (200 OK)');
    assert(
      typeof studentFileRes.body === 'string' && studentFileRes.body.startsWith('%PDF'),
      'Retrieved file body is valid PDF binary starting with %PDF'
    );

    // 37. Authoring staff retrieves PDF file via authenticated endpoint -> 200
    const staffFileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}/file`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffFileRes.status === 200, 'Authoring faculty member retrieves uploaded PDF file (200 OK)');

    // 38. Admin retrieves PDF file via authenticated endpoint -> 200
    const adminFileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}/file`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminFileRes.status === 200, 'Admin retrieves uploaded PDF file (200 OK)');

    // 39. Unauthenticated request to /api/notes/:id/file -> 401 Unauthorized
    const unauthFileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}/file`,
      method: 'GET',
    });
    assert(unauthFileRes.status === 401, 'Unauthenticated request to retrieve PDF blocked with 401');

    // 40. Cross-Class Isolation: ECE Student forbidden from downloading CSE note file -> 403
    const eceStudentFileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}/file`,
      method: 'GET',
      headers: { Authorization: `Bearer ${eceStudentToken}` },
    });
    assert(
      eceStudentFileRes.status === 403 || eceStudentFileRes.status === 404,
      `Non-enrolled student blocked from downloading note file (status ${eceStudentFileRes.status})`
    );

    // 41. Unauthorized faculty member (not assigned, not uploader) forbidden from downloading note file -> 403
    const eceStaffFileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}/file`,
      method: 'GET',
      headers: { Authorization: `Bearer ${eceStaffToken}` },
    });
    assert(
      eceStaffFileRes.status === 403 || eceStaffFileRes.status === 404,
      `Unassigned staff member blocked from downloading note file (status ${eceStaffFileRes.status})`
    );

    // 42. Non-PDF upload rejected -> 400 Bad Request
    const nonPdfUploadRes = await uploadPdfRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      },
      {
        title: 'Fake PDF Upload',
        subject_id: sampleNote.subject_id,
        class_id: sampleNote.class_id,
        category: 'LECTURE_NOTES',
      },
      Buffer.from('Malicious script content or executable text'),
      'script.sh',
      'text/plain'
    );
    assert(nonPdfUploadRes.status === 400, 'Non-PDF upload rejected with 400 Bad Request');

    // 43. Oversized file (> 10 MB) rejected -> 400 Bad Request
    const oversizedBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(10 * 1024 * 1024 + 1024, 'a'),
    ]);
    const oversizedUploadRes = await uploadPdfRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      },
      {
        title: 'Huge PDF Upload',
        subject_id: sampleNote.subject_id,
        class_id: sampleNote.class_id,
        category: 'LECTURE_NOTES',
      },
      oversizedBuffer,
      'huge_manual.pdf',
      'application/pdf'
    );
    assert(oversizedUploadRes.status === 400, 'Oversized file (> 10MB) rejected with 400 Bad Request');

    // 44. Unauthorized staff cannot upload notes for subject they are not assigned to -> 403
    const unauthStaffUpload = await uploadPdfRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/notes',
        method: 'POST',
        headers: { Authorization: `Bearer ${eceStaffToken}` },
      },
      {
        title: 'Unauthorized CSE Note by ECE Faculty',
        subject_id: sampleNote.subject_id, // CSE subject
        class_id: sampleNote.class_id,
        category: 'LECTURE_NOTES',
      },
      VALID_PDF_SAMPLE,
      'unauthorized.pdf',
      'application/pdf'
    );
    assert(unauthStaffUpload.status === 403, 'Faculty cannot upload notes for unassigned course subject (403 Forbidden)');

    // 45. Delete note cleans up both DB row and disk storage
    const deleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/notes/${uploadedNoteId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(deleteRes.status === 200, 'Staff deletes uploaded study material note (200 OK)');
    assert(!fs.existsSync(diskFilePath), 'Deleted note PDF file was cleaned up from server storage');


    console.log('\n=====================================================');
    console.log(`  PHASE 4.6 NOTES TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Note test execution error:', error);
    process.exit(1);
  }
}

runNoteTests();
