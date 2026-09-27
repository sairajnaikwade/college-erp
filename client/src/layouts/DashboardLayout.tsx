import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, TopNav, UserIdentityBar, SupportModal } from '../components';
import type { SidebarSection } from '../components';
import type { UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CalendarCheck,
  FileText,
  ClipboardList,
  Award,
  Megaphone,
  Clock,
  BarChart3,
  User,
  Building2,
  Calendar,
  GraduationCap,
  Layers,
  HelpCircle,
} from 'lucide-react';

// ─── Sidebar navigation per role (Hierarchical Module Structure) ─────────

const studentSections: SidebarSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
      { label: 'Profile', path: '/student/profile', icon: User },
    ],
  },
  {
    title: 'Academics',
    items: [
      {
        label: 'Academics',
        icon: BookOpen,
        children: [
          { label: 'Attendance', path: '/student/attendance', icon: CalendarCheck },
          { label: 'Assignments', path: '/student/assignments', icon: FileText },
          { label: 'Notes & Study Material', path: '/student/notes', icon: BookOpen },
          { label: 'Quizzes & Tests', path: '/student/quizzes', icon: ClipboardList },
          { label: 'Marks & Grades', path: '/student/marks', icon: Award },
          { label: 'Results', path: '/student/results', icon: GraduationCap },
        ],
      },
      {
        label: 'Academic Schedule',
        icon: Calendar,
        children: [
          { label: 'Timetable', path: '/student/timetable', icon: Clock },
        ],
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        label: 'Communication',
        icon: Megaphone,
        children: [
          { label: 'Notices', path: '/student/notices', icon: Megaphone },
        ],
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        label: 'Reports',
        icon: BarChart3,
        children: [
          { label: 'Academic Reports', path: '/student/reports', icon: BarChart3 },
        ],
      },
    ],
  },
];

const staffSections: SidebarSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
      { label: 'Profile', path: '/staff/profile', icon: User },
    ],
  },
  {
    title: 'Academics',
    items: [
      {
        label: 'Academics',
        icon: BookOpen,
        children: [
          { label: 'Attendance', path: '/staff/attendance', icon: CalendarCheck },
          { label: 'Assignments', path: '/staff/assignments', icon: FileText },
          { label: 'Notes & Study Material', path: '/staff/notes', icon: BookOpen },
          { label: 'Quizzes & Tests', path: '/staff/quizzes', icon: ClipboardList },
          { label: 'Marks & Grades', path: '/staff/marks', icon: Award },
          { label: 'Results', path: '/staff/results', icon: GraduationCap },
        ],
      },
      {
        label: 'Academic Schedule',
        icon: Calendar,
        children: [
          { label: 'Timetable', path: '/staff/timetable', icon: Clock },
        ],
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        label: 'Communication',
        icon: Megaphone,
        children: [
          { label: 'Notices', path: '/staff/notices', icon: Megaphone },
        ],
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        label: 'Reports',
        icon: BarChart3,
        children: [
          { label: 'Academic Reports', path: '/staff/reports', icon: BarChart3 },
        ],
      },
    ],
  },
];

const adminSections: SidebarSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Profile', path: '/admin/profile', icon: User },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Administration',
        icon: Building2,
        children: [
          { label: 'Departments', path: '/admin/departments', icon: Building2 },
          { label: 'Classes', path: '/admin/classes', icon: Layers },
          { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
          { label: 'Students', path: '/admin/students', icon: Users },
          { label: 'Staff', path: '/admin/staff', icon: UserCheck },
        ],
      },
    ],
  },
  {
    title: 'Academics',
    items: [
      {
        label: 'Academics',
        icon: BookOpen,
        children: [
          { label: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
          { label: 'Assignments', path: '/admin/assignments', icon: FileText },
          { label: 'Notes & Study Material', path: '/admin/notes', icon: BookOpen },
          { label: 'Quizzes & Tests', path: '/admin/quizzes', icon: ClipboardList },
          { label: 'Marks & Grades', path: '/admin/marks', icon: Award },
          { label: 'Results', path: '/admin/results', icon: GraduationCap },
        ],
      },
      {
        label: 'Academic Schedule',
        icon: Calendar,
        children: [
          { label: 'Timetable', path: '/admin/timetable', icon: Clock },
        ],
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        label: 'Communication',
        icon: Megaphone,
        children: [
          { label: 'Notices', path: '/admin/notices', icon: Megaphone },
        ],
      },
    ],
  },
  {
    title: 'Reports',
    items: [
      {
        label: 'Reports',
        icon: BarChart3,
        children: [
          { label: 'Academic Reports', path: '/admin/reports', icon: BarChart3 },
        ],
      },
    ],
  },
];

const sectionsByRole: Record<UserRole, SidebarSection[]> = {
  STUDENT: studentSections,
  STAFF: staffSections,
  ADMIN: adminSections,
};

interface DashboardLayoutProps {
  role: UserRole;
}

export function DashboardLayout({ role }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { user } = useAuth();

  const currentRole = user?.role || role;
  const displayName = user ? `${user.first_name} ${user.last_name}` : undefined;

  const handleMenuToggle = () => {
    // On mobile (< 768px), toggle the off-canvas drawer
    if (window.innerWidth < 768) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-800 flex flex-col font-sans overflow-x-hidden">
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-surface-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar (Off-canvas on mobile, fixed left on desktop) */}
      <Sidebar
        sections={sectionsByRole[currentRole]}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onNavigate={() => setMobileMenuOpen(false)}
      />

      {/* Top Header */}
      <TopNav
        sidebarCollapsed={sidebarCollapsed}
        onMenuToggle={handleMenuToggle}
        userName={displayName}
        userRole={currentRole}
      />

      <div
        className={`
          pt-[var(--topnav-height)] min-h-screen flex flex-col
          transition-all duration-300
          ml-0 ${sidebarCollapsed ? 'md:ml-[var(--sidebar-collapsed-width)]' : 'md:ml-[var(--sidebar-width)]'}
        `}
      >
        {/* User Identity Ribbon Subheader */}
        <UserIdentityBar />

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>

        {/* Floating Support Button at bottom left */}
        <div className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-30">
          <button
            onClick={() => setSupportOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer border border-emerald-500/30"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
            <span className="hidden xs:inline">Support</span>
          </button>
        </div>

        {/* Global Support Modal */}
        <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
      </div>
    </div>
  );
}
