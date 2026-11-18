/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { 
  GraduationCap, ArrowLeft, ArrowRight, Lock, Mail, Loader2, 
  Eye, EyeOff, Sparkles, Code2, BookOpen, Award, CheckCircle2, 
  ShieldCheck, HelpCircle, X, Terminal, Laptop, Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";

const SAVED_EMAIL_STORAGE_KEY = "mrtechlms_saved_student_email";

export function StudentLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, studentUser, studentToken, isStudentAuthenticating } = useAuth();

  const [email, setEmail] = useState(() => {
    return searchParams.get("email") || localStorage.getItem(SAVED_EMAIL_STORAGE_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem(SAVED_EMAIL_STORAGE_KEY);
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // If already authenticated as student, redirect to /student/dashboard or original target
  useEffect(() => {
    if (!isStudentAuthenticating && studentUser && studentToken) {
      if (studentUser.role === UserRole.STUDENT) {
        const from = (location.state as any)?.from?.pathname || "/student/dashboard";
        navigate(from, { replace: true });
      }
    }
  }, [studentUser, studentToken, isStudentAuthenticating, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    if (rememberMe) {
      localStorage.setItem(SAVED_EMAIL_STORAGE_KEY, email.trim());
    } else {
      localStorage.removeItem(SAVED_EMAIL_STORAGE_KEY);
    }

    const result = await login(email.trim(), password, "student");
    setIsSubmitting(false);

    if (result.success && result.user) {
      const from = (location.state as any)?.from?.pathname || "/student/dashboard";
      navigate(from, { replace: true });
    } else {
      setErrorMsg(result.error || "Authentication failed. Please verify your student email and password.");
    }
  };

  return (
    <div 
      style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text)" }}
      className="min-h-screen flex flex-col lg:flex-row font-sans transition-colors duration-200"
    >
      {/* =========================================================================
          LEFT COLUMN: STUDENT CAMPUS & LEARNING ECOSYSTEM SHOWCASE (Desktop / Tablet)
          ========================================================================= */}
      <aside className="lg:w-1/2 relative overflow-hidden bg-slate-950 text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Subtle Ambient Background Gradients & Glow */}
        <div className="absolute inset-0 bg-radial from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 group-hover:scale-105 transition-transform">
              <img 
                src="/mr-logo-icon.png" 
                alt="MR Technologies" 
                className="w-8 h-8 object-contain brand-logo-preserve" 
                style={{ filter: "none", mixBlendMode: "normal", opacity: 1 }}
              />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
                MR TECHNOLOGIES
              </span>
              <span className="text-[10px] font-mono tracking-widest text-blue-400 font-semibold block uppercase">
                Medha - Rubiks • Academy
              </span>
            </div>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Learner Portal</span>
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-8 sm:my-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 text-blue-300 mb-6 backdrop-blur-md">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span>Empower Your Tech Career</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight mb-4">
            Where Ambition Meets{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
              Technical Mastery
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-lg mb-8">
            Access your assigned learning tracks, dive into browser-based coding labs, complete scheduled assessments, and build verifiable skills.
          </p>

          {/* Feature Highlights Grid */}
          <div className="space-y-4 max-w-md">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Interactive Coding Sandboxes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Practice in real time with our in-browser editors and instant automated test verification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Structured Curriculum & Video Tracks
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Instructor-guided modules, downloadable notes, and progress analytics tailored to your batch.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Verified Industry Credentials
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Earn tamper-proof completion certificates ready to share with recruiters and employers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Badge / Social Proof */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-900">
                JD
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-900">
                SK
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-900">
                MR
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white">1,500+ Active Students</p>
              <p className="text-[10px] text-slate-400">Training across multi-tech stacks</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Learning Portal v2.0</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT COLUMN: DEDICATED STUDENT SIGN-IN CONSOLE
          ========================================================================= */}
      <main className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-16">
        {/* Top Bar inside Form Panel */}
        <div className="flex items-center justify-between pb-6">
          <Link 
            to="/" 
            id="back-to-home-link"
            className="inline-flex items-center gap-2 text-xs font-bold tracking-wide py-2 px-3.5 rounded-xl border transition-all hover:opacity-80 shadow-sm"
            style={{ 
              borderColor: "var(--theme-border)", 
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text)" 
            }}
          >
            <ArrowLeft className="w-4 h-4 text-blue-500" />
            <span>Return to Website</span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeQuickControls />
          </div>
        </div>

        {/* Center Sign In Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          {/* Card Title & Introduction */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Authentication</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--theme-text)" }}>
              Welcome Back, Learner
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Sign in with your registered student credentials to access your courses, lab exercises, and assessments.
            </p>
          </div>

          {/* Form Box */}
          <div 
            style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            className="border rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-500/5 space-y-6"
          >
            {errorMsg && (
              <div 
                id="student-signin-error-banner"
                className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-2xl flex items-start gap-3 animate-in fade-in"
              >
                <span className="text-base leading-none">⚠️</span>
                <div className="flex-1 leading-relaxed">
                  <p className="font-bold text-rose-900 dark:text-rose-200">Unable to Sign In</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Student Email Address */}
              <div>
                <label 
                  htmlFor="student-email-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider mb-1.5"
                >
                  Student Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="student-email-input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="student@domain.com"
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white caret-blue-500 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition font-mono"
                    required
                  />
                </div>
              </div>

              {/* Password with Show/Hide Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="student-password-input"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="student-password-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white caret-blue-500 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
                    required
                  />
                  <button
                    type="button"
                    id="toggle-password-visibility-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Email Option */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="remember-student-email"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Remember my email
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Need help?</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="student-signin-submit-btn"
                disabled={isSubmitting}
                className="w-full btn-primary btn-theme-primary font-bold text-xs py-3.5 px-4 rounded-xl transition duration-150 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 cursor-pointer flex items-center justify-center gap-2.5 mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <>
                    <span>Enter Student Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Account Enrollment Notice */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-slate-900/60 border border-blue-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Enrolled Student Access Only:</span>{" "}
                Student accounts are created directly by your academy administrator or course trainer.
              </div>
            </div>
          </div>
        </div>

        {/* Console Bottom Bar */}
        <div className="text-center pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 gap-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>256-bit SSL Encrypted • Single Session Protection</span>
          </div>
          <p>© {new Date().getFullYear()} MR TECHNOLOGIES — All Rights Reserved</p>
        </div>
      </main>

      {/* =========================================================================
          HELP & ACCESS MODAL (STUDENT CREDENTIAL ASSISTANCE)
          ========================================================================= */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div 
            style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            className="border max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative"
          >
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close help dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold" style={{ color: "var(--theme-text)" }}>
                  Student Account Assistance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  MR TECHNOLOGIES ACADEMY
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>How are student accounts created?</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Student accounts are provisioned exclusively by LMS Administrators and Batch Instructors upon institutional enrollment. Self-registration is disabled to safeguard course materials.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Forgot your password?</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reach out to your assigned Batch Coordinator or LMS Administrator with your registered roll number / email. They will safely reset your password or issue a temporary access key.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Contact Academy Office</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Visakhapatnam HQ • Support: <span className="font-mono font-medium text-blue-500">support@mrtechnologies.co.in</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
