/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { PenSquare } from "lucide-react";
import { BlogPortal } from "../../components/BlogPortal.js";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function AdminBlogPage() {
  const { currentUser, authToken, refreshUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser || !authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <PenSquare className="w-6 h-6 text-purple-600" />
            <span>Moderate Blogs</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Review, Publish, and Moderate Academy Community Articles
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
        </div>
      </div>

      <div className="animate-in fade-in duration-150">
        <BlogPortal
          authToken={authToken}
          userRole={currentUser.role}
          userId={currentUser.id}
          currentUser={currentUser}
          setCurrentUser={() => refreshUser()}
        />
      </div>
    </div>
  );
}
