import { getPool, closePool } from '../../config/database';
import { hashPassword } from '../../utils/password';
import { logger } from '../../utils/logger';

export async function seedDatabase(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    logger.info('Starting Phase 3 database seeding...');
    await client.query('BEGIN');

    // 1. Seed Departments
    const deptQuery = `
      INSERT INTO departments (name, code, description)
      VALUES 
        ('Computer Science & Engineering', 'CSE', 'Department of Computer Science and Engineering'),
        ('Electronics & Communication', 'ECE', 'Department of Electronics and Communication Engineering'),
        ('Information Technology', 'IT', 'Department of Information Technology'),
        ('Mechanical Engineering', 'MECH', 'Department of Mechanical Engineering')
      ON CONFLICT (code) DO UPDATE 
        SET name = EXCLUDED.name, description = EXCLUDED.description
      RETURNING id, code;
    `;
    const deptRes = await client.query(deptQuery);
    const deptMap = new Map<string, string>();
    deptRes.rows.forEach((r) => deptMap.set(r.code, r.id));
    logger.info(`Seeded ${deptRes.rows.length} departments.`);

    const cseDeptId = deptMap.get('CSE')!;
    const eceDeptId = deptMap.get('ECE')!;
    const itDeptId = deptMap.get('IT')!;
    const mechDeptId = deptMap.get('MECH')!;

    // 2. Seed Classes
    const classQuery = `
      INSERT INTO classes (department_id, name, year, semester, division, academic_year)
      VALUES
        ($1, 'CSE - Year 3 Sem 5 Div A', 3, 5, 'A', '2025-2026'),
        ($1, 'CSE - Year 2 Sem 3 Div A', 2, 3, 'A', '2025-2026'),
        ($2, 'ECE - Year 3 Sem 5 Div A', 3, 5, 'A', '2025-2026'),
        ($3, 'IT - Year 3 Sem 5 Div A', 3, 5, 'A', '2025-2026'),
        ($4, 'MECH - Year 2 Sem 3 Div A', 2, 3, 'A', '2025-2026')
      ON CONFLICT ON CONSTRAINT uq_class_dept_batch DO UPDATE
        SET name = EXCLUDED.name
      RETURNING id, name;
    `;
    const classRes = await client.query(classQuery, [cseDeptId, eceDeptId, itDeptId, mechDeptId]);
    const classMap = new Map<string, string>();
    classRes.rows.forEach((r) => classMap.set(r.name, r.id));
    logger.info(`Seeded ${classRes.rows.length} academic classes.`);

    const cseClassId = classMap.get('CSE - Year 3 Sem 5 Div A')!;
    const eceClassId = classMap.get('ECE - Year 3 Sem 5 Div A')!;
    const itClassId = classMap.get('IT - Year 3 Sem 5 Div A')!;

    // 3. Seed Subjects
    const subjectQuery = `
      INSERT INTO subjects (department_id, code, name, description, semester, credits)
      VALUES
        ($1, 'CS501', 'Database Management Systems', 'Relational database systems, SQL, normalization, transactions, and indexing.', 5, 4),
        ($1, 'CS502', 'Operating Systems', 'Process scheduling, concurrency, virtual memory management, and file systems.', 5, 4),
        ($1, 'CS503', 'Computer Networks', 'OSI model, TCP/IP protocol suite, network routing, and socket programming.', 5, 3),
        ($1, 'CS504', 'Software Engineering', 'Software development lifecycle, agile methodologies, design patterns, and testing.', 5, 3),
        ($1, 'CS505', 'Web Technology', 'Modern full-stack web architecture, React, Node.js, and REST APIs.', 5, 3),
        ($1, 'CS506', 'Cyber Security Fundamentals', 'Threat modeling, cryptography, web security, and vulnerability assessments.', 5, 3),
        ($2, 'EC501', 'Digital Signal Processing', 'Discrete-time signals, Z-transforms, FFT, and digital filter design.', 5, 4),
        ($3, 'IT501', 'Cloud Computing Architecture', 'Virtualization, microservices, AWS/GCP architecture, and distributed storage.', 5, 4)
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description, credits = EXCLUDED.credits
      RETURNING id, code;
    `;
    const subjectRes = await client.query(subjectQuery, [cseDeptId, eceDeptId, itDeptId]);
    const subjectMap = new Map<string, string>();
    subjectRes.rows.forEach((r) => subjectMap.set(r.code, r.id));
    logger.info(`Seeded ${subjectRes.rows.length} subjects.`);

    // 4. Default Passwords
    const adminPasswordHash = await hashPassword('Admin@123');
    const staffPasswordHash = await hashPassword('Staff@123');
    const studentPasswordHash = await hashPassword('Student@123');

    // 5. Seed Admin User
    const adminQuery = `
      INSERT INTO users (username, email, password_hash, role, account_status, first_name, last_name, phone)
      VALUES ('admin', 'admin@college.edu', $1, 'ADMIN', 'ACTIVE', 'System', 'Administrator', '+1 (555) 000-0001')
      ON CONFLICT (email) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash, role = 'ADMIN', account_status = 'ACTIVE'
      RETURNING id;
    `;
    const adminRes = await client.query(adminQuery, [adminPasswordHash]);
    const adminUserId = adminRes.rows[0].id;
    logger.info('Seeded Admin user (admin@college.edu).');

    // 6. Seed Staff Members
    const staffData = [
      {
        username: 'staff.jenkins',
        email: 'staff.jenkins@college.edu',
        first_name: 'Sarah',
        last_name: 'Jenkins',
        phone: '+1 (555) 123-4567',
        dept_id: cseDeptId,
        employee_id: 'EMP-CSE-001',
        designation: 'Associate Professor & Dept Head',
        subjects: ['CS501', 'CS506'], // DBMS, Cyber Security
      },
      {
        username: 'staff.turing',
        email: 'staff.turing@college.edu',
        first_name: 'Alan',
        last_name: 'Turing',
        phone: '+1 (555) 123-4568',
        dept_id: cseDeptId,
        employee_id: 'EMP-CSE-002',
        designation: 'Assistant Professor',
        subjects: ['CS502', 'CS503'], // OS, Networks
      },
      {
        username: 'staff.kahn',
        email: 'staff.kahn@college.edu',
        first_name: 'Robert',
        last_name: 'Kahn',
        phone: '+1 (555) 123-4569',
        dept_id: eceDeptId,
        employee_id: 'EMP-ECE-001',
        designation: 'Professor',
        subjects: ['EC501'], // DSP
      },
    ];

    const staffIdMap = new Map<string, string>();
    const staffUserMap = new Map<string, string>();

    for (const stf of staffData) {
      const userRes = await client.query(
        `
        INSERT INTO users (username, email, password_hash, role, account_status, first_name, last_name, phone, department_id)
        VALUES ($1, $2, $3, 'STAFF', 'ACTIVE', $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE 
          SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, department_id = EXCLUDED.department_id
        RETURNING id;
        `,
        [stf.username, stf.email, staffPasswordHash, stf.first_name, stf.last_name, stf.phone, stf.dept_id]
      );
      const userId = userRes.rows[0].id;
      staffUserMap.set(stf.username, userId);

      const staffRes = await client.query(
        `
        INSERT INTO staff (user_id, employee_id, designation)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE 
          SET employee_id = EXCLUDED.employee_id, designation = EXCLUDED.designation
        RETURNING id;
        `,
        [userId, stf.employee_id, stf.designation]
      );
      const staffId = staffRes.rows[0].id;
      staffIdMap.set(stf.employee_id, staffId);

      // Staff-Subject assignments
      for (const subCode of stf.subjects) {
        const subId = subjectMap.get(subCode);
        if (subId) {
          await client.query(
            `
            INSERT INTO staff_subjects (staff_id, subject_id)
            VALUES ($1, $2)
            ON CONFLICT (staff_id, subject_id) DO NOTHING;
            `,
            [staffId, subId]
          );
        }
      }
    }
    logger.info(`Seeded ${staffData.length} staff members and subject assignments.`);

    // 7. Seed Students
    const studentData = [
      {
        username: 'student.alex',
        email: 'alex.morgan@college.edu',
        first_name: 'Alex',
        last_name: 'Morgan',
        phone: '+1 (555) 234-5678',
        dept_id: cseDeptId,
        roll: '2024CS089',
        enrollment: 'ENR-2024-089',
        year: 3,
        semester: 5,
        division: 'A',
        class_id: cseClassId,
      },
      {
        username: 'student.priya',
        email: 'priya.sharma@college.edu',
        first_name: 'Priya',
        last_name: 'Sharma',
        phone: '+1 (555) 234-5679',
        dept_id: cseDeptId,
        roll: '2024CS090',
        enrollment: 'ENR-2024-090',
        year: 3,
        semester: 5,
        division: 'A',
        class_id: cseClassId,
      },
      {
        username: 'student.david',
        email: 'david.chen@college.edu',
        first_name: 'David',
        last_name: 'Chen',
        phone: '+1 (555) 234-5680',
        dept_id: cseDeptId,
        roll: '2024CS091',
        enrollment: 'ENR-2024-091',
        year: 3,
        semester: 5,
        division: 'A',
        class_id: cseClassId,
      },
      {
        username: 'student.aisha',
        email: 'aisha.khan@college.edu',
        first_name: 'Aisha',
        last_name: 'Khan',
        phone: '+1 (555) 234-5681',
        dept_id: eceDeptId,
        roll: '2024EC012',
        enrollment: 'ENR-2024-EC12',
        year: 3,
        semester: 5,
        division: 'A',
        class_id: eceClassId,
      },
      {
        username: 'student.michael',
        email: 'michael.scott@college.edu',
        first_name: 'Michael',
        last_name: 'Scott',
        phone: '+1 (555) 234-5682',
        dept_id: itDeptId,
        roll: '2024IT045',
        enrollment: 'ENR-2024-IT45',
        year: 3,
        semester: 5,
        division: 'A',
        class_id: itClassId,
      },
      {
        username: 'student.emily',
        email: 'emily.watson@college.edu',
        first_name: 'Emily',
        last_name: 'Watson',
        phone: '+1 (555) 234-5683',
        dept_id: cseDeptId,
        roll: '2024CS092',
        enrollment: 'ENR-2024-092',
        year: 3,
        semester: 5,
        division: 'A',
        class_id: cseClassId,
      },
    ];

    const studentIdMap = new Map<string, string>();

    for (const stu of studentData) {
      const userRes = await client.query(
        `
        INSERT INTO users (username, email, password_hash, role, account_status, first_name, last_name, phone, department_id)
        VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE 
          SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, department_id = EXCLUDED.department_id
        RETURNING id;
        `,
        [stu.username, stu.email, studentPasswordHash, stu.first_name, stu.last_name, stu.phone, stu.dept_id]
      );
      const userId = userRes.rows[0].id;

      const stuRes = await client.query(
        `
        INSERT INTO students (user_id, student_roll_number, enrollment_number, year, semester, division)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE 
          SET student_roll_number = EXCLUDED.student_roll_number,
              enrollment_number = EXCLUDED.enrollment_number,
              year = EXCLUDED.year,
              semester = EXCLUDED.semester,
              division = EXCLUDED.division
        RETURNING id;
        `,
        [userId, stu.roll, stu.enrollment, stu.year, stu.semester, stu.division]
      );
      const studentId = stuRes.rows[0].id;
      studentIdMap.set(stu.username, studentId);

      // Student-Class assignment
      if (stu.class_id) {
        await client.query(
          `
          INSERT INTO student_classes (student_id, class_id, academic_year)
          VALUES ($1, $2, '2025-2026')
          ON CONFLICT (student_id, class_id, academic_year) DO NOTHING;
          `,
          [studentId, stu.class_id]
        );
      }
    }
    logger.info(`Seeded ${studentData.length} students and class enrollments.`);

    // 8. Seed Campus Bulletins & Notices
    const noticesData = [
      {
        title: 'End-Semester Examination Schedule — Spring 2026',
        description: 'The comprehensive final examination schedule for Spring Semester 2026 has been published by the Controller of Examinations. All enrolled students must download and print their digital admit cards prior to commencement of theory exams.',
        category: 'EXAMINATION',
        priority: 'URGENT',
        published_by: adminUserId,
        target_role: 'ALL',
        department_id: null,
        is_published: true,
      },
      {
        title: 'Internal Assessment & Practical Lab Submissions Due',
        description: 'All 3rd Year B.Tech Computer Engineering students must complete and submit their Database Systems (CS501) and Operating Systems (CS502) laboratory workbooks to their respective course instructors by Friday 5:00 PM.',
        category: 'ACADEMIC',
        priority: 'HIGH',
        published_by: staffUserMap.get('staff.jenkins') || adminUserId,
        target_role: 'STUDENT',
        department_id: cseDeptId,
        is_published: true,
      },
      {
        title: 'Faculty Senate & Curriculum Review Committee Meeting',
        description: 'The bi-annual Faculty Senate meeting regarding syllabus upgrades and NBA accreditation criteria will be held in the Main Board Room, Block A at 3:30 PM this Thursday. Department heads and senior faculty attendance is mandatory.',
        category: 'ADMINISTRATIVE',
        priority: 'NORMAL',
        published_by: adminUserId,
        target_role: 'STAFF',
        department_id: null,
        is_published: true,
      },
      {
        title: 'Annual Technical Symposium & Project Exhibition (Apex TechFest)',
        description: 'Registrations are officially open for Apex TechFest 2026. Student innovation teams may submit project proposals across Artificial Intelligence, Embedded Systems, and Web Engineering tracks through the Student Portal.',
        category: 'EVENT',
        priority: 'NORMAL',
        published_by: staffUserMap.get('staff.turing') || adminUserId,
        target_role: 'ALL',
        department_id: null,
        is_published: true,
      },
      {
        title: 'Campus Network & Digital Library Maintenance Window',
        description: 'Scheduled maintenance of primary campus backbone switches and digital library repositories will take place this Sunday from 01:00 AM to 05:00 AM IST. Cloud ERP services will remain accessible via redundant backup connection.',
        category: 'GENERAL',
        priority: 'LOW',
        published_by: adminUserId,
        target_role: 'ALL',
        department_id: null,
        is_published: true,
      },
      {
        title: 'Campus Placement & Internship Drive — Registration Open',
        description: 'Eligible 3rd & 4th Year B.Tech students with CGPA >= 7.5 and no active backlogs are instructed to verify and update their academic credentials on the Training & Placement Cell portal before the upcoming corporate campus drive.',
        category: 'ACADEMIC',
        priority: 'HIGH',
        published_by: adminUserId,
        target_role: 'STUDENT',
        department_id: null,
        is_published: true,
      },
    ];

    for (const n of noticesData) {
      await client.query(
        `
        INSERT INTO notices (title, description, category, priority, published_by, target_role, department_id, is_published, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT DO NOTHING;
        `,
        [n.title, n.description, n.category, n.priority, n.published_by, n.target_role, n.department_id, n.is_published]
      );
    }
    logger.info(`Seeded ${noticesData.length} campus notices and bulletins.`);

    // 9. Seed Weekly Class Timetable (CSE Year 3 Sem 5 Div A)
    const sarahStaffId = staffIdMap.get('EMP-CSE-001')!;
    const turingStaffId = staffIdMap.get('EMP-CSE-002')!;

    const timetableSlots = [
      // Monday
      { day: 'MONDAY', start: '09:00:00', end: '10:00:00', sub: 'CS501', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'MONDAY', start: '10:15:00', end: '11:15:00', sub: 'CS502', staff: turingStaffId, room: 'Room C-205', type: 'THEORY' },
      { day: 'MONDAY', start: '11:30:00', end: '12:30:00', sub: 'CS503', staff: turingStaffId, room: 'Room C-205', type: 'THEORY' },
      { day: 'MONDAY', start: '14:00:00', end: '16:00:00', sub: 'CS501', staff: sarahStaffId, room: 'Database Lab 2', type: 'LAB' },

      // Tuesday
      { day: 'TUESDAY', start: '09:00:00', end: '10:00:00', sub: 'CS504', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'TUESDAY', start: '10:15:00', end: '11:15:00', sub: 'CS505', staff: turingStaffId, room: 'Room C-204', type: 'THEORY' },
      { day: 'TUESDAY', start: '11:30:00', end: '12:30:00', sub: 'CS506', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'TUESDAY', start: '14:00:00', end: '16:00:00', sub: 'CS502', staff: turingStaffId, room: 'Systems Lab 1', type: 'LAB' },

      // Wednesday
      { day: 'WEDNESDAY', start: '09:00:00', end: '10:00:00', sub: 'CS503', staff: turingStaffId, room: 'Room C-205', type: 'THEORY' },
      { day: 'WEDNESDAY', start: '10:15:00', end: '11:15:00', sub: 'CS501', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'WEDNESDAY', start: '11:30:00', end: '12:30:00', sub: 'CS504', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'WEDNESDAY', start: '14:00:00', end: '16:00:00', sub: 'CS503', staff: turingStaffId, room: 'Network Lab', type: 'LAB' },

      // Thursday
      { day: 'THURSDAY', start: '09:00:00', end: '10:00:00', sub: 'CS506', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'THURSDAY', start: '10:15:00', end: '11:15:00', sub: 'CS502', staff: turingStaffId, room: 'Room C-205', type: 'THEORY' },
      { day: 'THURSDAY', start: '11:30:00', end: '12:30:00', sub: 'CS505', staff: turingStaffId, room: 'Room C-204', type: 'THEORY' },
      { day: 'THURSDAY', start: '14:00:00', end: '15:30:00', sub: 'CS506', staff: sarahStaffId, room: 'Room C-301', type: 'TUTORIAL' },

      // Friday
      { day: 'FRIDAY', start: '09:00:00', end: '10:00:00', sub: 'CS501', staff: sarahStaffId, room: 'Room C-301', type: 'THEORY' },
      { day: 'FRIDAY', start: '10:15:00', end: '11:15:00', sub: 'CS503', staff: turingStaffId, room: 'Room C-205', type: 'THEORY' },
      { day: 'FRIDAY', start: '11:30:00', end: '12:30:00', sub: 'CS502', staff: turingStaffId, room: 'Room C-205', type: 'THEORY' },
      { day: 'FRIDAY', start: '14:00:00', end: '15:30:00', sub: 'CS505', staff: turingStaffId, room: 'Seminar Hall B', type: 'SEMINAR' },

      // Saturday
      { day: 'SATURDAY', start: '10:00:00', end: '12:00:00', sub: 'CS506', staff: sarahStaffId, room: 'Cyber Lab', type: 'LAB' },
    ];

    for (const slot of timetableSlots) {
      const subjectId = subjectMap.get(slot.sub)!;
      await client.query(
        `
        INSERT INTO timetable (
          academic_year,
          semester,
          department_id,
          class_id,
          division,
          subject_id,
          staff_id,
          day_of_week,
          start_time,
          end_time,
          room,
          lecture_type
        )
        VALUES ('2025-2026', 5, $1, $2, 'A', $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT ON CONSTRAINT uq_timetable_class_slot DO UPDATE
          SET subject_id = EXCLUDED.subject_id, staff_id = EXCLUDED.staff_id, room = EXCLUDED.room, end_time = EXCLUDED.end_time;
        `,
        [cseDeptId, cseClassId, subjectId, slot.staff, slot.day, slot.start, slot.end, slot.room, slot.type]
      );
    }
    logger.info(`Seeded ${timetableSlots.length} weekly timetable slots.`);

    // 10. Seed Real Attendance Records (CSE Year 3 Sem 5 Div A)
    const cseStudents = [
      { username: 'student.alex', absenceMod: 9 }, // ~89% present
      { username: 'student.priya', absenceMod: 17 }, // ~94% present
      { username: 'student.david', absenceMod: 7 }, // ~85% present
      { username: 'student.emily', absenceMod: 11 }, // ~91% present
    ];

    const lectureSessions = [
      { date: '2026-09-01', sub: 'CS501', staff: sarahStaffId, topic: 'Relational Model & Keys' },
      { date: '2026-09-01', sub: 'CS502', staff: turingStaffId, topic: 'Processes & Context Switching' },
      { date: '2026-09-02', sub: 'CS503', staff: turingStaffId, topic: 'OSI Reference Model & TCP/IP' },
      { date: '2026-09-02', sub: 'CS504', staff: sarahStaffId, topic: 'Agile & Waterfall Models' },
      { date: '2026-09-03', sub: 'CS505', staff: turingStaffId, topic: 'HTML5 Semantic Markup & CSS3' },
      { date: '2026-09-03', sub: 'CS506', staff: sarahStaffId, topic: 'Threat Landscapes & CIA Triad' },
      { date: '2026-09-04', sub: 'CS501', staff: sarahStaffId, topic: 'SQL Queries & Subqueries' },
      { date: '2026-09-04', sub: 'CS502', staff: turingStaffId, topic: 'CPU Scheduling Algorithms' },
      { date: '2026-09-07', sub: 'CS501', staff: sarahStaffId, topic: 'ER Modeling & Relational Schema' },
      { date: '2026-09-07', sub: 'CS503', staff: turingStaffId, topic: 'Data Link Layer & Framing' },
      { date: '2026-09-08', sub: 'CS504', staff: sarahStaffId, topic: 'Software Requirements Specification (SRS)' },
      { date: '2026-09-08', sub: 'CS505', staff: turingStaffId, topic: 'JavaScript ES6+ & Async/Await' },
      { date: '2026-09-09', sub: 'CS506', staff: sarahStaffId, topic: 'Symmetric & Asymmetric Cryptography' },
      { date: '2026-09-09', sub: 'CS502', staff: turingStaffId, topic: 'Process Synchronization & Semaphores' },
      { date: '2026-09-10', sub: 'CS501', staff: sarahStaffId, topic: 'Database Normalization (1NF, 2NF, 3NF)' },
      { date: '2026-09-10', sub: 'CS503', staff: turingStaffId, topic: 'Error Detection & CRC' },
      { date: '2026-09-11', sub: 'CS504', staff: sarahStaffId, topic: 'UML Class Diagrams & Sequence Diagrams' },
      { date: '2026-09-11', sub: 'CS505', staff: turingStaffId, topic: 'DOM Manipulation & Event Loop' },
      { date: '2026-09-14', sub: 'CS506', staff: sarahStaffId, topic: 'Public Key Infrastructure (PKI) & Certificates' },
      { date: '2026-09-14', sub: 'CS502', staff: turingStaffId, topic: 'Deadlock Characterization & Prevention' },
      { date: '2026-09-15', sub: 'CS501', staff: sarahStaffId, topic: 'BCNF & Multi-valued Dependencies' },
      { date: '2026-09-15', sub: 'CS503', staff: turingStaffId, topic: 'Medium Access Control & CSMA/CD' },
      { date: '2026-09-16', sub: 'CS504', staff: sarahStaffId, topic: 'Design Patterns: Factory & Singleton' },
      { date: '2026-09-16', sub: 'CS505', staff: turingStaffId, topic: 'React Components, Props & Hooks' },
      { date: '2026-09-17', sub: 'CS506', staff: sarahStaffId, topic: 'Network Security: Firewalls & IDS/IPS' },
      { date: '2026-09-17', sub: 'CS502', staff: turingStaffId, topic: 'Memory Management & Paging' },
      { date: '2026-09-18', sub: 'CS501', staff: sarahStaffId, topic: 'Transaction ACID Properties & Recovery' },
      { date: '2026-09-18', sub: 'CS503', staff: turingStaffId, topic: 'IP Addressing & Subnetting' },
      { date: '2026-09-21', sub: 'CS504', staff: sarahStaffId, topic: 'Software Testing: Unit & Integration' },
      { date: '2026-09-21', sub: 'CS505', staff: turingStaffId, topic: 'Express REST APIs & Middleware' },
      { date: '2026-09-22', sub: 'CS506', staff: sarahStaffId, topic: 'Web Vulnerabilities (OWASP Top 10)' },
      { date: '2026-09-22', sub: 'CS502', staff: turingStaffId, topic: 'Virtual Memory & Page Replacement' },
      { date: '2026-09-23', sub: 'CS501', staff: sarahStaffId, topic: 'B+ Tree Indexing & Query Optimization' },
      { date: '2026-09-23', sub: 'CS503', staff: turingStaffId, topic: 'Routing Protocols: OSPF & BGP' },
    ];

    let totalAttendanceInserted = 0;

    for (let i = 0; i < lectureSessions.length; i++) {
      const sess = lectureSessions[i];
      const subjectId = subjectMap.get(sess.sub)!;

      for (let j = 0; j < cseStudents.length; j++) {
        const studentInfo = cseStudents[j];
        const studentId = studentIdMap.get(studentInfo.username);
        if (!studentId) continue;

        // Determine status with realistic distribution
        let status: 'PRESENT' | 'ABSENT' | 'LATE' = 'PRESENT';
        if ((i + j * 3) % studentInfo.absenceMod === 0) {
          status = 'ABSENT';
        } else if ((i + j * 2) % (studentInfo.absenceMod * 2) === 1) {
          status = 'LATE';
        }

        await client.query(
          `
          INSERT INTO attendance (
            student_id,
            class_id,
            subject_id,
            marked_by,
            attendance_date,
            status,
            remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT ON CONSTRAINT uq_attendance_student_subject_date DO UPDATE
            SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, remarks = EXCLUDED.remarks, updated_at = NOW();
          `,
          [studentId, cseClassId, subjectId, sess.staff, sess.date, status, sess.topic]
        );
        totalAttendanceInserted++;
      }
    }
    logger.info(`Seeded ${totalAttendanceInserted} real attendance records.`);

    // 11. Seed Real Assignments & Submissions
    const kahnStaffId = staffIdMap.get('EMP-ECE-001') || sarahStaffId;

    const assignmentItems = [
      {
        key: 'cs501_norm',
        title: 'Lab Assignment 3: Relational Schema & 3NF Normalization',
        description: 'Construct a fully normalized (3NF) relational schema for a multi-tenant hospital inventory management system. Submit SQL DDL scripts, dependency diagrams, and schema diagrams.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS501')!,
        class_id: cseClassId,
        created_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-09-28 23:59:00+00',
        max_marks: 25,
        status: 'PUBLISHED',
      },
      {
        key: 'cs502_sem',
        title: 'Process Synchronization & Semaphore Implementation',
        description: 'Implement the classical Dining Philosophers problem in C/C++ using POSIX mutexes and counting semaphores. Ensure starvation-free and deadlock-free execution with detailed test cases.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS502')!,
        class_id: cseClassId,
        created_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-09-30 23:59:00+00',
        max_marks: 20,
        status: 'PUBLISHED',
      },
      {
        key: 'cs503_socket',
        title: 'Socket Programming: Multi-Client Chat Server',
        description: 'Build a multithreaded TCP socket server in Python or Node.js handling concurrent client connections, broadcast channels, and private messaging protocols with heartbeat detection.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS503')!,
        class_id: cseClassId,
        created_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-10-05 23:59:00+00',
        max_marks: 30,
        status: 'PUBLISHED',
      },
      {
        key: 'cs504_srs',
        title: 'Software Requirements Specification (SRS) Document',
        description: 'Author an IEEE 830 compliant SRS document for an Autonomous Campus Surveillance and Access Control System including detailed use case specifications and sequence diagrams.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS504')!,
        class_id: cseClassId,
        created_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-10-10 23:59:00+00',
        max_marks: 50,
        status: 'PUBLISHED',
      },
      {
        key: 'cs505_dash',
        title: 'Responsive College Dashboard with RESTful API',
        description: 'Develop a responsive frontend module consuming secure Express REST endpoints. Implement JWT authentication, robust error boundary states, and role-based navigation.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS505')!,
        class_id: cseClassId,
        created_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-09-20 23:59:00+00',
        max_marks: 40,
        status: 'PUBLISHED',
      },
      {
        key: 'cs506_owasp',
        title: 'OWASP Vulnerability Assessment & Mitigation Report',
        description: 'Conduct black-box security testing on the lab target web application. Document CSRF, Stored XSS, and SQL Injection vulnerabilities with reproducible proof-of-concept exploits and patch recommendations.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS506')!,
        class_id: cseClassId,
        created_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-09-18 23:59:00+00',
        max_marks: 25,
        status: 'PUBLISHED',
      },
      {
        key: 'cs501_sql_opt',
        title: 'SQL Query Optimization & B+ Tree Indexing Benchmark',
        description: 'Analyze EXPLAIN ANALYZE query execution plans across a 500,000 row dataset. Compare clustered B+ tree vs hash index query performance and document execution time benchmarks.',
        department_id: cseDeptId,
        subject_id: subjectMap.get('CS501')!,
        class_id: cseClassId,
        created_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-09-12 23:59:00+00',
        max_marks: 25,
        status: 'CLOSED',
      },
      {
        key: 'ec501_dsp',
        title: 'Digital Filter Design & Simulation in MATLAB',
        description: 'Design a 4th-order Butterworth low-pass filter with cutoff frequency 2.5 kHz and sampling frequency 20 kHz. Plot frequency magnitude response, phase response, and pole-zero constellation.',
        department_id: eceDeptId,
        subject_id: subjectMap.get('EC501')!,
        class_id: eceClassId,
        created_by: kahnStaffId,
        academic_year: '2025-2026',
        semester: 5,
        due_date: '2026-10-02 23:59:00+00',
        max_marks: 30,
        status: 'PUBLISHED',
      },
    ];

    const assignmentIdMap = new Map<string, string>();

    for (const a of assignmentItems) {
      const res = await client.query(
        `
        INSERT INTO assignments (
          title, description, department_id, class_id, subject_id, created_by, academic_year, semester, due_date, max_marks, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id;
        `,
        [a.title, a.description, a.department_id, a.class_id, a.subject_id, a.created_by, a.academic_year, a.semester, a.due_date, a.max_marks, a.status]
      );
      if (res.rows.length > 0) {
        assignmentIdMap.set(a.key, res.rows[0].id);
      } else {
        const existing = await client.query(
          `SELECT id FROM assignments WHERE title = $1 AND class_id = $2`,
          [a.title, a.class_id]
        );
        if (existing.rows.length > 0) {
          assignmentIdMap.set(a.key, existing.rows[0].id);
        }
      }
    }
    logger.info(`Seeded ${assignmentItems.length} assignments.`);

    // Submissions
    const alexStudentId = studentIdMap.get('student.alex');
    const priyaStudentId = studentIdMap.get('student.priya');
    const davidStudentId = studentIdMap.get('student.david');
    const emilyStudentId = studentIdMap.get('student.emily');

    const submissionRecords = [
      // Alex Morgan
      {
        assignmentKey: 'cs506_owasp',
        studentId: alexStudentId,
        submissionText: 'Submitted complete security assessment report detailing OWASP Top 10 vulnerabilities, POC payloads, and remediation code snippets.',
        attachmentName: 'cs506_alex_security_report.pdf',
        attachmentUrl: '/uploads/assignments/cs506_alex_security_report.pdf',
        submittedAt: '2026-09-17 19:30:00+00',
        status: 'GRADED',
        marks: 23,
        gradedBy: sarahStaffId,
        feedback: 'Thorough vulnerability analysis and actionable remediation strategies. Excellent POC demonstrations.',
      },
      {
        assignmentKey: 'cs501_sql_opt',
        studentId: alexStudentId,
        submissionText: 'Submitted benchmark report with EXPLAIN ANALYZE comparison tables and index tuning scripts.',
        attachmentName: 'cs501_alex_sql_benchmark.pdf',
        attachmentUrl: '/uploads/assignments/cs501_alex_sql_benchmark.pdf',
        submittedAt: '2026-09-11 16:45:00+00',
        status: 'GRADED',
        marks: 24,
        gradedBy: sarahStaffId,
        feedback: 'Outstanding query execution plan analysis and index comparison data.',
      },
      {
        assignmentKey: 'cs505_dash',
        studentId: alexStudentId,
        submissionText: 'GitHub repository: https://github.com/alex-morgan/college-portal-dashboard with live demo link and component documentation.',
        attachmentName: 'cs505_alex_dashboard_src.zip',
        attachmentUrl: '/uploads/assignments/cs505_alex_dashboard_src.zip',
        submittedAt: '2026-09-19 22:15:00+00',
        status: 'SUBMITTED',
        marks: null,
        gradedBy: null,
        feedback: null,
      },
      // Priya Sharma
      {
        assignmentKey: 'cs501_norm',
        studentId: priyaStudentId,
        submissionText: 'Normalized hospital schema up to 3NF and BCNF with complete SQL DDL create statements.',
        attachmentName: 'cs501_priya_schema.pdf',
        attachmentUrl: '/uploads/assignments/cs501_priya_schema.pdf',
        submittedAt: '2026-09-23 10:00:00+00',
        status: 'SUBMITTED',
        marks: null,
        gradedBy: null,
        feedback: null,
      },
      {
        assignmentKey: 'cs506_owasp',
        studentId: priyaStudentId,
        submissionText: 'Full penetration test audit matrix with OWASP risk scoring and automated vulnerability scanner logs.',
        attachmentName: 'cs506_priya_audit.pdf',
        attachmentUrl: '/uploads/assignments/cs506_priya_audit.pdf',
        submittedAt: '2026-09-18 14:00:00+00',
        status: 'GRADED',
        marks: 25,
        gradedBy: sarahStaffId,
        feedback: 'Flawless penetration test report with comprehensive threat modeling.',
      },
      // David Chen
      {
        assignmentKey: 'cs505_dash',
        studentId: davidStudentId,
        submissionText: 'Submitted student portal React code archive.',
        attachmentName: 'cs505_david_portal.zip',
        attachmentUrl: '/uploads/assignments/cs505_david_portal.zip',
        submittedAt: '2026-09-21 09:30:00+00',
        status: 'LATE',
        marks: null,
        gradedBy: null,
        feedback: null,
      },
      // Emily Watson
      {
        assignmentKey: 'cs506_owasp',
        studentId: emilyStudentId,
        submissionText: 'Completed OWASP audit report with focus on authentication bypass and session fixation.',
        attachmentName: 'cs506_emily_audit.pdf',
        attachmentUrl: '/uploads/assignments/cs506_emily_audit.pdf',
        submittedAt: '2026-09-18 11:20:00+00',
        status: 'GRADED',
        marks: 22,
        gradedBy: sarahStaffId,
        feedback: 'Well-structured analysis; consider adding automated fuzzing results in future submissions.',
      },
    ];

    let totalSubmissionsInserted = 0;
    for (const sub of submissionRecords) {
      if (!sub.studentId) continue;
      const assignId = assignmentIdMap.get(sub.assignmentKey);
      if (!assignId) continue;

      await client.query(
        `
        INSERT INTO assignment_submissions (
          assignment_id, student_id, submission_text, attachment_name, attachment_url, submitted_at, status, marks, graded_by, graded_at, feedback
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT ON CONSTRAINT uq_assignment_submission DO UPDATE
          SET submission_text = EXCLUDED.submission_text,
              attachment_name = EXCLUDED.attachment_name,
              attachment_url = EXCLUDED.attachment_url,
              submitted_at = EXCLUDED.submitted_at,
              status = EXCLUDED.status,
              marks = EXCLUDED.marks,
              graded_by = EXCLUDED.graded_by,
              graded_at = EXCLUDED.graded_at,
              feedback = EXCLUDED.feedback;
        `,
        [
          assignId,
          sub.studentId,
          sub.submissionText,
          sub.attachmentName,
          sub.attachmentUrl,
          sub.submittedAt,
          sub.status,
          sub.marks,
          sub.gradedBy,
          sub.status === 'GRADED' ? sub.submittedAt : null,
          sub.feedback,
        ]
      );
      totalSubmissionsInserted++;
    }
    logger.info(`Seeded ${totalSubmissionsInserted} assignment submissions.`);

    // 12. Seed Real Notes & Study Materials
    const noteItems = [
      {
        title: 'Database Normalization & BCNF Decomposition',
        description: 'Comprehensive lecture notes covering functional dependencies, 1NF, 2NF, 3NF, Boyce-Codd Normal Form, and loss-less join decomposition algorithms with step-by-step solved examples.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS501')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'LECTURE_NOTES',
        status: 'PUBLISHED',
        file_name: 'cs501_unit3_normalization_notes.pdf',
        file_url: '/uploads/notes/cs501_unit3_normalization_notes.pdf',
        file_type: 'application/pdf',
        file_size: 2450000,
      },
      {
        title: 'SQL Query Tuning & Indexing Reference Guide',
        description: 'Technical reference guide on B+ Tree vs Hash indexes, composite index design, EXPLAIN ANALYZE interpretation, and query execution plan optimization in relational database engines.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS501')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'REFERENCE',
        status: 'PUBLISHED',
        file_name: 'cs501_sql_indexing_tuning_guide.pdf',
        file_url: '/uploads/notes/cs501_sql_indexing_tuning_guide.pdf',
        file_type: 'application/pdf',
        file_size: 1820000,
      },
      {
        title: 'DBMS Mid-Term Comprehensive Question Bank',
        description: 'Curated repository of past mid-term exam questions with detailed solution keys covering ER modeling, relational algebra, SQL DDL/DML, and database recovery management.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS501')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'QUESTION_BANK',
        status: 'PUBLISHED',
        file_name: 'cs501_midterm_question_bank.pdf',
        file_url: '/uploads/notes/cs501_midterm_question_bank.pdf',
        file_type: 'application/pdf',
        file_size: 980000,
      },
      {
        title: 'Process Scheduling Algorithms & State Transitions',
        description: 'In-depth lecture slides on CPU scheduling algorithms (FCFS, SJF, Round Robin, Multilevel Feedback Queue), context switching overhead, and process control block (PCB) data structures.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS502')!,
        uploaded_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'LECTURE_NOTES',
        status: 'PUBLISHED',
        file_name: 'cs502_unit1_process_scheduling.pdf',
        file_url: '/uploads/notes/cs502_unit1_process_scheduling.pdf',
        file_type: 'application/pdf',
        file_size: 3120000,
      },
      {
        title: 'POSIX Mutexes & Semaphore Synchronization Lab Manual',
        description: 'Laboratory instructions and starter source code for implementing classical IPC problems including Producer-Consumer, Readers-Writers, and Dining Philosophers in C/POSIX.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS502')!,
        uploaded_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'PRACTICAL',
        status: 'PUBLISHED',
        file_name: 'cs502_semaphore_sync_lab_manual.pdf',
        file_url: '/uploads/notes/cs502_semaphore_sync_lab_manual.pdf',
        file_type: 'application/pdf',
        file_size: 1450000,
      },
      {
        title: 'Virtual Memory Management & Page Replacement Handout',
        description: 'Draft notes on demand paging, FIFO vs LRU vs Optimal page replacement algorithms, Belady anomaly, and Translation Lookaside Buffer (TLB) architecture.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS502')!,
        uploaded_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'STUDY_MATERIAL',
        status: 'DRAFT',
        file_name: 'cs502_virtual_memory_draft.pdf',
        file_url: '/uploads/notes/cs502_virtual_memory_draft.pdf',
        file_type: 'application/pdf',
        file_size: 890000,
      },
      {
        title: 'TCP/IP Protocol Suite & Layer 4 Flow Control Reference',
        description: 'Comprehensive protocol architecture reference examining 3-way handshakes, sliding window flow control, TCP congestion control (Tahoe, Reno), and UDP socket mechanics.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS503')!,
        uploaded_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'REFERENCE',
        status: 'PUBLISHED',
        file_name: 'cs503_tcp_ip_architecture_reference.pdf',
        file_url: '/uploads/notes/cs503_tcp_ip_architecture_reference.pdf',
        file_type: 'application/pdf',
        file_size: 4200000,
      },
      {
        title: 'Multi-Client Socket Programming in C & Python',
        description: 'Practical lab guide for socket programming: creating blocking vs non-blocking TCP socket endpoints, multithreaded client handlers, and broadcast message framing.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS503')!,
        uploaded_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'PRACTICAL',
        status: 'PUBLISHED',
        file_name: 'cs503_socket_programming_practical.pdf',
        file_url: '/uploads/notes/cs503_socket_programming_practical.pdf',
        file_type: 'application/pdf',
        file_size: 1650000,
      },
      {
        title: 'IEEE 830 Standard Software Requirements Specification (SRS) Template',
        description: 'Official template and best practice guidelines for writing compliant Software Requirements Specification documents with functional requirements and UML use case definitions.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS504')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'STUDY_MATERIAL',
        status: 'PUBLISHED',
        file_name: 'cs504_ieee_srs_template_guide.pdf',
        file_url: '/uploads/notes/cs504_ieee_srs_template_guide.pdf',
        file_type: 'application/pdf',
        file_size: 750000,
      },
      {
        title: 'Gang of Four (GoF) Design Patterns Summary Handout',
        description: 'Illustrated summary sheets for Creational, Structural, and Behavioral design patterns: Factory Method, Singleton, Observer, Decorator, and Strategy implementations with class diagrams.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS504')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'REFERENCE',
        status: 'PUBLISHED',
        file_name: 'cs504_design_patterns_summary.pdf',
        file_url: '/uploads/notes/cs504_design_patterns_summary.pdf',
        file_type: 'application/pdf',
        file_size: 2100000,
      },
      {
        title: 'Modern React Component Architecture & Custom Hooks',
        description: 'Lecture notes covering React 18 concurrent rendering, component state management, custom hook encapsulation, performance memoization with useMemo/useCallback, and Context API patterns.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS505')!,
        uploaded_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'LECTURE_NOTES',
        status: 'PUBLISHED',
        file_name: 'cs505_react_hooks_architecture.pdf',
        file_url: '/uploads/notes/cs505_react_hooks_architecture.pdf',
        file_type: 'application/pdf',
        file_size: 2900000,
      },
      {
        title: 'OWASP Top 10 Web Application Vulnerabilities & Defense Handbook',
        description: 'Comprehensive security reference detailing SQL Injection, Cross-Site Scripting (XSS), CSRF, Broken Access Control, and secure password hashing implementations with code mitigations.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS506')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'REFERENCE',
        status: 'PUBLISHED',
        file_name: 'cs506_owasp_top_10_defense_handbook.pdf',
        file_url: '/uploads/notes/cs506_owasp_top_10_defense_handbook.pdf',
        file_type: 'application/pdf',
        file_size: 3800000,
      },
      {
        title: 'Public Key Cryptography & PKI Certificates Study Notes',
        description: 'Archived reference notes on RSA algorithm mathematical foundations, Diffie-Hellman key exchange, X.509 certificate validation chains, and TLS 1.3 handshakes.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS506')!,
        uploaded_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'STUDY_MATERIAL',
        status: 'ARCHIVED',
        file_name: 'cs506_pki_cryptography_archived.pdf',
        file_url: '/uploads/notes/cs506_pki_cryptography_archived.pdf',
        file_type: 'application/pdf',
        file_size: 1200000,
      },
      {
        title: 'Digital Filter Design & Z-Transform Formula Sheet',
        description: 'Official formula sheet and course syllabus for IIR & FIR digital filter design, bilinear transformation method, and discrete Fourier transform (DFT) properties.',
        department_id: eceDeptId,
        class_id: eceClassId,
        subject_id: subjectMap.get('EC501')!,
        uploaded_by: kahnStaffId,
        academic_year: '2025-2026',
        semester: 5,
        category: 'SYLLABUS',
        status: 'PUBLISHED',
        file_name: 'ec501_dsp_filter_design_formulas.pdf',
        file_url: '/uploads/notes/ec501_dsp_filter_design_formulas.pdf',
        file_type: 'application/pdf',
        file_size: 1100000,
      },
    ];

    let totalNotesInserted = 0;
    for (const note of noteItems) {
      await client.query(
        `
        INSERT INTO notes (
          title, description, department_id, class_id, subject_id, uploaded_by, academic_year, semester, category, status, file_name, file_url, file_type, file_size, published_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        `,
        [
          note.title,
          note.description,
          note.department_id,
          note.class_id,
          note.subject_id,
          note.uploaded_by,
          note.academic_year,
          note.semester,
          note.category,
          note.status,
          note.file_name,
          note.file_url,
          note.file_type,
          note.file_size,
          note.status === 'PUBLISHED' ? new Date() : null,
        ]
      );
      totalNotesInserted++;
    }
    logger.info(`Seeded ${totalNotesInserted} course study materials and notes.`);

    // 13. Seed Real Quizzes & Online Tests
    const quizDefinitions = [
      {
        key: 'dbms_quiz',
        title: 'Database Systems & SQL Optimization Quiz',
        description: 'Comprehensive assessment covering BCNF normalization, relational algebra, transaction isolation levels, and B+ tree index execution plans.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS501')!,
        created_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        duration_minutes: 30,
        passing_marks: 12,
        status: 'PUBLISHED',
        questions: [
          {
            text: 'Which normal form guarantees the elimination of all transitive functional dependencies?',
            type: 'MCQ',
            marks: 5,
            order: 1,
            explanation: '3NF specifically eliminates transitive dependencies where non-prime attributes depend on other non-prime attributes.',
            options: [
              { text: 'First Normal Form (1NF)', is_correct: false },
              { text: 'Second Normal Form (2NF)', is_correct: false },
              { text: 'Third Normal Form (3NF)', is_correct: true },
              { text: 'Boyce-Codd Normal Form (BCNF)', is_correct: false },
            ],
          },
          {
            text: 'In relational databases, a clustered index alters the physical storage order of data rows on disk.',
            type: 'TRUE_FALSE',
            marks: 5,
            order: 2,
            explanation: 'A clustered index determines the physical order of data in a table, so only one clustered index can exist per table.',
            options: [
              { text: 'True', is_correct: true },
              { text: 'False', is_correct: false },
            ],
          },
          {
            text: 'What is the primary objective of Write-Ahead Logging (WAL) in transactional storage engines?',
            type: 'MCQ',
            marks: 5,
            order: 3,
            explanation: 'WAL ensures Atomicity and Durability (ACID) by logging changes before they are flushed to table data files.',
            options: [
              { text: 'Data stream compression', is_correct: false },
              { text: 'Atomicity and Durability during crash recovery', is_correct: true },
              { text: 'Read query load balancing', is_correct: false },
              { text: 'Role-based access security enforcement', is_correct: false },
            ],
          },
          {
            text: 'A standard B-Tree index has an average search time complexity of O(N).',
            type: 'TRUE_FALSE',
            marks: 5,
            order: 4,
            explanation: 'A balanced B-Tree index has an average and worst-case search time complexity of O(log N).',
            options: [
              { text: 'True', is_correct: false },
              { text: 'False', is_correct: true },
            ],
          },
        ],
        attempts: [
          {
            student_id: priyaStudentId,
            status: 'SUBMITTED',
            started_offset_mins: 45,
            submitted_offset_mins: 20,
            answers: [0, 0, 1, 1], // indices of correct options
          },
          {
            student_id: davidStudentId,
            status: 'SUBMITTED',
            started_offset_mins: 35,
            submitted_offset_mins: 15,
            answers: [0, 0, 1, 0], // Q4 wrong
          },
        ],
      },
      {
        key: 'os_quiz',
        title: 'Operating Systems: Concurrency & Process Synchronization',
        description: 'Mid-term test on semaphore primitives, deadlock conditions, context switching, and virtual memory page replacement algorithms.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS502')!,
        created_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        duration_minutes: 25,
        passing_marks: 10,
        status: 'PUBLISHED',
        questions: [
          {
            text: 'Which of the following conditions is NOT one of Coffman’s four necessary conditions for deadlock?',
            type: 'MCQ',
            marks: 5,
            order: 1,
            explanation: 'Preemption breaks deadlock; "No Preemption" is the condition required for deadlock to persist.',
            options: [
              { text: 'Mutual Exclusion', is_correct: false },
              { text: 'Hold and Wait', is_correct: false },
              { text: 'Preemption', is_correct: true },
              { text: 'Circular Wait', is_correct: false },
            ],
          },
          {
            text: 'A binary semaphore initialized to 1 can be used interchangeably with a mutex lock for mutual exclusion.',
            type: 'TRUE_FALSE',
            marks: 5,
            order: 2,
            explanation: 'Both restrict access to a critical section to one thread at a time when initialized to 1.',
            options: [
              { text: 'True', is_correct: true },
              { text: 'False', is_correct: false },
            ],
          },
          {
            text: 'Which POSIX system call creates a new child process with a duplicated address space?',
            type: 'MCQ',
            marks: 5,
            order: 3,
            explanation: 'fork() duplicates the calling process, creating a new child process.',
            options: [
              { text: 'exec()', is_correct: false },
              { text: 'fork()', is_correct: true },
              { text: 'spawn()', is_correct: false },
              { text: 'pthread_create()', is_correct: false },
            ],
          },
        ],
        attempts: [
          {
            student_id: alexStudentId,
            status: 'SUBMITTED',
            started_offset_mins: 50,
            submitted_offset_mins: 30,
            answers: [2, 0, 1], // all correct
          },
        ],
      },
      {
        key: 'cn_quiz',
        title: 'Computer Networks: Protocol Stack Assessment',
        description: 'Closed review test on TCP three-way handshake, sliding window protocols, subnetting, and DNS resolution.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS503')!,
        created_by: turingStaffId,
        academic_year: '2025-2026',
        semester: 5,
        duration_minutes: 20,
        passing_marks: 6,
        status: 'CLOSED',
        questions: [
          {
            text: 'Which transport layer protocol provides reliable, connection-oriented byte stream transmission?',
            type: 'MCQ',
            marks: 5,
            order: 1,
            explanation: 'TCP provides connection-oriented, ordered, and error-checked byte streams.',
            options: [
              { text: 'UDP', is_correct: false },
              { text: 'TCP', is_correct: true },
              { text: 'ICMP', is_correct: false },
              { text: 'ARP', is_correct: false },
            ],
          },
          {
            text: 'IPv6 addresses are exactly 64 bits in length.',
            type: 'TRUE_FALSE',
            marks: 5,
            order: 2,
            explanation: 'IPv6 addresses are 128 bits in length.',
            options: [
              { text: 'True', is_correct: false },
              { text: 'False', is_correct: true },
            ],
          },
        ],
        attempts: [
          {
            student_id: alexStudentId,
            status: 'SUBMITTED',
            started_offset_mins: 120,
            submitted_offset_mins: 105,
            answers: [1, 1], // all correct
          },
        ],
      },
      {
        key: 'se_quiz',
        title: 'Software Engineering: Agile & Design Patterns Quiz',
        description: 'Draft unit quiz assessing Scrum sprint workflows, SOLID principles, and UML state machine diagrams.',
        department_id: cseDeptId,
        class_id: cseClassId,
        subject_id: subjectMap.get('CS504')!,
        created_by: sarahStaffId,
        academic_year: '2025-2026',
        semester: 5,
        duration_minutes: 20,
        passing_marks: 5,
        status: 'DRAFT',
        questions: [
          {
            text: 'Which design pattern restricts a class to instantiating only a single global instance?',
            type: 'MCQ',
            marks: 5,
            order: 1,
            explanation: 'The Singleton pattern ensures a class has only one instance and provides a global access point to it.',
            options: [
              { text: 'Factory Pattern', is_correct: false },
              { text: 'Singleton Pattern', is_correct: true },
              { text: 'Observer Pattern', is_correct: false },
              { text: 'Strategy Pattern', is_correct: false },
            ],
          },
        ],
        attempts: [],
      },
    ];

    let totalQuizzesInserted = 0;
    for (const qDef of quizDefinitions) {
      // Calculate total marks
      const totalMarks = qDef.questions.reduce((sum, q) => sum + q.marks, 0);

      const quizRes = await client.query(
        `
        INSERT INTO quizzes (
          title, description, department_id, class_id, subject_id, created_by,
          academic_year, semester, duration_minutes, total_marks, passing_marks, status,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id;
        `,
        [
          qDef.title,
          qDef.description,
          qDef.department_id,
          qDef.class_id,
          qDef.subject_id,
          qDef.created_by,
          qDef.academic_year,
          qDef.semester,
          qDef.duration_minutes,
          totalMarks,
          qDef.passing_marks,
          qDef.status,
        ]
      );
      const quizId = quizRes.rows[0].id;
      totalQuizzesInserted++;

      // Insert questions and options
      const questionRecords: Array<{ id: string; marks: number; options: Array<{ id: string; is_correct: boolean }> }> = [];

      for (const q of qDef.questions) {
        const qRes = await client.query(
          `
          INSERT INTO quiz_questions (
            quiz_id, question_text, question_type, marks, question_order, explanation, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id;
          `,
          [quizId, q.text, q.type, q.marks, q.order, q.explanation]
        );
        const questionId = qRes.rows[0].id;

        const optionRecords: Array<{ id: string; is_correct: boolean }> = [];
        for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
          const opt = q.options[oIdx];
          const optRes = await client.query(
            `
            INSERT INTO quiz_options (question_id, option_text, option_order, is_correct, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id;
            `,
            [questionId, opt.text, oIdx + 1, opt.is_correct]
          );
          optionRecords.push({ id: optRes.rows[0].id, is_correct: opt.is_correct });
        }

        questionRecords.push({ id: questionId, marks: q.marks, options: optionRecords });
      }

      // Insert attempts and answers
      for (const att of qDef.attempts) {
        const startedAt = new Date(Date.now() - att.started_offset_mins * 60 * 1000);
        const submittedAt = new Date(Date.now() - att.submitted_offset_mins * 60 * 1000);

        let totalScore = 0;
        const answerInserts: Array<{ questionId: string; optionId: string; isCorrect: boolean; marks: number }> = [];

        for (let i = 0; i < questionRecords.length; i++) {
          const qRec = questionRecords[i];
          const chosenOptionIdx = att.answers[i];
          if (chosenOptionIdx !== undefined && qRec.options[chosenOptionIdx]) {
            const chosenOpt = qRec.options[chosenOptionIdx];
            const isCorrect = chosenOpt.is_correct;
            const marksAwarded = isCorrect ? qRec.marks : 0;
            totalScore += marksAwarded;
            answerInserts.push({
              questionId: qRec.id,
              optionId: chosenOpt.id,
              isCorrect,
              marks: marksAwarded,
            });
          }
        }

        const percentage = totalMarks > 0 ? parseFloat(((totalScore / totalMarks) * 100).toFixed(2)) : 0;

        const attRes = await client.query(
          `
          INSERT INTO quiz_attempts (
            quiz_id, student_id, started_at, submitted_at, status, score, percentage, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $3, $4)
          RETURNING id;
          `,
          [quizId, att.student_id, startedAt, submittedAt, att.status, totalScore, percentage]
        );
        const attemptId = attRes.rows[0].id;

        for (const ans of answerInserts) {
          await client.query(
            `
            INSERT INTO quiz_answers (
              attempt_id, question_id, selected_option_id, is_correct, marks_awarded, answered_at, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $6, $6);
            `,
            [attemptId, ans.questionId, ans.optionId, ans.isCorrect, ans.marks, submittedAt]
          );
        }
      }
    }
    logger.info(`Seeded ${totalQuizzesInserted} quizzes with questions, options, attempts, and answers.`);

    // ─── Phase 4.8: Seed Mark Components, Student Marks & Subject Results ──
    const compDefs = [
      // CS501 (Sarah Jenkins)
      {
        name: 'Assignment 1 — SQL & Relational Algebra',
        code: 'CS501-A1',
        description: 'Evaluates relational schema design and complex SQL queries',
        subject_code: 'CS501',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 10,
        weightage: 10,
        type: 'ASSIGNMENT',
        staff_id: sarahStaffId,
      },
      {
        name: 'Assignment 2 — Normalization & Indexing',
        code: 'CS501-A2',
        description: 'BCNF decomposition and query plan optimization',
        subject_code: 'CS501',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 10,
        weightage: 10,
        type: 'ASSIGNMENT',
        staff_id: sarahStaffId,
      },
      {
        name: 'Quiz 1 — Indexing & Query Plan Assessment',
        code: 'CS501-QZ1',
        description: 'Online timed MCQ on B+ Trees and MVCC',
        subject_code: 'CS501',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 10,
        weightage: 10,
        type: 'QUIZ',
        staff_id: sarahStaffId,
      },
      {
        name: 'Midterm Internal Theory & Lab Exam',
        code: 'CS501-INT1',
        description: 'Comprehensive mid-semester internal assessment',
        subject_code: 'CS501',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 20,
        weightage: 20,
        type: 'INTERNAL',
        staff_id: sarahStaffId,
      },

      // CS502 (Alan Turing)
      {
        name: 'Assignment 1 — Process Synchronization',
        code: 'CS502-A1',
        description: 'POSIX semaphore and deadlock prevention implementation',
        subject_code: 'CS502',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 15,
        weightage: 15,
        type: 'ASSIGNMENT',
        staff_id: turingStaffId,
      },
      {
        name: 'Quiz 1 — OS Concurrency & CPU Scheduling',
        code: 'CS502-QZ1',
        description: 'Online test evaluating scheduling algorithms',
        subject_code: 'CS502',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 10,
        weightage: 10,
        type: 'QUIZ',
        staff_id: turingStaffId,
      },
      {
        name: 'Practical Lab Assessment — Kernel Modules',
        code: 'CS502-PRAC1',
        description: 'Hands-on evaluation of system call tracing',
        subject_code: 'CS502',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 25,
        weightage: 25,
        type: 'PRACTICAL',
        staff_id: turingStaffId,
      },

      // CS503 (Alan Turing)
      {
        name: 'Assignment 1 — Socket Programming Server',
        code: 'CS503-A1',
        description: 'TCP multi-threaded server architecture',
        subject_code: 'CS503',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 20,
        weightage: 20,
        type: 'ASSIGNMENT',
        staff_id: turingStaffId,
      },
      {
        name: 'Midterm Internal Test — Networking Protocols',
        code: 'CS503-INT1',
        description: 'Routing algorithms and congestion control protocols',
        subject_code: 'CS503',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 30,
        weightage: 30,
        type: 'INTERNAL',
        staff_id: turingStaffId,
      },

      // CS504 (Sarah Jenkins)
      {
        name: 'Software Project Milestone 1 — SRS Document',
        code: 'CS504-PROJ1',
        description: 'IEEE 830 compliant requirements specification',
        subject_code: 'CS504',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 25,
        weightage: 25,
        type: 'PROJECT',
        staff_id: sarahStaffId,
      },
      {
        name: 'Internal Assessment — Agile & Scrum Concepts',
        code: 'CS504-INT1',
        description: 'Sprint planning and software testing strategies',
        subject_code: 'CS504',
        dept_id: cseDeptId,
        class_id: cseClassId,
        max_marks: 25,
        weightage: 25,
        type: 'INTERNAL',
        staff_id: sarahStaffId,
      },
    ];

    const compIdMap = new Map<string, string>();
    for (const comp of compDefs) {
      const subId = subjectMap.get(comp.subject_code)!;
      const cRes = await client.query(
        `
        INSERT INTO mark_components (
          name, code, description, department_id, subject_id, class_id,
          academic_year, semester, max_marks, weightage, component_type, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (subject_id, class_id, academic_year, semester, code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          max_marks = EXCLUDED.max_marks,
          weightage = EXCLUDED.weightage,
          component_type = EXCLUDED.component_type,
          updated_at = NOW()
        RETURNING id;
        `,
        [
          comp.name,
          comp.code,
          comp.description,
          comp.dept_id,
          subId,
          comp.class_id,
          '2025-2026',
          5,
          comp.max_marks,
          comp.weightage,
          comp.type,
          comp.staff_id,
        ]
      );
      compIdMap.set(comp.code, cRes.rows[0].id);
    }
    logger.info(`Seeded ${compDefs.length} mark components across Semester 5 courses.`);

    // Seed student marks
    const studentMarkEntries = [
      // Alex Morgan (alexStudentId)
      { student_id: alexStudentId, comp_code: 'CS501-A1', marks: 9, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Excellent SQL design' },
      { student_id: alexStudentId, comp_code: 'CS501-A2', marks: 8, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Good BCNF proof' },
      { student_id: alexStudentId, comp_code: 'CS501-QZ1', marks: 9, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Top quartile' },
      { student_id: alexStudentId, comp_code: 'CS501-INT1', marks: 17, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Strong query plan analysis' },
      { student_id: alexStudentId, comp_code: 'CS502-A1', marks: 14, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Clean mutex sync' },
      { student_id: alexStudentId, comp_code: 'CS502-QZ1', marks: 8, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Good timing' },
      { student_id: alexStudentId, comp_code: 'CS502-PRAC1', marks: 22, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Robust kernel hooks' },
      { student_id: alexStudentId, comp_code: 'CS503-A1', marks: 18, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Concurrent socket handling' },
      { student_id: alexStudentId, comp_code: 'CS503-INT1', marks: 26, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Well explained BGP routing' },
      { student_id: alexStudentId, comp_code: 'CS504-PROJ1', marks: 23, status: 'DRAFT', staff_id: sarahStaffId, remarks: 'Draft review in progress' },

      // Priya Sharma (priyaStudentId)
      { student_id: priyaStudentId, comp_code: 'CS501-A1', marks: 10, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Flawless schema' },
      { student_id: priyaStudentId, comp_code: 'CS501-A2', marks: 9, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Accurate dependencies' },
      { student_id: priyaStudentId, comp_code: 'CS501-QZ1', marks: 10, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Full marks' },
      { student_id: priyaStudentId, comp_code: 'CS501-INT1', marks: 18, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Exemplary work' },
      { student_id: priyaStudentId, comp_code: 'CS502-A1', marks: 15, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Flawless code' },
      { student_id: priyaStudentId, comp_code: 'CS502-QZ1', marks: 9, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Great score' },
      { student_id: priyaStudentId, comp_code: 'CS502-PRAC1', marks: 24, status: 'PUBLISHED', staff_id: turingStaffId, remarks: 'Outstanding practical demo' },

      // David Chen (davidStudentId)
      { student_id: davidStudentId, comp_code: 'CS501-A1', marks: 8, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Good effort' },
      { student_id: davidStudentId, comp_code: 'CS501-A2', marks: 7, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Need cleaner decomposition' },
      { student_id: davidStudentId, comp_code: 'CS501-QZ1', marks: 8, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Solid test score' },
      { student_id: davidStudentId, comp_code: 'CS501-INT1', marks: 15, status: 'PUBLISHED', staff_id: sarahStaffId, remarks: 'Satisfactory answers' },
    ];

    for (const sm of studentMarkEntries) {
      const compId = compIdMap.get(sm.comp_code);
      if (compId) {
        await client.query(
          `
          INSERT INTO student_marks (
            student_id, component_id, marks_obtained, status, remarks, entered_by, published_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (student_id, component_id)
          DO UPDATE SET
            marks_obtained = EXCLUDED.marks_obtained,
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            entered_by = EXCLUDED.entered_by,
            published_at = EXCLUDED.published_at,
            updated_at = NOW();
          `,
          [
            sm.student_id,
            compId,
            sm.marks,
            sm.status,
            sm.remarks,
            sm.staff_id,
            sm.status === 'PUBLISHED' ? new Date() : null,
          ]
        );
      }
    }
    logger.info(`Seeded ${studentMarkEntries.length} student mark records.`);

    // Seed student subject results
    const subjectResultEntries = [
      // Alex Morgan
      {
        student_id: alexStudentId,
        subject_code: 'CS501',
        class_id: cseClassId,
        total: 43,
        max: 50,
        pct: 86.0,
        grade: 'A+',
        gp: 9.0,
        status: 'PUBLISHED',
      },
      {
        student_id: alexStudentId,
        subject_code: 'CS502',
        class_id: cseClassId,
        total: 44,
        max: 50,
        pct: 88.0,
        grade: 'A+',
        gp: 9.0,
        status: 'PUBLISHED',
      },
      {
        student_id: alexStudentId,
        subject_code: 'CS503',
        class_id: cseClassId,
        total: 44,
        max: 50,
        pct: 88.0,
        grade: 'A+',
        gp: 9.0,
        status: 'PUBLISHED',
      },
      {
        student_id: alexStudentId,
        subject_code: 'CS504',
        class_id: cseClassId,
        total: 42,
        max: 50,
        pct: 84.0,
        grade: 'A+',
        gp: 9.0,
        status: 'DRAFT',
      },

      // Priya Sharma
      {
        student_id: priyaStudentId,
        subject_code: 'CS501',
        class_id: cseClassId,
        total: 47,
        max: 50,
        pct: 94.0,
        grade: 'O',
        gp: 10.0,
        status: 'PUBLISHED',
      },
      {
        student_id: priyaStudentId,
        subject_code: 'CS502',
        class_id: cseClassId,
        total: 48,
        max: 50,
        pct: 96.0,
        grade: 'O',
        gp: 10.0,
        status: 'PUBLISHED',
      },

      // David Chen
      {
        student_id: davidStudentId,
        subject_code: 'CS501',
        class_id: cseClassId,
        total: 38,
        max: 50,
        pct: 76.0,
        grade: 'A',
        gp: 8.0,
        status: 'PUBLISHED',
      },
    ];

    for (const sr of subjectResultEntries) {
      const subId = subjectMap.get(sr.subject_code)!;
      await client.query(
        `
        INSERT INTO student_subject_results (
          student_id, subject_id, class_id, academic_year, semester,
          total_marks, max_marks, percentage, grade, grade_point,
          result_status, published_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (student_id, subject_id, academic_year, semester)
        DO UPDATE SET
          class_id = EXCLUDED.class_id,
          total_marks = EXCLUDED.total_marks,
          max_marks = EXCLUDED.max_marks,
          percentage = EXCLUDED.percentage,
          grade = EXCLUDED.grade,
          grade_point = EXCLUDED.grade_point,
          result_status = EXCLUDED.result_status,
          published_at = EXCLUDED.published_at,
          updated_at = NOW();
        `,
        [
          sr.student_id,
          subId,
          sr.class_id,
          '2025-2026',
          5,
          sr.total,
          sr.max,
          sr.pct,
          sr.grade,
          sr.gp,
          sr.status,
          sr.status === 'PUBLISHED' ? new Date() : null,
        ]
      );
    }
    logger.info(`Seeded ${subjectResultEntries.length} student subject result records.`);

    await client.query('COMMIT');
    logger.info('Phase 3 database seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// CLI entry point
if (require.main === module) {
  (async () => {
    try {
      await seedDatabase();
    } catch (error) {
      console.error(error);
      process.exit(1);
    } finally {
      await closePool();
    }
  })();
}
