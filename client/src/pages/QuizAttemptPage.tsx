import { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Award,
  BookOpen,
  Check,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService } from '../services/quizService';
import type { QuizAttemptDetail, QuizResult, QuizQuestion } from '../types';

export function QuizAttemptPage() {
  const { attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<QuizAttemptDetail | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // question_id -> selected_option_id
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Post submission result
  const [result, setResult] = useState<QuizResult | null>(null);

  // Timer state (seconds remaining)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Load Attempt data
  const loadAttempt = async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await quizService.getAttempt(attemptId);
      setAttemptDetail(data);

      // Preload saved answers
      const answersMap: Record<string, string> = {};
      data.answers.forEach((ans) => {
        if (ans.selected_option_id) {
          answersMap[ans.question_id] = ans.selected_option_id;
        }
      });
      setSelectedAnswers(answersMap);

      // If attempt is already submitted or timed out, load result
      if (data.attempt.status !== 'IN_PROGRESS') {
        const res = await quizService.getAttemptResult(attemptId);
        setResult(res);
      } else {
        // Calculate remaining duration
        const startedTime = new Date(data.attempt.started_at).getTime();
        const durationMs = (data.quiz.duration_minutes || 30) * 60 * 1000;
        const expiryTime = startedTime + durationMs;
        const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
        setSecondsRemaining(remaining);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load quiz attempt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempt();
  }, [attemptId]);

  // Live Timer Countdown
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0 || result) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto submit on zero
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, result]);

  // Handle Option Selection & Auto-Save
  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (result || attemptDetail?.attempt.status !== 'IN_PROGRESS') return;

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));

    try {
      setIsSaving(true);
      if (attemptId) {
        await quizService.saveAnswer(attemptId, {
          question_id: questionId,
          selected_option_id: optionId,
        });
      }
    } catch (err: any) {
      console.error('Answer auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Quiz
  const handleFinalSubmit = async () => {
    if (!attemptId) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await quizService.submitQuiz(attemptId);
      setResult(res);
      setShowSubmitModal(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-surface-200">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-surface-700">Preparing assessment interface...</p>
      </div>
    );
  }

  if (error && !attemptDetail) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-surface-200">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-surface-900 mb-1">Unable to Load Quiz</h3>
        <p className="text-sm text-surface-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/student/quizzes')}
          className="px-4 py-2 bg-surface-200 hover:bg-surface-300 text-surface-800 text-xs font-semibold rounded-lg"
        >
          Return to Quizzes
        </button>
      </div>
    );
  }

  // Result Summary Screen
  if (result) {
    const isPassed = result.is_passed;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl border border-surface-200 shadow-lg overflow-hidden">
          <div className={`p-8 text-center text-white ${isPassed ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              {isPassed ? <Award className="w-10 h-10 text-white" /> : <AlertTriangle className="w-10 h-10 text-white" />}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isPassed ? 'Assessment Completed — Passed!' : 'Assessment Completed — Below Passing'}
            </h2>
            <p className="text-sm text-white/80 mt-1">{result.quiz.title}</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
                <p className="text-xs text-surface-500 font-semibold mb-1">Score Obtained</p>
                <p className="text-2xl font-black text-surface-900">
                  {result.attempt.score} <span className="text-sm font-normal text-surface-400">/ {result.quiz.total_marks}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
                <p className="text-xs text-surface-500 font-semibold mb-1">Percentage</p>
                <p className="text-2xl font-black text-surface-900">{result.attempt.percentage}%</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
                <p className="text-xs text-surface-500 font-semibold mb-1">Passing Threshold</p>
                <p className="text-2xl font-black text-surface-900">{result.quiz.passing_marks} pts</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-2 text-xs text-surface-600">
              <div className="flex justify-between">
                <span>Attempt Status:</span>
                <span className="font-bold text-surface-900">{result.attempt.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Questions Answered:</span>
                <span className="font-bold text-surface-900">{result.answers_count}</span>
              </div>
              <div className="flex justify-between">
                <span>Correct Answers:</span>
                <span className="font-bold text-emerald-700">{result.correct_answers_count}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={() => navigate('/student/quizzes')}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all"
              >
                Back to All Quizzes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const questions = attemptDetail?.questions || [];
  const currentQuestion: QuizQuestion | undefined = questions[currentQIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = (secondsRemaining ?? 999) < 300; // < 5 mins

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Assessment Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-surface-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 uppercase tracking-wider mb-0.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{attemptDetail?.quiz.subject_code} • {attemptDetail?.quiz.subject_name}</span>
          </div>
          <h1 className="text-xl font-bold text-surface-900">{attemptDetail?.quiz.title}</h1>
        </div>

        {/* Live Timer Pill */}
        {secondsRemaining !== null && (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm shadow-sm ${
              isLowTime
                ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                : 'bg-surface-50 border-surface-200 text-surface-800'
            }`}
          >
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-500' : 'text-surface-500'}`} />
            <span>Time Left: {formatTimer(secondsRemaining)}</span>
          </div>
        )}
      </div>

      {/* Main Test Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Question Content (3 cols) */}
        <div className="md:col-span-3 space-y-5">
          {currentQuestion && (
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-surface-100">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                  Question {currentQIndex + 1} of {totalQuestions}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {currentQuestion.marks} Marks
                </span>
              </div>

              {/* Question Prompt */}
              <div className="text-base font-semibold text-surface-900 leading-relaxed">
                {currentQuestion.question_text}
              </div>

              {/* Option Choices */}
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/40 text-primary-900 font-semibold shadow-sm'
                          : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50/80 text-surface-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-surface-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-surface-400 w-5">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span className="text-sm flex-1">{opt.option_text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Auto-save status */}
              <div className="text-right text-[11px] text-surface-400 font-medium">
                {isSaving ? 'Saving answer to secure cloud...' : 'Answer recorded'}
              </div>

              {/* Navigation Controls */}
              <div className="pt-4 border-t border-surface-100 flex items-center justify-between">
                <button
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-surface-200 rounded-lg text-xs font-semibold text-surface-700 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-surface-900 hover:bg-surface-800 text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Quiz</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question Selector Palette (1 col) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-4">
            <h3 className="font-bold text-surface-900 text-xs uppercase tracking-wider">
              Question Navigator
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = !!selectedAnswers[q.id];
                const isCurrent = idx === currentQIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-primary-600 ring-offset-2 bg-primary-600 text-white shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-surface-100 space-y-1.5 text-[11px] text-surface-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-surface-100 border border-surface-200"></span>
                <span>Unanswered ({totalQuestions - answeredCount})</span>
              </div>
            </div>

            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Final Submission</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Submit */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-surface-900">Confirm Quiz Submission</h3>

            <p className="text-xs text-surface-600 leading-relaxed">
              You have answered <strong>{answeredCount}</strong> out of <strong>{totalQuestions}</strong> questions.
              {totalQuestions - answeredCount > 0 && (
                <span className="text-amber-600 font-semibold block mt-1">
                  Warning: You have {totalQuestions - answeredCount} unanswered questions!
                </span>
              )}
              Once submitted, your answers will be evaluated server-side and recorded.
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border border-surface-200 rounded-lg text-xs font-semibold text-surface-700 hover:bg-surface-50"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
