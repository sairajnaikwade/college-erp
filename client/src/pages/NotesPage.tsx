import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Download,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Home,
  ChevronRight,
  UserCheck,
  FileDown,
  Tag,
  ExternalLink,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { noteService } from '../services/noteService';
import apiClient from '../services/api';
import type {
  Note,
  NoteCategory,
  CreateNotePayload,
  UpdateNotePayload,
  ApiResponse,
} from '../types';

interface ClassOption {
  id: string;
  name: string;
  division?: string;
  department_id?: string;
  department_name?: string;
  academic_year?: string;
  semester?: number;
}

interface SubjectOption {
  id: string;
  code: string;
  name: string;
  department_id?: string;
  semester?: number;
}

const CATEGORY_LABELS: Record<NoteCategory, { label: string; color: string }> = {
  LECTURE_NOTES: { label: 'Lecture Notes', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  STUDY_MATERIAL: { label: 'Study Material', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PRACTICAL: { label: 'Lab Manual', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REFERENCE: { label: 'Reference Guide', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  QUESTION_BANK: { label: 'Question Bank', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  SYLLABUS: { label: 'Syllabus & Formulas', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  OTHER: { label: 'General Resource', color: 'bg-surface-100 text-surface-700 border-surface-200' },
};

export function NotesPage() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';
  const dashboardPath = `/${role.toLowerCase()}/dashboard`;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Notes data
  const [notes, setNotes] = useState<Note[]>([]);

  // Class and Subject database-backed options for staff/admin
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);

  // Filter States
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View Details / Download Modal
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);

  // Staff Create Modal & File Picker State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createForm, setCreateForm] = useState<CreateNotePayload>({
    title: '',
    description: '',
    class_id: '',
    subject_id: '',
    academic_year: '2025-2026',
    semester: 5,
    category: 'LECTURE_NOTES',
    status: 'PUBLISHED',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Staff Edit Modal
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editForm, setEditForm] = useState<UpdateNotePayload>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Load notes
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'STUDENT') {
        const data = await noteService.getStudentNotes();
        setNotes(data);
      } else if (role === 'STAFF') {
        const data = await noteService.getStaffNotes();
        setNotes(data);
      } else {
        const res = await noteService.getAllNotes();
        setNotes(res.rows);
      }
    } catch (err: any) {
      console.error('Failed to load notes:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve notes records');
    } finally {
      setLoading(false);
    }
  };

  // Load academic classes & subjects for staff dropdowns
  const loadAcademicDropdownData = async () => {
    if (role === 'STUDENT') return;
    try {
      const classRes = await apiClient.get<ApiResponse<ClassOption[]>>('/classes');
      const loadedClasses = classRes.data?.data || [];
      setClasses(loadedClasses);

      if (role === 'STAFF') {
        try {
          const profileRes = await apiClient.get<ApiResponse<{ assigned_subjects?: SubjectOption[] }>>('/staff/me');
          const assigned = profileRes.data?.data?.assigned_subjects || [];
          if (assigned.length > 0) {
            setSubjects(assigned);
          } else {
            const allSubRes = await apiClient.get<ApiResponse<SubjectOption[]>>('/subjects');
            setSubjects(allSubRes.data?.data || []);
          }
        } catch {
          const allSubRes = await apiClient.get<ApiResponse<SubjectOption[]>>('/subjects');
          setSubjects(allSubRes.data?.data || []);
        }
      } else {
        const allSubRes = await apiClient.get<ApiResponse<SubjectOption[]>>('/subjects');
        setSubjects(allSubRes.data?.data || []);
      }
    } catch (dropdownErr) {
      console.error('Failed to load academic options for dropdown:', dropdownErr);
    }
  };

  useEffect(() => {
    loadData();
    loadAcademicDropdownData();
  }, [role]);

  // Handle PDF file selection with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdfType) {
      setFileError('Please select a PDF file.');
      setSelectedPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('PDF file size must not exceed 10 MB.');
      setSelectedPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedPdfFile(file);
  };

  // Handle clearing selected file
  const handleClearFile = () => {
    setSelectedPdfFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Create Note with Multipart Form Data
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.class_id || !createForm.subject_id) {
      setError('Please fill in all required fields (Title, Target Class, Course Subject)');
      return;
    }

    if (!selectedPdfFile) {
      setFileError('Please select a PDF file to upload.');
      return;
    }

    setIsCreating(true);
    setError(null);
    setFileError(null);

    try {
      const selectedClassObj = classes.find((c) => c.id === createForm.class_id);

      const formData = new FormData();
      formData.append('title', createForm.title.trim());
      if (createForm.description) {
        formData.append('description', createForm.description.trim());
      }
      formData.append('class_id', createForm.class_id);
      formData.append('subject_id', createForm.subject_id);
      formData.append('category', createForm.category);
      formData.append('status', createForm.status || 'PUBLISHED');
      formData.append('academic_year', selectedClassObj?.academic_year || createForm.academic_year || '2025-2026');
      formData.append('semester', (selectedClassObj?.semester || createForm.semester || 5).toString());
      formData.append('file', selectedPdfFile);

      await noteService.createNote(formData);

      setSuccessMessage('Study material published successfully!');
      setShowCreateModal(false);
      setSelectedPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setCreateForm({
        title: '',
        description: '',
        class_id: '',
        subject_id: '',
        academic_year: '2025-2026',
        semester: 5,
        category: 'LECTURE_NOTES',
        status: 'PUBLISHED',
      });
      await loadData();
    } catch (err: any) {
      console.error('Failed to create note:', err);
      setError(err?.response?.data?.message || 'Failed to publish study material');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Update Note
  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    setIsUpdating(true);
    setError(null);
    try {
      await noteService.updateNote(editingNote.id, editForm);
      setSuccessMessage('Study material updated successfully!');
      setEditingNote(null);
      setEditForm({});
      await loadData();
    } catch (err: any) {
      console.error('Failed to update note:', err);
      setError(err?.response?.data?.message || 'Failed to update study material');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await noteService.deleteNote(id);
      setSuccessMessage('Study material deleted successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      setError(err?.response?.data?.message || 'Failed to delete study material');
    }
  };

  // Handle Secure PDF Download
  const handleDownloadPdf = async (note: Note) => {
    try {
      setDownloadingNoteId(note.id);
      await noteService.downloadNoteFile(note.id, note.file_name || `${note.title}.pdf`);
      setSuccessMessage(`Downloaded "${note.title}"`);
    } catch (err: any) {
      console.error('Download failed:', err);
      setError(err?.response?.data?.message || 'Failed to download study material PDF');
    } finally {
      setDownloadingNoteId(null);
    }
  };

  // Handle Secure PDF View in New Tab
  const handleViewPdf = async (note: Note) => {
    try {
      setDownloadingNoteId(note.id);
      await noteService.openNoteFileInNewTab(note.id);
    } catch (err: any) {
      console.error('View failed:', err);
      setError(err?.response?.data?.message || 'Failed to open study material PDF');
    } finally {
      setDownloadingNoteId(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'PDF Document';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Unique subjects for filter
  const availableSubjects = Array.from(
    new Set(notes.map((n) => n.subject_code).filter(Boolean))
  );

  // Filtered notes list
  const filteredNotes = notes.filter((n) => {
    const matchSub = filterSubject === 'ALL' || n.subject_code === filterSubject || n.subject_id === filterSubject;
    const matchCat = filterCategory === 'ALL' || n.category === filterCategory;
    const matchStatus = filterStatus === 'ALL' || n.status === filterStatus;
    const matchQuery =
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.description && n.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.subject_name && n.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.subject_code && n.subject_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.file_name && n.file_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSub && matchCat && matchStatus && matchQuery;
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
        <span className="text-primary-700 font-bold">Course Notes & Materials</span>
      </nav>

      {/* ─── Banner / Header Bar ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-surface-900 tracking-tight">
              {role === 'STUDENT'
                ? 'Course Notes & Study Materials'
                : role === 'STAFF'
                ? 'Faculty Study Material & Notes Registry'
                : 'Institutional Study Material Repository'}
            </h1>
          </div>
          <p className="text-xs text-surface-500">
            {role === 'STUDENT'
              ? 'Access faculty lecture slides, lab manuals, reference handouts, and question banks for your enrolled courses.'
              : 'Upload and organize course handouts, lab practical instructions, and reference material for your students.'}
          </p>
        </div>

        {role !== 'STUDENT' && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setError(null);
              setFileError(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Study Material</span>
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
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
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
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Category Quick Counters ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['LECTURE_NOTES', 'STUDY_MATERIAL', 'PRACTICAL', 'REFERENCE', 'QUESTION_BANK', 'SYLLABUS'] as NoteCategory[]).map((cat) => {
          const count = notes.filter((n) => n.category === cat && (role !== 'STUDENT' || n.status === 'PUBLISHED')).length;
          const conf = CATEGORY_LABELS[cat];
          const isSelected = filterCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(isSelected ? 'ALL' : cat)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary-50 border-primary-300 ring-2 ring-primary-500/20 shadow-xs'
                  : 'bg-white border-surface-200 hover:border-surface-300 shadow-xs'
              }`}
            >
              <div className="text-lg font-bold text-surface-900">{count}</div>
              <div className="text-[11px] font-semibold text-surface-600 truncate mt-0.5">{conf.label}</div>
            </button>
          );
        })}
      </div>

      {/* ─── Filter & Search Bar ──────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:flex-1 min-w-0">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:flex-1 min-w-0 max-w-sm">
            <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by topic, keyword, or course code..."
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
            <option value="ALL">All Course Subjects</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Resource Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Status Filter for Staff/Admin */}
          {role !== 'STUDENT' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          )}
        </div>

        <div className="text-xs text-surface-500 font-medium">
          Showing {filteredNotes.length} resources
        </div>
      </div>

      {/* ─── Content Grid / Table ─────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 flex flex-col items-center justify-center text-surface-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-xs font-semibold">Loading course study materials...</p>
        </div>
      ) : role === 'STUDENT' ? (
        /* Student Notes Cards Grid */
        filteredNotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center text-surface-500">
            <BookOpen className="w-10 h-10 mx-auto text-surface-300 mb-2" />
            <h3 className="text-sm font-bold text-surface-700">No Study Materials Found</h3>
            <p className="text-xs text-surface-400 mt-1">There are no study materials matching your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const catConf = CATEGORY_LABELS[note.category] || CATEGORY_LABELS.OTHER;
              const isDownloading = downloadingNoteId === note.id;

              return (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs hover:border-primary-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-surface-100 text-surface-700 font-bold text-[10px] tracking-wide border border-surface-200">
                        {note.subject_code}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${catConf.color}`}>
                        <Tag className="w-3 h-3" />
                        <span>{catConf.label}</span>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-sm font-bold text-surface-900 leading-snug">{note.title}</h3>
                      <p className="text-xs text-surface-500 font-semibold mt-0.5">{note.subject_name}</p>
                      {note.description && (
                        <p className="text-xs text-surface-600 mt-2 line-clamp-2 leading-relaxed">{note.description}</p>
                      )}
                    </div>

                    {/* PDF File Info Badge */}
                    <div className="p-2.5 bg-surface-50 rounded-xl border border-surface-200 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-rose-200">
                        PDF
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-surface-800 truncate">
                          {note.file_name || `${note.title}.pdf`}
                        </div>
                        <div className="text-[10px] text-surface-400 font-medium">
                          {formatFileSize(note.file_size)}
                        </div>
                      </div>
                    </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-surface-500 pt-2 border-t border-surface-100">
                      {note.uploader_first_name && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-surface-400" />
                          <span>Prof. {note.uploader_last_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-surface-400" />
                        <span>{note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Term 5'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-surface-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleViewPdf(note)}
                      disabled={isDownloading}
                      className="text-xs text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View PDF</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPdf(note)}
                      disabled={isDownloading}
                      className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download</span>
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
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Target Class</th>
                  <th className="py-3 px-4">Uploaded PDF</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-xs">
                {filteredNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-surface-400">
                      No study materials found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredNotes.map((note) => {
                    const catConf = CATEGORY_LABELS[note.category] || CATEGORY_LABELS.OTHER;
                    const isDownloading = downloadingNoteId === note.id;

                    return (
                      <tr key={note.id} className="hover:bg-surface-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-surface-900 whitespace-nowrap">
                          <div>{note.subject_code}</div>
                          <div className="text-[11px] font-normal text-surface-500">{note.subject_name}</div>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-surface-900 truncate">{note.title}</div>
                          <div className="text-[11px] text-surface-500 truncate">{note.description || 'No description'}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${catConf.color}`}>
                            {catConf.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-surface-700">
                          {note.class_name || 'CSE Year 3 Sem 5'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                          <div className="flex items-center gap-1.5 font-medium text-surface-800">
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px] border border-rose-200">
                              PDF
                            </span>
                            <span className="truncate max-w-[150px]" title={note.file_name || 'document.pdf'}>
                              {note.file_name || 'document.pdf'}
                            </span>
                          </div>
                          <div className="text-[10px] text-surface-400 mt-0.5">{formatFileSize(note.file_size)}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              note.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : note.status === 'DRAFT'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-surface-100 text-surface-600 border border-surface-200'
                            }`}
                          >
                            {note.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewPdf(note)}
                              disabled={isDownloading}
                              className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors cursor-pointer"
                              title="View PDF"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-primary-600" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(note)}
                              disabled={isDownloading}
                              className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setEditForm({
                                  title: note.title,
                                  description: note.description || '',
                                  category: note.category,
                                  status: note.status,
                                });
                              }}
                              className="p-1.5 hover:bg-surface-100 text-surface-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Note"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Details Modal ─────────────────── */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-surface-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-surface-100 text-surface-800 font-bold text-[10px] tracking-wide border border-surface-200">
                  {selectedNote.subject_code}
                </span>
                <span className="text-xs font-bold text-surface-600 truncate max-w-[240px]">
                  {selectedNote.subject_name}
                </span>
              </div>
              <button onClick={() => setSelectedNote(null)} className="text-surface-400 hover:text-surface-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <h3 className="text-base font-bold text-surface-900">{selectedNote.title}</h3>
                <p className="text-xs text-surface-600 mt-1 leading-relaxed">{selectedNote.description || 'No detailed instructions provided.'}</p>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-xl border border-surface-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-500 font-semibold">Resource Category:</span>
                  <span className="font-bold text-surface-800">{CATEGORY_LABELS[selectedNote.category]?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500 font-semibold">Author / Instructor:</span>
                  <span className="font-bold text-surface-800">
                    {selectedNote.uploader_first_name ? `Prof. ${selectedNote.uploader_first_name} ${selectedNote.uploader_last_name}` : 'Academic Faculty'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500 font-semibold">File Name:</span>
                  <span className="font-mono font-bold text-surface-700">{selectedNote.file_name || 'document.pdf'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500 font-semibold">File Size:</span>
                  <span className="font-bold text-surface-800">{formatFileSize(selectedNote.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500 font-semibold">Published Date:</span>
                  <span className="font-bold text-surface-800">
                    {selectedNote.published_at ? new Date(selectedNote.published_at).toLocaleDateString() : 'Current Term'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleViewPdf(selectedNote);
                  setSelectedNote(null);
                }}
                className="px-4 py-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>View PDF</span>
              </button>
              <button
                onClick={() => {
                  handleDownloadPdf(selectedNote);
                  setSelectedNote(null);
                }}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Staff Create Note Modal ─────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl border border-surface-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-surface-900">Upload Course Study Material</h3>
                <p className="text-[11px] text-surface-500 mt-0.5">Publish PDF notes, reference guides, or lab manuals</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedPdfFile(null);
                  setFileError(null);
                }}
                className="text-surface-400 hover:text-surface-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Material Title *</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Unit 3: Database Normalization Solved Examples"
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Description & Overview</label>
                <textarea
                  rows={2}
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Brief summary of lecture topics, covered theorems, and lab objectives..."
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Resource Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as NoteCategory })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Publish Status *</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PUBLISHED">Published (Visible to Students)</option>
                    <option value="DRAFT">Draft (Private)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              {/* Database-backed Target Class and Subject Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Target Class *</label>
                  <select
                    required
                    value={createForm.class_id}
                    onChange={(e) => setCreateForm({ ...createForm, class_id: e.target.value })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Target Class Batch</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.division ? `(${cls.division})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Course Subject *</label>
                  <select
                    required
                    value={createForm.subject_id}
                    onChange={(e) => setCreateForm({ ...createForm, subject_id: e.target.value })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Course Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code}: {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ─── Real PDF File Picker ─────────────────── */}
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  File / Study Material *
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload-file-input"
                />

                {!selectedPdfFile ? (
                  <label
                    htmlFor="pdf-upload-file-input"
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-surface-200 hover:border-primary-400 rounded-xl bg-surface-50 hover:bg-primary-50/20 transition-all cursor-pointer group"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold group-hover:bg-primary-700 transition-colors shadow-xs">
                        Choose PDF
                      </span>
                      <span className="text-xs text-surface-600 font-medium">
                        Select a course PDF from your computer
                      </span>
                    </div>
                    <p className="text-[11px] text-surface-400 mt-1.5 font-normal">
                      PDF format only (.pdf) • Maximum file size: 10 MB
                    </p>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-primary-50/50 border border-primary-200 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0 font-bold text-[10px] tracking-wider">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-surface-900 truncate">
                          {selectedPdfFile.name}
                        </p>
                        <p className="text-[11px] text-surface-500 font-medium">
                          PDF • {formatFileSize(selectedPdfFile.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {fileError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedPdfFile(null);
                    setFileError(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreating ||
                    !selectedPdfFile ||
                    !createForm.title.trim() ||
                    !createForm.class_id ||
                    !createForm.subject_id
                  }
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isCreating ? 'Publishing Material...' : 'Publish Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Staff Edit Note Modal ───────────────────── */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-surface-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="text-base font-bold text-surface-900">Edit Study Material</h3>
              <button onClick={() => setEditingNote(null)} className="text-surface-400 hover:text-surface-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateNote} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as NoteCategory })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 text-xs font-bold text-surface-600 hover:bg-surface-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default NotesPage;
