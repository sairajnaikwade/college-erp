import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Filter,
  Search,
  CheckCircle2,
  Home,
  ChevronRight,
  Eye,
  X,
  Award,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ACADEMIC_QUIZZES_DATA, type QuizRecord } from '../services/academicData';

export function QuizPage() {
  const { user } = useAuth();
  const dashboardPath = `/${user?.role?.toLowerCase() || 'student'}/dashboard`;
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [semester, setSemester] = useState('6');
  const [activeTab, setActiveTab] = useState<'ENDED' | 'ACTIVE' | 'UPCOMING'>('ENDED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState<QuizRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProceed = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 300);
  };

  const filteredQuizzes = ACADEMIC_QUIZZES_DATA.filter((q) => {
    const matchTab = q.status === activeTab;
    const matchSearch =
      !searchQuery ||
      q.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
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
        <span className="text-primary-700 font-bold">Academic Quizzes & Assessments</span>
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
              <option value="2026-27">2026-27 (Current Term)</option>
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
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
              <option value="6">Semester 6</option>
              <option value="5">Semester 5</option>
              <option value="4">Semester 4</option>
              <option value="3">Semester 3</option>
              <option value="2">Semester 2</option>
              <option value="1">Semester 1</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleProceed}
              disabled={isProcessing}
              className="w-full sm:w-auto px-8 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Loading...' : 'PROCEED'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Quiz Section Tabs & Table Header ─────────── */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-100 flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-surface-900 tracking-tight mr-2">
              {activeTab === 'ENDED' ? 'Ended Quizzes' : activeTab === 'ACTIVE' ? 'Active Quizzes' : 'Upcoming Quizzes'}
            </h2>

            <div className="flex bg-surface-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ENDED')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'ENDED' ? 'bg-white text-primary-700 shadow-xs font-bold' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                Ended ({ACADEMIC_QUIZZES_DATA.filter(q => q.status === 'ENDED').length})
              </button>
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'ACTIVE' ? 'bg-white text-primary-700 shadow-xs font-bold' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                Active ({ACADEMIC_QUIZZES_DATA.filter(q => q.status === 'ACTIVE').length})
              </button>
              <button
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'UPCOMING' ? 'bg-white text-primary-700 shadow-xs font-bold' : 'text-surface-500 hover:text-surface-800'
                }`}
              >
                Upcoming (0)
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course or quiz title..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-surface-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium"
            />
          </div>
        </div>

        {/* ─── Data Table ──────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 text-surface-800 font-bold border-b border-surface-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-3">Program</th>
                <th className="py-3 px-3">Year</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-3">Quiz Date</th>
                <th className="py-3 px-3">Start Time</th>
                <th className="py-3 px-3">End Time</th>
                <th className="py-3 px-3 text-center">Obtained Marks</th>
                <th className="py-3 px-4 text-center">View Quiz Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium text-surface-700">
              {filteredQuizzes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-surface-400 font-medium">
                    No quizzes found for the selected academic criteria.
                  </td>
                </tr>
              ) : (
                filteredQuizzes.map((quiz, idx) => (
                  <tr key={quiz.id} className="hover:bg-surface-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-surface-400 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-surface-900 min-w-[200px]">
                      {quiz.course}
                    </td>
                    <td className="py-3 px-3 font-semibold text-surface-600 whitespace-nowrap">{quiz.program}</td>
                    <td className="py-3 px-3 font-semibold text-surface-600">{quiz.year}</td>
                    <td className="py-3 px-4 font-medium text-primary-700">{quiz.title}</td>
                    <td className="py-3 px-3 font-semibold text-surface-800 whitespace-nowrap">{quiz.quizDate}</td>
                    <td className="py-3 px-3 font-mono text-surface-500 whitespace-nowrap">{quiz.startTime}</td>
                    <td className="py-3 px-3 font-mono text-surface-500 whitespace-nowrap">{quiz.endTime}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-surface-900">
                      {quiz.obtainedMarks}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {quiz.status === 'ENDED' ? (
                        <button
                          onClick={() => setSelectedQuiz(quiz)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-primary-700 hover:text-primary-900 hover:bg-primary-50 text-[11px] font-bold transition-all cursor-pointer border border-primary-200"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Response</span>
                        </button>
                      ) : quiz.status === 'ACTIVE' ? (
                        <button className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-xs">
                          Start Quiz
                        </button>
                      ) : (
                        <span className="text-surface-400 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── View Quiz Response Modal Dialog ─────────── */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-primary-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">{selectedQuiz.title}</h3>
                  <p className="text-[11px] text-primary-200">{selectedQuiz.course}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuiz(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Strip */}
            <div className="bg-surface-50 px-6 py-3 border-b border-surface-200 flex flex-wrap items-center justify-between text-xs font-semibold text-surface-700">
              <div>
                Date: <span className="font-bold text-surface-900">{selectedQuiz.quizDate}</span>
              </div>
              <div>
                Time: <span className="font-mono text-surface-900">{selectedQuiz.startTime} - {selectedQuiz.endTime}</span>
              </div>
              <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                Score: {selectedQuiz.obtainedMarks} ({((selectedQuiz.score / selectedQuiz.totalMarks) * 100).toFixed(0)}%)
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedQuiz.questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-surface-200 bg-surface-50/40 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-surface-900">
                      Q{idx + 1}. {q.q}
                    </p>
                    <span className="text-[10px] font-mono font-bold bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-primary-200 whitespace-nowrap">
                      {q.marks} Marks
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-700">Submitted Answer: </span>
                        {q.yourAnswer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-50 border-t border-surface-200 flex justify-end">
              <button
                onClick={() => setSelectedQuiz(null)}
                className="px-5 py-2 bg-surface-800 text-white rounded-xl text-xs font-semibold hover:bg-surface-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
