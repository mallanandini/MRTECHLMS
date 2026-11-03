/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { ProfileConsole } from "../../components/ProfileConsole.js";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function StudentProfilePage() {
  const { currentUser, authToken, refreshUser } = useAuth();
  const navigate = useNavigate();

  if (!currentUser || !authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <User className="w-6 h-6 text-blue-600" />
            <span>Preferences & Profile</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Customize Color Theme, Appearance Mode, and Personal Profile
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeQuickControls />
        </div>
      </div>

      <div className="animate-in fade-in duration-150">
        <ProfileConsole
          currentUser={currentUser}
          setCurrentUser={() => refreshUser()}
          authToken={authToken}
          onReadBlog={() => navigate("/student/blogs")}
          onNavigate={(tab) => {
            if (tab === "blogs") navigate("/student/blogs");
            else if (tab === "courses") navigate("/student/courses");
            else if (tab === "practice") navigate("/student/coding-practice");
            else if (tab === "assessments") navigate("/student/assessments");
            else navigate("/student/dashboard");
          }}
        />
      </div>
    </div>
  );
}
