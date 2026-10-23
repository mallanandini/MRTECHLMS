/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ArrowRight, Lock, Mail, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";

export function AdminLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, adminUser, adminToken, isAdminAuthenticating } = useAuth();

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as admin, redirect to /admin/dashboard
  useEffect(() => {
    if (!isAdminAuthenticating && adminUser && adminToken) {
      if (adminUser.role === UserRole.ADMIN || adminUser.role === UserRole.SUPER_ADMIN) {
        const from = (location.state as any)?.from?.pathname || "/admin/dashboard";
        navigate(from, { replace: true });
      } else if (adminUser.role === UserRole.MANAGER) {
        navigate("/manager/team", { replace: true });
      }
    }
  }, [adminUser, adminToken, isAdminAuthenticating, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);

    const result = await login(email, password, "admin");
    setIsSubmitting(false);

    if (result.success && result.user) {
      if (result.user.role === UserRole.MANAGER) {
        navigate("/manager/team", { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || "/admin/dashboard";
        navigate(from, { replace: true });
      }
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
            <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-amber-500/10 mb-4 hover:scale-105 transition-transform">
              <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-16 h-16 object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--theme-text)" }}>
              Admin Portal Sign In
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
              MR TECHNOLOGIES • ADMINISTRATIVE ACCESS
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
                  <span>Administrator Email Address</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="admin@domain.com"
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white caret-slate-900 dark:caret-white border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition font-mono"
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
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white caret-slate-900 dark:caret-white border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-60 text-white font-bold text-xs py-3.5 rounded-xl transition duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
