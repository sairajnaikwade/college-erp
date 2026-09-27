import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Building,
  User,
  Clock,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { noticeService } from '../services/noticeService';
import type { NoticeQueryParams } from '../services/noticeService';
import type {
  Notice,
  NoticeCategory,
  NoticePriority,
  NoticeTargetRole,
} from '../types';

const CATEGORY_MAP: Record<NoticeCategory, { label: string; bg: string; text: string; border: string }> = {
  ACADEMIC: { label: 'Academic', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ADMINISTRATIVE: { label: 'Administrative', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  EXAMINATION: { label: 'Examination', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  EVENT: { label: 'Event', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  GENERAL: { label: 'General', bg: 'bg-surface-100', text: 'text-surface-700', border: 'border-surface-200' },
  URGENT: { label: 'Urgent Alert', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const PRIORITY_MAP: Record<NoticePriority, { label: string; badge: string }> = {
  URGENT: { label: 'Urgent', badge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' },
  HIGH: { label: 'High Priority', badge: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold' },
  NORMAL: { label: 'Normal', badge: 'bg-surface-100 text-surface-700 border-surface-200' },
  LOW: { label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const TARGET_ROLE_MAP: Record<NoticeTargetRole, string> = {
  ALL: 'Campus Wide',
  STUDENT: 'Students Only',
  STAFF: 'Faculty & Staff',
  ADMIN: 'Administrators',
};

export function NoticesPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'STUDENT';
  const canCreateNotice = userRole === 'ADMIN' || userRole === 'STAFF';
  const isAdmin = userRole === 'ADMIN';

  // Data & loading states
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>('ALL');

  // Modals
  const [viewNotice, setViewNotice] = useState<Notice | null>(null);
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create / Edit Form State
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: NoticeCategory;
    priority: NoticePriority;
    target_role: NoticeTargetRole;
    expires_at: string;
    is_published: boolean;
  }>({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'NORMAL',
    target_role: 'ALL',
    expires_at: '',
    is_published: true,
  });

  // Fetch notices
  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: NoticeQueryParams = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedPriority !== 'ALL') params.priority = selectedPriority;
      if (isAdmin && selectedTargetRole !== 'ALL') params.target_role = selectedTargetRole;

      const data = await noticeService.getNotices(params);
      setNotices(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [selectedCategory, selectedPriority, selectedTargetRole]);

  // Filtered notices by search query
  const filteredNotices = useMemo(() => {
    if (!searchQuery.trim()) return notices;
    const query = searchQuery.toLowerCase();
    return notices.filter((n) =>
      n.title.toLowerCase().includes(query) ||
      n.description.toLowerCase().includes(query) ||
      (n.published_by_name && n.published_by_name.toLowerCase().includes(query)) ||
      (n.department_name && n.department_name.toLowerCase().includes(query)) ||
      (n.department_code && n.department_code.toLowerCase().includes(query))
    );
  }, [notices, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      description: '',
      category: 'GENERAL',
      priority: 'NORMAL',
      target_role: 'ALL',
      expires_at: '',
      is_published: true,
    });
    setShowCreateEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      description: notice.description,
      category: notice.category,
      priority: notice.priority,
      target_role: notice.target_role,
      expires_at: notice.expires_at ? notice.expires_at.split('T')[0] : '',
      is_published: notice.is_published,
    });
    setShowCreateEditModal(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Partial<Notice> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        target_role: formData.target_role,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_published: formData.is_published,
      };

      if (editingNotice) {
        await noticeService.updateNotice(editingNotice.id, payload);
        setSuccessMessage('Notice updated successfully.');
      } else {
        await noticeService.createNotice(payload);
        setSuccessMessage('Notice published successfully.');
      }

      setShowCreateEditModal(false);
      loadNotices();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save notice.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete notice (Admin only)
  const handleDeleteNotice = async () => {
    if (!deleteNoticeId) return;
    try {
      setSubmitting(true);
      await noticeService.deleteNotice(deleteNoticeId);
      setSuccessMessage('Notice deleted successfully.');
      setDeleteNoticeId(null);
      loadNotices();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold">
              <Megaphone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900 tracking-tight">
                Campus Notices & Bulletins
              </h1>
              <p className="text-xs text-surface-500 font-medium mt-0.5">
                Official institutional announcements, departmental circulars and academic alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadNotices}
            className="px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh Notices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canCreateNotice && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Notifications (Error / Success) ────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Filter & Search Bar ────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices by title, content, or publisher..."
              className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          {/* Priority & Target Role Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="HIGH">High Priority</option>
              <option value="NORMAL">Normal Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {isAdmin && (
              <select
                value={selectedTargetRole}
                onChange={(e) => setSelectedTargetRole(e.target.value)}
                className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="ALL">All Target Audiences</option>
                <option value="STUDENT">Students Only</option>
                <option value="STAFF">Faculty Only</option>
                <option value="ADMIN">Admin Only</option>
              </select>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            All Categories ({notices.length})
          </button>
          {(['ACADEMIC', 'ADMINISTRATIVE', 'EXAMINATION', 'EVENT', 'GENERAL', 'URGENT'] as NoticeCategory[]).map(
            (cat) => {
              const meta = CATEGORY_MAP[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {meta.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* ─── Notices List Grid ──────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-surface-200 p-5 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-surface-200 rounded w-20" />
                <div className="h-4 bg-surface-100 rounded w-16" />
              </div>
              <div className="h-5 bg-surface-200 rounded w-3/4" />
              <div className="space-y-1.5">
                <div className="h-3 bg-surface-100 rounded w-full" />
                <div className="h-3 bg-surface-100 rounded w-5/6" />
              </div>
              <div className="pt-2 border-t border-surface-100 flex justify-between">
                <div className="h-3 bg-surface-100 rounded w-24" />
                <div className="h-3 bg-surface-100 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-surface-800">No Bulletins Found</h3>
          <p className="text-xs text-surface-500 max-w-sm mx-auto">
            {searchQuery
              ? `No announcements match "${searchQuery}". Try adjusting your filters.`
              : 'There are currently no active campus bulletins or circulars in this category.'}
          </p>
          {canCreateNotice && (
            <button
              onClick={handleOpenCreate}
              className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Notice</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotices.map((notice) => {
            const catMeta = CATEGORY_MAP[notice.category] || CATEGORY_MAP.GENERAL;
            const canEdit = isAdmin || (userRole === 'STAFF' && notice.published_by === user?.id);
            const canDelete = isAdmin;

            return (
              <div
                key={notice.id}
                className="bg-white rounded-2xl border border-surface-200 hover:border-surface-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}
                      >
                        {catMeta.label}
                      </span>
                      {notice.priority === 'URGENT' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          URGENT
                        </span>
                      ) : notice.priority === 'HIGH' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                          High
                        </span>
                      ) : null}
                    </div>

                    <span className="text-[10px] font-medium text-surface-400 bg-surface-100 px-2 py-0.5 rounded-md">
                      {TARGET_ROLE_MAP[notice.target_role] || 'Campus Wide'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setViewNotice(notice)}
                    className="text-sm font-bold text-surface-900 leading-snug hover:text-primary-600 transition-colors cursor-pointer line-clamp-2"
                  >
                    {notice.title}
                  </h3>

                  {/* Description Snippet */}
                  <p className="text-xs text-surface-600 line-clamp-3 leading-relaxed">
                    {notice.description}
                  </p>

                  {/* Department Tag if present */}
                  {notice.department_name && (
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-500 font-medium">
                      <Building className="w-3 h-3 text-surface-400" />
                      <span>{notice.department_name} ({notice.department_code})</span>
                    </div>
                  )}
                </div>

                {/* Footer Meta & Actions */}
                <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-surface-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-surface-400" />
                      {notice.published_by_name || 'Academic Administration'}
                    </span>
                    <span className="text-[10px] text-surface-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-surface-400" />
                      {new Date(notice.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewNotice(notice)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 transition-colors cursor-pointer"
                      title="Read Full Notice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canEdit && (
                      <button
                        onClick={() => handleOpenEdit(notice)}
                        className="p-1.5 rounded-lg text-surface-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => setDeleteNoticeId(notice.id)}
                        className="p-1.5 rounded-lg text-surface-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal: View Notice Details ─────────────────────────────── */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-surface-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      CATEGORY_MAP[viewNotice.category]?.bg
                    } ${CATEGORY_MAP[viewNotice.category]?.text} ${CATEGORY_MAP[viewNotice.category]?.border}`}
                  >
                    {CATEGORY_MAP[viewNotice.category]?.label}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      PRIORITY_MAP[viewNotice.priority]?.badge
                    }`}
                  >
                    {PRIORITY_MAP[viewNotice.priority]?.label}
                  </span>
                  <span className="text-[10px] font-medium text-surface-500 bg-surface-100 px-2 py-0.5 rounded-md">
                    {TARGET_ROLE_MAP[viewNotice.target_role]}
                  </span>
                </div>
                <h3 className="text-base font-bold text-surface-900 leading-snug">
                  {viewNotice.title}
                </h3>
              </div>
              <button
                onClick={() => setViewNotice(null)}
                className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="p-3 bg-surface-50 rounded-xl grid grid-cols-2 gap-2 text-xs text-surface-600">
              <div>
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Published By</span>
                <span className="font-semibold text-surface-800">
                  {viewNotice.published_by_name || 'Academic Authority'}
                </span>
                {viewNotice.published_by_role && (
                  <span className="text-[10px] text-primary-600 font-bold block">
                    ({viewNotice.published_by_role})
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Published On</span>
                <span className="font-semibold text-surface-800">
                  {new Date(viewNotice.published_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {viewNotice.department_name && (
                <div className="col-span-2 pt-1 border-t border-surface-200">
                  <span className="text-[10px] text-surface-400 uppercase font-bold block">Department</span>
                  <span className="font-semibold text-surface-800">
                    {viewNotice.department_name} ({viewNotice.department_code})
                  </span>
                </div>
              )}
              {viewNotice.expires_at && (
                <div className="col-span-2 pt-1 border-t border-surface-200">
                  <span className="text-[10px] text-surface-400 uppercase font-bold block">Valid Until</span>
                  <span className="font-semibold text-surface-800">
                    {new Date(viewNotice.expires_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Full Content */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider">Announcement Content</h4>
              <div className="text-xs text-surface-800 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-surface-50/50 border border-surface-100 font-normal">
                {viewNotice.description}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewNotice(null)}
                className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Create / Edit Notice (Staff / Admin) ────────────── */}
      {showCreateEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">
                    {editingNotice ? 'Edit Notice / Bulletin' : 'Publish New Campus Bulletin'}
                  </h3>
                  <p className="text-[11px] text-surface-400">
                    {editingNotice ? 'Update announcement details' : 'Draft and broadcast institutional announcement'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateEditModal(false)}
                className="p-1.5 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Notice Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Midterm Examination Schedule Released"
                  className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Notice Content & Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide comprehensive details, instructions, links, or schedules..."
                  className="w-full px-3.5 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as NoticeCategory })}
                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium cursor-pointer"
                  >
                    <option value="GENERAL">General</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="EXAMINATION">Examination</option>
                    <option value="EVENT">Event</option>
                    <option value="URGENT">Urgent Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as NoticePriority })}
                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium cursor-pointer"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Alert</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              {/* Target Audience & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Target Audience</label>
                  <select
                    value={formData.target_role}
                    onChange={(e) => setFormData({ ...formData, target_role: e.target.value as NoticeTargetRole })}
                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium cursor-pointer"
                  >
                    <option value="ALL">Campus Wide (All)</option>
                    <option value="STUDENT">Students Only</option>
                    <option value="STAFF">Faculty & Staff</option>
                    <option value="ADMIN">Administrators Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium cursor-pointer"
                  />
                </div>
              </div>

              {/* Publish State */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-surface-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <span>Publish Immediately (visible to target audience)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-surface-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEditModal(false)}
                  className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingNotice ? 'Update Notice' : 'Publish Notice'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Delete Confirmation (Admin) ────────────────────── */}
      {deleteNoticeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-900">Delete Campus Bulletin</h3>
              <p className="text-xs text-surface-500 mt-1">
                Are you sure you want to permanently delete this notice? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteNoticeId(null)}
                className="w-full py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteNotice}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
