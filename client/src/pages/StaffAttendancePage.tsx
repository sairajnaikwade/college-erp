import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter,
  CheckCircle2,
  XCircle,
  Save,
  Home,
  ChevronRight,
  Search,
  CheckCheck,
  AlertTriangle,
  Loader2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/api';
import { attendanceService } from '../services/attendanceService';
import type { ApiResponse, AttendanceStatus } from '../types';

interface ClassOption {
  id: string;
  name: string;
  year: number;
  semester: number;
  division: string;
  academic_year: string;
}

interface SubjectOption {
  id: string;
  code: string;
  name: string;
  semester: number;
}

interface StaffStudentRow {
  student_id: string;
  roll_number: string;
  enrollment_number: string;
  name: string;
  division: string;
  term_attendance_rate: number;
  status: AttendanceStatus;
  remarks?: string | null;
}

export function StaffAttendancePage() {
  const { user } = useAuth();
  const dashboardPath = `/${user?.role?.toLowerCase() || 'staff'}/dashboard`;
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [lectureDate, setLectureDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StaffStudentRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedBatchId, setSavedBatchId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facultyName = user ? `${user.first_name} ${user.last_name}` : 'Course Instructor';

  // 1. Fetch available classes & subjects
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const [classRes, subRes] = await Promise.all([
          apiClient.get<ApiResponse<ClassOption[]>>('/classes'),
          apiClient.get<ApiResponse<SubjectOption[]>>('/subjects'),
        ]);

        if (isMounted) {
          const clsList = classRes.data?.data || [];
          const subList = subRes.data?.data || [];
          setClasses(clsList);
          setSubjects(subList);

          if (clsList.length > 0) setSelectedClassId(clsList[0].id);
          if (subList.length > 0) setSelectedSubjectId(subList[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load class metadata:', err);
        if (isMounted) setError('Failed to load academic classes and subjects list');
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch students & existing attendance for selected class and date
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;

    let isMounted = true;
    async function loadClassStudents() {
      try {
        setIsLoadingStudents(true);
        setError(null);

        // Fetch class attendance records (including students)
        const records = await attendanceService.getClassAttendance(selectedClassId, {
          subjectId: selectedSubjectId,
        });

        if (isMounted) {
          // Group by student to deduce current date's status and term attendance
          const studentMap = new Map<string, StaffStudentRow>();

          // Also get student list from class attendance records
          records.forEach((r) => {
            const studentId = r.student_id;
            const isToday = r.attendance_date === lectureDate;

            if (!studentMap.has(studentId)) {
              studentMap.set(studentId, {
                student_id: studentId,
                roll_number: r.student_roll_number || 'N/A',
                enrollment_number: r.enrollment_number || 'N/A',
                name: r.student_first_name ? `${r.student_first_name} ${r.student_last_name || ''}` : 'Student',
                division: r.division || 'A',
                term_attendance_rate: 85.0,
                status: isToday ? r.status : 'PRESENT',
                remarks: isToday ? r.remarks : null,
              });
            } else if (isToday) {
              const existing = studentMap.get(studentId)!;
              existing.status = r.status;
              existing.remarks = r.remarks;
            }
          });

          // Calculate term attendance rate per student from history
          studentMap.forEach((st) => {
            const studentLogs = records.filter((r) => r.student_id === st.student_id);
            if (studentLogs.length > 0) {
              const attended = studentLogs.filter((l) => l.status === 'PRESENT' || l.status === 'LATE').length;
              st.term_attendance_rate = parseFloat(((attended / studentLogs.length) * 100).toFixed(1));
            }
          });

          const studentList = Array.from(studentMap.values());
          setStudents(studentList);
        }
      } catch (err: any) {
        console.error('Failed to load class register:', err);
        if (isMounted) setError(err?.response?.data?.message || 'Failed to retrieve class attendance register');
      } finally {
        if (isMounted) setIsLoadingStudents(false);
      }
    }

    loadClassStudents();
    return () => {
      isMounted = false;
    };
  }, [selectedClassId, selectedSubjectId, lectureDate]);

  // Toggle individual student status (PRESENT -> ABSENT -> LATE -> PRESENT)
  const handleToggleStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const nextStatus: AttendanceStatus =
            s.status === 'PRESENT' ? 'ABSENT' : s.status === 'ABSENT' ? 'LATE' : 'PRESENT';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
    setSaveSuccess(false);
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'PRESENT' })));
    setSaveSuccess(false);
  };

  // Mark all absent
  const handleMarkAllAbsent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'ABSENT' })));
    setSaveSuccess(false);
  };

  // Save attendance
  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId || students.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const recordsToSave = students.map((s) => ({
        student_id: s.student_id,
        status: s.status,
        remarks: s.remarks || 'Regular Lecture Session',
      }));

      await attendanceService.markAttendance({
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        attendance_date: lectureDate,
        records: recordsToSave,
      });

      setSavedBatchId(`ATT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      setError(err?.response?.data?.message || 'Failed to save attendance records');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollment_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = students.filter((s) => s.status === 'PRESENT').length;
  const lateCount = students.filter((s) => s.status === 'LATE').length;
  const absentCount = students.filter((s) => s.status === 'ABSENT').length;
  const attendanceRate =
    students.length > 0 ? (((presentCount + lateCount) / students.length) * 100).toFixed(1) : '0.0';

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

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
        <span className="text-surface-500">Faculty Academic Portal</span>
        <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
        <span className="text-primary-700 font-bold">Attendance Management</span>
      </nav>

      {/* ─── Academic Filters / Class Selector Bar ─────── */}
      <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary-600" />
            Class & Course Selector
          </h3>
          <span className="text-xs text-surface-400 font-medium">Faculty: {facultyName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1 uppercase">Class Batch</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-surface-50 border border-surface-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:outline-none"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1 uppercase">Course / Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-surface-50 border border-surface-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.name} (Sem {sub.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-surface-600 mb-1 uppercase">Lecture Date</label>
            <input
              type="date"
              value={lectureDate}
              onChange={(e) => setLectureDate(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 bg-surface-50 border border-surface-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ─── Error Alert Banner ───────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Save Confirmation Banner ─────────────────── */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs font-semibold text-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              Attendance record for <strong>{selectedSubject?.code} ({selectedClass?.name})</strong> for <strong>{lectureDate}</strong> saved successfully to database.
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            {savedBatchId}
          </span>
        </div>
      )}

      {/* ─── Student Attendance Table & Controls ──────── */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        {/* Table Top Controls Strip */}
        <div className="p-4 sm:p-5 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="font-bold text-surface-800">
              Total: <strong className="text-surface-900">{students.length}</strong>
            </span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Present: {presentCount}
            </span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Late: {lateCount}
            </span>
            <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              Absent: {absentCount}
            </span>
            <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
              Rate: {attendanceRate}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or roll..."
                className="pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-surface-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium"
              />
            </div>

            <button
              onClick={handleMarkAllPresent}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </button>

            <button
              onClick={handleMarkAllAbsent}
              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Mark All Absent</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || students.length === 0}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Attendance'}</span>
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoadingStudents ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-surface-500 uppercase">Loading Enrolled Students...</p>
          </div>
        ) : (
          /* Student Register Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-surface-700 font-bold border-b border-surface-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-24">Roll No</th>
                  <th className="py-3 px-4">Enrollment No</th>
                  <th className="py-3 px-4">Student Full Name</th>
                  <th className="py-3 px-4">Division</th>
                  <th className="py-3 px-4 text-center">Term Attendance</th>
                  <th className="py-3 px-4 text-center">Status (Click to Toggle)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-surface-400 font-medium">
                      No enrolled students found for this class batch.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const isPresent = st.status === 'PRESENT';
                    const isLate = st.status === 'LATE';

                    return (
                      <tr key={st.student_id} className="hover:bg-surface-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-surface-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-surface-900">{st.roll_number}</td>
                        <td className="py-3 px-4 font-mono text-surface-600">{st.enrollment_number}</td>
                        <td className="py-3 px-4 font-bold text-surface-900">{st.name}</td>
                        <td className="py-3 px-4 font-semibold text-primary-700">{st.division}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-surface-800">{st.term_attendance_rate}%</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(st.student_id)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                              isPresent
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : isLate
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                          >
                            {isPresent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>PRESENT</span>
                              </>
                            ) : isLate ? (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>LATE</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>ABSENT</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
