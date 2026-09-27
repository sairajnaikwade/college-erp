import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, AlertCircle, Loader2,
  HelpCircle, KeyRound, Building, GraduationCap, ShieldCheck,
  BookOpen, Users, Monitor, ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'student' | 'staff' | 'admin'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showOrgModal, setShowOrgModal] = useState(false);

  // Login-success transition state
  const [showTransition, setShowTransition] = useState(false);
  const [transitionRole, setTransitionRole] = useState('');
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // If already logged in, redirect to appropriate role portal
  useEffect(() => {
    if (isAuthenticated && user) {
      const targetRole = user.role.toLowerCase();
      navigate(`/${targetRole}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const roleMap: Record<'student' | 'staff' | 'admin', 'STUDENT' | 'STAFF' | 'ADMIN'> = {
    student: 'STUDENT',
    staff: 'STAFF',
    admin: 'ADMIN',
  };

  const handleRoleSelect = (role: 'student' | 'staff' | 'admin') => {
    setSelectedRole(role);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const authenticatedUser = await login(identifier, password, roleMap[selectedRole]);
      const targetRole = authenticatedUser.role.toLowerCase();

      // Show branded transition overlay before navigating
      setTransitionRole(targetRole);
      setShowTransition(true);
      setSubmitting(false);

      // Check if user prefers reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const transitionDuration = prefersReducedMotion ? 300 : 800;

      transitionTimerRef.current = setTimeout(() => {
        navigate(`/${targetRole}/dashboard`, { replace: true });
      }, transitionDuration);
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please verify credentials.';
      setErrorMsg(serverMessage);
      setSubmitting(false);
    }
  };

  const roleTitles = {
    student: 'Student',
    staff: 'Faculty',
    admin: 'Administrator',
  };

  const stats = [
    { icon: GraduationCap, value: '1L+', label: 'Students', color: 'text-primary-500' },
    { icon: Users, value: '500+', label: 'Faculty', color: 'text-rose-500' },
    { icon: BookOpen, value: '50+', label: 'Academic Modules', color: 'text-amber-500' },
    { icon: Monitor, value: '100%', label: 'Digital Campus', color: 'text-emerald-500' },
  ];

  const roleLabels: Record<string, string> = {
    student: 'Student',
    staff: 'Faculty',
    admin: 'Administrator',
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans relative overflow-hidden">

      {/* ═══════════ LOGIN SUCCESS TRANSITION OVERLAY ═══════════ */}
      {showTransition && (
        <div className="login-transition-overlay">
          <div className="login-transition-content">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-2xl shadow-xl mb-5">
              <GraduationCap className="w-9 h-9 text-amber-300" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 tracking-tight">
              Welcome back
            </h3>
            <p className="text-sm text-surface-400 font-medium mt-1">
              Loading your {roleLabels[transitionRole] || 'academic'} portal...
            </p>
            <div className="mt-5">
              <div className="login-transition-spinner" />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ LEFT PANEL — Institutional Branding ═══════════ */}
      <div className={`relative lg:w-[55%] w-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-sky-50 px-6 sm:px-10 lg:px-14 py-8 lg:py-10 overflow-hidden transition-opacity duration-300 ${showTransition ? 'opacity-0' : 'opacity-100'}`}>

        {/* Animated decorative dot grid — top right */}
        <div className="absolute top-16 right-12 w-28 h-28 opacity-20 pointer-events-none hidden lg:block login-anim-float-slow"
          style={{
            backgroundImage: 'radial-gradient(circle, #3b82f6 1.2px, transparent 1.2px)',
            backgroundSize: '12px 12px',
          }}
        />
        {/* Animated decorative dot grid — mid left */}
        <div className="absolute top-[50%] left-6 w-16 h-20 opacity-10 pointer-events-none hidden lg:block login-anim-float-slower"
          style={{
            backgroundImage: 'radial-gradient(circle, #93c5fd 1.2px, transparent 1.2px)',
            backgroundSize: '10px 10px',
          }}
        />
        {/* Decorative wave curves */}
        <svg className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-[0.05]" viewBox="0 0 800 600" fill="none" preserveAspectRatio="none">
          <path d="M600,0 Q700,150 600,300 Q500,450 600,600 L800,600 L800,0 Z" fill="#2563eb"/>
          <path d="M650,0 Q750,200 650,400 Q550,500 700,600 L800,600 L800,0 Z" fill="#3b82f6"/>
        </svg>
        {/* Ambient floating glow orbs */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-primary-200/15 rounded-full blur-3xl pointer-events-none login-anim-glow-drift" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-sky-200/10 rounded-full blur-3xl pointer-events-none login-anim-glow-drift-reverse" />

        {/* Top Brand Bar */}
        <div className="relative z-10 flex items-center justify-between mb-8 lg:mb-10 login-anim-stagger-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-surface-900 tracking-tight leading-tight">
                Apex Institute of Technology
              </h1>
              <p className="text-[11px] text-surface-400 font-medium">College ERP</p>
            </div>
          </div>
          <p className="hidden sm:block text-[11px] text-primary-500 font-semibold italic text-right leading-tight max-w-[140px]">
            Empowering Education Through Technology
          </p>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 mb-8 lg:mb-10 login-anim-stagger-2">
          <h2 className="text-2xl sm:text-3xl lg:text-[2.5rem] font-black text-surface-900 leading-[1.15] tracking-tight">
            A Digital Campus for a{' '}
            <span className="text-primary-600 login-anim-hero-highlight">Brighter Tomorrow!</span>
          </h2>
          <p className="mt-3 text-sm text-surface-500 font-medium max-w-md leading-relaxed">
            Unified Platform for Students, Faculty &amp; Administration
          </p>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 flex flex-wrap gap-4 sm:gap-6 mb-8 lg:mb-10 login-anim-stagger-3">
          {stats.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2.5 login-anim-stat-item" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
              <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-surface-200/70 flex items-center justify-center login-anim-stat-icon">
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
              </div>
              <div>
                <span className="text-base font-black text-surface-900 leading-none">{s.value}</span>
                <p className="text-[10px] text-surface-400 font-semibold mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="relative z-10 mb-6 lg:mb-8 login-anim-stagger-4">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-surface-200/60 rounded-2xl px-5 py-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900 leading-tight">Secure · Reliable · Scalable</p>
              <p className="text-[11px] text-surface-400 font-medium">Enterprise Higher Education ERP System</p>
            </div>
          </div>
        </div>

        {/* Campus Photo */}
        <div className="relative z-10 flex-1 min-h-[160px] lg:min-h-[220px] rounded-2xl overflow-hidden shadow-lg border border-surface-200/50 login-anim-stagger-5">
          <img
            src="/campus.jpg"
            alt="Apex Institute of Technology Campus"
            className="w-full h-full object-cover login-anim-campus-zoom"
          />
        </div>

        {/* Bottom Status Bar */}
        <div className="relative z-10 flex items-center justify-between mt-5 text-xs text-surface-400 font-medium login-anim-stagger-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Portal Services Online
          </span>
          <span>Academic Term 2026-27</span>
        </div>
      </div>


      {/* ═══════════ RIGHT PANEL — Login Form ═══════════ */}
      <div className={`lg:w-[45%] w-full flex items-center justify-center px-6 sm:px-10 lg:px-14 py-10 lg:py-0 bg-white relative transition-opacity duration-300 ${showTransition ? 'opacity-0' : 'opacity-100'}`}>

        {/* Subtle left border on desktop */}
        <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-surface-200/70" />

        <div className="w-full max-w-[400px]">

          {/* Crest / Emblem */}
          <div className="text-center mb-7 login-anim-right-1">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-2xl shadow-lg ring-4 ring-primary-50 mb-4 login-anim-crest-bounce">
              <GraduationCap className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-xl font-extrabold text-surface-900 tracking-tight">
              {roleTitles[selectedRole]} <span className="font-normal italic text-surface-500">Sign-In</span>
            </h2>
            <p className="text-xs text-surface-400 mt-1 font-medium">
              Enter your institutional credentials to continue
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex bg-surface-100 p-1 rounded-xl mb-6 login-anim-right-2">
            {(['student', 'staff', 'admin'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleSelect(role)}
                className={`
                  flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer
                  ${
                    selectedRole === role
                      ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
                      : 'text-surface-500 hover:text-surface-800 hover:bg-white/50'
                  }
                `}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs animate-[shake_0.3s_ease-in-out]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMsg}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5 login-anim-right-3">
            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1.5">
                Institutional Username or Email
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="UCS23M1092"
                  className="w-full pl-10 pr-4 py-3 bg-surface-50 border border-surface-300 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-surface-700 mb-1.5">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-11 py-3 bg-surface-50 border border-surface-300 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Audit badge */}
            <div className="flex items-center justify-end text-xs">
              <span className="text-surface-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-medium">Audit Logging Enabled</span>
              </span>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="login-anim-right-4 w-full py-3 px-6 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 active:scale-[0.97] text-white font-bold text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  SIGN IN
                  <ArrowRight className="w-4 h-4 login-anim-arrow-nudge" />
                </>
              )}
            </button>
          </form>

          {/* Secondary Footer Actions */}
          <div className="pt-6 mt-6 border-t border-surface-100 space-y-4 login-anim-right-5">
            <div className="flex items-center justify-between text-xs text-surface-500">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="flex items-center gap-1.5 hover:text-primary-700 transition-colors cursor-pointer font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5 text-surface-400" />
                <span>Helpdesk</span>
              </button>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="flex items-center gap-1.5 hover:text-primary-700 transition-colors cursor-pointer font-medium"
              >
                <KeyRound className="w-3.5 h-3.5 text-surface-400" />
                <span>Forgot Password?</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200 text-surface-600 text-[11px] font-semibold hover:bg-surface-100 transition-colors cursor-default">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"><path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="#4CAF50"/><path d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z" fill="#F44336"/><path d="M20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.5 12.92 20.16 13.19L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81Z" fill="#FFC107"/><path d="M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="#2196F3"/></svg>
                  Google Play
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200 text-surface-600 text-[11px] font-semibold hover:bg-surface-100 transition-colors cursor-default">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.94 11.3 4.7 7.97C5.57 6.3 7.32 5.23 9.22 5.21C10.51 5.19 11.74 6.09 12.55 6.09C13.36 6.09 14.85 5.02 16.4 5.18C17.04 5.21 18.89 5.44 20.09 7.15C19.97 7.23 17.56 8.62 17.58 11.53C17.61 15 20.61 16.05 20.63 16.06C20.6 16.13 20.14 17.72 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.58 4.35 14.89 5.18C14.2 6.01 13.07 6.7 11.95 6.61C11.8 5.46 12.39 4.26 13 3.5Z"/></svg>
                  App Store
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowOrgModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-800 text-white text-[11px] font-bold hover:bg-primary-900 transition-colors cursor-pointer shadow-sm"
              >
                <Building className="w-3.5 h-3.5 text-amber-300" />
                <span>Org Code</span>
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* ═══════════ MODALS ═══════════ */}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900">Institutional Password Reset</h3>
            <p className="text-sm text-surface-500 leading-relaxed">
              Please contact your department coordinator or campus IT helpdesk to issue a secure password reset link.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Org Code Modal */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
              <Building className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900">Institution Code</h3>
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
              <span className="font-mono text-lg font-black text-primary-700">APEX-INST-2026</span>
              <p className="text-[11px] text-surface-400 mt-1.5 font-medium">Apex Institute of Technology Campus Identifier</p>
            </div>
            <button
              onClick={() => setShowOrgModal(false)}
              className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
