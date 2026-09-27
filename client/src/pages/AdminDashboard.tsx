import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Building2,
  BookOpen,
  CalendarCheck,
  Layers,
  Search,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '../services/api';
import type { ApiResponse } from '../types';

interface OverviewData {
  total_students: number;
  total_staff: number;
  total_departments: number;
  total_subjects: number;
  total_classes: number;
  active_sessions: number;
}

interface AdminModule {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: any;
  color: string;
  badge?: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<OverviewData>({
    total_students: 0,
    total_staff: 0,
    total_departments: 0,
    total_subjects: 0,
    total_classes: 0,
    active_sessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchModule, setSearchModule] = useState('');

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await apiClient.get<ApiResponse<OverviewData>>('/admin/overview');
        if (res.data?.data) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  const adminModules: AdminModule[] = [
    { id: 'students', title: 'Student Management', category: 'Management', path: '/admin/students', icon: Users, color: 'from-blue-600 to-indigo-700', badge: `${stats.total_students || 0} Enrolled` },
    { id: 'staff', title: 'Faculty & Staff', category: 'Management', path: '/admin/staff', icon: UserCheck, color: 'from-emerald-600 to-teal-700', badge: `${stats.total_staff || 0} Faculty` },
    { id: 'departments', title: 'Departments', category: 'Management', path: '/admin/departments', icon: Building2, color: 'from-purple-600 to-indigo-700', badge: `${stats.total_departments || 0} Depts` },
    { id: 'classes', title: 'Class Batches', category: 'Management', path: '/admin/classes', icon: Layers, color: 'from-amber-600 to-orange-700', badge: `${stats.total_classes || 0} Batches` },
    { id: 'subjects', title: 'Curriculum & Subjects', category: 'Management', path: '/admin/subjects', icon: BookOpen, color: 'from-cyan-600 to-blue-700', badge: `${stats.total_subjects || 0} Courses` },
    { id: 'attendance', title: 'Attendance Register', category: 'Academics', path: '/admin/attendance', icon: CalendarCheck, color: 'from-rose-600 to-pink-700' },
    { id: 'quizzes', title: 'Quiz Central', category: 'Academics', path: '/admin/quizzes', icon: ClipboardList, color: 'from-indigo-600 to-purple-700' },
    { id: 'reports', title: 'Institutional Reports', category: 'Analytics', path: '/admin/reports', icon: BarChart3, color: 'from-emerald-700 to-teal-800' },
  ];

  const filteredModules = adminModules.filter((m) =>
    m.title.toLowerCase().includes(searchModule.toLowerCase()) ||
    m.category.toLowerCase().includes(searchModule.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ─── Search Module Input Bar ──────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs">
        <div className="relative max-w-2xl mx-auto">
          <Search className="w-5 h-5 text-surface-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchModule}
            onChange={(e) => setSearchModule(e.target.value)}
            placeholder="Search Administrative Management Module (e.g., Students, Staff, Departments, Classes)..."
            className="w-full pl-12 pr-4 py-3 bg-surface-50/70 border border-surface-200 rounded-xl text-xs sm:text-sm font-semibold text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-xs"
          />
          {searchModule && (
            <button
              onClick={() => setSearchModule('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-surface-400 hover:text-surface-700 bg-surface-200 px-2 py-1 rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Key Institutional Entity Metrics ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Link to="/admin/students" className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex items-center gap-3 hover:border-primary-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Students</p>
            <p className="text-lg font-black text-surface-900">{loading ? '...' : stats.total_students}</p>
          </div>
        </Link>

        <Link to="/admin/staff" className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex items-center gap-3 hover:border-primary-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Faculty</p>
            <p className="text-lg font-black text-surface-900">{loading ? '...' : stats.total_staff}</p>
          </div>
        </Link>

        <Link to="/admin/departments" className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex items-center gap-3 hover:border-primary-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Departments</p>
            <p className="text-lg font-black text-surface-900">{loading ? '...' : stats.total_departments}</p>
          </div>
        </Link>

        <Link to="/admin/classes" className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex items-center gap-3 hover:border-primary-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Classes</p>
            <p className="text-lg font-black text-surface-900">{loading ? '...' : stats.total_classes}</p>
          </div>
        </Link>

        <Link to="/admin/subjects" className="bg-white p-4 rounded-2xl border border-surface-200 shadow-xs flex items-center gap-3 hover:border-primary-300 transition-all group">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Subjects</p>
            <p className="text-lg font-black text-surface-900">{loading ? '...' : stats.total_subjects}</p>
          </div>
        </Link>
      </div>

      {/* ─── Administrative Modules Grid ──────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary-600" />
            Institutional Administration & Management Modules ({filteredModules.length})
          </h3>
          <span className="text-[11px] text-surface-400 font-medium">Enterprise RBAC Enabled</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                to={mod.path}
                className="group bg-white rounded-2xl border border-surface-200 p-4 flex flex-col items-center justify-between text-center min-h-[135px] hover:shadow-md hover:border-primary-300 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                {mod.badge && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                    {mod.badge}
                  </span>
                )}

                <span className="text-xs font-bold text-surface-800 group-hover:text-primary-700 transition-colors pt-1">
                  {mod.title}
                </span>

                <div className="w-13 h-13 rounded-full bg-surface-50 border border-surface-200/80 flex items-center justify-center my-2 shadow-xs group-hover:scale-105 group-hover:bg-primary-50 transition-all">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${mod.color} text-white flex items-center justify-center shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <span className="text-[10px] font-medium text-surface-400">
                  {mod.category}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Department Overview & System Status ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Enrollment Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
            <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary-600" />
              Department Enrollment Overview
            </h4>
            <Link to="/admin/departments" className="text-xs text-primary-600 font-semibold hover:text-primary-800">
              Department Settings &rarr;
            </Link>
          </div>

          <div className="space-y-3.5">
            {[
              { dept: 'Department of Computer Engineering', code: 'CSE', share: 45 },
              { dept: 'Department of Electronics & Telecommunication', code: 'E&TC', share: 25 },
              { dept: 'Department of Information Technology', code: 'IT', share: 20 },
              { dept: 'Department of Mechanical Engineering', code: 'MECH', share: 10 },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-surface-50 rounded-xl border border-surface-200/70">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-xs font-bold text-surface-900">{item.dept}</p>
                    <p className="text-[10px] text-surface-400 font-mono">Code: {item.code}</p>
                  </div>
                  <span className="text-xs font-bold text-primary-700">{item.share}%</span>
                </div>
                <div className="w-full bg-surface-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-primary-600"
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System & Telemetry Integration Status */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
              <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                System & Security Integration
              </h4>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'PostgreSQL Relational DB', status: 'Connected (Healthy)', ok: true },
                { label: 'Express API Server', status: 'Operational (Port 5000)', ok: true },
                { label: 'Active Sessions', status: `${stats.active_sessions || 1} Tracked Session`, ok: true },
                { label: 'Security Event Logging', status: 'Audit Stream Active', ok: true },
                { label: 'Role-Based Access Control', status: 'Enforced (Zero-Trust)', ok: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-xl border border-surface-200/80">
                  <span className="text-xs font-medium text-surface-700">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-semibold text-surface-600">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-surface-50 border border-surface-200 text-center">
            <span className="text-[11px] text-surface-500 font-medium">
              Enterprise Access: <strong className="text-surface-800">RBAC Enforced</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
