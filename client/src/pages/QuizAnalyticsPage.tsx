import { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { quizService } from '../services/quizService';
import type { Quiz, QuizAnalytics, QuizAttempt } from '../types';

export function QuizAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'STAFF';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await quizService.getQuizAnalytics(id);
        setQuiz(data.quiz);
        setAnalytics(data.analytics);
        setAttempts(data.attempts);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load quiz analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-surface-200">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-surface-700">Computing assessment analytics...</p>
      </div>
    );
  }

  if (error || !quiz || !analytics) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-surface-200 space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-surface-900">Analytics Unavailable</h3>
        <p className="text-sm text-surface-600">{error || 'Could not find quiz analytics data'}</p>
        <button
          onClick={() => navigate(`/${role.toLowerCase()}/quizzes`)}
          className="px-4 py-2 bg-surface-200 hover:bg-surface-300 text-surface-800 text-xs font-semibold rounded-lg"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${role.toLowerCase()}/quizzes`)}
            className="p-2 border border-surface-200 hover:bg-surface-100 rounded-lg text-surface-600 transition-all"
            title="Back to Quizzes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 uppercase">
              <span>{quiz.subject_code} • {quiz.class_name}</span>
            </div>
            <h1 className="text-xl font-bold text-surface-900">{quiz.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-600">
          <span className="px-2.5 py-1 rounded-full bg-surface-100 font-semibold">
            Status: {quiz.status}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-surface-100 font-semibold">
            Duration: {quiz.duration_minutes}m
          </span>
          <span className="px-2.5 py-1 rounded-full bg-surface-100 font-semibold">
            Passing: {quiz.passing_marks} / {quiz.total_marks} pts
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-surface-500">
            <span className="text-xs font-medium">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-2xl font-black text-surface-900">{analytics.completion_percentage}%</p>
          <p className="text-[11px] text-surface-500">
            {analytics.submitted_count} of {analytics.total_students} students submitted
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-surface-500">
            <span className="text-xs font-medium">Average Score</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-surface-900">
            {analytics.average_score} <span className="text-xs font-normal text-surface-400">/ {quiz.total_marks}</span>
          </p>
          <p className="text-[11px] text-surface-500">
            High: {analytics.highest_score} • Low: {analytics.lowest_score}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-surface-500">
            <span className="text-xs font-medium">Passed Assessments</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{analytics.pass_count}</p>
          <p className="text-[11px] text-surface-500">
            Pass threshold: {quiz.passing_marks} pts
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-surface-500">
            <span className="text-xs font-medium">Needs Review / Failed</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700">{analytics.fail_count}</p>
          <p className="text-[11px] text-surface-500">
            Timed out: {analytics.timed_out_count}
          </p>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-surface-900 text-sm">Student Attempts & Score Submissions</h3>
            <p className="text-xs text-surface-500">Individual test logs and evaluation records</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-surface-100 rounded-full text-surface-700">
            {attempts.length} Recorded Attempts
          </span>
        </div>

        {attempts.length === 0 ? (
          <div className="p-8 text-center text-xs text-surface-500">
            No students have started or submitted this assessment yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50/70 border-b border-surface-200 text-surface-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll / Enrollment</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-surface-900">
                      {att.student_first_name} {att.student_last_name}
                    </td>
                    <td className="py-3 px-4 text-surface-600 font-mono text-[11px]">
                      {att.roll_number || att.enrollment_number || '—'}
                    </td>
                    <td className="py-3 px-4 text-surface-500">
                      {att.started_at ? new Date(att.started_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-surface-500">
                      {att.submitted_at ? new Date(att.submitted_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        att.status === 'SUBMITTED' || att.status === 'GRADED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : att.status === 'IN_PROGRESS'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-surface-900">
                      {att.score !== null ? `${att.score} / ${quiz.total_marks}` : '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-surface-900">
                      {att.percentage !== null ? `${att.percentage}%` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {att.is_passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </span>
                      ) : att.status === 'IN_PROGRESS' ? (
                        <span className="text-surface-400">PENDING</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAIL</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
