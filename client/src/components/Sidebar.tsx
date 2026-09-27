import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarSubItem {
  label: string;
  path: string;
  icon?: LucideIcon;
  badge?: number | string;
}

export interface SidebarItem {
  id?: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  badge?: number | string;
  children?: SidebarSubItem[];
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[];
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  sections,
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
  onNavigate,
}: SidebarProps) {
  const location = useLocation();

  // Manage open/expanded state for groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand parent group if active child route matches current path
  useEffect(() => {
    const newOpen: Record<string, boolean> = {};
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          const isChildActive = item.children.some(
            (child) =>
              location.pathname === child.path ||
              (child.path !== '/' && location.pathname.startsWith(child.path + '/'))
          );
          if (isChildActive) {
            newOpen[item.label] = true;
          }
        }
      });
    });

    setOpenGroups((prev) => ({
      ...prev,
      ...newOpen,
    }));
  }, [location.pathname, sections]);

  const toggleGroup = (groupLabel: string) => {
    if (collapsed) {
      // If collapsed, expand the sidebar and open the group
      onToggle();
      setOpenGroups((prev) => ({
        ...prev,
        [groupLabel]: true,
      }));
      return;
    }

    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-50 md:z-30
        bg-surface-900 text-white
        transition-all duration-300 ease-in-out
        flex flex-col select-none
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
        ${collapsed ? 'md:w-[var(--sidebar-collapsed-width)]' : 'md:w-[var(--sidebar-width)]'}
        w-[var(--sidebar-width)] max-w-[85vw]
      `}
    >
      {/* ─── Logo / Brand ─────────────────────────── */}
      <div className="flex items-center justify-between h-[var(--topnav-height)] px-4 border-b border-surface-700/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate leading-tight tracking-tight">
                Apex ERP
              </h1>
              <p className="text-[10px] text-surface-400 truncate leading-tight font-medium">
                Higher Education Portal
              </p>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ─── Navigation ───────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5 scrollbar-thin scrollbar-thumb-surface-700">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (!collapsed || mobileOpen) && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-surface-400 uppercase tracking-wider">
                {section.title}
              </p>
            )}

            <ul className="space-y-1">
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children && item.children.length > 0);

                if (hasChildren && item.children) {
                  const isGroupOpen = Boolean(openGroups[item.label]);
                  const hasActiveChild = item.children.some(
                    (child) =>
                      location.pathname === child.path ||
                      (child.path !== '/' && location.pathname.startsWith(child.path + '/'))
                  );

                  return (
                    <li key={item.label} className="space-y-1">
                      {/* Group Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        title={collapsed && !mobileOpen ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg
                          text-xs font-semibold transition-all duration-150 cursor-pointer
                          ${
                            hasActiveChild
                              ? 'text-primary-300 bg-surface-800/60'
                              : 'text-surface-300 hover:bg-surface-800 hover:text-white'
                          }
                          ${collapsed && !mobileOpen ? 'justify-center' : 'justify-between'}
                        `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon className={`w-4 h-4 flex-shrink-0 ${hasActiveChild ? 'text-primary-400' : 'text-surface-400'}`} />
                          {(!collapsed || mobileOpen) && (
                            <span className="truncate tracking-tight font-medium">
                              {item.label}
                            </span>
                          )}
                        </div>

                        {(!collapsed || mobileOpen) && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {item.badge !== undefined && (
                              <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {item.badge}
                              </span>
                            )}
                            {isGroupOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 text-surface-400 transition-transform duration-200" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-surface-400 transition-transform duration-200" />
                            )}
                          </div>
                        )}
                      </button>

                      {/* Submodule Items */}
                      {(!collapsed || mobileOpen) && isGroupOpen && (
                        <ul className="pl-3.5 pr-1 space-y-0.5 border-l border-surface-700/60 ml-4 my-1">
                          {item.children.map((child) => {
                            const isChildActive =
                              location.pathname === child.path ||
                              (child.path !== '/' && location.pathname.startsWith(child.path + '/'));
                            const ChildIcon = child.icon;

                            return (
                              <li key={child.path}>
                                <NavLink
                                  to={child.path}
                                  onClick={() => onNavigate?.()}
                                  className={`
                                    flex items-center gap-2.5 px-2.5 py-1.5 rounded-md
                                    text-xs transition-all duration-150
                                    ${
                                      isChildActive
                                        ? 'bg-primary-600/25 text-primary-300 font-bold shadow-xs'
                                        : 'text-surface-300 hover:bg-surface-800/80 hover:text-white font-medium'
                                    }
                                  `}
                                >
                                  {ChildIcon ? (
                                    <ChildIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isChildActive ? 'text-primary-400' : 'text-surface-400'}`} />
                                  ) : (
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isChildActive ? 'bg-primary-400' : 'bg-surface-500'}`} />
                                  )}
                                  <span className="truncate">{child.label}</span>
                                  {child.badge !== undefined && (
                                    <span className="ml-auto flex-shrink-0 bg-primary-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                      {child.badge}
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }

                // Top-level direct link
                if (!item.path) return null;
                const isItemActive = location.pathname === item.path;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => onNavigate?.()}
                      title={collapsed && !mobileOpen ? item.label : undefined}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg
                        text-xs font-semibold transition-all duration-150
                        ${
                          isItemActive
                            ? 'bg-primary-600/20 text-primary-300 font-bold'
                            : 'text-surface-300 hover:bg-surface-800 hover:text-white font-medium'
                        }
                        ${collapsed && !mobileOpen ? 'justify-center' : ''}
                      `}
                    >
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${isItemActive ? 'text-primary-400' : 'text-surface-400'}`} />
                      {(!collapsed || mobileOpen) && (
                        <>
                          <span className="truncate tracking-tight">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="ml-auto flex-shrink-0 bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ─── Collapse Toggle (Desktop Only) ──────────────────────── */}
      <div className="hidden md:block border-t border-surface-700/50 p-2.5">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors duration-150 cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-semibold">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
