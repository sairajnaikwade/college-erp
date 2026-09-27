import { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
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

interface ClassItem {
  id: string;
  department_id: string;
  department_name: string;
  department_code: string;
  name: string;
  year: number;
  semester: number;
  division: string;
  academic_year: string;
  student_count: number;
  created_at: string;
}

export function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formDeptId, setFormDeptId] = useState('');
  const [formName, setFormName] = useState('');
  const [formYear, setFormYear] = useState(1);
  const [formSemester, setFormSemester] = useState(1);
  const [formDivision, setFormDivision] = useState('A');
  const [formAcademicYear, setFormAcademicYear] = useState('2025-2026');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedDept) params.department_id = selectedDept;
      if (selectedYear) params.year = selectedYear;

      const res = await apiClient.get<ApiResponse<ClassItem[]>>('/classes', { params });
      setClasses(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load classes');
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
    fetchClasses();
  }, [selectedDept, selectedYear]);

  const openCreateModal = () => {
    setEditingClass(null);
    setFormDeptId(departments[0]?.id || '');
    setFormName('');
    setFormYear(1);
    setFormSemester(1);
    setFormDivision('A');
    setFormAcademicYear('2025-2026');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormDeptId(cls.department_id);
    setFormName(cls.name);
    setFormYear(cls.year);
    setFormSemester(cls.semester);
    setFormDivision(cls.division);
    setFormAcademicYear(cls.academic_year);
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (editingClass) {
        await apiClient.put(`/classes/${editingClass.id}`, {
          department_id: formDeptId,
          name: formName,
          year: formYear,
          semester: formSemester,
          division: formDivision,
          academic_year: formAcademicYear,
        });
      } else {
        await apiClient.post('/classes', {
          department_id: formDeptId,
          name: formName,
          year: formYear,
          semester: formSemester,
          division: formDivision,
          academic_year: formAcademicYear,
        });
      }
      setModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cls: ClassItem) => {
    if (!window.confirm(`Are you sure you want to delete class ${cls.name}?`)) {
      return;
    }
    try {
      await apiClient.delete(`/classes/${cls.id}`);
      fetchClasses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete class');
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.department_name.toLowerCase().includes(search.toLowerCase()) ||
      c.division.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Batches"
        subtitle="Manage academic classes, batch divisions, and student cohort allocations"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Classes' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Class
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
              placeholder="Search classes..."
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
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* ─── Main Table ─── */}
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
      ) : filteredClasses.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center text-surface-400">
            <Layers className="w-12 h-12 mx-auto mb-3 text-surface-300" />
            <p className="text-base font-semibold text-surface-700">No classes found</p>
            <p className="text-xs mt-1">Add a new academic class to get started.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <Card key={cls.id} hover>
              <CardBody className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <Badge variant="primary">{cls.department_code}</Badge>
                    <h3 className="text-base font-bold text-surface-900 mt-1">{cls.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cls)}
                      className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-surface-100 rounded-md transition-colors"
                      title="Edit Class"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cls)}
                      className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-surface-600 border-t border-surface-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-surface-400">Academic Year</span>
                    <span className="font-medium text-surface-800">{cls.academic_year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-400">Semester & Year</span>
                    <span className="font-medium text-surface-800">
                      Semester {cls.semester} (Year {cls.year})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-400">Division</span>
                    <span className="font-bold text-primary-600">Section {cls.division}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-surface-100">
                    <span className="text-surface-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Enrolled Students
                    </span>
                    <Badge variant={cls.student_count > 0 ? 'accent' : 'neutral'}>
                      {cls.student_count} Students
                    </Badge>
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
                {editingClass ? 'Edit Class' : 'Create New Class'}
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

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Class / Batch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE - Year 3 Sem 5 Div A"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Year *</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Semester *</label>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Division *</label>
                  <input
                    type="text"
                    required
                    placeholder="A"
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="2025-2026"
                    value={formAcademicYear}
                    onChange={(e) => setFormAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
