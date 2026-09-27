import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  Layers,
  Home,
  X,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { marksService } from '../services/marksService';
import type {
  MarkComponent,
  ComponentType,
} from '../types';

export function MarksPage() {
  const { user } = useAuth();
  const dashboardPath = `/${user?.role?.toLowerCase() || 'staff'}/dashboard`;

  const [loading, setLoading] = useState(true);
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Components List
  const [components, setComponents] = useState<MarkComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<MarkComponent | null>(null);

  // Eligible students for selected component
  const [studentsRoster, setStudentsRoster] = useState<Array<{
    student_id: string;
    student_roll_number: string;
    enrollment_number: string;
    first_name: string;
    last_name: string;
    email: string;
    mark_id: string | null;
    marks_obtained: number | null;
    status: string;
    remarks: string | null;
    published_at: string | null;
  }>>([]);

  // Local marks entry state map: student_id -> { marks_obtained: string, remarks: string }
  const [marksState, setMarksState] = useState<Record<string, { marks_obtained: string; remarks: string }>>({});

  // Filter & Search
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create Component Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createComponentForm, setCreateComponentForm] = useState<{
    name: string;
    code: string;
    description: string;
    subject_id: string;
    class_id: string;
    max_marks: number;
    weightage: number;
    component_type: ComponentType;
  }>({
    name: '',
    code: '',
    description: '',
    subject_id: '',
    class_id: '',
    max_marks: 20,
    weightage: 20,
    component_type: 'INTERNAL',
  });

  const loadComponents = async () => {
    try {
      setComponentsLoading(true);
      setError(null);
      const data = await marksService.getComponents();
      setComponents(data);
      if (data.length > 0 && !selectedComponent) {
        setSelectedComponent(data[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load mark components');
    } finally {
      setComponentsLoading(false);
      setLoading(false);
    }
  };

  const loadComponentStudents = async (compId: string) => {
    try {
      setStudentsLoading(true);
      setError(null);
      const data = await marksService.getComponentStudents(compId);
      setStudentsRoster(data.students);

      const stateMap: Record<string, { marks_obtained: string; remarks: string }> = {};
      data.students.forEach(s => {
        stateMap[s.student_id] = {
          marks_obtained: s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained.toString() : '',
          remarks: s.remarks || '',
        };
      });
      setMarksState(stateMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load component students');
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadComponents();
  }, []);

  useEffect(() => {
    if (selectedComponent) {
      loadComponentStudents(selectedComponent.id);
    }
  }, [selectedComponent?.id]);

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createComponentForm.name.trim() || !createComponentForm.code.trim()) {
      setError('Component name and code are required');
      return;
    }
    if (!createComponentForm.subject_id) {
      setError('Subject selection is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const created = await marksService.createComponent({
        name: createComponentForm.name.trim(),
        code: createComponentForm.code.trim().toUpperCase(),
        description: createComponentForm.description,
        subject_id: createComponentForm.subject_id,
        max_marks: Number(createComponentForm.max_marks),
        weightage: Number(createComponentForm.weightage),
        component_type: createComponentForm.component_type,
      });

      setSuccessMessage(`Component "${created.name}" created successfully!`);
      setShowCreateModal(false);
      setCreateComponentForm({
        name: '',
        code: '',
        description: '',
        subject_id: '',
        class_id: '',
        max_marks: 20,
        weightage: 20,
        component_type: 'INTERNAL',
      });
      await loadComponents();
      setSelectedComponent(created);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create mark component');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComponent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete component "${name}"?`)) return;
    try {
      setLoading(true);
      await marksService.deleteComponent(id);
      setSuccessMessage(`Component "${name}" deleted.`);
      if (selectedComponent?.id === id) {
        setSelectedComponent(null);
      }
      await loadComponents();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete mark component');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMarks = async (publish: boolean = false) => {
    if (!selectedComponent) return;

    const entries: Array<{ student_id: string; marks_obtained: number; remarks: string; status: 'DRAFT' | 'PUBLISHED' }> = [];
    const maxMarks = selectedComponent.max_marks;

    for (const student of studentsRoster) {
      const state = marksState[student.student_id];
      if (state && state.marks_obtained !== '') {
        const val = parseFloat(state.marks_obtained);
        if (isNaN(val) || val < 0) {
          setError(`Invalid marks for ${student.first_name} ${student.last_name}: Marks cannot be negative.`);
          return;
        }
        if (val > maxMarks) {
          setError(`Marks for ${student.first_name} ${student.last_name} (${val}) exceeds maximum (${maxMarks}).`);
          return;
        }
        entries.push({
          student_id: student.student_id,
          marks_obtained: val,
          remarks: state.remarks || '',
          status: publish ? 'PUBLISHED' : 'DRAFT',
        });
      }
    }

    if (entries.length === 0) {
      setError('Please enter marks for at least one student before saving.');
      return;
    }

    try {
      setSavingMarks(true);
      setError(null);
      await marksService.enterMarks({
        component_id: selectedComponent.id,
        entries,
      });

      setSuccessMessage(publish ? `Marks published successfully for ${entries.length} student(s)!` : `Draft marks saved for ${entries.length} student(s).`);
      await loadComponentStudents(selectedComponent.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save student marks');
    } finally {
      setSavingMarks(false);
    }
  };

  const subjectsList = Array.from(new Set(components.map(c => c.subject_code).filter(Boolean)));

  const filteredComponents = components.filter(c => {
    if (filterSubject !== 'ALL' && c.subject_code !== filterSubject) return false;
    if (filterType !== 'ALL' && c.component_type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.subject_name && c.subject_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const componentTypesList: ComponentType[] = ['ASSIGNMENT', 'QUIZ', 'INTERNAL', 'PRACTICAL', 'PROJECT', 'OTHER'];

  if (loading && components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600 text-sm font-medium">Loading marks management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Institutional Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Link
          to={dashboardPath}
          className="flex items-center gap-1 text-gray-500 hover:text-primary-700 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span>/</span>
        <span>Academic Assessment</span>
        <span>/</span>
        <span className="text-gray-800 font-semibold">Marks & Grades Management</span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Award className="w-6 h-6 text-yellow-300" />
            <h1 className="text-xl font-bold">Continuous Internal Assessment (CIA) & Marks</h1>
          </div>
          <p className="text-blue-100 text-sm max-w-2xl">
            Configure course mark components, record student performance marks, and publish official academic evaluation scores.
          </p>
        </div>

        <button
          onClick={() => {
            if (user?.subjects && user.subjects.length > 0) {
              setCreateComponentForm(prev => ({
                ...prev,
                subject_id: user.subjects![0].id,
              }));
            } else if (components.length > 0) {
              setCreateComponentForm(prev => ({
                ...prev,
                subject_id: components[0].subject_id,
              }));
            }
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Component</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Left side components selector, right side mark entry table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Component Explorer (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-800 text-sm">Course Components</h2>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              {filteredComponents.length}
            </span>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-100 space-y-2.5 bg-gray-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search component or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Subject</label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full py-1 px-2 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Subjects</option>
                  {subjectsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-gray-400 mb-0.5">Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full py-1 px-2 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Types</option>
                  {componentTypesList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Component List */}
          <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
            {componentsLoading ? (
              <div className="py-8 text-center text-gray-400 text-xs flex justify-center items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Loading components...
              </div>
            ) : filteredComponents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                No mark components found.
              </div>
            ) : (
              filteredComponents.map(comp => {
                const isSelected = selectedComponent?.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedComponent(comp)}
                    className={`p-3.5 cursor-pointer transition-colors text-left flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-800">{comp.code}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {comp.component_type}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 line-clamp-1">{comp.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>{comp.subject_code}</span>
                        <span>•</span>
                        <span>Max: {comp.max_marks} M</span>
                        <span>•</span>
                        <span className="text-blue-600 font-semibold">{comp.marks_count || 0} entered</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteComponent(comp.id, comp.name);
                      }}
                      title="Delete component"
                      className="text-gray-300 hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Mark Entry Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedComponent ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Active Component Details Header */}
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex flex-col md:flex-row justify-between md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {selectedComponent.code}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {selectedComponent.subject_code} — {selectedComponent.subject_name}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-gray-800">{selectedComponent.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Class: {selectedComponent.class_name} • Max Marks: <strong className="text-gray-700">{selectedComponent.max_marks}</strong> • Weightage: {selectedComponent.weightage || selectedComponent.max_marks}%
                  </p>
                </div>

                {/* Save & Publish Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSaveMarks(false)}
                    disabled={savingMarks}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingMarks ? 'Saving...' : 'Save Draft'}</span>
                  </button>

                  <button
                    onClick={() => handleSaveMarks(true)}
                    disabled={savingMarks}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{savingMarks ? 'Publishing...' : 'Publish Marks'}</span>
                  </button>
                </div>
              </div>

              {/* Student Marks Table */}
              <div className="overflow-x-auto">
                {studentsLoading ? (
                  <div className="py-16 text-center text-gray-400 text-xs flex flex-col justify-center items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Loading class student list...</span>
                  </div>
                ) : studentsRoster.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-sm">
                    No students enrolled in this class batch.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-4">Roll No.</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4 w-32">Marks ({selectedComponent.max_marks})</th>
                        <th className="py-3 px-4">Remarks</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentsRoster.map(student => {
                        const cur = marksState[student.student_id] || { marks_obtained: '', remarks: '' };
                        const isPublished = student.status === 'PUBLISHED';
                        const numVal = parseFloat(cur.marks_obtained);
                        const isInvalid = !isNaN(numVal) && (numVal < 0 || numVal > selectedComponent.max_marks);

                        return (
                          <tr key={student.student_id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                              {student.student_roll_number}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="text-[10px] text-gray-400">{student.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedComponent.max_marks}
                                  step="0.5"
                                  value={cur.marks_obtained}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setMarksState(prev => ({
                                      ...prev,
                                      [student.student_id]: {
                                        ...prev[student.student_id],
                                        marks_obtained: val,
                                      },
                                    }));
                                  }}
                                  placeholder="0.0"
                                  className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded border focus:outline-none focus:ring-1 ${
                                    isInvalid
                                      ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-500'
                                      : 'border-gray-300 bg-white text-gray-800 focus:ring-blue-500'
                                  }`}
                                />
                                {isInvalid && (
                                  <span className="text-[9px] text-red-600 block mt-0.5">
                                    0 - {selectedComponent.max_marks} only
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={cur.remarks}
                                onChange={e => {
                                  const val = e.target.value;
                                  setMarksState(prev => ({
                                    ...prev,
                                    [student.student_id]: {
                                      ...prev[student.student_id],
                                      remarks: val,
                                    },
                                  }));
                                }}
                                placeholder="Add optional remarks..."
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isPublished ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  PUBLISHED
                                </span>
                              ) : student.status === 'DRAFT' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                  DRAFT
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  PENDING
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No Component Selected</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Select a course assessment component from the left panel to record and publish student evaluation marks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Mark Component */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-800 text-base">Create Assessment Component</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComponent} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Component Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Assignment 1 — Relational Algebra"
                    value={createComponentForm.name}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Component Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., CS501-A1"
                    value={createComponentForm.code}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Component Type *</label>
                  <select
                    value={createComponentForm.component_type}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, component_type: e.target.value as ComponentType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {componentTypesList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Subject Course *</label>
                  <select
                    value={createComponentForm.subject_id}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, subject_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select subject...</option>
                    {user?.subjects && user.subjects.length > 0 ? (
                      user.subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                      ))
                    ) : (
                      components.map(c => (
                        <option key={c.subject_id} value={c.subject_id}>{c.subject_code} — {c.subject_name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Maximum Marks *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={createComponentForm.max_marks}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, max_marks: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={createComponentForm.weightage}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, weightage: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Short description of assessment scope..."
                    value={createComponentForm.description}
                    onChange={e => setCreateComponentForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Create Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default MarksPage;
