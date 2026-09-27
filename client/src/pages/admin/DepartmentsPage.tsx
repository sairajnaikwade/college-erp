import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  BookOpen,
  Layers,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Badge } from '../../components';
import apiClient from '../../services/api';
import type { ApiResponse } from '../../types';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  student_count: number;
  staff_count: number;
  subject_count: number;
  class_count: number;
  created_at: string;
}

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiResponse<Department[]>>('/departments');
      setDepartments(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormName('');
    setFormCode('');
    setFormDesc('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormDesc(dept.description || '');
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (editingDept) {
        await apiClient.put(`/departments/${editingDept.id}`, {
          name: formName,
          code: formCode,
          description: formDesc,
        });
      } else {
        await apiClient.post('/departments', {
          name: formName,
          code: formCode,
          description: formDesc,
        });
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!window.confirm(`Are you sure you want to delete department ${dept.name} (${dept.code})?`)) {
      return;
    }
    try {
      await apiClient.delete(`/departments/${dept.id}`);
      fetchDepartments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete department');
    }
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Manage academic divisions, faculties, and enrolled student bodies"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Departments' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Department
          </Button>
        }
      />

      {/* ─── Search & Filters ─── */}
      <Card>
        <CardBody className="p-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by department name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <span className="text-xs text-surface-500">
            Showing {filteredDepts.length} of {departments.length} departments
          </span>
        </CardBody>
      </Card>

      {/* ─── Main Grid / Table ─── */}
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
      ) : filteredDepts.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center text-surface-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-surface-300" />
            <p className="text-base font-semibold text-surface-700">No departments found</p>
            <p className="text-xs mt-1">Get started by creating a new academic department.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDepts.map((dept) => (
            <Card key={dept.id} hover>
              <CardBody className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="primary">{dept.code}</Badge>
                      <h3 className="text-base font-bold text-surface-900 truncate">{dept.name}</h3>
                    </div>
                    <p className="text-xs text-surface-500 line-clamp-2 mb-4">
                      {dept.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-surface-100 rounded-md transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept)}
                      className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-surface-100 text-center">
                  <div className="p-2 rounded-lg bg-surface-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-surface-500 mb-0.5">
                      <Users className="w-3 h-3 text-primary-600" /> Students
                    </div>
                    <p className="text-sm font-bold text-surface-800">{dept.student_count}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-surface-500 mb-0.5">
                      <UserCheck className="w-3 h-3 text-accent-600" /> Staff
                    </div>
                    <p className="text-sm font-bold text-surface-800">{dept.staff_count}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-surface-500 mb-0.5">
                      <BookOpen className="w-3 h-3 text-amber-600" /> Subjects
                    </div>
                    <p className="text-sm font-bold text-surface-800">{dept.subject_count}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] text-surface-500 mb-0.5">
                      <Layers className="w-3 h-3 text-cyan-600" /> Classes
                    </div>
                    <p className="text-sm font-bold text-surface-800">{dept.class_count}</p>
                  </div>
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
                {editingDept ? 'Edit Department' : 'Create New Department'}
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
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science & Engineering"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the department curriculum..."
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
                  {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
