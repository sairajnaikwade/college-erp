import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building2,
  User,
} from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody, Badge } from '../components';
import { useAuth } from '../hooks/useAuth';
import { timetableService } from '../services/timetableService';
import type { TimetableEntry, DayOfWeek } from '../types';

const DAYS: { key: DayOfWeek | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Full Week' },
  { key: 'MONDAY', label: 'Monday' },
  { key: 'TUESDAY', label: 'Tuesday' },
  { key: 'WEDNESDAY', label: 'Wednesday' },
  { key: 'THURSDAY', label: 'Thursday' },
  { key: 'FRIDAY', label: 'Friday' },
  { key: 'SATURDAY', label: 'Saturday' },
];

export function TimetablePage() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('ALL');
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [selectedSemester, setSelectedSemester] = useState<number>(user?.semester || 5);

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const isStaff = user?.role === 'STAFF';

  useEffect(() => {
    let isMounted = true;
    const fetchTimetable = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const params = {
          day_of_week: selectedDay === 'ALL' ? undefined : selectedDay,
          academic_year: selectedYear,
          semester: selectedSemester,
        };

        const data = isStaff
          ? await timetableService.getStaffTimetable(params)
          : await timetableService.getStudentTimetable(params);

        if (isMounted) {
          setTimetable(data);
        }
      } catch {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTimetable();
    return () => {
      isMounted = false;
    };
  }, [selectedDay, selectedYear, selectedSemester, isStaff]);

  // Group timetable by day when displaying full week
  const groupedSchedule = DAYS.filter((d) => d.key !== 'ALL').map((day) => ({
    dayLabel: day.label,
    dayKey: day.key,
    slots: timetable.filter((s) => s.day_of_week === day.key),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaff ? 'Faculty Teaching Schedule' : 'Student Class Timetable'}
        subtitle={
          isStaff
            ? 'Official assigned lectures, laboratory sessions, and tutorial timetable'
            : 'Weekly course schedule, classroom assignments, and faculty allocations'
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="primary">
              {user?.department_code || 'CSE'} &middot; AY {selectedYear}
            </Badge>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-surface-700 shadow-xs focus:ring-1 focus:ring-primary-500"
            >
              <option value="2025-2026">AY 2025-26</option>
              <option value="2026-2027">AY 2026-27</option>
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value))}
              className="bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-surface-700 shadow-xs focus:ring-1 focus:ring-primary-500"
            >
              <option value={5}>Semester 5</option>
              <option value={6}>Semester 6</option>
            </select>
          </div>
        }
      />

      {/* ─── Day Selector Tab Navigation ─────────────────── */}
      <div className="bg-white p-2 rounded-2xl border border-surface-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {DAYS.map((day) => (
          <button
            key={day.key}
            onClick={() => setSelectedDay(day.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedDay === day.key
                ? 'bg-primary-600 text-white shadow-xs'
                : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* ─── Schedule Content View ──────────────────────── */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <Card key={n}>
              <CardBody className="p-6 space-y-3">
                <div className="h-4 bg-surface-200 rounded w-1/4" />
                <div className="h-10 bg-surface-100 rounded w-full" />
                <div className="h-10 bg-surface-100 rounded w-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardBody className="p-8 text-center text-xs text-rose-600 font-semibold">
            Unable to load timetable records from the server. Please verify your connection.
          </CardBody>
        </Card>
      ) : selectedDay === 'ALL' ? (
        /* Full Week View grouped by day */
        <div className="space-y-6">
          {groupedSchedule.map((group) => (
            <Card key={group.dayKey}>
              <CardHeader className="bg-surface-50/50 border-b border-surface-200/80 py-3 px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                    {group.dayLabel}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-surface-500 bg-surface-200/60 px-2 py-0.5 rounded-full">
                  {group.slots.length} {group.slots.length === 1 ? 'Slot' : 'Slots'}
                </span>
              </CardHeader>
              <CardBody className="p-0">
                {group.slots.length === 0 ? (
                  <div className="py-6 text-center text-xs text-surface-400 font-medium">
                    No academic sessions scheduled for {group.dayLabel}.
                  </div>
                ) : (
                  <div className="divide-y divide-surface-100">
                    {group.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 sm:px-6 hover:bg-surface-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-4">
                          <div className="w-24 sm:w-28 flex-shrink-0">
                            <span className="text-xs font-mono font-bold text-surface-900 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-surface-400" />
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-surface-900">
                                {slot.subject_code}: {slot.subject_name}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  slot.lecture_type === 'LAB'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : slot.lecture_type === 'SEMINAR'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : slot.lecture_type === 'TUTORIAL'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {slot.lecture_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-surface-500">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-surface-400" />
                                {slot.room}
                              </span>
                              <span>&middot;</span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-surface-400" />
                                {isStaff ? slot.class_name : slot.staff_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className="text-[10px] font-mono text-surface-400">
                            {slot.subject_credits} Credits
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        /* Single Day Selected View */
        <Card>
          <CardHeader className="bg-surface-50/50 border-b border-surface-200/80 py-3.5 px-5 flex items-center justify-between">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              {DAYS.find((d) => d.key === selectedDay)?.label} Schedule
            </h3>
            <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
              {timetable.length} Sessions
            </span>
          </CardHeader>
          <CardBody className="p-0">
            {timetable.length === 0 ? (
              <div className="py-12 text-center text-xs text-surface-400 font-medium">
                No lectures or practical labs scheduled for this day.
              </div>
            ) : (
              <div className="divide-y divide-surface-100">
                {timetable.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 sm:px-6 hover:bg-surface-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-24 sm:w-28 flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-surface-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-surface-400" />
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-surface-900">
                            {slot.subject_code}: {slot.subject_name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              slot.lecture_type === 'LAB'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : slot.lecture_type === 'SEMINAR'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : slot.lecture_type === 'TUTORIAL'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {slot.lecture_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-surface-500">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-surface-400" />
                            {slot.room}
                          </span>
                          <span>&middot;</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-surface-400" />
                            {isStaff ? slot.class_name : slot.staff_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[10px] font-mono text-surface-400">
                        {slot.subject_credits} Credits
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
