/**
 * Common TypeScript types for the College ERP frontend.
 */

// ─── User Roles & Account Status ──────────────────────────
export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';

// ─── User Profile & Self-Profile Types ────────────────────
export interface EnrolledSubject {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
}

export interface StudentClassHistory {
  class_id: string;
  class_name: string;
  academic_year: string;
  joined_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  first_name: string;
  last_name: string;
  phone?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  profile_photo_url?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  // Student specific
  student_id?: string;
  student_roll_number?: string;
  enrollment_number?: string;
  year?: number;
  semester?: number;
  division?: string;
  class_id?: string | null;
  class_name?: string | null;
  enrolled_subjects?: EnrolledSubject[];
  class_history?: StudentClassHistory[];
  // Staff specific
  staff_id?: string;
  employee_id?: string;
  designation?: string;
  subjects?: EnrolledSubject[];
}

export type StudentProfile = User;
export type StaffProfile = User;

// ─── Auth Session & Login Response ────────────────────────
export interface AuthSession {
  id: string;
  expiresAt: string;
}

export interface LoginResponseData {
  token: string;
  session: AuthSession;
  user: User;
}

// ─── API Response Envelopes ──────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiPaginatedResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

// ─── Navigation ──────────────────────────────────────────
export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

// ─── Breadcrumb ──────────────────────────────────────────
export interface BreadcrumbItem {
  label: string;
  path?: string;
}

// ─── Stat Card ───────────────────────────────────────────
// ─── Campus Notices & Bulletins ─────────────────────────
export type NoticeCategory = 'ACADEMIC' | 'ADMINISTRATIVE' | 'EXAMINATION' | 'EVENT' | 'GENERAL' | 'URGENT';
export type NoticePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NoticeTargetRole = 'ALL' | 'STUDENT' | 'STAFF' | 'ADMIN';

export interface Notice {
  id: string;
  title: string;
  description: string;
  category: NoticeCategory;
  priority: NoticePriority;
  published_by?: string | null;
  published_by_name?: string | null;
  published_by_role?: string | null;
  published_at: string;
  expires_at?: string | null;
  target_role: NoticeTargetRole;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Timetable & Class Schedules ─────────────────────────
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type LectureType = 'THEORY' | 'LAB' | 'TUTORIAL' | 'SEMINAR';

export interface TimetableEntry {
  id: string;
  academic_year: string;
  semester: number;
  department_id: string;
  department_name?: string;
  department_code?: string;
  class_id: string;
  class_name?: string;
  division: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_credits: number;
  staff_id: string;
  staff_name: string;
  staff_employee_id: string;
  staff_designation?: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  room: string;
  lecture_type: LectureType;
  created_at?: string;
  updated_at?: string;
}

// ─── Attendance Management ───────────────────────────────
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  marked_by: string;
  attendance_date: string;
  status: AttendanceStatus;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
  student_roll_number?: string;
  enrollment_number?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_email?: string;
  subject_name?: string;
  subject_code?: string;
  subject_credits?: number;
  class_name?: string;
  division?: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  faculty_employee_id?: string;
}

export interface SubjectAttendanceSummary {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  faculty_name: string;
  faculty_code: string;
  total_sessions: number;
  attended_sessions: number;
  absent_sessions: number;
  late_sessions: number;
  percentage: number;
}

export interface OverallAttendanceSummary {
  total_conducted: number;
  total_attended: number;
  total_absent: number;
  total_late: number;
  overall_percentage: number;
  is_eligible: boolean;
}

export interface StudentAttendanceResponse {
  overall: OverallAttendanceSummary;
  subjects: SubjectAttendanceSummary[];
  records: AttendanceRecord[];
}

