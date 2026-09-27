/**
 * Security Event Types — Architectural Interface
 * ================================================
 * These interfaces define the structure for security events
 * that the ERP will generate for SOC CoPilot consumption.
 */

// ─── User Roles ───────────────────────────────────────────
export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

// ─── Event Result ─────────────────────────────────────────
export type EventResult = 'SUCCESS' | 'FAILURE' | 'DENIED';

// ─── Authentication Event Types ───────────────────────────
export type AuthEventType =
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGE'
  | 'SESSION_CREATED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED';

// ─── Academic Structure Event Types ───────────────────────
export type AcademicEventType =
  | 'DEPARTMENT_VIEW'
  | 'DEPARTMENT_CREATE'
  | 'DEPARTMENT_UPDATE'
  | 'DEPARTMENT_DELETE'
  | 'CLASS_VIEW'
  | 'CLASS_CREATE'
  | 'CLASS_UPDATE'
  | 'CLASS_DELETE'
  | 'SUBJECT_VIEW'
  | 'SUBJECT_CREATE'
  | 'SUBJECT_UPDATE'
  | 'SUBJECT_DELETE'
  | 'STUDENT_VIEW'
  | 'STUDENT_CREATE'
  | 'STUDENT_UPDATE'
  | 'STUDENT_DISABLE'
  | 'STUDENT_ENABLE'
  | 'STAFF_VIEW'
  | 'STAFF_CREATE'
  | 'STAFF_UPDATE'
  | 'STAFF_DISABLE'
  | 'STAFF_ENABLE'
  | 'STAFF_SUBJECT_ASSIGN'
  | 'STAFF_SUBJECT_REMOVE'
  | 'STUDENT_CLASS_ASSIGN'
  | 'STUDENT_CLASS_REMOVE'
  | 'TIMETABLE_VIEW'
  | 'TIMETABLE_CREATE'
  | 'TIMETABLE_UPDATE'
  | 'TIMETABLE_DELETE';

// ─── Activity Event Types ─────────────────────────────────
export type ActivityEventType =
  | 'DASHBOARD_VIEW'
  | 'PROFILE_VIEW'
  | 'PROFILE_UPDATE'
  | 'PROFILE_PHOTO_UPDATE'
  | 'ATTENDANCE_VIEW'
  | 'ATTENDANCE_MARK'
  | 'ATTENDANCE_UPDATE'
  | 'ATTENDANCE_DELETE'
  | 'ASSIGNMENT_VIEW'
  | 'ASSIGNMENT_CREATE'
  | 'ASSIGNMENT_DOWNLOAD'
  | 'ASSIGNMENT_UPLOAD'
  | 'ASSIGNMENT_SUBMIT'
  | 'ASSIGNMENT_UPDATE'
  | 'ASSIGNMENT_DELETE'
  | 'ASSIGNMENT_GRADE'
  | 'NOTE_VIEW'
  | 'NOTE_CREATE'
  | 'NOTE_UPDATE'
  | 'NOTE_DOWNLOAD'
  | 'NOTE_UPLOAD'
  | 'NOTE_DELETE'
  | 'QUIZ_VIEW'
  | 'QUIZ_CREATE'
  | 'QUIZ_UPDATE'
  | 'QUIZ_DELETE'
  | 'QUIZ_PUBLISH'
  | 'QUIZ_CLOSE'
  | 'QUIZ_START'
  | 'QUESTION_VIEW'
  | 'QUIZ_QUESTION_VIEW'
  | 'ANSWER_SUBMIT'
  | 'QUIZ_ANSWER_SUBMIT'
  | 'QUIZ_SUBMIT'
  | 'QUIZ_TIMEOUT'
  | 'QUIZ_RESULT_VIEW'
  | 'MARK_COMPONENT_VIEW'
  | 'MARK_COMPONENT_CREATE'
  | 'MARK_COMPONENT_UPDATE'
  | 'MARK_COMPONENT_DELETE'
  | 'MARK_VIEW'
  | 'MARK_CREATE'
  | 'MARK_UPDATE'
  | 'MARK_PUBLISH'
  | 'RESULT_VIEW'
  | 'RESULT_CALCULATE'
  | 'RESULT_PUBLISH'
  | 'RESULT_ACCESS_DENIED'
  | 'MARKS_VIEW'
  | 'MARKS_UPLOAD'
  | 'MARKS_UPDATE'
  | 'REPORT_VIEW'
  | 'REPORT_DOWNLOAD'
  | 'REPORT_GENERATE'
  | 'REPORT_EXPORT'
  | 'REPORT_FILTER'
  | 'REPORT_PRINT'
  | 'NOTICE_VIEW'
  | 'NOTICE_CREATE'
  | 'NOTICE_UPDATE'
  | 'NOTICE_DELETE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DISABLE'
  | 'USER_ENABLE'
  | 'CHANGE_ROLE'
  | 'RESET_PASSWORD'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

// ─── Honeypot Event Types ─────────────────────────────────
export type HoneypotEventType =
  | 'HONEYPOT_SESSION_STARTED'
  | 'HONEYPOT_PAGE_VIEW'
  | 'HONEYPOT_RESOURCE_ACCESS'
  | 'HONEYPOT_DOWNLOAD_ATTEMPT'
  | 'HONEYPOT_ACTION'
  | 'HONEYPOT_SESSION_ENDED';

// ─── Combined Event Type ──────────────────────────────────
export type SecurityEventType =
  | AuthEventType
  | AcademicEventType
  | ActivityEventType
  | HoneypotEventType;

// ─── Resource Types ───────────────────────────────────────
export type ResourceType =
  | 'USER'
  | 'STUDENT'
  | 'STAFF'
  | 'DEPARTMENT'
  | 'SUBJECT'
  | 'CLASS'
  | 'ATTENDANCE'
  | 'ASSIGNMENT'
  | 'SUBMISSION'
  | 'NOTE'
  | 'QUIZ'
  | 'QUESTION'
  | 'OPTION'
  | 'ATTEMPT'
  | 'ANSWER'
  | 'MARK_COMPONENT'
  | 'MARK'
  | 'RESULT'
  | 'MARKS'
  | 'NOTICE'
  | 'TIMETABLE'
  | 'REPORT'
  | 'STUDENT_REPORT'
  | 'CLASS_REPORT'
  | 'SUBJECT_REPORT'
  | 'DEPARTMENT_REPORT'
  | 'SESSION'
  | 'PROFILE';

// ─── Security Event ──────────────────────────────────────
export interface SecurityEvent {
  event_id: string;
  user_id: string;
  role: UserRole;
  event_type: SecurityEventType;
  resource_type?: ResourceType;
  resource_id?: string;
  endpoint: string;
  method: string;
  result: EventResult;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Behavioural Features (for future AI/ML) ─────────────
export interface BehaviouralFeatures {
  user_id: string;
  session_id: string;
  failed_login_count: number;
  successful_login_count: number;
  request_count: number;
  requests_per_minute: number;
  unique_endpoints: number;
  unique_resources: number;
  file_download_count: number;
  file_upload_count: number;
  sensitive_resource_access_count: number;
  unauthorized_attempt_count: number;
  session_duration: number;
  password_reset_count: number;
  profile_change_count: number;
}
