import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  ClipboardList,
  FileText,
  BookOpen,
  Award,
  Clock,
  Megaphone,
  User,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  Sparkles,
  Compass,
  Rocket,
  Layers,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import { noticeService } from '../services/noticeService';
import { timetableService } from '../services/timetableService';
import { attendanceService } from '../services/attendanceService';
import { assignmentService } from '../services/assignmentService';
import { noteService } from '../services/noteService';
import { quizService } from '../services/quizService';
import { marksService } from '../services/marksService';
import { useAuth } from '../hooks/useAuth';
import type { Notice, TimetableEntry, OverallAttendanceSummary, StudentAssignment, StudentQuiz, StudentOverallResults } from '../types';

interface AcademicModule {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: any;
  color: string;
  badge?: string;
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [searchModule, setSearchModule] = useState('');
  const [visionOpen, setVisionOpen] = useState(true);
  const [missionOpen, setMissionOpen] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);

  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  const [attendanceSummary, setAttendanceSummary] = useState<OverallAttendanceSummary | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [academicResults, setAcademicResults] = useState<StudentOverallResults | null>(null);

  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
  const currentDay = dayNames[new Date().getDay()];
  const currentWeekdayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoadingSchedule(true);
        // If Sunday, fetch Monday as preview or current day
        const dayToFetch = currentDay === 'SUNDAY' ? 'MONDAY' : currentDay;
        const slots = await timetableService.getStudentTimetable({ day_of_week: dayToFetch });
        if (isMounted) {
          setTodaySchedule(slots);
        }
      } catch {
        // Non-blocking
      } finally {
        if (isMounted) {
          setIsLoadingSchedule(false);
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentDay]);

  useEffect(() => {
    let isMounted = true;
    const fetchNotices = async () => {
      try {
        setIsLoadingNotices(true);
        const data = await noticeService.getNotices({ limit: 4 });
        if (isMounted) {
          setNotices(data);
        }
      } catch {
        // Non-blocking
      } finally {
        if (isMounted) {
          setIsLoadingNotices(false);
        }
      }
    };
    fetchNotices();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAttendance = async () => {
      try {
        const data = await attendanceService.getStudentAttendance();
        if (isMounted && data?.overall) {
          setAttendanceSummary(data.overall);
        }
      } catch {
        // Non-blocking
      }
    };
    fetchAttendance();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAssignments = async () => {
      try {
        setIsLoadingAssignments(true);
        const data = await assignmentService.getStudentAssignments();
        if (isMounted) {
          setAssignments(data);
        }
      } catch {
        // Non-blocking
      } finally {
        if (isMounted) {
          setIsLoadingAssignments(false);
        }
      }
    };
    fetchAssignments();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    noteService.getStudentNotes()
      .then((data) => {
        if (isMounted) setNotesCount(data.length);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    quizService.getStudentQuizzes()
      .then((data) => {
        if (isMounted) setQuizzes(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    marksService.getStudentResults()
      .then((data) => {
        if (isMounted) setAcademicResults(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const activeQuizCount = quizzes.filter((q) => q.status === 'PUBLISHED' && (!q.attempt_status || q.attempt_status === 'IN_PROGRESS')).length;
  const pendingAssignmentsCount = assignments.filter(
    (a) => !a.submission_status || a.submission_status === 'NOT_SUBMITTED'
  ).length;

  const academicModules: AcademicModule[] = [
    {
      id: 'attendance',
      title: 'Attendance',
      category: 'Academics',
      path: '/student/attendance',
      icon: CalendarCheck,
      color: 'from-blue-600 to-indigo-700',
      badge: attendanceSummary ? `${attendanceSummary.overall_percentage}%` : '...',
    },
    { id: 'quiz', title: 'Quiz & Tests', category: 'Academics', path: '/student/quizzes', icon: ClipboardList, color: 'from-emerald-600 to-teal-700', badge: activeQuizCount > 0 ? `${activeQuizCount} Active` : undefined },
    { id: 'assignments', title: 'Assignments', category: 'Academics', path: '/student/assignments', icon: FileText, color: 'from-amber-600 to-orange-700', badge: `${pendingAssignmentsCount} Due` },
    { id: 'notes', title: 'Course Notes', category: 'Academics', path: '/student/notes', icon: BookOpen, color: 'from-cyan-600 to-blue-700', badge: notesCount !== null ? `${notesCount} Files` : undefined },
    { id: 'marks', title: 'Marks & Grades', category: 'Academics', path: '/student/results', icon: Award, color: 'from-rose-600 to-pink-700', badge: academicResults?.overall ? `GPA ${academicResults.overall.gpa}` : undefined },
    { id: 'timetable', title: 'Class Timetable', category: 'General', path: '/student/timetable', icon: Clock, color: 'from-purple-600 to-violet-700' },
    { id: 'notices', title: 'Campus Bulletins', category: 'General', path: '/student/notices', icon: Megaphone, color: 'from-red-600 to-rose-700', badge: notices.length > 0 ? `${notices.length} New` : undefined },
    { id: 'profile', title: 'Student Profile', category: 'Main', path: '/student/profile', icon: User, color: 'from-slate-700 to-surface-900' },
  ];

  const filteredModules = academicModules.filter((m) =>
    m.title.toLowerCase().includes(searchModule.toLowerCase()) ||
    m.category.toLowerCase().includes(searchModule.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ─── Search Module Input Bar ──────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs">
        <div className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 text-surface-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchModule}
            onChange={(e) => setSearchModule(e.target.value)}
            placeholder="Search Module (e.g., Attendance, Quiz, Assignments, Notes, Timetable)..."
            className="w-full pl-12 pr-4 py-3 bg-surface-50/70 border border-surface-200 rounded-xl text-xs sm:text-sm font-semibold text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-xs"
          />
          {searchModule && (
            <button
              onClick={() => setSearchModule('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-surface-400 hover:text-surface-700 bg-surface-200 px-2 py-1 rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Grid: Module Cards + Right Sidebar ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Academic Modules & Schedule */}
        <div className="lg:col-span-8 space-y-6">
          {/* Modules Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary-600" />
                Academic Portals & Modules ({filteredModules.length})
              </h3>
              <span className="text-[11px] text-surface-400 font-medium">Direct Portal Access</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {filteredModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.id}
                    to={mod.path}
                    className="group bg-white rounded-2xl border border-surface-200 p-4 flex flex-col items-center justify-between text-center min-h-[135px] hover:shadow-md hover:border-primary-300 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 inset-x-0 h-1 bg-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {mod.badge && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                        {mod.badge}
                      </span>
                    )}

                    <span className="text-xs font-bold text-surface-800 group-hover:text-primary-700 transition-colors pt-1">
                      {mod.title}
                    </span>

                    <div className="w-13 h-13 rounded-full bg-surface-50 border border-surface-200/80 flex items-center justify-center my-2 shadow-xs group-hover:scale-105 group-hover:bg-primary-50 transition-all">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${mod.color} text-white flex items-center justify-center shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <span className="text-[10px] font-medium text-surface-400">
                      {mod.category}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
              <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary-600" />
                {currentDay === 'SUNDAY' ? 'Upcoming Class Schedule (Monday Preview)' : `Today's Class Schedule (${currentWeekdayLabel})`}
                {user?.class_name && (
                  <span className="text-[10px] text-surface-400 font-normal lowercase"> &middot; {user.class_name}</span>
                )}
              </h4>
              <Link to="/student/timetable" className="text-xs text-primary-600 font-semibold hover:text-primary-800">
                Full Timetable &rarr;
              </Link>
            </div>

            {isLoadingSchedule ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                    <div className="h-3 bg-surface-200 rounded w-1/3" />
                    <div className="h-4 bg-surface-200 rounded w-3/4" />
                    <div className="h-3 bg-surface-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : todaySchedule.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-50 border border-surface-200 text-center text-xs text-surface-400 font-medium">
                No lectures scheduled for {currentWeekdayLabel}.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {todaySchedule.map((cls) => (
                  <div key={cls.id} className="p-3.5 rounded-xl bg-surface-50 border border-surface-200 flex flex-col justify-between hover:bg-surface-100/70 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-primary-700 font-bold">
                          {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          cls.lecture_type === 'LAB' ? 'bg-purple-100 text-purple-800' :
                          cls.lecture_type === 'SEMINAR' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {cls.lecture_type}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-surface-900">{cls.subject_code}: {cls.subject_name}</p>
                      <p className="text-[11px] text-surface-500 mt-0.5">{cls.room} &middot; {cls.staff_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Academic Deadlines & Tasks */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
              <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                Upcoming Course Assignments
              </h4>
              <Link to="/student/assignments" className="text-[11px] font-semibold text-primary-600 hover:text-primary-800">
                View All ({assignments.length}) &rarr;
              </Link>
            </div>

            {isLoadingAssignments ? (
              <div className="space-y-2.5 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-50 border border-surface-200 h-14" />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-50 border border-surface-200 text-center text-xs text-surface-400 font-medium">
                No active coursework assignments.
              </div>
            ) : (
              <div className="space-y-2.5">
                {assignments.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/student/assignments"
                    className="p-3 rounded-xl bg-surface-50 hover:bg-surface-100 border border-surface-200/80 flex items-center justify-between gap-3 transition-colors block"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-surface-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-surface-500">{item.subject_code} &middot; {item.subject_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        item.submission_status === 'GRADED'
                          ? 'text-purple-700 bg-purple-50 border-purple-200'
                          : item.submission_status === 'SUBMITTED'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        {item.submission_status === 'GRADED'
                          ? `Graded: ${item.marks_obtained}/${item.max_marks}`
                          : item.submission_status === 'SUBMITTED'
                          ? 'Submitted'
                          : `Due: ${new Date(item.due_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Quick Widget + Vision/Mission + Bulletins */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Attendance Gauge Summary Card */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-3">
              <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-primary-600" />
                Attendance Summary
              </h4>
              <Link to="/student/attendance" className="text-[11px] font-semibold text-primary-600 hover:text-primary-800">
                Details &rarr;
              </Link>
            </div>

            <div className="flex items-center gap-4 py-1">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-200 flex flex-col items-center justify-center text-center flex-shrink-0">
                <span className="text-base font-black text-primary-700 leading-none">
                  {attendanceSummary ? `${attendanceSummary.overall_percentage}%` : '--%'}
                </span>
                <span className="text-[9px] text-primary-600 font-bold mt-0.5">Overall</span>
              </div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-surface-800">
                  {attendanceSummary ? `${attendanceSummary.total_attended} Attended / ${attendanceSummary.total_conducted} Total Lectures` : 'Loading attendance stats...'}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exam Clearance: {attendanceSummary?.is_eligible ?? true ? 'Eligible' : 'Attendance Deficit'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Vision Card */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setVisionOpen(!visionOpen)}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-surface-50 to-white flex items-center justify-between border-b border-surface-100 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary-600" />
                <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Institutional Vision
                </h4>
              </div>
              {visionOpen ? (
                <ChevronUp className="w-4 h-4 text-surface-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-surface-400" />
              )}
            </button>

            {visionOpen && (
              <div className="p-4 space-y-3 text-xs text-surface-700">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Organization</span>
                  </div>
                  <p className="text-surface-600 leading-relaxed bg-surface-50 p-2.5 rounded-lg border border-surface-100 text-[11px]">
                    To develop world class professionals through quality technical education and academic rigor.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-primary-700 font-bold text-[11px] mb-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Department</span>
                  </div>
                  <p className="text-surface-600 leading-relaxed bg-surface-50 p-2.5 rounded-lg border border-surface-100 text-[11px]">
                    To nurture engineering leaders with technical competence, research acumen, and moral ethics.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Institutional Mission Card */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
            <button
              onClick={() => setMissionOpen(!missionOpen)}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-surface-50 to-white flex items-center justify-between border-b border-surface-100 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Institutional Mission
                </h4>
              </div>
              {missionOpen ? (
                <ChevronUp className="w-4 h-4 text-surface-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-surface-400" />
              )}
            </button>

            {missionOpen && (
              <div className="p-4 space-y-3 text-xs text-surface-700">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Organization</span>
                  </div>
                  <p className="text-surface-600 leading-relaxed bg-surface-50 p-2.5 rounded-lg border border-surface-100 text-[11px]">
                    To foster educational excellence, academic integrity, and research innovation across engineering domains.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-primary-700 font-bold text-[11px] mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Department</span>
                  </div>
                  <p className="text-surface-600 leading-relaxed bg-surface-50 p-2.5 rounded-lg border border-surface-100 text-[11px]">
                    To provide hands-on computing curriculum and empower students to solve societal challenges.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Bulletins */}
          <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-surface-100 pb-2">
              <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-rose-500" />
                Recent Bulletins
              </h4>
              <Link to="/student/notices" className="text-[11px] font-semibold text-primary-600 hover:text-primary-800">
                View All
              </Link>
            </div>
            <div className="space-y-2 text-xs">
              {isLoadingNotices ? (
                <div className="space-y-2 animate-pulse">
                  <div className="p-2.5 rounded-lg bg-surface-50 space-y-1.5">
                    <div className="h-3 bg-surface-200 rounded w-3/4" />
                    <div className="h-2 bg-surface-100 rounded w-1/2" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-50 space-y-1.5">
                    <div className="h-3 bg-surface-200 rounded w-2/3" />
                    <div className="h-2 bg-surface-100 rounded w-1/3" />
                  </div>
                </div>
              ) : notices.length === 0 ? (
                <div className="p-2.5 text-center text-xs text-surface-400">
                  No active bulletins
                </div>
              ) : (
                notices.slice(0, 2).map((notice) => (
                  <div key={notice.id} className="p-2.5 rounded-lg bg-surface-50 hover:bg-surface-100/70 transition-colors">
                    <p className="font-semibold text-surface-900 text-[11px]">{notice.title}</p>
                    <span className="text-[10px] text-surface-400 mt-0.5 block">
                      {new Date(notice.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      &middot; {notice.published_by_name || 'Academic Administration'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
