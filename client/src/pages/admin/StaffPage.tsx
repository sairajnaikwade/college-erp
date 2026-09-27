import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  BookOpen,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { PageHeader, Card, CardBody, Button, Badge } from '../../components';
import apiClient from '../../services/api';
import type { ApiResponse, AccountStatus } from '../../types';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface SubjectItem {
  id: string;
  department_id: string;
  name: string;
  code: string;
  semester: number;
}

interface AssignedSubject {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  academic_year: string;
  assigned_at: string;
}

interface StaffItem {
  staff_id: string;
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
  employee_id: string;
  designation: string;
  qualification: string | null;
  assigned_subjects?: AssignedSubject[];
  created_at: string;
}

export function StaffPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDesignation, setFormDesignation] = useState('Assistant Professor');
  const [formQualification, setFormQualification] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Subject Management Modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [targetStaff, setTargetStaff] = useState<StaffItem | null>(null);
  const [staffSubjects, setStaffSubjects] = useState<AssignedSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [subjectModalLoading, setSubjectModalLoading] = useState(false);
  const [subjectModalError, setSubjectModalError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedDept) params.department_id = selectedDept;
      if (selectedStatus) params.status = selectedStatus;

      const res = await apiClient.get<ApiResponse<StaffItem[]>>('/staff', { params });
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [deptRes, subRes] = await Promise.all([
        apiClient.get<ApiResponse<Department[]>>('/departments'),
        apiClient.get<ApiResponse<SubjectItem[]>>('/subjects'),
      ]);
      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (subRes.data.success) setAllSubjects(subRes.data.data);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedDept, selectedStatus]);

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormUsername('');
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormPhone('');
    setFormDeptId(departments[0]?.id || '');
    setFormEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormDesignation('Assistant Professor');
    setFormQualification('M.Tech, Ph.D');
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (st: StaffItem) => {
    setEditingStaff(st);
    setFormUsername(st.username);
    setFormEmail(st.email);
    setFormFirstName(st.first_name);
    setFormLastName(st.last_name);
    setFormPhone(st.phone || '');
    setFormDeptId(st.department_id);
    setFormEmployeeId(st.employee_id);
    setFormDesignation(st.designation);
    setFormQualification(st.qualification || '');
    setModalError(null);
    setModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (editingStaff) {
        const res = await apiClient.put<ApiResponse<StaffItem>>(`/staff/${editingStaff.staff_id}`, {
          first_name: formFirstName,
          last_name: formLastName,
          phone: formPhone || null,
          designation: formDesignation,
          qualification: formQualification || null,
        });
        if (res.data.success) {
          setModalOpen(false);
          fetchStaff();
        }
      } else {
        const res = await apiClient.post<ApiResponse<StaffItem>>('/staff', {
          username: formUsername,
          email: formEmail,
          password: 'Password@123',
          first_name: formFirstName,
          last_name: formLastName,
          phone: formPhone || null,
          department_id: formDeptId,
          employee_id: formEmployeeId,
          designation: formDesignation,
          qualification: formQualification || null,
        });
        if (res.data.success) {
          setModalOpen(false);
          fetchStaff();
        }
      }
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || 'Failed to save staff record');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: StaffItem) => {
    const nextStatus: AccountStatus = staff.account_status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await apiClient.patch<ApiResponse<any>>(`/staff/${staff.staff_id}/status`, {
        status: nextStatus,
      });
      if (res.data.success) {
        fetchStaff();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Open Subject Assignment Modal
  const openSubjectModal = async (st: StaffItem) => {
    setTargetStaff(st);
    setSubjectModalError(null);
    setSubjectModalOpen(true);
    setSubjectModalLoading(true);
    setSelectedSubjectId('');

    try {
      const res = await apiClient.get<ApiResponse<AssignedSubject[]>>(`/staff/${st.staff_id}/subjects`);
      if (res.data.success) {
        setStaffSubjects(res.data.data);
      }
    } catch (err: any) {
      setSubjectModalError(err.response?.data?.error?.message || 'Failed to load assigned subjects');
    } finally {
      setSubjectModalLoading(false);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStaff || !selectedSubjectId) return;

    setSubjectModalLoading(true);
    setSubjectModalError(null);

    try {
      const res = await apiClient.post<ApiResponse<any>>(
        `/staff/${targetStaff.staff_id}/subjects/${selectedSubjectId}`,
        { academic_year: academicYear }
      );
      if (res.data.success) {
        const refRes = await apiClient.get<ApiResponse<AssignedSubject[]>>(`/staff/${targetStaff.staff_id}/subjects`);
        if (refRes.data.success) {
          setStaffSubjects(refRes.data.data);
        }
        setSelectedSubjectId('');
        fetchStaff();
      }
    } catch (err: any) {
      setSubjectModalError(err.response?.data?.error?.message || 'Failed to assign subject');
    } finally {
      setSubjectModalLoading(false);
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!targetStaff) return;
    if (!confirm('Are you sure you want to remove this subject assignment?')) return;

    setSubjectModalLoading(true);
    setSubjectModalError(null);

    try {
      const res = await apiClient.delete<ApiResponse<any>>(
        `/staff/${targetStaff.staff_id}/subjects/${subjectId}`
      );
      if (res.data.success) {
        setStaffSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
        fetchStaff();
      }
    } catch (err: any) {
      setSubjectModalError(err.response?.data?.error?.message || 'Failed to remove subject');
    } finally {
      setSubjectModalLoading(false);
    }
  };

  // Filter available subjects to match staff member's department
  const eligibleSubjects = allSubjects.filter(
    s => targetStaff && s.department_id === targetStaff.department_id && !staffSubjects.some(as => as.subject_id === s.id)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Faculty & Staff"
        subtitle="Manage faculty members, designations, department alignments, and subject allocations"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Staff' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Faculty
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, employee ID, or username..."
                className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="relative">
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 flex justify-center items-center text-surface-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-12 text-center text-surface-400">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium text-surface-600">No faculty members found</p>
              <p className="text-sm">Try adjusting your search criteria or add a new faculty member.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200/60 bg-surface-50/50 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Faculty Member</th>
                    <th className="py-3.5 px-6">Employee ID</th>
                    <th className="py-3.5 px-6">Department</th>
                    <th className="py-3.5 px-6">Designation</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/60 text-sm">
                  {staffList.map(st => (
                    <tr key={st.staff_id} className="hover:bg-surface-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                            {st.first_name[0]}
                            {st.last_name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-surface-900">
                              {st.first_name} {st.last_name}
                            </div>
                            <div className="text-xs text-surface-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {st.email}
                              </span>
                              {st.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {st.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-surface-700">
                        {st.employee_id}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-800">
                          {st.department_code}
                        </span>
                        <div className="text-xs text-surface-500 mt-0.5">{st.department_name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-surface-800 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-surface-400" />
                          {st.designation}
                        </div>
                        {st.qualification && (
                          <div className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                            <GraduationCap className="w-3 h-3 text-surface-400" />
                            {st.qualification}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={
                            st.account_status === 'ACTIVE'
                              ? 'accent'
                              : st.account_status === 'LOCKED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {st.account_status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openSubjectModal(st)}
                            title="Manage Subject Allocations"
                            className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(st)}
                            title="Edit Faculty Details"
                            className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(st)}
                            title={st.account_status === 'ACTIVE' ? 'Disable Account' : 'Activate Account'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              st.account_status === 'ACTIVE'
                                ? 'text-surface-500 hover:text-danger-600 hover:bg-danger-50'
                                : 'text-surface-500 hover:text-primary-600 hover:bg-primary-50'
                            }`}
                          >
                            {st.account_status === 'ACTIVE' ? (
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
          )}
        </CardBody>
      </Card>

      {/* Create / Edit Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-surface-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-surface-900">
                  {editingStaff ? 'Edit Faculty Details' : 'Add New Faculty Member'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {!editingStaff && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={formUsername}
                        onChange={e => setFormUsername(e.target.value)}
                        placeholder="e.g. staff.sarah"
                        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        placeholder="sarah@college.edu"
                        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                        Department *
                      </label>
                      <select
                        value={formDeptId}
                        onChange={e => setFormDeptId(e.target.value)}
                        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={formEmployeeId}
                        onChange={e => setFormEmployeeId(e.target.value)}
                        placeholder="e.g. EMP-1001"
                        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={e => setFormFirstName(e.target.value)}
                    placeholder="Sarah"
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={e => setFormLastName(e.target.value)}
                    placeholder="Connor"
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDesignation}
                    onChange={e => setFormDesignation(e.target.value)}
                    placeholder="Associate Professor"
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={formQualification}
                    onChange={e => setFormQualification(e.target.value)}
                    placeholder="Ph.D, M.Tech"
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="pt-4 border-t border-surface-200/60 flex items-center justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingStaff ? 'Save Changes' : 'Create Faculty'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Allocations Modal */}
      {subjectModalOpen && targetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-surface-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <div>
                  <h3 className="font-semibold text-surface-900">
                    Subject Allocations
                  </h3>
                  <p className="text-xs text-surface-500">
                    {targetStaff.first_name} {targetStaff.last_name} ({targetStaff.department_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSubjectModalOpen(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {subjectModalError && (
                <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{subjectModalError}</span>
                </div>
              )}

              {/* Assign new subject form */}
              <form onSubmit={handleAssignSubject} className="p-4 bg-surface-50 rounded-xl border border-surface-200/60 space-y-3">
                <div className="text-xs font-semibold text-surface-700 uppercase">
                  Assign New Subject
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedSubjectId}
                      onChange={e => setSelectedSubjectId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select subject ({targetStaff.department_code})...</option>
                      {eligibleSubjects.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} — {sub.name} (Sem {sub.semester})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      placeholder="2025-2026"
                      required
                      className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={subjectModalLoading || !selectedSubjectId}
                  >
                    {subjectModalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Assign Subject
                  </Button>
                </div>
              </form>

              {/* Current assigned subjects list */}
              <div>
                <div className="text-xs font-semibold text-surface-700 uppercase mb-3">
                  Currently Assigned Subjects ({staffSubjects.length})
                </div>

                {subjectModalLoading && staffSubjects.length === 0 ? (
                  <div className="p-6 text-center text-surface-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : staffSubjects.length === 0 ? (
                  <div className="p-6 border border-dashed border-surface-200 rounded-xl text-center text-surface-400 text-sm">
                    No subjects assigned to this faculty member yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {staffSubjects.map(as => (
                      <div
                        key={as.id || as.subject_id}
                        className="flex items-center justify-between p-3 bg-surface-50 border border-surface-200/60 rounded-xl text-sm"
                      >
                        <div>
                          <div className="font-semibold text-surface-900">
                            {as.code} — {as.name}
                          </div>
                          <div className="text-xs text-surface-500">
                            Academic Year: {as.academic_year || 'Current'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(as.subject_id)}
                          title="Remove assignment"
                          className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-surface-200/60 flex justify-end">
                <Button variant="ghost" onClick={() => setSubjectModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
