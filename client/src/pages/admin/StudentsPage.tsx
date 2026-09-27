import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  Layers,
  AlertCircle,
  Loader2,
  X,
  Mail,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Badge } from '../../components';
import apiClient from '../../services/api';
import type { ApiResponse, AccountStatus } from '../../types';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface ClassItem {
  id: string;
  department_id: string;
  name: string;
  year: number;
  division: string;
}

interface StudentItem {
  student_id: string;
  user_id: string;
  username: string;
  email: string;
  account_status: AccountStatus;
  first_name: string;
  last_name: string;
  phone: string | null;
  department_id: string;
  department_name: string;
  department_code: string;
  student_roll_number: string;
  enrollment_number: string;
  year: number;
  semester: number;
  division: string;
  current_class_id?: string | null;
  current_class_name?: string | null;
  created_at: string;
}

export function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formEnrollment, setFormEnrollment] = useState('');
  const [formYear, setFormYear] = useState(1);
  const [formSemester, setFormSemester] = useState(1);
  const [formDivision, setFormDivision] = useState('A');
  const [formClassId, setFormClassId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Assign Class Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<StudentItem | null>(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedDept) params.department_id = selectedDept;
      if (selectedYear) params.year = selectedYear;
      if (selectedStatus) params.account_status = selectedStatus;

      const res = await apiClient.get<ApiResponse<StudentItem[]>>('/students', { params });
      setStudents(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [deptRes, classRes] = await Promise.all([
        apiClient.get<ApiResponse<Department[]>>('/departments'),
        apiClient.get<ApiResponse<ClassItem[]>>('/classes'),
      ]);
      setDepartments(deptRes.data.data || []);
      setClasses(classRes.data.data || []);
      if (deptRes.data.data?.length > 0 && !formDeptId) {
        setFormDeptId(deptRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedDept, selectedYear, selectedStatus]);

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormUsername('');
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormPhone('');
    setFormDeptId(departments[0]?.id || '');
    setFormRoll('');
    setFormEnrollment('');
    setFormYear(1);
    setFormSemester(1);
    setFormDivision('A');
    setFormClassId('');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (stu: StudentItem) => {
    setEditingStudent(stu);
    setFormUsername(stu.username);
    setFormEmail(stu.email);
    setFormFirstName(stu.first_name);
    setFormLastName(stu.last_name);
    setFormPhone(stu.phone || '');
    setFormDeptId(stu.department_id);
    setFormRoll(stu.student_roll_number);
    setFormEnrollment(stu.enrollment_number);
    setFormYear(stu.year);
    setFormSemester(stu.semester);
    setFormDivision(stu.division);
    setFormClassId(stu.current_class_id || '');
    setModalError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (editingStudent) {
        await apiClient.put(`/students/${editingStudent.student_id}`, {
          first_name: formFirstName,
          last_name: formLastName,
          phone: formPhone,
          department_id: formDeptId,
          student_roll_number: formRoll,
          enrollment_number: formEnrollment,
          year: formYear,
          semester: formSemester,
          division: formDivision,
        });
      } else {
        await apiClient.post('/students', {
          username: formUsername,
          email: formEmail,
          first_name: formFirstName,
          last_name: formLastName,
          phone: formPhone,
          department_id: formDeptId,
          student_roll_number: formRoll,
          enrollment_number: formEnrollment,
          year: formYear,
          semester: formSemester,
          division: formDivision,
          class_id: formClassId || undefined,
        });
      }
      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to save student record');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (stu: StudentItem) => {
    const nextStatus = stu.account_status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change status of ${stu.first_name} ${stu.last_name} to ${nextStatus}?`)) {
      return;
    }
    try {
      await apiClient.patch(`/students/${stu.student_id}/status`, { status: nextStatus });
      fetchStudents();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update student status');
    }
  };

  const openAssignModal = (stu: StudentItem) => {
    setTargetStudent(stu);
    // filter classes matching student's department
    const validClasses = classes.filter((c) => c.department_id === stu.department_id);
    setTargetClassId(validClasses[0]?.id || '');
    setAssignError(null);
    setAssignModalOpen(true);
  };

  const handleAssignClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !targetClassId) return;

    setAssigning(true);
    setAssignError(null);

    try {
      await apiClient.post(`/students/${targetStudent.student_id}/class`, {
        class_id: targetClassId,
        academic_year: '2025-2026',
      });
      setAssignModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Failed to assign class');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        subtitle="Manage student enrollments, cohort assignments, and authentication status"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Students' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Student
          </Button>
        }
      />

      {/* ─── Search & Filters Bar ─── */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by name, roll, enrollment, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="LOCKED">Locked</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* ─── Table ─── */}
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
      ) : students.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center text-surface-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-surface-300" />
            <p className="text-base font-semibold text-surface-700">No students found</p>
            <p className="text-xs mt-1">Add students to start tracking academic data.</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50 text-surface-600 text-xs uppercase font-semibold">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Roll & Enrollment</th>
                  <th className="py-3.5 px-4">Department & Class</th>
                  <th className="py-3.5 px-4">Year / Sem</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {students.map((stu) => (
                  <tr key={stu.student_id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-surface-900">
                          {stu.first_name} {stu.last_name}
                        </p>
                        <p className="text-xs text-surface-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {stu.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-medium text-surface-800">{stu.student_roll_number}</p>
                      <p className="text-xs text-surface-400 font-mono">{stu.enrollment_number}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-surface-800">{stu.department_name}</p>
                      <p className="text-xs text-primary-600 font-medium">
                        {stu.current_class_name || 'No Class Assigned'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-medium text-surface-700">
                        Year {stu.year}, Sem {stu.semester} ({stu.division})
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          stu.account_status === 'ACTIVE'
                            ? 'accent'
                            : stu.account_status === 'DISABLED'
                            ? 'neutral'
                            : 'danger'
                        }
                      >
                        {stu.account_status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAssignModal(stu)}
                          className="p-1.5 text-surface-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                          title="Assign Class"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(stu)}
                          className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-surface-100 rounded-md transition-colors"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(stu)}
                          className={`p-1.5 rounded-md transition-colors ${
                            stu.account_status === 'ACTIVE'
                              ? 'text-surface-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-surface-400 hover:text-accent-600 hover:bg-accent-50'
                          }`}
                          title={stu.account_status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
                        >
                          {stu.account_status === 'ACTIVE' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Create / Edit Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-surface-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-4">
              <h3 className="text-base font-bold text-surface-900">
                {editingStudent ? 'Edit Student Details' : 'Register New Student'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {!editingStudent && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. student.johndoe"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john.doe@college.edu"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024CS101"
                    value={formRoll}
                    onChange={(e) => setFormRoll(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Enrollment Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ENR-2024-101"
                    value={formEnrollment}
                    onChange={(e) => setFormEnrollment(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Division *</label>
                  <input
                    type="text"
                    required
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingStudent ? 'Update Student' : 'Register Student'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Assign Class Modal ─── */}
      {assignModalOpen && targetStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-200">
            <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-4">
              <h3 className="text-base font-bold text-surface-900">
                Assign Class Cohort
              </h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="p-1 text-surface-400 hover:text-surface-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-surface-50 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-surface-800">
                Student: {targetStudent.first_name} {targetStudent.last_name}
              </p>
              <p className="text-surface-500">
                Department: {targetStudent.department_name} ({targetStudent.department_code})
              </p>
            </div>

            {assignError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Select Class Batch *
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {classes
                    .filter((c) => c.department_id === targetStudent.department_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-surface-400 mt-1">
                  * Only classes in {targetStudent.department_code} are eligible.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <Button variant="outline" type="button" onClick={() => setAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={assigning}>
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