export interface MarkAttendanceRecordPayload {
  student_id: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface MarkAttendancePayload {
  class_id: string;
  subject_id: string;
  attendance_date: string;
  records: MarkAttendanceRecordPayload[];
}

// ─── Assignments & Submissions Management ─────────────────
export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type SubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'LATE' | 'GRADED';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  department_id: string;
  department_name?: string;
  department_code?: string;
  class_id: string;
  class_name?: string;
  division?: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  created_by: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  faculty_employee_id?: string;
  academic_year: string;
  semester: number;
  due_date: string;
  max_marks: number;
  status: AssignmentStatus;
  attachment_name?: string | null;
  attachment_url?: string | null;
  total_submissions?: number;
  graded_submissions?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentAssignment extends Assignment {
  submission_id?: string | null;
  submission_status?: SubmissionStatus;
  submitted_at?: string | null;
  submission_text?: string | null;
  submission_attachment_name?: string | null;
  submission_attachment_url?: string | null;
  marks_obtained?: number | null;
  feedback?: string | null;
  graded_at?: string | null;
  grader_first_name?: string | null;
  grader_last_name?: string | null;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  assignment_title?: string;
  assignment_max_marks?: number;
  assignment_due_date?: string;
  student_id: string;
  student_roll_number?: string;
  enrollment_number?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_email?: string;
  submitted_at?: string | null;
  status: SubmissionStatus;
  submission_text?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  marks?: number | null;
  feedback?: string | null;
  graded_by?: string | null;
  grader_first_name?: string | null;
  grader_last_name?: string | null;
  graded_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAssignmentPayload {
  title: string;
  description: string;
  department_id?: string;
  class_id: string;
  subject_id: string;
  academic_year?: string;
  semester?: number;
  due_date: string;
  max_marks?: number;
  status?: AssignmentStatus;
  attachment_name?: string;
  attachment_url?: string;
}

export interface UpdateAssignmentPayload {
  title?: string;
  description?: string;
  due_date?: string;
  max_marks?: number;
  status?: AssignmentStatus;
  attachment_name?: string;
  attachment_url?: string;
}

export interface SubmitAssignmentPayload {
  submission_text?: string;
  attachment_name?: string;
  attachment_url?: string;
}

export interface GradeSubmissionPayload {
  marks: number;
  feedback?: string;
}

// ─── Notes & Study Material Management ─────────────────────
export type NoteCategory =
  | 'LECTURE_NOTES'
  | 'STUDY_MATERIAL'
  | 'PRACTICAL'
  | 'REFERENCE'
  | 'QUESTION_BANK'
  | 'SYLLABUS'
  | 'OTHER';

export type NoteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Note {
  id: string;
  title: string;
  description?: string | null;
  department_id: string;
  department_name?: string;
  department_code?: string;
  class_id: string;
  class_name?: string;
  division?: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  subject_credits?: number;
  uploaded_by: string;
  uploader_first_name?: string;
  uploader_last_name?: string;
  uploader_employee_id?: string;
  uploader_designation?: string;
  academic_year: string;
  semester: number;
  category: NoteCategory;
  status: NoteStatus;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StudentNote = Note;

export interface CreateNotePayload {
  title: string;
  description?: string;
  department_id?: string;
  class_id: string;
  subject_id: string;
  academic_year?: string;
  semester?: number;
  category: NoteCategory;
  status?: NoteStatus;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

export interface UpdateNotePayload {
  title?: string;
  description?: string;
  category?: NoteCategory;
  status?: NoteStatus;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

export interface NoteFilters {
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  category?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
}

// ─── Quizzes & Online Tests ─────────────────────────────────
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT' | 'GRADED';

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  option_order: number;
  is_correct?: boolean;
  created_at?: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  question_order: number;
  explanation?: string | null;
  options: QuizOption[];
  created_at?: string;
  updated_at?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  department_id: string;
  department_name?: string;
  department_code?: string;
  class_id: string;
  class_name?: string;
  division?: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  created_by: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  faculty_employee_id?: string;
  academic_year: string;
  semester: number;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  status: QuizStatus;
  start_at?: string | null;
  end_at?: string | null;
  total_questions?: number;
  total_attempts?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentQuiz extends Quiz {
  attempt_id?: string | null;
  attempt_status?: AttemptStatus | null;
  started_at?: string | null;
  submitted_at?: string | null;
  score?: number | null;
  percentage?: number | null;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string | null;
  status: AttemptStatus;
  score?: number | null;
  percentage?: number | null;
  created_at?: string;
  updated_at?: string;
  student_first_name?: string;
  student_last_name?: string;
  roll_number?: string;
  enrollment_number?: string;
  is_passed?: boolean;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id?: string | null;
  answer_text?: string | null;
  is_correct?: boolean | null;
  marks_awarded?: number | null;
  answered_at?: string;
}

export interface QuizStartResponse {
  attempt_id: string;
  quiz_id: string;
  started_at: string;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  questions: QuizQuestion[];
}

export interface QuizAttemptDetail {
  attempt: QuizAttempt;
  quiz: Partial<Quiz>;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: Partial<Quiz>;
  answers_count: number;
  correct_answers_count: number;
  is_passed: boolean;
}

export interface QuizAnalytics {
  total_students: number;
  started_count: number;
  submitted_count: number;
  timed_out_count: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  pass_count: number;
  fail_count: number;
  completion_percentage: number;
}

export interface CreateQuizPayload {
  title: string;
  description?: string;
  department_id?: string;
  class_id?: string;
  subject_id: string;
  academic_year?: string;
  semester?: number;
  duration_minutes: number;
  passing_marks?: number;
  start_at?: string | null;
  end_at?: string | null;
}

export interface UpdateQuizPayload {
  title?: string;
  description?: string | null;
  duration_minutes?: number;
  passing_marks?: number;
  start_at?: string | null;
  end_at?: string | null;
}

export interface CreateQuestionPayload {
  question_text: string;
  question_type: QuestionType;
  marks: number;
  question_order?: number;
  explanation?: string | null;
  options: Array<{
    option_text: string;
    option_order?: number;
    is_correct?: boolean;
  }>;
}

export interface QuizFilters {
  classId?: string;
  subjectId?: string;
  departmentId?: string;
  status?: string;
  academicYear?: string;
  semester?: number;
  search?: string;
}

// ─── Phase 4.8 Marks & Grades Types ─────────────────────────
export type ComponentType = 'ASSIGNMENT' | 'QUIZ' | 'INTERNAL' | 'PRACTICAL' | 'PROJECT' | 'OTHER';
export type MarkStatus = 'DRAFT' | 'PUBLISHED';
export type ResultStatus = 'DRAFT' | 'PUBLISHED';

export interface MarkComponent {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string;
  department_name?: string;
  department_code?: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  class_id: string;
  class_name?: string;
  division?: string;
  academic_year: string;
  semester: number;
  max_marks: number;
  weightage: number | null;
  component_type: ComponentType;
  created_by: string;
  faculty_first_name?: string;
  faculty_last_name?: string;
  marks_count?: number;
  published_marks_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StudentMark {
  id: string;
  student_id: string;
  component_id: string;
  marks_obtained: number;
  status: MarkStatus;
  remarks: string | null;
  entered_by: string;
  published_at: string | null;
  component_name?: string;
  component_code?: string;
  component_type?: ComponentType;
  max_marks?: number;
  weightage?: number | null;
  subject_id?: string;
  subject_name?: string;
  subject_code?: string;
  student_first_name?: string;
  student_last_name?: string;
  student_roll_number?: string;
  enrollment_number?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentSubjectResult {
  id: string;
  student_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  class_id: string;
  class_name?: string;
  division?: string;
  academic_year: string;
  semester: number;
  total_marks: number;
  max_marks: number;
  percentage: number;
  grade: string | null;
  grade_point: number | null;
  result_status: ResultStatus;
  published_at: string | null;
  student_first_name?: string;
  student_last_name?: string;
  student_roll_number?: string;
  enrollment_number?: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectComponentBreakdown {
  id: string;
  name: string;
  code: string;
  component_type: ComponentType;
  max_marks: number;
  weightage: number | null;
  marks_obtained: number | null;
  remarks: string | null;
  status: string;
}

export interface SubjectResultDetailResponse {
  subject: {
    id: string;
    name: string;
    code: string;
  };
  result: StudentSubjectResult;
  components: SubjectComponentBreakdown[];
}

export interface StudentOverallResults {
  academic_year: string;
  semester: number;
  overall: {
    total_marks: number;
    max_marks: number;
    percentage: number;
    grade: string;
    gpa: number;
    is_passed: boolean;
  };
  subjects: StudentSubjectResult[];
}

export interface MarksStats {
  total_components: number;
  total_marks_entered: number;
  published_marks: number;
  draft_marks: number;
}

export interface ResultsStats {
  total_results: number;
  published_results: number;
  draft_results: number;
  students_with_results: number;
  average_percentage: number;
  pass_count: number;
  fail_count: number;
}

// ─── Phase 4.9 Reports & Analytics Types ───────────────────

export interface StudentAcademicSummary {
  profile: {
    student_id: string;
    student_roll_number: string;
    first_name: string;
    last_name: string;
    email: string;
    department_name: string;
    department_code: string;
    class_name: string;
    division: string;
    academic_year: string;
    semester: number;
  };
  subjects: Array<{
    subject_id: string;
    subject_code: string;
    subject_name: string;
    credits: number;
    marks_obtained: number;
    max_marks: number;
    percentage: number;
    grade: string;
    grade_point: number;
    result_status: string;
    attendance: {
      conducted: number;
      present: number;
      late: number;
      absent: number;
      percentage: number;
      status: 'ELIGIBLE' | 'SHORTAGE';
    };
    assignments: {
      total: number;
      submitted: number;
      graded: number;
    };
    quizzes: {
      total: number;
      attempted: number;
      submitted: number;
      avg_score: number;
    };
  }>;
  overall_attendance: {
    conducted: number;
    present: number;
    late: number;
    absent: number;
    percentage: number;
  };
  overall_assignments: {
    total: number;
    submitted: number;
    pending: number;
    graded: number;
    late: number;
    submission_rate: number;
  };
  overall_quizzes: {
    total: number;
    attempted: number;
    submitted: number;
    timed_out: number;
    average_score: number;
  };
  overall_results: {
    total_subjects: number;
    published_results: number;
    total_marks: number;
    max_marks: number;
    percentage: number;
    gpa: number;
    grade: string;
    is_passed: boolean;
  };
}

export interface StudentAttendanceReport {
  summary: {
    conducted: number;
    present: number;
    late: number;
    absent: number;
    percentage: number;
    status: 'ELIGIBLE' | 'SHORTAGE';
  };
  by_subject: Array<{
    subject_id: string;
    subject_code: string;
    subject_name: string;
    conducted: number;
    present: number;
    late: number;
    absent: number;
    percentage: number;
    status: 'ELIGIBLE' | 'SHORTAGE';
  }>;
  recent_logs: Array<{
    id: string;
    subject_code: string;
    subject_name: string;
    date: string;
    status: string;
    remarks: string | null;
  }>;
}

export interface StudentAssignmentReport {
  summary: {
    total_assignments: number;
    submitted_count: number;
    pending_count: number;
    late_count: number;
    graded_count: number;
    submission_rate: number;
  };
  assignments: Array<{
    id: string;
    title: string;
    subject_code: string;
    subject_name: string;
    due_date: string;
    max_marks: number;
    submission_status: string;
    submitted_at: string | null;
    marks_obtained: number | null;
    feedback: string | null;
  }>;
}

export interface StudentQuizReport {
  summary: {
    total_quizzes: number;
    attempted_count: number;
    submitted_count: number;
    timed_out_count: number;
    average_score: number;
  };
  quizzes: Array<{
    id: string;
    title: string;
    subject_code: string;
    subject_name: string;
    total_marks: number;
    passing_marks: number;
    attempt_status: string;
    started_at: string | null;
    submitted_at: string | null;
    score: number | null;
    percentage: number | null;
    is_passed: boolean | null;
  }>;
}

export interface ClassAttendanceReport {
  class_info: any;
  summary: {
    total_students: number;
    average_attendance: number;
    eligible_count: number;
    shortage_count: number;
    eligible_percentage: number;
  };
  students: Array<{
    student_id: string;
    roll_number: string;
    first_name: string;
    last_name: string;
    conducted: number;
    present: number;
    late: number;
    absent: number;
    attendance_percentage: number;
    status: 'ELIGIBLE' | 'SHORTAGE';
  }>;
}

export interface ClassPerformanceReport {
  class_info: any;
  summary: {
    total_students: number;
    published_results: number;
    average_percentage: number;
    highest_percentage: number;
    lowest_percentage: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
  };
  results: Array<{
    result_id: string;
    student_id: string;
    roll_number: string;
    first_name: string;
    last_name: string;
    subject_id: string;
    subject_code: string;
    subject_name: string;
    total_marks: number;
    max_marks: number;
    percentage: number;
    grade: string;
    grade_point: number;
    result_status: string;
  }>;
}

export interface SubjectPerformanceReport {
  subject_info: any;
  metrics: {
    total_students: number;
    published_count: number;
    average_marks: number;
    maximum_marks: number;
    minimum_marks: number;
    average_percentage: number;
    pass_count: number;
    fail_count: number;
    pass_percentage: number;
  };
  grade_distribution: {
    O: number;
    'A+': number;
    A: number;
    'B+': number;
    B: number;
    C: number;
    P: number;
    F: number;
  };
}

export interface AssignmentAnalyticsReport {
  summary: {
    total_assignments: number;
    total_submissions: number;
    submitted_on_time: number;
    late_submissions: number;
    pending_submissions: number;
    graded_submissions: number;
    average_marks: number;
    overall_submission_rate: number;
  };
  assignments: Array<{
    id: string;
    title: string;
    subject_code: string;
    subject_name: string;
    class_name: string;
    due_date: string;
    max_marks: number;
    total_enrolled: number;
    submitted: number;
    late: number;
    pending: number;
    graded: number;
    average_marks: number;
    submission_rate: number;
  }>;
}

export interface QuizAnalyticsReport {
  summary: {
    total_quizzes: number;
    published_quizzes: number;
    closed_quizzes: number;
    draft_quizzes: number;
    total_attempts: number;
    submitted_attempts: number;
    timed_out_attempts: number;
    average_score: number;
    overall_pass_rate: number;
  };
  quizzes: Array<{
    id: string;
    title: string;
    subject_code: string;
    subject_name: string;
    class_name: string;
    status: string;
    total_marks: number;
    passing_marks: number;
    total_enrolled: number;
    total_attempts: number;
    submitted: number;
    timed_out: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_count: number;
    fail_count: number;
    completion_rate: number;
  }>;
}

export interface FacultyActivityReport {
  faculty_info: any;
  assigned_subjects: Array<{ id: string; code: string; name: string }>;
  assigned_classes: Array<{ id: string; name: string; division: string }>;
  activity: {
    attendance_sessions_marked: number;
    assignments_created: number;
    assignments_graded: number;
    notes_uploaded: number;
    notes_published: number;
    quizzes_created: number;
    quizzes_published: number;
    mark_components_configured: number;
    student_marks_entered: number;
    results_published: number;
  };
}

export interface DepartmentAcademicReport {
  departments: Array<{
    department_id: string;
    department_name: string;
    department_code: string;
    total_classes: number;
    total_students: number;
    total_subjects: number;
    total_faculty: number;
    average_attendance: number;
    average_marks_percentage: number;
    published_results: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
  }>;
}

export interface AdminInstitutionalAnalytics {
  counts: {
    total_students: number;
    total_staff: number;
    total_departments: number;
    total_classes: number;
    total_subjects: number;
  };
  academic_performance: {
    published_results: number;
    draft_results: number;
    average_percentage: number;
    pass_count: number;
    fail_count: number;
    overall_pass_rate: number;
  };
  attendance: {
    average_attendance: number;
    students_below_threshold: number;
    students_eligible: number;
  };
  assignments: {
    total_assignments: number;
    total_submissions: number;
    submission_rate: number;
    late_submission_rate: number;
  };
  quizzes: {
    total_quizzes: number;
    published_quizzes: number;
    total_attempts: number;
    average_quiz_score: number;
  };
  notes: {
    total_notes: number;
    published_notes: number;
  };
}
