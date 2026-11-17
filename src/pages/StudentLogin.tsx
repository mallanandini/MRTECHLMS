/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { GraduationCap, ArrowLeft, ArrowRight, ShieldAlert, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";

export function StudentLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, studentUser, studentToken, isStudentAuthenticating } = useAuth();

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as student, redirect to /student/dashboard
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

    const result = await login(email, password, "student");
    setIsSubmitting(false);

    if (result.success && result.user) {
      const from = (location.state as any)?.from?.pathname || "/student/dashboard";
      navigate(from, { replace: true });
    } else {
      setErrorMsg(result.error || "Authentication failed. Please check your credentials.");
    }
  };

  return (
    <div className="student-login-page min-h-screen flex flex-col font-sans transition-colors duration-200">
      <div className="student-login-tech-backdrop" aria-hidden="true">
        <svg className="student-login-circuit-lines" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M0 190h210l54 54h154l56-56h165M1440 220h-220l-72 72h-122l-58 58h-130M0 690h190l78-78h126l52-52h122M1440 660h-174l-76-76h-118l-54-54h-150" />
            <path d="M330 0v105l58 58v78M1080 0v116l-62 62v92M410 900v-126l52-52v-70M1010 900V770l-60-60v-82" />
            <circle cx="210" cy="190" r="4" /><circle cx="584" cy="188" r="4" />
            <circle cx="1220" cy="220" r="4" /><circle cx="838" cy="350" r="4" />
            <circle cx="190" cy="690" r="4" /><circle cx="568" cy="560" r="4" />
            <circle cx="1266" cy="660" r="4" /><circle cx="868" cy="530" r="4" />
          </g>
        </svg>
        <div className="student-login-equations student-login-equations-left">
          <span>∑ xᵢ² = ‖x‖²</span><span>f(x) → y</span><span>101101 · 010010</span><span>∂E / ∂w = 0</span>
        </div>
        <div className="student-login-equations student-login-equations-right">
          <span>0101 1100 1010</span><span>∫ f(x) dx</span><span>A · x = b</span><span>√(a² + b²)</span>
        </div>
        <div className="student-login-coordinate">NODE_07&nbsp;&nbsp; / &nbsp;&nbsp;LEARN.SYS</div>
      </div>
      {/* Header */}
      <header 
        className="student-login-header border-b px-4 sm:px-8 py-3.5 flex items-center justify-between"
      >
        <Link to="/" className="flex items-center gap-2.5 text-xs font-semibold hover:opacity-80 transition" style={{ color: "var(--theme-text)" }}>
          <ArrowLeft className="w-4 h-4" />
          <img 
            src="/mr-logo-icon.png" 
            alt="MR Logo" 
            className="w-5 h-5 object-contain brand-logo-preserve" 
            style={{ filter: "none", mixBlendMode: "normal", opacity: 1 }}
          />
          <span>Back to Home</span>
        </Link>
        <ThemeQuickControls />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="student-login-brand-mark inline-flex p-3 rounded-2xl mb-4 hover:scale-105 transition-transform">
              <img 
                src="/mr-logo-icon.png" 
                alt="MR Technologies" 
                className="w-16 h-16 object-contain brand-logo-preserve" 
                style={{ filter: "none", mixBlendMode: "normal", opacity: 1 }}
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--theme-text)" }}>
              Student Portal Sign In
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
              MR TECHNOLOGIES • MEDHA - RUBIKS
            </p>
          </div>

          {/* Form Container */}
          <div className="student-login-glass-card border rounded-3xl p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <span className="text-base">⚠️</span>
                <div className="flex-1 leading-relaxed">
                  {errorMsg}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Student Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="student@domain.com"
                  className="student-login-input w-full rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 transition font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="••••••••"
                  className="student-login-input w-full rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary btn-theme-primary font-bold text-xs py-3.5 rounded-xl transition duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <>
                    <span>Sign In to Student Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Student accounts are provisioned exclusively by LMS Administrators.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
