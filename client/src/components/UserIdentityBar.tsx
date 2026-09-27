import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { GraduationCap, Briefcase, UserCheck } from 'lucide-react';

export const UserIdentityBar: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-white border-b border-surface-200 px-4 sm:px-6 py-2.5 shadow-xs animate-pulse">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-200" />
            <div className="space-y-1.5">
              <div className="w-32 h-3.5 bg-surface-200 rounded" />
              <div className="w-48 h-2.5 bg-surface-100 rounded" />
            </div>
          </div>
          <div className="hidden lg:block w-40 h-5 bg-surface-100 rounded" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = user.role;
  const fullName = `${user.first_name} ${user.last_name}`;
  const accountStatus = user.account_status || 'ACTIVE';

  let idLabel = '';
  let idValue = '';
  let departmentOrDesignation = '';
  const secondaryDetails: { label: string; value: string }[] = [];
  let RoleIcon = GraduationCap;

  if (role === 'STUDENT') {
    idLabel = 'Roll No';
    idValue = user.student_roll_number || user.enrollment_number || user.id.slice(0, 8).toUpperCase();
    departmentOrDesignation = user.department_name || (user.department_code ? `Dept. of ${user.department_code}` : 'Engineering');
    
    if (user.year) secondaryDetails.push({ label: 'Year', value: `Year ${user.year}` });
    if (user.semester) secondaryDetails.push({ label: 'Semester', value: `Sem ${user.semester}` });
    if (user.division) secondaryDetails.push({ label: 'Division', value: user.division });
    if (user.class_name) secondaryDetails.push({ label: 'Class', value: user.class_name });
    
    RoleIcon = GraduationCap;
  } else if (role === 'STAFF') {
    idLabel = 'Employee ID';
    idValue = user.employee_id || user.id.slice(0, 8).toUpperCase();
    departmentOrDesignation = user.department_name || (user.department_code ? `Dept. of ${user.department_code}` : 'Academic Faculty');
    
    if (user.designation) {
      secondaryDetails.push({ label: 'Designation', value: user.designation });
    }
    RoleIcon = Briefcase;
  } else {
    idLabel = 'Admin ID';
    idValue = user.username || user.id.slice(0, 8).toUpperCase();
    departmentOrDesignation = user.department_name || 'System & Institutional Administration';
    secondaryDetails.push({ label: 'Access Level', value: 'Superuser / Full RBAC' });
    RoleIcon = UserCheck;
  }

  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  const isAccountActive = accountStatus === 'ACTIVE';

  return (
    <div className="bg-white border-b border-surface-200 px-3 sm:px-6 py-2 sm:py-2.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 max-w-7xl mx-auto min-w-0">
        {/* Left: Avatar + Name + Status + Role-Specific Details */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Avatar Circle */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-900 text-white font-bold text-xs flex items-center justify-center ring-2 ring-primary-100">
              {initials || 'U'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ring-2 ring-white ${
                isAccountActive ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          {/* User Details */}
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-surface-900 uppercase tracking-tight truncate">
                {fullName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold flex-shrink-0 ${
                  isAccountActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isAccountActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {accountStatus}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] sm:text-xs text-surface-500">
              <span className="text-surface-300 hidden sm:inline">|</span>
              <span className="font-medium">
                {idLabel}: <strong className="font-mono text-surface-800">{idValue}</strong>
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-primary-700 font-semibold text-[11px]">
              <span className="text-surface-300">|</span>
              <span className="uppercase tracking-wider">
                {departmentOrDesignation}
              </span>
            </div>

            {secondaryDetails.map((item, idx) => (
              <div key={idx} className="hidden md:flex items-center gap-1 text-surface-500 text-[11px]">
                <span className="text-surface-300">|</span>
                <span>{item.label}: <strong className="text-surface-800">{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Role & Telemetry Indicator */}
        <div className="hidden xl:flex items-center gap-2 text-[11px] text-surface-500 bg-surface-50 px-2.5 py-1 rounded-md border border-surface-200 flex-shrink-0">
          <RoleIcon className="w-3.5 h-3.5 text-primary-600" />
          <span>Role: <strong className="text-surface-800">{role}</strong></span>
          <span className="text-surface-300">•</span>
          <span className="text-emerald-700 font-semibold">Security: Event Logging Active</span>
        </div>
      </div>
    </div>
  );
};
