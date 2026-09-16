/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { AdminConsole } from "../../components/AdminConsole.js";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function AdminDashboardPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  if (!authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-6 h-6 object-contain shrink-0" />
            <span>Admin Console</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Academy User Provisioning, Access Management & System Overview
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
        </div>
      </div>

      <div className="animate-in fade-in duration-150">
        <AdminConsole authToken={authToken} initialTab="users" />
      </div>
    </div>
  );
}
