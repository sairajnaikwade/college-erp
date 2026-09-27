import { useState, useEffect } from 'react';
import {
  FileText,
  BarChart3,
  AlertTriangle,
  Printer,
  Search,
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  HelpCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import { reportService } from '../services/reportService';
import type {
  ApiResponse,
  StudentAcademicSummary,
  StudentAttendanceReport,
  StudentAssignmentReport,
  StudentQuizReport,
  ClassAttendanceReport,
  ClassPerformanceReport,
  SubjectPerformanceReport,
  AssignmentAnalyticsReport,
  QuizAnalyticsReport,
  FacultyActivityReport,
  DepartmentAcademicReport,
  AdminInstitutionalAnalytics,
} from '../types';

interface ClassOption {
  id: string;
  name: string;
  year?: number;
  semester?: number;
  division?: string;
  academic_year?: string;
}

interface SubjectOption {
  id: string;
  code: string;
  name: string;
  semester?: number;
}

export function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  // Global UI states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Student State
  const [studentSummary, setStudentSummary] = useState<StudentAcademicSummary | null>(null);
  const [studentAttReport, setStudentAttReport] = useState<StudentAttendanceReport | null>(null);
  const [studentAssignReport, setStudentAssignReport] = useState<StudentAssignmentReport | null>(null);
  const [studentQuizReport, setStudentQuizReport] = useState<StudentQuizReport | null>(null);
  const [studentActiveTab, setStudentActiveTab] = useState<'SCORECARD' | 'ATTENDANCE' | 'ASSIGNMENTS' | 'QUIZZES'>('SCORECARD');

  // Staff State
  const [staffTab, setStaffTab] = useState<'CLASS_ATTENDANCE' | 'CLASS_PERFORMANCE' | 'SUBJECT_PERFORMANCE' | 'ASSIGNMENT_ANALYTICS' | 'QUIZ_ANALYTICS' | 'ACTIVITY'>('CLASS_ATTENDANCE');
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [classAttReport, setClassAttReport] = useState<ClassAttendanceReport | null>(null);
  const [classPerfReport, setClassPerfReport] = useState<ClassPerformanceReport | null>(null);
  const [subjectPerfReport, setSubjectPerfReport] = useState<SubjectPerformanceReport | null>(null);
  const [assignAnalytics, setAssignAnalytics] = useState<AssignmentAnalyticsReport | null>(null);
  const [quizAnalytics, setQuizAnalytics] = useState<QuizAnalyticsReport | null>(null);
  const [facultyActivity, setFacultyActivity] = useState<FacultyActivityReport | null>(null);

  // Admin State
  const [adminTab, setAdminTab] = useState<'INSTITUTION' | 'DEPARTMENTS' | 'ATTENDANCE_OVERVIEW' | 'ASSIGNMENTS_OVERVIEW' | 'QUIZZES_OVERVIEW'>('INSTITUTION');
  const [adminAnalytics, setAdminAnalytics] = useState<AdminInstitutionalAnalytics | null>(null);
  const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAcademicReport | null>(null);

  // Search & Date filters
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Data Fetching ─────────────────────────────────────────

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (role === 'STUDENT') {
        const [sumRes, attRes, assignRes, qzRes] = await Promise.all([
          reportService.getStudentSummary(),
          reportService.getStudentAttendance(),
          reportService.getStudentAssignments(),
          reportService.getStudentQuizzes(),
        ]);
        setStudentSummary(sumRes);
        setStudentAttReport(attRes);
        setStudentAssignReport(assignRes);
        setStudentQuizReport(qzRes);
      } else if (role === 'STAFF') {
        const [clsRes, subRes, actRes, assignRes, qzRes] = await Promise.all([
          apiClient.get<ApiResponse<ClassOption[]>>('/classes'),
          apiClient.get<ApiResponse<SubjectOption[]>>('/subjects'),
          reportService.getFacultyActivity(),
          reportService.getAssignmentAnalytics(),
          reportService.getQuizAnalytics(),
        ]);
        const classes = clsRes.data.data || [];
        const subjects = subRes.data.data || [];
        setClassesList(classes);
        setSubjectsList(subjects);
        setFacultyActivity(actRes);
        setAssignAnalytics(assignRes);
        setQuizAnalytics(qzRes);

        const initialClassId = classes[0]?.id || '';
        const initialSubjectId = subjects[0]?.id || '';
        setSelectedClassId(initialClassId);
        setSelectedSubjectId(initialSubjectId);

        if (initialClassId) {
          const [attRes, perfRes] = await Promise.all([
            reportService.getClassAttendance(initialClassId),
            reportService.getClassPerformance(initialClassId),
          ]);
          setClassAttReport(attRes);
          setClassPerfReport(perfRes);
        }

        if (initialSubjectId) {
          const subPerf = await reportService.getSubjectPerformance(initialSubjectId);
          setSubjectPerfReport(subPerf);
        }
      } else if (role === 'ADMIN') {
        const [instRes, deptRes, clsRes, subRes, assignRes, qzRes] = await Promise.all([
          reportService.getInstitutionalAnalytics(),
          reportService.getDepartmentAnalytics(),
          apiClient.get<ApiResponse<ClassOption[]>>('/classes'),
          apiClient.get<ApiResponse<SubjectOption[]>>('/subjects'),
          reportService.getAssignmentAnalytics(),
          reportService.getQuizAnalytics(),
        ]);
        const classes = clsRes.data.data || [];
        const subjects = subRes.data.data || [];
        setAdminAnalytics(instRes);
        setDeptAnalytics(deptRes);
        setClassesList(classes);
        setSubjectsList(subjects);
        setAssignAnalytics(assignRes);
        setQuizAnalytics(qzRes);

        if (classes[0]?.id) {
          setSelectedClassId(classes[0].id);
          const attRes = await reportService.getClassAttendance(classes[0].id);
          setClassAttReport(attRes);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  // Handle Staff Class Change
  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    if (!classId) return;
    try {
      setLoading(true);
      const [attRes, perfRes] = await Promise.all([
        reportService.getClassAttendance(classId, { subjectId: selectedSubjectId || undefined }),
        reportService.getClassPerformance(classId, { subjectId: selectedSubjectId || undefined }),
      ]);
      setClassAttReport(attRes);
      setClassPerfReport(perfRes);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load class report');
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Subject Change
  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (!subjectId) return;
    try {
      setLoading(true);
      const subPerf = await reportService.getSubjectPerformance(subjectId, {
        classId: selectedClassId || undefined,
      });
      setSubjectPerfReport(subPerf);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subject report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !studentSummary && !adminAnalytics && !classAttReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Generating live academic reports & analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* ─── Top Header & Controls ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm print:shadow-none print:border-none print:p-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Reports & Analytics</h1>
              <p className="text-sm text-slate-500">
                {role === 'STUDENT' && 'Comprehensive academic scorecard, attendance records, assignments and quiz performance'}
                {role === 'STAFF' && 'Course analytics, student roster attendance, performance grading and faculty activities'}
                {role === 'ADMIN' && 'Institutional KPIs, department summaries, attendance compliance and examination analytics'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-100"
          >
            <Printer className="w-4 h-4" />
            Print / Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── 1. STUDENT VIEW ─────────────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {role === 'STUDENT' && studentSummary && (
        <div className="space-y-6">
          {/* Student Profile & Key Metrics Banner */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 mb-3">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Academic Year {studentSummary.profile.academic_year} • Semester {studentSummary.profile.semester}
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  {studentSummary.profile.first_name} {studentSummary.profile.last_name}
                </h2>
                <p className="text-sm text-indigo-200 mt-1">
                  Roll No: <span className="text-white font-mono font-bold">{studentSummary.profile.student_roll_number}</span> • Class: <span className="text-white font-semibold">{studentSummary.profile.class_name} (Div {studentSummary.profile.division})</span> • Dept: <span className="text-white font-semibold">{studentSummary.profile.department_name} ({studentSummary.profile.department_code})</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                <div className="bg-white/10 backdrop-blur-md px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-white/10 text-center flex-1 min-w-[85px] sm:min-w-[110px]">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-indigo-200 font-semibold">Semester GPA</p>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">{studentSummary.overall_results.gpa.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-white/10 text-center flex-1 min-w-[85px] sm:min-w-[110px]">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-indigo-200 font-semibold">Grade</p>
                  <p className="text-2xl sm:text-3xl font-black text-amber-300 mt-0.5">{studentSummary.overall_results.grade || 'N/A'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-white/10 text-center flex-1 min-w-[85px] sm:min-w-[110px]">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-indigo-200 font-semibold">Attendance</p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-0.5">{studentSummary.overall_attendance.percentage.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Subjects Evaluated</span>
                <BookOpen className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {studentSummary.overall_results.published_results} / {studentSummary.overall_results.total_subjects}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Published Results</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Attendance Status</span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {studentSummary.overall_attendance.present + studentSummary.overall_attendance.late} / {studentSummary.overall_attendance.conducted}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-block w-2 h-2 rounded-full ${studentSummary.overall_attendance.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-xs font-semibold text-slate-700">
                  {studentSummary.overall_attendance.percentage >= 75 ? 'ELIGIBLE (≥75%)' : 'SHORTAGE (<75%)'}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Assignments</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {studentSummary.overall_assignments.submitted} / {studentSummary.overall_assignments.total}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {studentSummary.overall_assignments.submission_rate.toFixed(0)}% Submission Rate
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Online Quizzes</span>
                <HelpCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {studentSummary.overall_quizzes.submitted} / {studentSummary.overall_quizzes.total}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Avg Score: {studentSummary.overall_quizzes.average_score.toFixed(1)} pts
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
            <button
              onClick={() => setStudentActiveTab('SCORECARD')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                studentActiveTab === 'SCORECARD'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Academic Scorecard
            </button>
            <button
              onClick={() => setStudentActiveTab('ATTENDANCE')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                studentActiveTab === 'ATTENDANCE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Attendance Breakdown
            </button>
            <button
              onClick={() => setStudentActiveTab('ASSIGNMENTS')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                studentActiveTab === 'ASSIGNMENTS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Assignment Records
            </button>
            <button
              onClick={() => setStudentActiveTab('QUIZZES')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                studentActiveTab === 'QUIZZES'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Quiz Results
            </button>
          </div>

          {/* 1.1 Academic Scorecard Tab */}
          {studentActiveTab === 'SCORECARD' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Subject-wise Academic Performance</h3>
                <span className="text-xs font-medium text-slate-500">Authoritative Evaluation Data</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4 text-center">Credits</th>
                      <th className="py-3.5 px-4 text-center">Marks Obtained</th>
                      <th className="py-3.5 px-4 text-center">Percentage</th>
                      <th className="py-3.5 px-4 text-center">Grade</th>
                      <th className="py-3.5 px-4 text-center">Attendance</th>
                      <th className="py-3.5 px-4 text-center">Assignments</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {studentSummary.subjects.map((sub) => (
                      <tr key={sub.subject_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-indigo-600 text-xs px-2 py-0.5 bg-indigo-50 rounded mr-2">
                            {sub.subject_code}
                          </span>
                          <span className="font-semibold text-slate-900">{sub.subject_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-600 font-medium">{sub.credits}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {sub.result_status === 'PUBLISHED' ? `${sub.marks_obtained} / ${sub.max_marks}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                          {sub.result_status === 'PUBLISHED' ? `${sub.percentage.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {sub.result_status === 'PUBLISHED' ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {sub.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Pending</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              sub.attendance.percentage >= 75
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {sub.attendance.percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                          {sub.assignments.submitted} / {sub.assignments.total}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              sub.result_status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.result_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 1.2 Attendance Report Tab */}
          {studentActiveTab === 'ATTENDANCE' && studentAttReport && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900">Subject Attendance Summary</h3>
                  <span className="text-xs font-semibold text-slate-500">Threshold: 75.0%</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-4">Subject</th>
                        <th className="py-3.5 px-4 text-center">Conducted</th>
                        <th className="py-3.5 px-4 text-center">Present</th>
                        <th className="py-3.5 px-4 text-center">Late</th>
                        <th className="py-3.5 px-4 text-center">Absent</th>
                        <th className="py-3.5 px-4 text-center">Attendance %</th>
                        <th className="py-3.5 px-4 text-center">Compliance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {studentAttReport.by_subject.map((sub) => (
                        <tr key={sub.subject_id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-indigo-600 text-xs px-2 py-0.5 bg-indigo-50 rounded mr-2">
                              {sub.subject_code}
                            </span>
                            <span className="font-semibold text-slate-900">{sub.subject_name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{sub.conducted}</td>
                          <td className="py-3.5 px-4 text-center text-emerald-600 font-semibold">{sub.present}</td>
                          <td className="py-3.5 px-4 text-center text-amber-600 font-semibold">{sub.late}</td>
                          <td className="py-3.5 px-4 text-center text-rose-600 font-semibold">{sub.absent}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">{sub.percentage.toFixed(2)}%</td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                sub.status === 'ELIGIBLE'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 1.3 Assignment Report Tab */}
          {studentActiveTab === 'ASSIGNMENTS' && studentAssignReport && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Course Assignments Breakdown</h3>
                <span className="text-xs font-medium text-slate-500">
                  {studentAssignReport.summary.submitted_count} Submitted • {studentAssignReport.summary.pending_count} Pending
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Assignment Title</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Due Date</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Score</th>
                      <th className="py-3.5 px-4">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {studentAssignReport.assignments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{item.title}</td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          <span className="font-mono font-bold text-indigo-600 mr-1">{item.subject_code}</span>
                          {item.subject_name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {new Date(item.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.submission_status === 'GRADED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.submission_status === 'SUBMITTED'
                                ? 'bg-indigo-100 text-indigo-800'
                                : item.submission_status === 'LATE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.submission_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {item.marks_obtained !== null ? `${item.marks_obtained} / ${item.max_marks}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 italic max-w-xs truncate">
                          {item.feedback || 'No remarks provided'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 1.4 Quiz Report Tab */}
          {studentActiveTab === 'QUIZZES' && studentQuizReport && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Online Quiz Evaluation</h3>
                <span className="text-xs font-medium text-slate-500">
                  Avg Score: {studentQuizReport.summary.average_score.toFixed(1)} pts
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Quiz Title</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4 text-center">Attempt Status</th>
                      <th className="py-3.5 px-4 text-center">Score</th>
                      <th className="py-3.5 px-4 text-center">Percentage</th>
                      <th className="py-3.5 px-4 text-center">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {studentQuizReport.quizzes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{q.title}</td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          <span className="font-mono font-bold text-indigo-600 mr-1">{q.subject_code}</span>
                          {q.subject_name}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              q.attempt_status === 'SUBMITTED' || q.attempt_status === 'GRADED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : q.attempt_status === 'TIMED_OUT'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {q.attempt_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {q.score !== null ? `${q.score} / ${q.total_marks}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                          {q.percentage !== null ? `${q.percentage.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {q.is_passed !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                q.is_passed ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                              }`}
                            >
                              {q.is_passed ? 'PASSED' : 'FAILED'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── 2. STAFF VIEW ───────────────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {role === 'STAFF' && (
        <div className="space-y-6">
          {/* Staff Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-4 print:hidden">
            <div className="w-full sm:flex-1 min-w-0 sm:min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Div {c.division}) • Sem {c.semester}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:flex-1 min-w-0 sm:min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Select Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {subjectsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:flex-1 min-w-0 sm:min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Search Student / Code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter roster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Staff Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
            <button
              onClick={() => setStaffTab('CLASS_ATTENDANCE')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                staffTab === 'CLASS_ATTENDANCE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Class Attendance (75% Threshold)
            </button>
            <button
              onClick={() => setStaffTab('CLASS_PERFORMANCE')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                staffTab === 'CLASS_PERFORMANCE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Class Performance Roster
            </button>
            <button
              onClick={() => setStaffTab('SUBJECT_PERFORMANCE')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                staffTab === 'SUBJECT_PERFORMANCE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Subject Grade Distribution
            </button>
            <button
              onClick={() => setStaffTab('ASSIGNMENT_ANALYTICS')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                staffTab === 'ASSIGNMENT_ANALYTICS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Assignment Analytics
            </button>
            <button
              onClick={() => setStaffTab('QUIZ_ANALYTICS')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                staffTab === 'QUIZ_ANALYTICS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Quiz Analytics
            </button>
            <button
              onClick={() => setStaffTab('ACTIVITY')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                staffTab === 'ACTIVITY' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Activity Summary
            </button>
          </div>

          {/* 2.1 Staff: Class Attendance Roster */}
          {staffTab === 'CLASS_ATTENDANCE' && classAttReport && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Enrolled Students</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{classAttReport.summary.total_students}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Class Average</span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {classAttReport.summary.average_attendance.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-600 uppercase">Eligible (≥ 75%)</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{classAttReport.summary.eligible_count}</div>
                  <span className="text-xs text-slate-500">{classAttReport.summary.eligible_percentage.toFixed(0)}% of class</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-rose-600 uppercase">Shortage (&lt; 75%)</span>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{classAttReport.summary.shortage_count}</div>
                  <span className="text-xs text-slate-500">Requires attendance warning</span>
                </div>
              </div>

              {/* Roster Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900">Class Attendance Verification Roster</h3>
                  <span className="text-xs font-semibold text-slate-500">Threshold: 75.00%</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-4">Roll Number</th>
                        <th className="py-3.5 px-4">Student Name</th>
                        <th className="py-3.5 px-4 text-center">Conducted</th>
                        <th className="py-3.5 px-4 text-center">Present</th>
                        <th className="py-3.5 px-4 text-center">Late</th>
                        <th className="py-3.5 px-4 text-center">Absent</th>
                        <th className="py-3.5 px-4 text-center">Attendance %</th>
                        <th className="py-3.5 px-4 text-center">Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {classAttReport.students
                        .filter(
                          (s) =>
                            s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((st) => (
                          <tr key={st.student_id} className="hover:bg-slate-50/80">
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{st.roll_number}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              {st.first_name} {st.last_name}
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium text-slate-700">{st.conducted}</td>
                            <td className="py-3.5 px-4 text-center text-emerald-600 font-semibold">{st.present}</td>
                            <td className="py-3.5 px-4 text-center text-amber-600 font-semibold">{st.late}</td>
                            <td className="py-3.5 px-4 text-center text-rose-600 font-semibold">{st.absent}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                              {st.attendance_percentage.toFixed(2)}%
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  st.status === 'ELIGIBLE'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2.2 Staff: Class Performance Roster */}
          {staffTab === 'CLASS_PERFORMANCE' && classPerfReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Published Results</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {classPerfReport.summary.published_results}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Average Percentage</span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {classPerfReport.summary.average_percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-600 uppercase">Pass Rate</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {classPerfReport.summary.pass_rate.toFixed(1)}%
                  </div>
                  <span className="text-xs text-slate-500">{classPerfReport.summary.pass_count} passed</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Range (High / Low)</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {classPerfReport.summary.highest_percentage.toFixed(0)}% / {classPerfReport.summary.lowest_percentage.toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-900">Student Results Roster</h3>
                  <span className="text-xs font-medium text-slate-500">Live PostgreSQL Results</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-4">Roll Number</th>
                        <th className="py-3.5 px-4">Student</th>
                        <th className="py-3.5 px-4">Subject</th>
                        <th className="py-3.5 px-4 text-center">Marks</th>
                        <th className="py-3.5 px-4 text-center">Percentage</th>
                        <th className="py-3.5 px-4 text-center">Grade</th>
                        <th className="py-3.5 px-4 text-center">Grade Point</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {classPerfReport.results.map((r) => (
                        <tr key={r.result_id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{r.roll_number}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {r.first_name} {r.last_name}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-700">
                            <span className="font-mono font-bold text-indigo-600 mr-1">{r.subject_code}</span>
                            {r.subject_name}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            {r.total_marks} / {r.max_marks}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                            {r.percentage.toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {r.grade}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">{r.grade_point}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                r.result_status === 'PUBLISHED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.result_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2.3 Staff: Subject Performance & Grade Distribution */}
          {staffTab === 'SUBJECT_PERFORMANCE' && subjectPerfReport && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4">Grade Distribution for {subjectPerfReport.subject_info?.code}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {(['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'] as const).map((grade) => (
                    <div
                      key={grade}
                      className={`p-4 rounded-xl border text-center ${
                        grade === 'F'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider block text-slate-500">Grade {grade}</span>
                      <span className="text-2xl font-black mt-1 block">
                        {subjectPerfReport.grade_distribution[grade] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2.4 Staff: Assignment Analytics */}
          {staffTab === 'ASSIGNMENT_ANALYTICS' && assignAnalytics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Assignments</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{assignAnalytics.summary.total_assignments}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Submission Rate</span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {assignAnalytics.summary.overall_submission_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Submissions Graded</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {assignAnalytics.summary.graded_submissions}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Average Score</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {assignAnalytics.summary.average_marks.toFixed(1)} pts
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900">Assignment Submission Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-4">Title</th>
                        <th className="py-3.5 px-4">Subject</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4 text-center">Enrolled</th>
                        <th className="py-3.5 px-4 text-center">Submitted</th>
                        <th className="py-3.5 px-4 text-center">Late</th>
                        <th className="py-3.5 px-4 text-center">Pending</th>
                        <th className="py-3.5 px-4 text-center">Avg Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {assignAnalytics.assignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{a.title}</td>
                          <td className="py-3.5 px-4 text-xs font-mono font-bold text-indigo-600">{a.subject_code}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">{a.class_name}</td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">{a.total_enrolled}</td>
                          <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{a.submitted}</td>
                          <td className="py-3.5 px-4 text-center text-amber-600 font-semibold">{a.late}</td>
                          <td className="py-3.5 px-4 text-center text-slate-500">{a.pending}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            {a.average_marks} / {a.max_marks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2.5 Staff: Quiz Analytics */}
          {staffTab === 'QUIZ_ANALYTICS' && quizAnalytics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Quizzes</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{quizAnalytics.summary.total_quizzes}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Attempts</span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">{quizAnalytics.summary.total_attempts}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Pass Rate</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    {quizAnalytics.summary.overall_pass_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Average Score</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {quizAnalytics.summary.average_score.toFixed(1)} pts
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900">Quiz Completion & Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3.5 px-4">Quiz Title</th>
                        <th className="py-3.5 px-4">Subject</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4 text-center">Attempts</th>
                        <th className="py-3.5 px-4 text-center">Pass / Fail</th>
                        <th className="py-3.5 px-4 text-center">Average Score</th>
                        <th className="py-3.5 px-4 text-center">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {quizAnalytics.quizzes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{q.title}</td>
                          <td className="py-3.5 px-4 text-xs font-mono font-bold text-indigo-600">{q.subject_code}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">{q.class_name}</td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">{q.total_attempts}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-emerald-700 font-bold">{q.pass_count}</span> /{' '}
                            <span className="text-rose-700 font-bold">{q.fail_count}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            {q.average_score} / {q.total_marks}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-indigo-600">
                            {q.completion_rate.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2.6 Staff: Faculty Activity Summary */}
          {staffTab === 'ACTIVITY' && facultyActivity && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {facultyActivity.faculty_info?.first_name?.[0]}
                  {facultyActivity.faculty_info?.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {facultyActivity.faculty_info?.first_name} {facultyActivity.faculty_info?.last_name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {facultyActivity.faculty_info?.designation} • Employee ID: {facultyActivity.faculty_info?.employee_id} • {facultyActivity.faculty_info?.department_name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Attendance Sessions</span>
                  <span className="text-2xl font-bold text-slate-900 block mt-1">
                    {facultyActivity.activity.attendance_sessions_marked}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Assignments Created</span>
                  <span className="text-2xl font-bold text-slate-900 block mt-1">
                    {facultyActivity.activity.assignments_created}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Notes Published</span>
                  <span className="text-2xl font-bold text-slate-900 block mt-1">
                    {facultyActivity.activity.notes_published}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Results Published</span>
                  <span className="text-2xl font-bold text-slate-900 block mt-1">
                    {facultyActivity.activity.results_published}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ─── 3. ADMIN VIEW ───────────────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {role === 'ADMIN' && adminAnalytics && (
        <div className="space-y-6">
          {/* Institutional KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Students</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{adminAnalytics.counts.total_students}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Faculty</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{adminAnalytics.counts.total_staff}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Departments</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{adminAnalytics.counts.total_departments}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Classes / Batches</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{adminAnalytics.counts.total_classes}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase">Courses / Subjects</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{adminAnalytics.counts.total_subjects}</div>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
            <button
              onClick={() => setAdminTab('INSTITUTION')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                adminTab === 'INSTITUTION' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Institutional Overview
            </button>
            <button
              onClick={() => setAdminTab('DEPARTMENTS')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                adminTab === 'DEPARTMENTS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Department Analytics
            </button>
          </div>

          {/* 3.1 Institutional Overview */}
          {adminTab === 'INSTITUTION' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Academic Performance Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Academic Performance & Results
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {adminAnalytics.academic_performance.overall_pass_rate.toFixed(1)}% Pass Rate
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <span className="text-xs text-slate-500 font-semibold">Published Results</span>
                    <span className="text-xl font-bold text-slate-900 block mt-1">
                      {adminAnalytics.academic_performance.published_results}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <span className="text-xs text-slate-500 font-semibold">Institution Average</span>
                    <span className="text-xl font-bold text-indigo-600 block mt-1">
                      {adminAnalytics.academic_performance.average_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <span className="text-xs text-slate-500 font-semibold">Pass / Fail</span>
                    <span className="text-xl font-bold text-slate-900 block mt-1">
                      {adminAnalytics.academic_performance.pass_count} / {adminAnalytics.academic_performance.fail_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Compliance Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Attendance Compliance
                  </h3>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {adminAnalytics.attendance.average_attendance.toFixed(1)}% Campus Avg
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-xs text-emerald-700 font-semibold">Eligible Students (≥ 75%)</span>
                    <span className="text-xl font-bold text-emerald-900 block mt-1">
                      {adminAnalytics.attendance.students_eligible}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="text-xs text-rose-700 font-semibold">Attendance Shortage (&lt; 75%)</span>
                    <span className="text-xl font-bold text-rose-900 block mt-1">
                      {adminAnalytics.attendance.students_below_threshold}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3.2 Department Academic Table */}
          {adminTab === 'DEPARTMENTS' && deptAnalytics && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-900">Department Performance & Metrics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4 text-center">Classes</th>
                      <th className="py-3.5 px-4 text-center">Students</th>
                      <th className="py-3.5 px-4 text-center">Faculty</th>
                      <th className="py-3.5 px-4 text-center">Avg Attendance</th>
                      <th className="py-3.5 px-4 text-center">Avg Marks</th>
                      <th className="py-3.5 px-4 text-center">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {deptAnalytics.departments.map((d) => (
                      <tr key={d.department_id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <span className="font-mono text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded mr-2">
                            {d.department_code}
                          </span>
                          {d.department_name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">{d.total_classes}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">{d.total_students}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-700">{d.total_faculty}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {d.average_attendance.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                          {d.average_marks_percentage.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold text-xs">
                            {d.pass_rate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
