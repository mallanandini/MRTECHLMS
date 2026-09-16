/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, ArrowRight, Lock, Mail, User, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";

export function AdminRegister() {
  const navigate = useNavigate();
  const { adminRegister, currentUser, authToken, isAuthenticating } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as admin, redirect to /admin/dashboard
  useEffect(() => {
    if (!isAuthenticating && currentUser && authToken) {
      if (currentUser.role === UserRole.ADMIN) {
        navigate("/admin/dashboard", { replace: true });
      } else if (currentUser.role === UserRole.STUDENT) {
        navigate("/student/dashboard", { replace: true });
      }
    }
  }, [currentUser, authToken, isAuthenticating, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    const result = await adminRegister(name, email, password);
    setIsSubmitting(false);

    if (result.success && result.user) {
      navigate("/admin/dashboard", { replace: true });
    } else {
      setErrorMsg(result.error || "Failed to register administrator account.");
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
          <span>Back to Portals</span>
        </Link>
        <ThemeQuickControls />
      </header>

      {/* Main Form Card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-amber-500/10 mb-4 hover:scale-105 transition-transform">
              <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-16 h-16 object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--theme-text)" }}>
              Register Administrator
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
                <span className="flex-1 leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white caret-slate-900 dark:caret-white border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Administrator Email</span>
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
                  <span>Password (Min 6 Characters)</span>
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

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Confirm Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
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
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-60 text-white font-bold text-xs py-3.5 rounded-xl transition duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <span>Registering Administrator...</span>
                ) : (
                  <>
                    <span>Create Administrator Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an administrator account?{" "}
                <Link to="/admin/login" className="font-bold underline text-amber-600 dark:text-amber-400">
                  Sign In &rarr;
                </Link>
              </p>
              <div>
                <Link to="/student/login" className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                  Switch to Student Portal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
