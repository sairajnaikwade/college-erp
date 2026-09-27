import {
  Bell,
  User,
  LogOut,
  Menu,
  GraduationCap,
  Activity,
  HelpCircle,
  Megaphone,
  Maximize2,
  Minimize2,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { UserRole, Notice } from '../types';
import { useAuth } from '../hooks/useAuth';
import { SupportModal } from './SupportModal';
import { noticeService } from '../services/noticeService';

interface TopNavProps {
  sidebarCollapsed: boolean;
  onMenuToggle: () => void;
  userName?: string;
  userRole?: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  STUDENT: 'Student',
  STAFF: 'Faculty',
  ADMIN: 'Administrator',
};

const roleBadgeColors: Record<UserRole, string> = {
  STUDENT: 'bg-primary-50 text-primary-700 border border-primary-200',
  STAFF: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ADMIN: 'bg-amber-50 text-amber-800 border border-amber-200',
};

export function TopNav({
  sidebarCollapsed,
  onMenuToggle,
  userName,
  userRole = 'STUDENT',
}: TopNavProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [noticesError, setNoticesError] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const noticesRef = useRef<HTMLDivElement>(null);

  // Fetch campus notices on load and auth change
  useEffect(() => {
    let isMounted = true;
    const fetchNotices = async () => {
      try {
        setIsLoadingNotices(true);
        const data = await noticeService.getNotices({ limit: 5 });
        if (isMounted) {
          setNotices(data);
          setNoticesError(false);
        }
      } catch {
        if (isMounted) {
          setNoticesError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoadingNotices(false);
        }
      }
    };
    fetchNotices();
    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const displayName =
    userName ||
    (user ? `${user.first_name} ${user.last_name}` : 'Authenticated User');
  const displayRole = user?.role || userRole;

  const initials = displayName
    .replace('Dr. ', '')
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (noticesRef.current && !noticesRef.current.contains(event.target as Node)) {
        setNoticesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const dashboardPath = `/${displayRole.toLowerCase()}/dashboard`;
  const profilePath = `/${displayRole.toLowerCase()}/profile`;

  return (
    <>
      <header
        className={`
          fixed top-0 right-0 z-20
          h-[var(--topnav-height)]
          bg-white
          border-b border-surface-200
          flex items-center justify-between px-2.5 sm:px-4 md:px-6
          transition-all duration-300 shadow-xs
          left-0 ${sidebarCollapsed ? 'md:left-[var(--sidebar-collapsed-width)]' : 'md:left-[var(--sidebar-width)]'}
        `}
      >
        {/* ─── Left Section: Brand / Menu Toggle / Institutional Crest ─── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors cursor-pointer flex-shrink-0"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-800 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-300" />
            </div>
            <div className="hidden min-[400px]:block min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-surface-900 tracking-tight leading-tight truncate max-w-[140px] sm:max-w-[220px] md:max-w-none">
                Apex Institute of Technology
              </h1>
              <p className="text-[9px] sm:text-[10px] text-surface-400 font-medium leading-none truncate">
                Academic Portal & ERP Management
              </p>
            </div>
          </div>
        </div>

        {/* ─── Center: System Status Pill ──────────────────────── */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 border border-surface-200 text-surface-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>System Online</span>
          <span className="text-surface-300">•</span>
          <span className="text-[10px] text-surface-500 uppercase tracking-wider">Academic Year 2026-27</span>
        </div>

        {/* ─── Right Section: Quick Action Icons & Profile ──────── */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Home Shortcut */}
          <Link
            to={dashboardPath}
            className="p-2 rounded-lg text-surface-500 hover:text-primary-700 hover:bg-surface-100 transition-colors hidden sm:flex items-center justify-center"
            title="Dashboard"
          >
            <Home className="w-4 h-4 text-surface-600" />
          </Link>

          {/* Activity / Analytics Shortcut */}
          <div
            className="p-2 rounded-lg text-surface-400 hover:text-primary-700 hover:bg-surface-100 transition-colors hidden sm:flex items-center justify-center cursor-default"
            title="Telemetry Status: Active"
          >
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>

          {/* Help & Support Button */}
          <button
            onClick={() => setSupportOpen(true)}
            className="p-2 rounded-lg text-surface-500 hover:text-primary-700 hover:bg-surface-100 transition-colors cursor-pointer"
            title="Helpdesk & Support"
          >
            <HelpCircle className="w-4 h-4 text-surface-600" />
          </button>

          {/* Megaphone / Announcements Dropdown */}
          <div className="relative" ref={noticesRef}>
            <button
              onClick={() => setNoticesOpen(!noticesOpen)}
              className="p-2 rounded-lg text-surface-500 hover:text-amber-700 hover:bg-surface-100 transition-colors cursor-pointer relative"
              title="Notices & Bulletins"
            >
              <Megaphone className="w-4 h-4 text-amber-600" />
              {notices.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {noticesOpen && (
              <div className="fixed sm:absolute top-[calc(var(--topnav-height)+4px)] sm:top-auto right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-96 bg-white rounded-xl border border-surface-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-surface-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                    Institutional Bulletins
                  </h4>
                  <span className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-bold">
                    {isLoadingNotices ? '...' : `${notices.length} Recent`}
                  </span>
                </div>
                <div className="divide-y divide-surface-100 max-h-72 overflow-y-auto">
                  {isLoadingNotices ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-1.5 animate-pulse">
                          <div className="h-3 bg-surface-200 rounded w-1/3" />
                          <div className="h-3.5 bg-surface-200 rounded w-3/4" />
                          <div className="h-2.5 bg-surface-100 rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : noticesError ? (
                    <div className="p-4 text-center text-xs text-surface-400">
                      Unable to load campus notices at this time.
                    </div>
                  ) : notices.length === 0 ? (
                    <div className="p-4 text-center text-xs text-surface-400">
                      No new campus notices
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <div key={notice.id} className="p-3 hover:bg-surface-50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                              {notice.category}
                            </span>
                            {notice.priority === 'URGENT' && (
                              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                URGENT
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-surface-400">
                            {new Date(notice.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-surface-900 mt-1">{notice.title}</p>
                        <p className="text-[11px] text-surface-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notice.description}
                        </p>
                        <span className="text-[10px] text-surface-400 mt-1 block">
                          Issued by: {notice.published_by_name || 'Academic Administration'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button
            className="relative p-2 rounded-lg text-surface-500 hover:text-primary-700 hover:bg-surface-100 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-surface-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-600 rounded-full ring-2 ring-white" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-surface-500 hover:text-primary-700 hover:bg-surface-100 transition-colors hidden sm:flex items-center justify-center cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-surface-600" /> : <Maximize2 className="w-4 h-4 text-surface-600" />}
          </button>

          {/* Profile Dropdown & Initials Avatar */}
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full hover:bg-surface-100 transition-colors cursor-pointer border border-transparent hover:border-surface-200"
            >
              <div className="w-8 h-8 rounded-full bg-surface-900 text-white font-bold text-xs flex items-center justify-center ring-2 ring-primary-100">
                {initials || 'US'}
              </div>
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="fixed sm:absolute top-[calc(var(--topnav-height)+4px)] sm:top-auto right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] max-w-xs sm:w-64 bg-white rounded-xl border border-surface-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-surface-100">
                  <p className="text-sm font-bold text-surface-900 truncate">{displayName}</p>
                  <p className="text-xs text-surface-400 truncate">{user?.email || 'user@college.edu'}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadgeColors[displayRole]}`}>
                      {roleLabels[displayRole]}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Authenticated
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to={profilePath}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-surface-400" />
                    Institutional Profile
                  </Link>
                  <Link
                    to={dashboardPath}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                  >
                    <Home className="w-3.5 h-3.5 text-surface-400" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setSupportOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-surface-700 hover:bg-surface-50 transition-colors text-left cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-surface-400" />
                    Help & Support
                  </button>
                  <div className="border-t border-surface-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-danger-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-danger-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Support Center Modal */}
      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
