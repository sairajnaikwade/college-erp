import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  Edit2,
  Trash2,
  BarChart3,
  Search,
  Filter,
  Layers,
  Home,
  X,
  Loader2,
  Lock,
  Globe,
  FileCheck,
  Users,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { quizService } from '../services/quizService';
import type {
  Quiz,
  StudentQuiz,
  CreateQuizPayload,
  CreateQuestionPayload,
} from '../types';

export function QuizzesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'STUDENT';
  const dashboardPath = `/${role.toLowerCase()}/dashboard`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quizzes list
  const [quizzes, setQuizzes] = useState<(Quiz | StudentQuiz)[]>([]);

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stats
  const [stats, setStats] = useState<{ total: number; published: number; draft: number; closed: number; total_attempts: number } | null>(null);

  // Faculty Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateQuizPayload>({
    title: '',
    description: '',
    subject_id: '',
    duration_minutes: 30,
    passing_marks: 12,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Faculty Add Question Modal
  const [selectedQuizForQuestion, setSelectedQuizForQuestion] = useState<Quiz | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<CreateQuestionPayload>({
    question_text: '',
    question_type: 'MCQ',
    marks: 5,
    explanation: '',
    options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Load Quizzes
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (role === 'STUDENT') {
        const data = await quizService.getStudentQuizzes();
        setQuizzes(data);
      } else if (role === 'STAFF') {
        const data = await quizService.getStaffQuizzes();
        setQuizzes(data);
      } else {
        const data = await quizService.getAllQuizzes();
        setQuizzes(data.rows);
        const statsData = await quizService.getStats();
        setStats(statsData);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [role]);

  // Handle Create Quiz
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.subject_id) {
      setError('Please provide a quiz title and course subject.');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      await quizService.createQuiz(createForm);
      setSuccessMessage('Draft quiz created successfully. Add questions before publishing.');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        subject_id: '',
        duration_minutes: 30,
        passing_marks: 12,
      });
      await fetchQuizzes();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create quiz');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizForQuestion) return;

    if (!questionForm.question_text.trim()) {
      setError('Please provide the question prompt.');
      return;
    }

    const hasEmptyOptions = questionForm.options.some(o => !o.option_text.trim());
    if (hasEmptyOptions) {
      setError('All options must have non-empty text.');
      return;
    }

    const correctCount = questionForm.options.filter(o => o.is_correct).length;
    if (correctCount !== 1) {
      setError('Please designate exactly one correct option.');
      return;
    }

    try {
      setIsAddingQuestion(true);
      setError(null);
      await quizService.addQuestion(selectedQuizForQuestion.id, questionForm);
      setSuccessMessage('Question added successfully.');
      setShowQuestionModal(false);
      setQuestionForm({
        question_text: '',
        question_type: 'MCQ',
        marks: 5,
        explanation: '',
        options: [
          { option_text: '', is_correct: true },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ],
      });
      await fetchQuizzes();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add question');
    } finally {
      setIsAddingQuestion(false);
    }
  };

  // Handle Publish / Close Toggle
  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      setError(null);
      if (quiz.status === 'DRAFT') {
        await quizService.publishQuiz(quiz.id);
        setSuccessMessage(`Quiz "${quiz.title}" is now PUBLISHED and open for student attempts.`);
      } else if (quiz.status === 'PUBLISHED') {
        await quizService.closeQuiz(quiz.id);
        setSuccessMessage(`Quiz "${quiz.title}" has been CLOSED.`);
      }
      await fetchQuizzes();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update quiz status');
    }
  };

  // Handle Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz? All associated questions and attempts will be removed.')) {
      return;
    }
    try {
      setError(null);
      await quizService.deleteQuiz(quizId);
      setSuccessMessage('Quiz deleted successfully.');
      await fetchQuizzes();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete quiz');
    }
  };

  // Start Quiz (Student)
  const handleStartQuiz = async (quizId: string) => {
    try {
      setError(null);
      const res = await quizService.startQuiz(quizId);
      navigate(`/student/quizzes/${quizId}/attempt/${res.attempt_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start quiz');
    }
  };

  // Filtered Quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    if (filterSubject !== 'ALL' && q.subject_id !== filterSubject) return false;
    if (filterStatus !== 'ALL' && q.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(query);
      const matchDesc = q.description?.toLowerCase().includes(query) || false;
      const matchSub = q.subject_name?.toLowerCase().includes(query) || q.subject_code?.toLowerCase().includes(query) || false;
      if (!matchTitle && !matchDesc && !matchSub) return false;
    }
    return true;
  });

  // Unique subjects for filter
  const subjectsMap = new Map<string, { id: string; name: string; code: string }>();
  quizzes.forEach((q) => {
    if (q.subject_id && q.subject_name) {
      subjectsMap.set(q.subject_id, {
        id: q.subject_id,
        name: q.subject_name,
        code: q.subject_code || '',
      });
    }
  });
  const availableSubjects = Array.from(subjectsMap.values());

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-surface-500 mb-1">
            <Link
              to={dashboardPath}
              className="flex items-center gap-1 text-surface-500 hover:text-primary-700 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span>Academic Portal</span>
            <span>/</span>
            <span className="text-surface-900 font-semibold">Quizzes & Online Tests</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            Quizzes & Online Tests
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            {role === 'STUDENT'
              ? 'Access scheduled online assessments, track question timer, and view certified test scores.'
              : role === 'STAFF'
              ? 'Manage continuous evaluations, author MCQ/True-False questions, publish test schedules, and inspect analytics.'
              : 'Institutional online assessment catalog, global examination compliance, and performance oversight.'}
          </p>
        </div>

        {role !== 'STUDENT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        )}
      </div>

      {/* Admin Stats Banner */}
      {role === 'ADMIN' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500 font-medium">Total Quizzes</p>
              <p className="text-xl font-bold text-surface-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500 font-medium">Published / Active</p>
              <p className="text-xl font-bold text-emerald-700">{stats.published}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500 font-medium">Draft Tests</p>
              <p className="text-xl font-bold text-amber-700">{stats.draft}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-500 font-medium">Total Attempts</p>
              <p className="text-xl font-bold text-purple-700">{stats.total_attempts}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quizzes by title, description, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-2 border border-surface-200 rounded-lg text-xs font-medium text-surface-600">
              <Filter className="w-3.5 h-3.5" />
              <span>Subject:</span>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-transparent text-surface-900 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Subjects</option>
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code ? `${sub.code} - ` : ''}{sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-2 border border-surface-200 rounded-lg text-xs font-medium text-surface-600">
              <span>Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-surface-900 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-surface-600">Loading continuous assessment schedules...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-200 shadow-sm">
          <HelpCircle className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-surface-800 mb-1">No quizzes found</h3>
          <p className="text-xs text-surface-500 max-w-sm mx-auto">
            {role === 'STUDENT'
              ? 'There are currently no active online assessments matching your filter criteria.'
              : 'No quizzes match the active filters. Create a new draft quiz to begin.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz) => {
            const studentQuiz = quiz as StudentQuiz;
            const hasAttempted = !!studentQuiz.attempt_status && studentQuiz.attempt_status !== 'IN_PROGRESS';
            const isPassed = (studentQuiz.score ?? 0) >= quiz.passing_marks;

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-xl border border-surface-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Card Header & Badges */}
                  <div className="p-5 border-b border-surface-100 bg-surface-50/50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {quiz.subject_code || 'COURSE'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {quiz.status === 'PUBLISHED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Published
                          </span>
                        )}
                        {quiz.status === 'DRAFT' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        )}
                        {quiz.status === 'CLOSED' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-surface-900 text-base leading-snug line-clamp-2">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-surface-500 font-medium mt-1">
                      {quiz.subject_name} • {quiz.class_name || 'Class Batch'}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3 text-xs text-surface-600">
                    {quiz.description && (
                      <p className="line-clamp-2 text-surface-600 leading-relaxed">{quiz.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-surface-400" />
                        <span><strong>{quiz.duration_minutes}</strong> mins</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-surface-400" />
                        <span>Total: <strong>{quiz.total_marks}</strong> pts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-3.5 h-3.5 text-surface-400" />
                        <span>Pass: <strong>{quiz.passing_marks}</strong> pts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-surface-400" />
                        <span>Questions: <strong>{quiz.total_questions ?? '—'}</strong></span>
                      </div>
                    </div>

                    {/* Student Attempt Status Card */}
                    {role === 'STUDENT' && studentQuiz.attempt_status && (
                      <div className={`p-3 rounded-lg border text-xs ${
                        studentQuiz.attempt_status === 'IN_PROGRESS'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : isPassed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>Status: {studentQuiz.attempt_status}</span>
                          {studentQuiz.score !== null && studentQuiz.score !== undefined && (
                            <span>{studentQuiz.score} / {quiz.total_marks} ({studentQuiz.percentage}%)</span>
                          )}
                        </div>
                        {hasAttempted && (
                          <p className="text-[11px] mt-0.5 opacity-80">
                            Verdict: {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-surface-50 border-t border-surface-100 flex items-center justify-between gap-2">
                  {role === 'STUDENT' ? (
                    studentQuiz.attempt_status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => navigate(`/student/quizzes/${quiz.id}/attempt/${studentQuiz.attempt_id}`)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume Test</span>
                      </button>
                    ) : hasAttempted ? (
                      <button
                        onClick={() => navigate(`/student/quizzes/${quiz.id}/attempt/${studentQuiz.attempt_id}`)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-200 hover:bg-surface-300 text-surface-800 text-xs font-semibold rounded-lg transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View Results</span>
                      </button>
                    ) : quiz.status === 'PUBLISHED' ? (
                      <button
                        onClick={() => handleStartQuiz(quiz.id)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Quiz</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-surface-200 text-surface-400 text-xs font-medium rounded-lg cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Quiz Closed</span>
                      </button>
                    )
                  ) : (
                    <div className="w-full flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedQuizForQuestion(quiz);
                            setShowQuestionModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-800 text-xs font-semibold rounded-md transition-all flex items-center gap-1"
                          title="Add Questions"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Question</span>
                        </button>

                        <button
                          onClick={() => navigate(`/${role.toLowerCase()}/quizzes/${quiz.id}/analytics`)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-md border border-purple-200 transition-all flex items-center gap-1"
                          title="View Performance Analytics"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Analytics</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {quiz.status === 'DRAFT' && (
                          <button
                            onClick={() => handleTogglePublish(quiz)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-all"
                            title="Publish Quiz"
                          >
                            Publish
                          </button>
                        )}
                        {quiz.status === 'PUBLISHED' && (
                          <button
                            onClick={() => handleTogglePublish(quiz)}
                            className="px-2.5 py-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 text-xs font-semibold rounded-md transition-all"
                            title="Close Quiz"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-1.5 text-surface-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Quiz Modal (Faculty/Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
              <div>
                <h3 className="font-bold text-surface-900 text-base">Create New Quiz</h3>
                <p className="text-xs text-surface-500">Configure online continuous test details</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Quiz Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unit 4: Concurrency & Synchronization Quiz"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Course Subject <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.subject_id}
                  onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select subject...</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code ? `${sub.code} - ` : ''}{sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional context, syllabus scope, instructions..."
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-surface-700 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    required
                    value={createForm.duration_minutes}
                    onChange={(e) => setCreateForm({ ...createForm, duration_minutes: parseInt(e.target.value, 10) || 30 })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-surface-700 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.passing_marks}
                    onChange={(e) => setCreateForm({ ...createForm, passing_marks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-surface-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-surface-300 text-surface-700 font-semibold rounded-lg hover:bg-surface-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm transition-all text-xs"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Draft Quiz</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Question Modal (Faculty/Admin) */}
      {showQuestionModal && selectedQuizForQuestion && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-surface-900 text-base">Add Question to Quiz</h3>
                <p className="text-xs text-surface-500">{selectedQuizForQuestion.title}</p>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Question Type <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 font-medium text-surface-800 cursor-pointer">
                    <input
                      type="radio"
                      name="qtype"
                      value="MCQ"
                      checked={questionForm.question_type === 'MCQ'}
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          question_type: 'MCQ',
                          options: [
                            { option_text: '', is_correct: true },
                            { option_text: '', is_correct: false },
                            { option_text: '', is_correct: false },
                            { option_text: '', is_correct: false },
                          ],
                        })
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span>Multiple Choice (MCQ)</span>
                  </label>
                  <label className="flex items-center gap-2 font-medium text-surface-800 cursor-pointer">
                    <input
                      type="radio"
                      name="qtype"
                      value="TRUE_FALSE"
                      checked={questionForm.question_type === 'TRUE_FALSE'}
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          question_type: 'TRUE_FALSE',
                          options: [
                            { option_text: 'True', is_correct: true },
                            { option_text: 'False', is_correct: false },
                          ],
                        })
                      }
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span>True / False</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Question Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter the question prompt or problem statement..."
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Marks Awarded <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm({ ...questionForm, marks: parseFloat(e.target.value) || 5 })}
                  className="w-32 px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Options Setup */}
              <div className="space-y-2 pt-2 border-t border-surface-100">
                <label className="block font-bold text-surface-800">
                  Options & Correct Answer Selection <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-surface-500 mb-2">
                  Select the radio button next to the correct answer.
                </p>

                {questionForm.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={opt.is_correct === true}
                      onChange={() => {
                        const nextOptions = questionForm.options.map((o, i) => ({
                          ...o,
                          is_correct: i === idx,
                        }));
                        setQuestionForm({ ...questionForm, options: nextOptions });
                      }}
                      className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-bold text-surface-500 w-6">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const nextOptions = [...questionForm.options];
                        nextOptions[idx].option_text = e.target.value;
                        setQuestionForm({ ...questionForm, options: nextOptions });
                      }}
                      className="flex-1 px-3 py-1.5 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">
                  Explanation / Answer Justification (Internal/Post-test)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional reasoning shown after evaluation..."
                  value={questionForm.explanation || ''}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="pt-4 border-t border-surface-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 border border-surface-300 text-surface-700 font-semibold rounded-lg hover:bg-surface-50 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingQuestion}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm transition-all text-xs"
                >
                  {isAddingQuestion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
