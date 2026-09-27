import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Search,
  Home,
  X,
  Loader2,
  Send,
  Calculator,
  Eye,
  GraduationCap,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { marksService } from '../services/marksService';
import type {
  StudentOverallResults,
  StudentSubjectResult,
  SubjectResultDetailResponse,
  ResultsStats,
} from '../types';

export function ResultsPage() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';
  const dashboardPath = `/${role.toLowerCase()}/dashboard`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Student State
  const [studentResults, setStudentResults] = useState<StudentOverallResults | null>(null);
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<SubjectResultDetailResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Staff & Admin State
  const [classResults, setClassResults] = useState<StudentSubjectResult[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [calculatingId, setCalculatingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Admin Statistics
  const [adminStats, setAdminStats] = useState<ResultsStats | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (role === 'STUDENT') {
        const data = await marksService.getStudentResults();
        setStudentResults(data);
      } else if (role === 'STAFF') {
        const statsData = await marksService.getResultsStats();
        setAdminStats(statsData);
        // Default to CSE Class if available
        const defaultClassId = user?.department_code === 'CSE' || !user?.department_code ? '22222222-2222-2222-2222-222222222221' : '';
        if (defaultClassId) {
          setSelectedClassId(defaultClassId);
          const results = await marksService.getClassResults(defaultClassId);
          setClassResults(results);
        }
      } else if (role === 'ADMIN') {
        const [statsData, allResultsData] = await Promise.all([
          marksService.getResultsStats(),
          marksService.getAllResults(),
        ]);
        setAdminStats(statsData);
        setClassResults(allResultsData.rows);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load academic results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleClassChange = async (clsId: string) => {
    setSelectedClassId(clsId);
    try {
      setLoading(true);
      const results = await marksService.getClassResults(clsId);
      setClassResults(results);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load class results');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateResult = async (studentId: string, subjectId: string) => {
    try {
      setCalculatingId(`${studentId}-${subjectId}`);
      setError(null);
      await marksService.calculateSubjectResult(studentId, subjectId);
      setSuccessMessage('Subject result calculated successfully!');
      if (selectedClassId) {
        const refreshed = await marksService.getClassResults(selectedClassId);
        setClassResults(refreshed);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to calculate subject result');
    } finally {
      setCalculatingId(null);
    }
  };

  const handlePublishResult = async (studentId: string, subjectId: string) => {
    try {
      setPublishingId(`${studentId}-${subjectId}`);
      setError(null);
      await marksService.publishSubjectResult(studentId, subjectId);
      setSuccessMessage('Subject result published successfully!');
      if (selectedClassId) {
        const refreshed = await marksService.getClassResults(selectedClassId);
        setClassResults(refreshed);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to publish subject result');
    } finally {
      setPublishingId(null);
    }
  };

  const handleViewSubjectDetails = async (subjectId: string) => {
    try {
      setError(null);
      const detail = await marksService.getStudentSubjectResultDetails(subjectId);
      setSelectedSubjectDetail(detail);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subject component breakdown');
    }
  };

  const filteredResults = classResults.filter(r => {
    if (filterGrade !== 'ALL' && r.grade !== filterGrade) return false;
    if (filterStatus !== 'ALL' && r.result_status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (r.student_first_name && r.student_first_name.toLowerCase().includes(q)) ||
        (r.student_last_name && r.student_last_name.toLowerCase().includes(q)) ||
        (r.student_roll_number && r.student_roll_number.toLowerCase().includes(q)) ||
        (r.subject_code && r.subject_code.toLowerCase().includes(q)) ||
        (r.subject_name && r.subject_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600 text-sm font-medium">Loading academic results & grades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Link
          to={dashboardPath}
          className="flex items-center gap-1 text-gray-500 hover:text-primary-700 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span>/</span>
        <span>Academic Assessment</span>
        <span>/</span>
        <span className="text-gray-800 font-semibold">Semester Results & GPA</span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <GraduationCap className="w-6 h-6 text-yellow-300" />
            <h1 className="text-xl font-bold">Academic Performance & Grade Card</h1>
          </div>
          <p className="text-blue-100 text-sm max-w-2xl">
            Official semester evaluation records, Continuous Internal Assessment (CIA) breakdowns, and Cumulative Grade Point Average (CGPA).
          </p>
        </div>

        <div className="px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-xs font-semibold text-white">
          Academic Year: 2025-2026 • Semester 5
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── STUDENT VIEW ─────────────────────────────────────── */}
      {role === 'STUDENT' && studentResults && (
        <div className="space-y-6">
          {/* Overall Summary Scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester GPA</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-900">{studentResults.overall.gpa}</span>
                <span className="text-xs text-gray-400 font-medium">/ 10.0</span>
              </div>
              <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Grade: {studentResults.overall.grade}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Marks</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-800">{studentResults.overall.total_marks}</span>
                <span className="text-xs text-gray-400 font-medium">/ {studentResults.overall.max_marks}</span>
              </div>
              <span className="text-[11px] text-gray-500">Across {studentResults.subjects.length} Course Subjects</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aggregate Percentage</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-700">{studentResults.overall.percentage}%</span>
              </div>
              <span className="text-[11px] text-blue-600 font-semibold">First Class with Distinction</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester Result</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${studentResults.overall.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                  {studentResults.overall.is_passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <span className="text-[11px] text-gray-500">All subject credits cleared</span>
            </div>
          </div>

          {/* Subject-wise Results Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Subject-wise Result Breakdown</h2>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {studentResults.subjects.length} Subjects Evaluated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-4">Subject Code</th>
                    <th className="py-3.5 px-4">Subject Name</th>
                    <th className="py-3.5 px-4 text-center">Marks Obtained</th>
                    <th className="py-3.5 px-4 text-center">Percentage</th>
                    <th className="py-3.5 px-4 text-center">Grade</th>
                    <th className="py-3.5 px-4 text-center">Grade Point</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentResults.subjects.map(sub => (
                    <tr key={sub.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                        {sub.subject_code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">
                        {sub.subject_name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-gray-700">
                        {sub.total_marks} / {sub.max_marks}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-indigo-700">
                        {sub.percentage}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-900 font-extrabold rounded-md text-xs">
                          {sub.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-gray-700">
                        {sub.grade_point}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleViewSubjectDetails(sub.subject_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Breakdown</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── STAFF & ADMIN VIEW ───────────────────────────────── */}
      {(role === 'STAFF' || role === 'ADMIN') && (
        <div className="space-y-6">
          {/* Admin / Staff Stats Cards */}
          {adminStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total Results</span>
                <div className="text-2xl font-bold text-gray-800 mt-1">{adminStats.total_results}</div>
                <span className="text-[11px] text-gray-400">{adminStats.students_with_results} unique students</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase">Published Results</span>
                <div className="text-2xl font-bold text-green-600 mt-1">{adminStats.published_results}</div>
                <span className="text-[11px] text-gray-400">{adminStats.draft_results} pending drafts</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase">Average Percentage</span>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{adminStats.average_percentage}%</div>
                <span className="text-[11px] text-green-600 font-semibold">{adminStats.pass_count} Passed</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase">Pass Rate</span>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {adminStats.total_results > 0 ? ((adminStats.pass_count / adminStats.total_results) * 100).toFixed(1) : 0}%
                </div>
                <span className="text-[11px] text-red-500">{adminStats.fail_count} Failed</span>
              </div>
            </div>
          )}

          {/* Results Table with Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Class Academic Results Catalogue</h2>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search student or subject..."
                    className="pl-7 pr-3 py-1 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                {role === 'STAFF' && (
                  <select
                    value={selectedClassId}
                    onChange={e => handleClassChange(e.target.value)}
                    className="py-1 px-2 bg-white border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="22222222-2222-2222-2222-222222222221">CSE - Year 3 Sem 5 Div A</option>
                    <option value="22222222-2222-2222-2222-222222222222">CSE - Year 2 Sem 3 Div A</option>
                    <option value="22222222-2222-2222-2222-222222222223">ECE - Year 3 Sem 5 Div A</option>
                    <option value="22222222-2222-2222-2222-222222222224">IT - Year 3 Sem 5 Div A</option>
                  </select>
                )}

                <select
                  value={filterGrade}
                  onChange={e => setFilterGrade(e.target.value)}
                  className="py-1 px-2 bg-white border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Grades</option>
                  <option value="O">Grade O (90-100)</option>
                  <option value="A+">Grade A+ (80-89)</option>
                  <option value="A">Grade A (70-79)</option>
                  <option value="B+">Grade B+ (60-69)</option>
                  <option value="B">Grade B (55-59)</option>
                  <option value="C">Grade C (50-54)</option>
                  <option value="P">Grade P (40-49)</option>
                  <option value="F">Grade F (Fail)</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="py-1 px-2 bg-white border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredResults.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-xs">
                  No academic result records found matching filters.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Roll No.</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Course Subject</th>
                      <th className="py-3 px-4 text-center">Marks</th>
                      <th className="py-3 px-4 text-center">Percentage</th>
                      <th className="py-3 px-4 text-center">Grade</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.map(res => {
                      const isPublished = res.result_status === 'PUBLISHED';
                      const isCalcLoading = calculatingId === `${res.student_id}-${res.subject_id}`;
                      const isPubLoading = publishingId === `${res.student_id}-${res.subject_id}`;

                      return (
                        <tr key={res.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-gray-800">
                            {res.student_roll_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800">
                            {res.student_first_name} {res.student_last_name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-800">{res.subject_code}</span> — <span className="text-gray-600">{res.subject_name}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-700">
                            {res.total_marks} / {res.max_marks}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-700">
                            {res.percentage}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded text-xs">
                              {res.grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isPublished ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                PUBLISHED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                DRAFT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleCalculateResult(res.student_id, res.subject_id)}
                                disabled={isCalcLoading}
                                title="Recalculate total marks & grade"
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded border border-gray-300 transition-all text-[11px] flex items-center gap-1"
                              >
                                <Calculator className="w-3 h-3" />
                                <span>{isCalcLoading ? 'Calculating...' : 'Recalculate'}</span>
                              </button>

                              {!isPublished && (
                                <button
                                  onClick={() => handlePublishResult(res.student_id, res.subject_id)}
                                  disabled={isPubLoading}
                                  title="Publish subject result to student"
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded shadow-sm transition-all text-[11px] flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{isPubLoading ? '...' : 'Publish'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Subject Result Component Breakdown Drawer */}
      {showDetailModal && selectedSubjectDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-900 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 bg-white/20 rounded">
                  {selectedSubjectDetail.subject.code}
                </span>
                <h3 className="text-base font-bold mt-1">{selectedSubjectDetail.subject.name}</h3>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Band */}
              <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Total Marks</span>
                  <div className="text-base font-bold text-gray-800">
                    {selectedSubjectDetail.result.total_marks} / {selectedSubjectDetail.result.max_marks}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Percentage</span>
                  <div className="text-base font-bold text-indigo-700">{selectedSubjectDetail.result.percentage}%</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Grade</span>
                  <div className="text-base font-extrabold text-blue-900">{selectedSubjectDetail.result.grade}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400">Grade Point</span>
                  <div className="text-base font-bold text-gray-800">{selectedSubjectDetail.result.grade_point}</div>
                </div>
              </div>

              {/* Assessment Components List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Internal Assessment Components
                </h4>
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {selectedSubjectDetail.components.map(comp => (
                    <div key={comp.id} className="p-3.5 bg-white flex items-center justify-between text-xs hover:bg-gray-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{comp.code}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {comp.component_type}
                          </span>
                        </div>
                        <p className="text-gray-600 font-medium text-xs mt-0.5">{comp.name}</p>
                        {comp.remarks && (
                          <p className="text-[11px] text-gray-400 italic mt-0.5">Note: {comp.remarks}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-800">
                          {comp.marks_obtained !== null ? `${comp.marks_obtained} / ${comp.max_marks}` : '—'}
                        </div>
                        <span className="text-[10px] font-semibold text-green-600">
                          {comp.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultsPage;
