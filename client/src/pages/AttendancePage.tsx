import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Home,
  ChevronRight,
  Search,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { attendanceService } from '../services/attendanceService';
import type { StudentAttendanceResponse } from '../types';

export function AttendancePage() {
  const { user } = useAuth();
  const dashboardPath = `/${user?.role?.toLowerCase() || 'student'}/dashboard`;
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('5');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LATE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceResponse | null>(null);

  const fetchAttendance = async (isManual = false) => {
    if (isManual) setIsFetching(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await attendanceService.getStudentAttendance({
        academicYear,
        semester: semester ? parseInt(semester, 10) : undefined,
      });
      setAttendanceData(data);
    } catch (err: any) {
      console.error('Failed to load student attendance:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve attendance records');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleFetch = () => {
    fetchAttendance(true);
  };

  const regNo = user?.enrollment_number || (user?.id
    ? `REG-2026-${user.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`
    : 'REG-2026-001');

  const rollNo = user?.student_roll_number || '42';
  const division = user?.division || 'A';
  const deptName = user?.department_name || 'B.Tech CSE';

  const overall = attendanceData?.overall || {
    total_conducted: 0,
    total_attended: 0,
    total_absent: 0,
    total_late: 0,
    overall_percentage: 0,
    is_eligible: true,
  };

  const subjects = attendanceData?.subjects || [];
  const records = attendanceData?.records || [];

  const filteredSessions = records.filter((s) => {
    const matchSub =
      !filterSubject ||
      (s.subject_name && s.subject_name.toLowerCase().includes(filterSubject.toLowerCase())) ||
      (s.subject_code && s.subject_code.toLowerCase().includes(filterSubject.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
    return matchSub && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* ─── Breadcrumb Navigation ────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-surface-500">
        <Link
          to={dashboardPath}
          className="flex items-center gap-1 hover:text-primary-700 transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-surface-400" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
        <span className="text-surface-500">Academics</span>
        <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
        <span className="text-primary-700 font-bold">My Attendance</span>
      </nav>

      {/* ─── Academic Filters Bar ──────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-surface-200 shadow-xs">
        <div className="flex flex-wrap items-end gap-3 sm:gap-6">
          <div className="w-full sm:flex-1 min-w-0 sm:min-w-[180px]">
            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
              Select Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 bg-surface-50 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="2025-2026">2025-2026 (Current Term)</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>

          <div className="w-full sm:flex-1 min-w-0 sm:min-w-[180px]">
            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
              Select Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 bg-surface-50 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none transition-all"
            >
              <option value="5">Semester 5 (Current)</option>
              <option value="6">Semester 6</option>
              <option value="4">Semester 4</option>
              <option value="3">Semester 3</option>
              <option value="2">Semester 2</option>
              <option value="1">Semester 1</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleFetch}
              disabled={isFetching}
              className="w-full sm:w-auto px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              <span>{isFetching ? 'Fetching...' : 'FETCH'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Student Academic Metadata Ribbon ─────────── */}
      <div className="bg-white px-5 py-3.5 rounded-xl border border-surface-200 shadow-xs flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs font-semibold text-surface-700">
        <div>
          Registration No: <span className="font-mono text-primary-700 font-bold">{regNo}</span>
        </div>
        <div>
          Class Coordinator: <span className="text-surface-900 font-bold">Dr. Sarah Jenkins</span>
        </div>
        <div>
          Program: <span className="text-surface-900 font-bold">{deptName}</span>
        </div>
        <div>
          Division: <span className="text-primary-700 font-bold">{division}</span>
        </div>
        <div>
          Roll No: <span className="text-surface-900 font-bold">{rollNo}</span>
        </div>
        <div className="bg-primary-50 text-primary-800 px-3 py-1 rounded-md border border-primary-200 flex items-center gap-1.5">
          <span>Overall:</span>
          <strong className="text-primary-900 font-bold">{overall.overall_percentage}%</strong>
          <span className="text-surface-400 font-normal text-[11px]">
            ({overall.total_attended}/{overall.total_conducted} Sessions)
          </span>
        </div>
      </div>

      {/* ─── Error Alert Banner ───────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Loading Skeleton ─────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-surface-200">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-surface-600 uppercase tracking-wider">Loading Live Attendance Records...</p>
        </div>
      ) : (
        <>
          {/* ─── Subject-Wise Attendance Breakdown Cards ───── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary-600" />
                Subject-Wise Attendance Breakdown
              </h3>
              <span className="text-xs text-surface-400 font-medium">Institutional Criteria: Min 75%</span>
            </div>

            {subjects.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-surface-200 text-center">
                <p className="text-xs font-bold text-surface-500">No subject attendance recorded for this term yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subjects.map((sub, idx) => {
                  const isGood = sub.percentage >= 75;
                  const radius = 38;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (sub.percentage / 100) * circumference;

                  return (
                    <div
                      key={sub.subject_id || idx}
                      className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* Subject Header */}
                      <div className="border-b border-surface-100 pb-3 mb-3">
                        <p className="text-[11px] font-mono font-bold text-surface-500 uppercase truncate">
                          {sub.faculty_code} / {sub.faculty_name}
                        </p>
                        <h4 className="text-xs font-bold text-surface-900 mt-1 truncate" title={sub.subject_name}>
                          {sub.subject_name}
                        </h4>
                      </div>

                      {/* Donut Progress Dial & Course Code */}
                      <div className="flex items-center justify-between py-2">
                        {/* Donut Chart */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r={radius}
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-surface-100"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r={radius}
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className={isGood ? 'text-primary-600' : 'text-amber-500'}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-sm font-extrabold text-surface-900 leading-none">
                              {sub.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Course Code & Short Title */}
                        <div className="text-right space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold bg-primary-50 text-primary-700 border border-primary-200">
                            {sub.subject_code}
                          </span>
                          <p className="text-base font-black text-surface-800 tracking-tight truncate max-w-[120px]">
                            {sub.subject_code}
                          </p>
                          <p className="text-xs text-surface-500 font-medium">
                            {sub.attended_sessions} / {sub.total_sessions} Lectures
                          </p>
                        </div>
                      </div>

                      {/* Card Footer Status */}
                      <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-[11px]">
                        <span className="text-surface-400 font-medium">Academic Status</span>
                        {isGood ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Eligible for Exams
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Attendance Deficit
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Detailed Session Attendance Register Table ─── */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-600" />
                  Session Attendance Register
                </h3>
                <p className="text-xs text-surface-400 mt-0.5 font-medium">
                  Verified lecture logs recorded by course faculty ({filteredSessions.length} total records)
                </p>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    placeholder="Search subject..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-surface-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="flex bg-surface-100 p-0.5 rounded-lg text-xs font-semibold">
                  {(['ALL', 'PRESENT', 'ABSENT', 'LATE'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        filterStatus === st ? 'bg-white text-primary-700 shadow-xs font-bold' : 'text-surface-500 hover:text-surface-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 text-surface-700 font-bold border-b border-surface-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Course Code & Subject</th>
                    <th className="py-3 px-4">Faculty</th>
                    <th className="py-3 px-4">Topic / Remarks</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-surface-400 font-medium">
                        No session logs matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-surface-50/60 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-surface-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-surface-900 whitespace-nowrap">{row.attendance_date}</td>
                        <td className="py-3 px-4 font-bold text-primary-700 whitespace-nowrap">
                          {row.subject_code}: {row.subject_name}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {row.faculty_first_name ? `${row.faculty_first_name} ${row.faculty_last_name}` : 'Course Faculty'}
                        </td>
                        <td className="py-3 px-4 text-surface-600">{row.remarks || 'Regular Lecture Session'}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : row.status === 'LATE'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {row.status === 'PRESENT' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : row.status === 'LATE' ? (
                              <Clock className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
