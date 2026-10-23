/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LogIn, Terminal, CheckCircle2 } from "lucide-react";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";

export function AdminRegister() {
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

      {/* Main Notice Card */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-amber-500/10 mb-4">
              <ShieldAlert className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--theme-text)" }}>
              Admin Registration Disabled
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
              MR TECHNOLOGIES • ENTERPRISE ACCESS CONTROL
            </p>
          </div>

          {/* Details Container */}
          <div 
            style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            className="border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 text-sm"
          >
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 rounded-2xl space-y-2">
              <p className="font-semibold text-xs leading-relaxed">
                Public self-registration for administrator privileges is restricted to prevent unauthorized administrative escalation.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">
                Authorized Provisioning Methods:
              </h3>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <span>1. Secure Server Terminal CLI</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  System administrators with server console access can provision accounts using:
                </p>
                <div className="bg-emerald-50 dark:bg-emerald-100 text-black border border-emerald-300 px-3 py-2 rounded-xl text-xs font-mono font-bold select-all">
                  npm run create-admin
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span>2. Existing Administrator Delegation</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  An existing authenticated administrator can provision additional administrators from within the Admin Console under <strong>User Management &rarr; Add User</strong>.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <Link
                to="/admin/login"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Return to Admin Login</span>
              </Link>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <span>Portal Gateway</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
