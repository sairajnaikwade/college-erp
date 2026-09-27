import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Search,
  Eye,
  Award,
  Calendar,
  X,
  Loader2,
  Home,
  ChevronRight,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { assignmentService } from '../services/assignmentService';
import type {
  Assignment,
  StudentAssignment,
  AssignmentSubmission,
  CreateAssignmentPayload,
} from '../types';

export function AssignmentsPage() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';
  const dashboardPath = `/${role.toLowerCase()}/dashboard`;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Student specific data
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  // Staff / Admin specific data
  const [staffAssignments, setStaffAssignments] = useState<Assignment[]>([]);

  // Filter States
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Student Submission Modal State
  const [selectedAssignmentForSubmit, setSelectedAssignmentForSubmit] = useState<StudentAssignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staff Create Assignment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAssignmentPayload>({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    academic_year: '2025-2026',
    semester: 5,
    due_date: '',
    max_marks: 25,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Staff Submissions & Grading Drawer State
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Assignment | null>(null);
  const [submissionsList, setSubmissionsList] = useState<AssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeMarks, setGradeMarks] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [isGrading, setIsGrading] = useState(false);

  // Fetch assignments data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'STUDENT') {
        const data = await assignmentService.getStudentAssignments();
        setStudentAssignments(data);
      } else if (role === 'STAFF') {
        const data = await assignmentService.getStaffAssignments();
        setStaffAssignments(data);
      } else {
        const res = await assignmentService.getAllAssignments();
        setStaffAssignments(res.rows);
      }
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve assignment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  // Handle Student Submit
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForSubmit) return;
    if (!submissionText.trim() && !attachmentName.trim()) {
      setError('Please provide submission text or attach a file');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await assignmentService.submitAssignment(selectedAssignmentForSubmit.id, {
        submission_text: submissionText,
        attachment_name: attachmentName || undefined,
        attachment_url: attachmentUrl || undefined,
      });
      setSuccessMessage('Assignment submitted successfully!');
      setSelectedAssignmentForSubmit(null);
      setSubmissionText('');
      setAttachmentName('');
      setAttachmentUrl('');
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit assignment:', err);
      setError(err?.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Staff View Submissions
  const handleOpenSubmissions = async (assignment: Assignment) => {
    setViewingSubmissionsFor(assignment);
    setLoadingSubmissions(true);
    try {
      const data = await assignmentService.getAssignmentSubmissions(assignment.id);
      setSubmissionsList(data);
    } catch (err: any) {
      console.error('Failed to load submissions:', err);
      setError('Failed to load submissions for this assignment');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Handle Staff Grade Submission
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    const marksNum = parseFloat(gradeMarks);
    if (isNaN(marksNum) || marksNum < 0) {
      setError('Please enter a valid numeric mark');
      return;
    }

    setIsGrading(true);
    setError(null);
    try {
      await assignmentService.gradeSubmission(gradingSubmission.id, {
        marks: marksNum,
        feedback: gradeFeedback || undefined,
      });
      setSuccessMessage('Grade and feedback saved successfully!');
      setGradingSubmission(null);
      setGradeMarks('');
      setGradeFeedback('');
      if (viewingSubmissionsFor) {
        const data = await assignmentService.getAssignmentSubmissions(viewingSubmissionsFor.id);
        setSubmissionsList(data);
      }
      await loadData();
    } catch (err: any) {
      console.error('Failed to grade submission:', err);
      setError(err?.response?.data?.message || 'Grading failed');
    } finally {
      setIsGrading(false);
    }
  };

  // Handle Staff Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.class_id || !createForm.subject_id || !createForm.due_date) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await assignmentService.createAssignment(createForm);
      setSuccessMessage('Assignment created and published successfully!');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        class_id: '',
        subject_id: '',
        academic_year: '2025-2026',
        semester: 5,
        due_date: '',
        max_marks: 25,
      });
      await loadData();
    } catch (err: any) {
      console.error('Failed to create assignment:', err);
      setError(err?.response?.data?.message || 'Failed to create assignment');
    } finally {
      setIsCreating(false);
    }
  };

  // Calculate Student Summary
  const studentTotal = studentAssignments.length;
  const studentSubmitted = studentAssignments.filter(
    (a) => a.submission_status === 'SUBMITTED' || a.submission_status === 'GRADED'
  ).length;
  const studentGraded = studentAssignments.filter((a) => a.submission_status === 'GRADED').length;
  const studentPending = studentAssignments.filter(
    (a) => !a.submission_status || a.submission_status === 'NOT_SUBMITTED'
  ).length;

  // Filtered Lists
  const filteredStudentList = studentAssignments.filter((a) => {
    const matchSub = filterSubject === 'ALL' || a.subject_code === filterSubject || a.subject_id === filterSubject;
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PENDING' && (!a.submission_status || a.submission_status === 'NOT_SUBMITTED')) ||
      (filterStatus === 'SUBMITTED' && a.submission_status === 'SUBMITTED') ||
      (filterStatus === 'GRADED' && a.submission_status === 'GRADED') ||
      (filterStatus === 'LATE' && a.submission_status === 'LATE');
    const matchQuery =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subject_name && a.subject_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSub && matchStatus && matchQuery;
  });

  const filteredStaffList = staffAssignments.filter((a) => {
    const matchSub = filterSubject === 'ALL' || a.subject_code === filterSubject || a.subject_id === filterSubject;
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchQuery =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subject_name && a.subject_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSub && matchStatus && matchQuery;
  });

  // Unique subjects for filter
  const availableSubjects = Array.from(
    new Set(
      (role === 'STUDENT' ? studentAssignments : staffAssignments)
        .map((a) => a.subject_code)
        .filter(Boolean)
    )
  );

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
        <span className="text-primary-700 font-bold">Assignments & Submissions</span>
      </nav>

      {/* ─── Banner / Header Bar ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-primary-50 text-primary-700 border border-primary-100">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-surface-900 tracking-tight">
              {role === 'STUDENT'
                ? 'My Academic Assignments'
                : role === 'STAFF'
                ? 'Course Assignments & Evaluation'
                : 'Institution Assignment Records'}
            </h1>
          </div>
          <p className="text-xs text-surface-500">
            {role === 'STUDENT'
              ? 'View assigned coursework, submit responses, track due dates, and review faculty evaluations.'
              : 'Create course assignments, monitor student submissions, grade coursework, and provide feedback.'}
          </p>
        </div>

        {role !== 'STUDENT' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Summary Cards (Student Role) ─────────────── */}
      {role === 'STUDENT' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-surface-900">{studentTotal}</div>
              <div className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Total Assigned</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-surface-900">{studentPending}</div>
              <div className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Pending Action</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-surface-900">{studentSubmitted}</div>
              <div className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Submitted</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-surface-900">{studentGraded}</div>
              <div className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Evaluated</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Filter & Search Bar ──────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:flex-1 min-w-0 max-w-sm">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="text-xs px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Subjects</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Statuses</option>
            {role === 'STUDENT' ? (
              <>
                <option value="PENDING">Pending Submission</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="GRADED">Graded / Evaluated</option>
                <option value="LATE">Late Submission</option>
              </>
            ) : (
              <>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
                <option value="DRAFT">Draft</option>
              </>
            )}
          </select>
        </div>

        <div className="text-xs text-surface-500 font-medium">
          Showing {role === 'STUDENT' ? filteredStudentList.length : filteredStaffList.length} items
        </div>
      </div>

      {/* ─── Main Content / List ──────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 flex flex-col items-center justify-center text-surface-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-xs font-semibold">Loading assignments data...</p>
        </div>
      ) : role === 'STUDENT' ? (
        /* Student Assignment Cards Grid */
        filteredStudentList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center text-surface-500">
            <FileText className="w-10 h-10 mx-auto text-surface-300 mb-2" />
            <h3 className="text-sm font-bold text-surface-700">No Assignments Found</h3>
            <p className="text-xs text-surface-400 mt-1">There are no assignments matching your selected filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudentList.map((assign) => {
              const isPastDue = new Date(assign.due_date) < new Date();
              const isSubmitted = assign.submission_status === 'SUBMITTED' || assign.submission_status === 'GRADED';
              const isGraded = assign.submission_status === 'GRADED';

              return (
                <div
                  key={assign.id}
                  className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-100 text-surface-700 font-bold text-[10px] tracking-wide border border-surface-200">
                          {assign.subject_code}
                        </span>
                        <span className="text-xs font-semibold text-surface-500 truncate max-w-[160px]">
                          {assign.subject_name}
                        </span>
                      </div>

                      {/* Status Badge */}
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Award className="w-3 h-3" />
                          <span>{assign.marks_obtained} / {assign.max_marks} Marks</span>
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Submitted</span>
                        </span>
                      ) : isPastDue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-surface-900 leading-snug">{assign.title}</h3>
                      <p className="text-xs text-surface-600 mt-1 line-clamp-2 leading-relaxed">{assign.description}</p>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-surface-500 pt-1 border-t border-surface-100">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-surface-400" />
                        <span>Due: {new Date(assign.due_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-surface-400" />
                        <span>Max Marks: {assign.max_marks}</span>
                      </div>
                      {assign.faculty_first_name && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-surface-400" />
                          <span>Prof. {assign.faculty_last_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Faculty Feedback (if graded) */}
                    {isGraded && assign.feedback && (
                      <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs text-purple-900">
                        <div className="font-bold text-[10px] uppercase text-purple-700 tracking-wider mb-0.5">
                          Faculty Feedback:
                        </div>
                        <p className="italic">{assign.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-surface-100 flex items-center justify-between">
                    <div className="text-[11px] text-surface-400">
                      {isSubmitted && assign.submitted_at ? (
                        <span>Submitted on {new Date(assign.submitted_at).toLocaleDateString()}</span>
                      ) : (
                        <span>Submission portal open</span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAssignmentForSubmit(assign);
                        setSubmissionText(assign.submission_text || '');
                        setAttachmentName(assign.submission_attachment_name || '');
                        setAttachmentUrl(assign.submission_attachment_url || '');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSubmitted
                          ? 'bg-surface-100 hover:bg-surface-200 text-surface-700 border border-surface-200'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-xs'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitted ? 'Edit Submission' : 'Submit Work'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Staff / Faculty / Admin Table View */
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Subject & Class</th>
                  <th className="py-3 px-4">Assignment Title</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Max Marks</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-xs">
                {filteredStaffList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-surface-400">
                      No assignments found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaffList.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-surface-900">{a.subject_code}</div>
                        <div className="text-[11px] text-surface-500">{a.class_name || 'CSE Year 3 Sem 5'}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-surface-900 truncate">{a.title}</div>
                        <div className="text-[11px] text-surface-500 truncate">{a.description}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-surface-700">
                        {new Date(a.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-surface-900">{a.max_marks}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-100 text-surface-800 font-semibold text-[11px]">
                          <span>{a.total_submissions || 0} Submitted</span>
                          <span className="text-surface-400">|</span>
                          <span className="text-emerald-700">{a.graded_submissions || 0} Graded</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.status === 'CLOSED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-surface-100 text-surface-700 border border-surface-200'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenSubmissions(a)}
                          className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View & Grade</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Student Submission Modal ─────────────────── */}
      {selectedAssignmentForSubmit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-surface-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                  {selectedAssignmentForSubmit.subject_code}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-surface-900 mt-1">
                  Submit: {selectedAssignmentForSubmit.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAssignmentForSubmit(null)}
                className="text-surface-400 hover:text-surface-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  Submission Text / Notes / Repository URL
                </label>
                <textarea
                  rows={4}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Enter your solution, code explanations, or project link..."
                  className="w-full text-xs p-3 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  Attachment File Name / Identifier
                </label>
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. lab3_normalization_report.pdf"
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setSelectedAssignmentForSubmit(null)}
                  className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Confirm Submission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Staff Create Assignment Modal ────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-surface-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="text-sm sm:text-base font-bold text-surface-900">Create New Course Assignment</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-surface-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Lab 4: B+ Tree Indexing & Analysis"
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Description & Instructions *</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Detailed assignment problem statement, expectations, and grading criteria..."
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Max Marks *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={createForm.max_marks}
                    onChange={(e) => setCreateForm({ ...createForm, max_marks: parseFloat(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Target Class *</label>
                  <input
                    type="text"
                    required
                    value={createForm.class_id}
                    onChange={(e) => setCreateForm({ ...createForm, class_id: e.target.value })}
                    placeholder="Enter Class UUID"
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Course Subject *</label>
                  <input
                    type="text"
                    required
                    value={createForm.subject_id}
                    onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}
                    placeholder="Enter Subject UUID"
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Publish Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Staff Submissions Drawer / Modal ─────────── */}
      {viewingSubmissionsFor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-xl border border-surface-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                  {viewingSubmissionsFor.subject_code}
                </span>
                <h3 className="text-base font-bold text-surface-900 mt-1">
                  Submissions: {viewingSubmissionsFor.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingSubmissionsFor(null)}
                className="text-surface-400 hover:text-surface-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingSubmissions ? (
                <div className="py-8 flex flex-col items-center justify-center text-surface-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                  <span className="text-xs">Loading submissions...</span>
                </div>
              ) : submissionsList.length === 0 ? (
                <div className="py-8 text-center text-surface-400 text-xs">
                  No students have submitted work for this assignment yet.
                </div>
              ) : (
                submissionsList.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 bg-surface-50 border border-surface-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-surface-900">
                          {sub.student_first_name} {sub.student_last_name}
                        </span>
                        <span className="text-[11px] font-semibold text-surface-500">
                          ({sub.student_roll_number})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === 'GRADED'
                              ? 'bg-purple-50 text-purple-700'
                              : sub.status === 'LATE'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-surface-600 line-clamp-2 italic">
                        "{sub.submission_text || 'File submission only'}"
                      </p>
                      {sub.attachment_name && (
                        <div className="text-[11px] text-primary-600 font-semibold flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{sub.attachment_name}</span>
                        </div>
                      )}
                      {sub.status === 'GRADED' && (
                        <div className="text-[11px] text-purple-700 font-bold">
                          Marks: {sub.marks} / {viewingSubmissionsFor.max_marks} | Feedback: {sub.feedback || 'None'}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setGradingSubmission(sub);
                        setGradeMarks(sub.marks ? sub.marks.toString() : '');
                        setGradeFeedback(sub.feedback || '');
                      }}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{sub.status === 'GRADED' ? 'Re-Grade' : 'Grade Submission'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Staff Grade Single Submission Modal ─────── */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="text-base font-bold text-surface-900">
                Grade: {gradingSubmission.student_first_name} {gradingSubmission.student_last_name}
              </h3>
              <button onClick={() => setGradingSubmission(null)} className="text-surface-400 hover:text-surface-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  Marks Awarded (out of {viewingSubmissionsFor?.max_marks || 25}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={viewingSubmissionsFor?.max_marks || 100}
                  required
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                  placeholder="e.g. 23.5"
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Instructor Feedback & Remarks</label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Provide constructive feedback on code structure, test coverage, and documentation..."
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGrading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  <span>Save Grade</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default AssignmentsPage;
