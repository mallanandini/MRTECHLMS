/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { GraduationCap, ArrowLeft, ArrowRight, ShieldAlert, Lock, Mail } from "lucide-react";
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
    <div 
      style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text)" }}
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
    >
      {/* Header */}
      <header 
        style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
        className="border-b px-4 sm:px-8 py-3.5 flex items-center justify-between"
      >
        <Link to="/" className="flex items-center gap-2.5 text-xs font-semibold hover:opacity-80 transition" style={{ color: "var(--theme-text)" }}>
          <ArrowLeft className="w-4 h-4" />
          <img src="/mr-logo-icon.png" alt="MR Logo" className="w-5 h-5 object-contain" />
          <span>Back to Home</span>
        </Link>
        <ThemeQuickControls />
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/10 mb-4 hover:scale-105 transition-transform">
              <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-16 h-16 object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--theme-text)" }}>
              Student Portal Sign In
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
              MR TECHNOLOGIES • MEDHA - RUBIKS
            </p>
          </div>

          {/* Form Container */}
          <div 
            style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            className="border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
          >
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
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white caret-slate-900 dark:caret-white border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition font-mono"
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
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white caret-slate-900 dark:caret-white border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-theme-primary hover:opacity-90 disabled:opacity-60 text-black font-bold text-xs py-3.5 rounded-xl transition duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
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
