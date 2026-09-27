import { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  AlertCircle,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Badge } from '../../components';
import apiClient from '../../services/api';
import type { ApiResponse } from '../../types';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface AssignedStaff {
  staff_id: string;
  employee_id: string;
  designation: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SubjectItem {
  id: string;
  department_id: string;
  department_name: string;
  department_code: string;
  code: string;
  name: string;
  description: string | null;
  semester: number;
  credits: number;
  assigned_staff_count: number;
  assigned_staff?: AssignedStaff[];
  created_at: string;
}

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedSem, setSelectedSem] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [formDeptId, setFormDeptId] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSemester, setFormSemester] = useState(5);
  const [formCredits, setFormCredits] = useState(3);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedDept) params.department_id = selectedDept;
      if (selectedSem) params.semester = selectedSem;

      const res = await apiClient.get<ApiResponse<SubjectItem[]>>('/subjects', { params });
      setSubjects(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get<ApiResponse<Department[]>>('/departments');
      setDepartments(res.data.data || []);
      if (res.data.data?.length > 0 && !formDeptId) {
        setFormDeptId(res.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [selectedDept, selectedSem]);

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormDeptId(departments[0]?.id || '');
    setFormCode('');
    setFormName('');
    setFormDesc('');
    setFormSemester(5);
    setFormCredits(3);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setFormDeptId(sub.department_id);
    setFormCode(sub.code);
    setFormName(sub.name);
    setFormDesc(sub.description || '');
    setFormSemester(sub.semester);
    setFormCredits(sub.credits);
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (editingSubject) {
        await apiClient.put(`/subjects/${editingSubject.id}`, {
          department_id: formDeptId,
          code: formCode,
          name: formName,
          description: formDesc,
          semester: formSemester,
          credits: formCredits,
        });
      } else {
        await apiClient.post('/subjects', {
          department_id: formDeptId,
          code: formCode,
          name: formName,
          description: formDesc,
          semester: formSemester,
          credits: formCredits,
        });
      }
      setModalOpen(false);
      fetchSubjects();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sub: SubjectItem) => {
    if (!window.confirm(`Are you sure you want to delete subject ${sub.code} - ${sub.name}?`)) {
      return;
    }
    try {
      await apiClient.delete(`/subjects/${sub.id}`);
      fetchSubjects();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete subject');
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.department_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects & Curriculum"
        subtitle="Manage academic courses, syllabus structures, credits, and faculty allocations"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Subjects' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Subject
          </Button>
        }
      />

      {/* ─── Filters Bar ─── */}
      <Card>
        <CardBody className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-surface-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* ─── Subjects Grid ─── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardBody className="p-8 text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-semibold">{error}</p>
          </CardBody>
        </Card>
      ) : filteredSubjects.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center text-surface-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-surface-300" />
            <p className="text-base font-semibold text-surface-700">No subjects found</p>
            <p className="text-xs mt-1">Get started by adding a curriculum subject.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSubjects.map((sub) => (
            <Card key={sub.id} hover>
              <CardBody className="p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="primary">{sub.code}</Badge>
                      <Badge variant="neutral">Sem {sub.semester}</Badge>
                      <Badge variant="accent">{sub.credits} Credits</Badge>
                    </div>
                    <h3 className="text-base font-bold text-surface-900 mt-1">{sub.name}</h3>
                    <p className="text-xs text-primary-600 font-medium mb-1">
                      {sub.department_name} ({sub.department_code})
                    </p>
                    <p className="text-xs text-surface-500 line-clamp-2">
                      {sub.description || 'No detailed course description.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(sub)}
                      className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-surface-100 rounded-md transition-colors"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub)}
                      className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs">
                  <span className="text-surface-500 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-accent-600" /> Assigned Faculty:
                  </span>
                  <span className="font-semibold text-surface-800">
                    {sub.assigned_staff_count > 0
                      ? `${sub.assigned_staff_count} Faculty Assigned`
                      : 'Unassigned'}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Create / Edit Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-200">
            <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-4">
              <h3 className="text-base font-bold text-surface-900">
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-surface-400 hover:text-surface-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Department *
                </label>
                <select
                  required
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS501"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Semester *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={formSemester}
                    onChange={(e) => setFormSemester(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Credits *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formCredits}
                    onChange={(e) => setFormCredits(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Subject Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Description / Syllabus Topics
                </label>
                <textarea
                  rows={3}
                  placeholder="Course objectives, curriculum outline..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
