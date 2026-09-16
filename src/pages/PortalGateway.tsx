/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  GraduationCap, ShieldAlert, ArrowRight, BookOpen, 
  Code, Award, CheckCircle2, UserPlus, LogIn, Sparkles 
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";

export function PortalGateway() {
  const { currentUser, authToken, isAuthenticating } = useAuth();
  const navigate = useNavigate();

  // If already logged in, show quick redirection notice or redirect directly
  useEffect(() => {
    if (!isAuthenticating && currentUser && authToken) {
      if (currentUser.role === UserRole.STUDENT) {
        navigate("/student/dashboard", { replace: true });
      } else if (currentUser.role === UserRole.ADMIN) {
        navigate("/admin/dashboard", { replace: true });
      }
    }
  }, [currentUser, authToken, isAuthenticating, navigate]);

  return (
    <div 
      style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text)" }}
      className="min-h-screen flex flex-col font-sans transition-colors duration-200"
    >
      {/* Top Navigation Bar */}
      <header 
        style={{ 
          backgroundColor: "var(--theme-surface)", 
          borderColor: "var(--theme-border)" 
        }}
        className="border-b px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <img 
            src="/mr-logo-icon.png" 
            alt="MR Technologies Logo" 
            className="w-10 h-10 object-contain shrink-0 drop-shadow-xs" 
          />
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none" style={{ color: "var(--theme-text)" }}>
              MR TECHNOLOGIES
            </h1>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest block mt-1 opacity-70">
              Medha - Rubiks • Trainings - Placements - Services
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeQuickControls />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="mb-6 flex justify-center">
            <div className="p-3 sm:p-4 bg-white rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 inline-block hover:scale-[1.01] transition-transform">
              <img 
                src="/mr-logo-full.jpg" 
                alt="MR Technologies - Medha Rubiks" 
                className="h-16 sm:h-20 object-contain rounded-lg"
              />
            </div>
          </div>
          <div 
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 border"
            style={{ 
              backgroundColor: "var(--theme-primary-light)", 
              color: "var(--theme-primary)",
              borderColor: "var(--theme-primary)"
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unified Academy Gateway</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3" style={{ color: "var(--theme-text)" }}>
            Select Your Learning Portal
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Welcome to the MR TECHNOLOGIES enterprise portal. Choose your dedicated workspace below to access learning programs, student coding practice, or manage academy administration.
          </p>
        </div>

        {/* Portals Grid (2 Portals Only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto w-full">
          {/* STUDENT PORTAL CARD */}
          <div 
            style={{ 
              backgroundColor: "var(--theme-surface)", 
              borderColor: "var(--theme-border)" 
            }}
            className="rounded-3xl border p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition duration-300 hover:border-blue-500/50 group"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition transform group-hover:scale-105"
                  style={{ backgroundColor: "var(--theme-primary)" }}
                >
                  <GraduationCap className="w-7 h-7" />
                </div>
                <span 
                  className="text-[11px] font-bold font-mono uppercase tracking-wider px-3 py-1 rounded-full border"
                  style={{ 
                    backgroundColor: "var(--theme-primary-light)", 
                    color: "var(--theme-primary)",
                    borderColor: "var(--theme-border)"
                  }}
                >
                  Learners
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--theme-text)" }}>
                Student Portal
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                Access your assigned coursework, interactive coding sandbox, live assessments, and academy community.
              </p>

              <div className="space-y-2.5 mb-8">
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Admin-Assigned Course Curriculum & Player</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full Coding & Typing Practice Lab</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Assigned Assessments with Immediate Scoring</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tech Knowledgebase & Blog Community</span>
                </div>
              </div>
            </div>

            <Link
              to="/student/login"
              style={{ backgroundColor: "var(--theme-primary)" }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl text-white font-bold text-xs shadow-md hover:opacity-95 transition cursor-pointer"
            >
              <span>Enter Student Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* ADMIN PORTAL CARD */}
          <div 
            style={{ 
              backgroundColor: "var(--theme-surface)", 
              borderColor: "var(--theme-border)" 
            }}
            className="rounded-3xl border p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition duration-300 hover:border-amber-500/50 group"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-slate-900 dark:bg-amber-600 shadow-lg transition transform group-hover:scale-105">
                  <ShieldAlert className="w-7 h-7 text-amber-400 dark:text-white" />
                </div>
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider px-3 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                  Administrative
                </span>
              </div>

              <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: "var(--theme-text)" }}>
                Admin Portal
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                Complete administration control: provision student accounts, grant/revoke access rights, and moderate learning tracks.
              </p>

              <div className="space-y-2.5 mb-8">
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Provision Student Accounts & Bulk Excel Import</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Granular Grant / Revoke Course & Assessment Access</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Academy Metrics, Enrollments & Progress Analytics</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Course Catalog & Community Content Moderation</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                to="/admin/login"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </Link>
              <Link
                to="/admin/register"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer text-slate-800 dark:text-slate-200"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Admin</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Reviewer Quick Credentials (STUDENT & ADMIN ONLY - NO TRAINER) */}
        <div 
          style={{ 
            backgroundColor: "var(--theme-surface)", 
            borderColor: "var(--theme-border)" 
          }}
          className="mt-12 p-5 sm:p-6 rounded-2xl border max-w-3xl mx-auto w-full text-center"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3">
            Quick Reviewer Credentials
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            <Link
              to="/student/login?email=student@lms.com"
              className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-left hover:border-blue-400 transition block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono uppercase">Student Portal</span>
                <span className="text-[10px] text-slate-400 font-mono">student123</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">student@lms.com</p>
            </Link>

            <Link
              to="/admin/login?email=admin@lms.com"
              className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-left hover:border-amber-400 transition block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono uppercase">Admin Portal</span>
                <span className="text-[10px] text-slate-400 font-mono">admin123</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">admin@lms.com</p>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer 
        style={{ borderColor: "var(--theme-border)" }}
        className="border-t py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-sans"
      >
        <div className="flex items-center justify-center gap-2 mb-2 font-semibold">
          <img src="/mr-logo-icon.png" alt="MR Logo" className="w-4 h-4 object-contain" />
          <span>MR TECHNOLOGIES • MEDHA - RUBIKS</span>
        </div>
        <p className="font-mono text-[11px]">
          © {new Date().getFullYear()} MR TECHNOLOGIES — Trainings, Placements & Services. Enterprise LMS.
        </p>
      </footer>
    </div>
  );
}
