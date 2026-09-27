import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FileText,
  CalendarCheck,
  Clock,
  ClipboardList,
  Upload,
  Megaphone,
  BarChart3,
  Search,
  Layers,
  Award,
} from 'lucide-react';
import { noticeService } from '../services/noticeService';
import { timetableService } from '../services/timetableService';
import { quizService } from '../services/quizService';
import { marksService } from '../services/marksService';
import type { TimetableEntry, MarksStats } from '../types';

interface FacultyModule {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: any;
  color: string;
  badge?: string;
}

export function StaffDashboard() {
  const [searchModule, setSearchModule] = useState('');
  const [noticesCount, setNoticesCount] = useState<number>(0);
  const [quizzesCount, setQuizzesCount] = useState<number>(0);
  const [marksStats, setMarksStats] = useState<MarksStats | null>(null);

  const [teachingSchedule, setTeachingSchedule] = useState<TimetableEntry[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
  const currentDay = dayNames[new Date().getDay()];
  const currentWeekdayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    let isMounted = true;
    noticeService.getNotices({ limit: 5 }).then((data) => {
      if (isMounted) setNoticesCount(data.length);
    }).catch(() => {});

    quizService.getStaffQuizzes().then((data) => {
      if (isMounted) setQuizzesCount(data.length);
    }).catch(() => {});

    marksService.getMarksStats().then((data) => {
      if (isMounted) setMarksStats(data);
    }).catch(() => {});

    setIsLoadingSchedule(true);
    const dayToFetch = currentDay === 'SUNDAY' ? 'MONDAY' : currentDay;
    timetableService.getStaffTimetable({ day_of_week: dayToFetch })
      .then((slots) => {
        if (isMounted) setTeachingSchedule(slots);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingSchedule(false);
      });

    return () => { isMounted = false; };
  }, [currentDay]);

  const pendingSubmissionsCount = 7;

  const facultyModules: FacultyModule[] = [
    { id: 'attendance', title: 'Mark Attendance', category: 'Academics', path: '/staff/attendance', icon: CalendarCheck, color: 'from-blue-600 to-indigo-700', badge: 'Today' },
    { id: 'quizzes', title: 'Quizzes & Tests', category: 'Academics', path: '/staff/quizzes', icon: ClipboardList, color: 'from-emerald-600 to-teal-700', badge: `${quizzesCount} Quizzes` },
    { id: 'assignments', title: 'Assignments', category: 'Academics', path: '/staff/assignments', icon: FileText, color: 'from-amber-600 to-orange-700', badge: `${pendingSubmissionsCount} Pending` },
    { id: 'notes', title: 'Course Notes', category: 'Academics', path: '/staff/notes', icon: BookOpen, color: 'from-cyan-600 to-blue-700' },
    { id: 'subjects', title: 'My Subjects', category: 'Academics', path: '/staff/subjects', icon: BookOpen, color: 'from-purple-600 to-violet-700', badge: '4 Assigned' },
    { id: 'students', title: 'Enrolled Students', category: 'Management', path: '/staff/students', icon: Users, color: 'from-slate-700 to-surface-900', badge: '120 Active' },
    { id: 'marks', title: 'Marks & Grading', category: 'Academics', path: '/staff/marks', icon: Award, color: 'from-rose-600 to-pink-700', badge: marksStats ? `${marksStats.total_components} Components` : undefined },
    { id: 'results', title: 'Semester Results', category: 'Academics', path: '/staff/results', icon: Award, color: 'from-indigo-600 to-blue-700' },
    { id: 'timetable', title: 'Teaching Schedule', category: 'General', path: '/staff/timetable', icon: Clock, color: 'from-indigo-600 to-blue-700' },
    { id: 'notices', title: 'Bulletins', category: 'General', path: '/staff/notices', icon: Megaphone, color: 'from-red-600 to-rose-700', badge: noticesCount > 0 ? `${noticesCount} Bulletins` : undefined },
    { id: 'reports', title: 'Academic Reports', category: 'Analytics', path: '/staff/reports', icon: BarChart3, color: 'from-emerald-700 to-teal-800' },
  ];

  const filteredModules = facultyModules.filter((m) =>
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
            placeholder="Search Faculty Module (e.g., Mark Attendance, Quizzes, Notes, Students)..."
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

      {/* ─── Faculty Module Cards Grid ────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary-600" />
            Faculty Academic Portals & Modules ({filteredModules.length})
          </h3>
          <span className="text-[11px] text-surface-400 font-medium">Quick Academic Workflow</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
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

      {/* ─── Faculty Schedule & Assessment Reviews ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Teaching Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
            <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary-600" />
              {currentDay === 'SUNDAY' ? 'Assigned Lectures & Labs (Monday Preview)' : `Today's Assigned Lectures & Labs (${currentWeekdayLabel})`}
            </h4>
            <Link
              to="/staff/attendance"
              className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-200 hover:bg-primary-100 transition-colors"
            >
              Open Attendance Marker &rarr;
            </Link>
          </div>

          {isLoadingSchedule ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-3 px-3.5 rounded-xl bg-surface-50 border border-surface-200 space-y-2">
                  <div className="h-3 bg-surface-200 rounded w-1/4" />
                  <div className="h-4 bg-surface-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : teachingSchedule.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-50 border border-surface-200 text-center text-xs text-surface-400 font-medium">
              No assigned lectures or lab sessions for {currentWeekdayLabel}.
            </div>
          ) : (
            <div className="space-y-3">
              {teachingSchedule.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between py-3 px-3.5 rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-100/70 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-surface-700 w-28">
                      {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-surface-900">{cls.subject_code}: {cls.subject_name}</p>
                      <p className="text-[11px] text-surface-500">{cls.class_name} &middot; {cls.room}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      cls.lecture_type === 'LAB' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      cls.lecture_type === 'SEMINAR' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {cls.lecture_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Assessment Reviews & Quick Actions */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
              <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-600" />
                Assessment Reviews
              </h4>
              <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                14 Pending
              </span>
            </div>

            <div className="space-y-3">
              {[
                { title: 'ER Diagram Relational Schema', subject: 'DBMS Div A', count: 8, total: 45 },
                { title: 'Transactions & ACID Proofs', subject: 'DBMS Div B', count: 23, total: 42 },
                { title: 'Subword Tokenizer Lab Notebook', subject: 'NLP Lab Div B', count: 15, total: 38 },
              ].map((sub, i) => (
                <div key={i} className="p-3 bg-surface-50 rounded-xl border border-surface-200/80">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                    <span className="text-surface-800 truncate">{sub.title}</span>
                    <span className="text-surface-500 font-mono text-[11px]">{sub.count}/{sub.total}</span>
                  </div>
                  <p className="text-[10px] text-surface-400 mb-2">{sub.subject}</p>
                  <div className="w-full bg-surface-200 rounded-full h-1.5">
                    <div
                      className="bg-primary-600 h-1.5 rounded-full"
                      style={{ width: `${(sub.count / sub.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/staff/attendance"
            className="mt-4 w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-colors shadow-xs"
          >
            Launch Attendance Register
          </Link>
        </div>
      </div>
    </div>
  );
}
