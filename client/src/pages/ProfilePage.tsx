import { User as UserIcon, Mail, Phone, Building2, Calendar, Shield, Award, KeyRound, CheckCircle2, Layers, BookOpen } from 'lucide-react';
import { PageHeader, Card, CardHeader, CardBody, Badge } from '../components';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-white rounded-2xl border border-surface-200 p-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-surface-200" />
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl border border-surface-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-surface-200 shadow-xs">
        <p className="text-sm font-semibold text-surface-700">Unable to load profile information.</p>
      </div>
    );
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const email = user.email;
  const role = user.role;
  const departmentName = user.department_name || (user.department_code ? `Dept. of ${user.department_code}` : 'Institutional Administration');
  const phone = user.phone || 'Not provided';
  const accountStatus = user.account_status || 'ACTIVE';

  let officialIdLabel = 'User ID';
  let officialIdValue = user.id.slice(0, 8).toUpperCase();
  let academicStatusOrDesignation = 'System Administration';

  if (role === 'STUDENT') {
    officialIdLabel = 'Roll Number';
    officialIdValue = user.student_roll_number || user.enrollment_number || 'N/A';
    academicStatusOrDesignation = user.semester
      ? `Semester ${user.semester} (Year ${user.year || 1})`
      : 'Undergraduate Program';
  } else if (role === 'STAFF') {
    officialIdLabel = 'Employee ID';
    officialIdValue = user.employee_id || 'N/A';
    academicStatusOrDesignation = user.designation || 'Faculty Member';
  } else {
    officialIdLabel = 'Admin ID';
    officialIdValue = user.username || 'admin';
    academicStatusOrDesignation = 'Institutional Superuser';
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Active Term';

  const lastLogin = user.last_login_at
    ? new Date(user.last_login_at).toLocaleString()
    : 'Current Session Active';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Profile"
        subtitle="Verified identity, contact information, and academic affiliations"
        breadcrumbs={[
          { label: 'Dashboard', path: `/${role.toLowerCase()}/dashboard` },
          { label: 'Profile' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Avatar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardBody className="p-6 text-center">
              <div className="relative inline-block mx-auto mb-4">
                <div className="w-24 h-24 rounded-full bg-surface-900 flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-primary-50">
                  <UserIcon className="w-12 h-12 text-primary-200" />
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-5 h-5 border-2 border-white rounded-full ${
                    accountStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  title={accountStatus}
                />
              </div>

              <h2 className="text-xl font-bold text-surface-900">{fullName}</h2>
              <p className="text-xs text-surface-500 mb-3 font-mono">{email}</p>

              <div className="flex justify-center gap-2 mb-6">
                <Badge variant={role === 'ADMIN' ? 'warning' : role === 'STAFF' ? 'accent' : 'primary'}>
                  {role}
                </Badge>
                <Badge variant="neutral">
                  {officialIdLabel}: {officialIdValue}
                </Badge>
              </div>

              <div className="border-t border-surface-200 pt-4 text-left space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-500">Account Status</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                      accountStatus === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {accountStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-500">Member Since</span>
                  <span className="font-medium text-surface-700">{memberSince}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-500">Last Session Login</span>
                  <span className="font-mono text-surface-700 text-[11px] truncate max-w-[170px] text-right">
                    {lastLogin}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Account Security Card */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">Account Security</h3>
            </CardHeader>
            <CardBody className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200/80">
                <div className="flex items-center space-x-3">
                  <KeyRound className="w-4 h-4 text-primary-600" />
                  <div>
                    <p className="text-xs font-semibold text-surface-800">Password Storage</p>
                    <p className="text-[10px] text-surface-400">BCrypt 10-Round Salt Hash</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Protected
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200/80">
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-surface-800">Session Security</p>
                    <p className="text-[10px] text-surface-400">Database Tracked JWT</p>
                  </div>
                </div>
                <Badge variant="accent">Active Session</Badge>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Detailed Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">
                  Personal & Institutional Records
                </h3>
                <p className="text-xs text-surface-400 mt-0.5 font-medium">
                  Authoritative record data from PostgreSQL repository
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1.5 mb-1">
                    <UserIcon className="w-3.5 h-3.5 text-surface-400" /> Full Name
                  </label>
                  <p className="text-sm font-bold text-surface-900">{fullName}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-surface-400" /> Official Email
                  </label>
                  <p className="text-sm font-semibold text-surface-900 font-mono">{email}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-surface-400" /> Contact Phone
                  </label>
                  <p className="text-sm font-semibold text-surface-900">{phone}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-surface-400" /> Department
                  </label>
                  <p className="text-sm font-semibold text-surface-900">{departmentName}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-surface-400" /> Role & Authority
                  </label>
                  <p className="text-sm font-semibold text-surface-900">{role}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-surface-500 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-surface-400" /> Status & Term
                  </label>
                  <p className="text-sm font-semibold text-surface-900">{academicStatusOrDesignation}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Role-Specific Affiliation Details */}
          {role === 'STUDENT' && (
            <Card>
              <CardHeader>
                <div>
                  <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">
                    Student Enrollment & Academic Affiliations
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">Enrolled batch and assigned curriculum</p>
                </div>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Roll Number</p>
                    <p className="text-sm font-bold text-surface-900 font-mono">{user.student_roll_number || 'N/A'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Enrollment No</p>
                    <p className="text-sm font-bold text-surface-900 font-mono">{user.enrollment_number || 'N/A'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Academic Year</p>
                    <p className="text-sm font-bold text-surface-900">{user.year ? `Year ${user.year}` : 'Year 1'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Division</p>
                    <p className="text-sm font-bold text-primary-700">{user.division || 'A'}</p>
                  </div>
                </div>

                {user.enrolled_subjects && user.enrolled_subjects.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                      Enrolled Courses & Subjects ({user.enrolled_subjects.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {user.enrolled_subjects.map((sub) => (
                        <div key={sub.id} className="p-2.5 rounded-lg bg-surface-50 border border-surface-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-primary-700 font-mono">{sub.code}: </span>
                            <span className="font-medium text-surface-800">{sub.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-surface-500 bg-surface-200 px-1.5 py-0.5 rounded">
                            {sub.credits} Credits
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {role === 'STAFF' && (
            <Card>
              <CardHeader>
                <div>
                  <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">
                    Faculty Designation & Teaching Portfolio
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">Assigned subjects and institutional portfolio</p>
                </div>
              </CardHeader>
              <CardBody className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Official Employee ID</p>
                    <p className="text-sm font-bold text-surface-900 font-mono">{user.employee_id || 'N/A'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Academic Designation</p>
                    <p className="text-sm font-bold text-surface-900">{user.designation || 'Faculty Member'}</p>
                  </div>
                </div>

                {user.subjects && user.subjects.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary-600" />
                      Assigned Teaching Subjects ({user.subjects.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {user.subjects.map((sub) => (
                        <div key={sub.id} className="p-2.5 rounded-lg bg-surface-50 border border-surface-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-primary-700 font-mono">{sub.code}: </span>
                            <span className="font-medium text-surface-800">{sub.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-surface-500 bg-surface-200 px-1.5 py-0.5 rounded">
                            {sub.credits} Credits
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {role === 'ADMIN' && (
            <Card>
              <CardHeader>
                <div>
                  <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider">
                    Institutional Governance & System Authority
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">Administrative domain and authorization scope</p>
                </div>
              </CardHeader>
              <CardBody className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Administrator Username</p>
                    <p className="text-sm font-bold text-surface-900 font-mono">{user.username}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">RBAC Role</p>
                    <p className="text-sm font-bold text-amber-700">ROLE_ADMIN</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/80">
                    <p className="text-[11px] text-surface-500 mb-1">Access Scope</p>
                    <p className="text-sm font-bold text-surface-900">Institutional Full Access</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
