/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { Menu, Sparkles } from "lucide-react";
import { Sidebar } from "../components/Sidebar.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";
import { NotificationBell } from "../components/NotificationBell.js";
import { useAuth } from "../context/AuthContext.js";
import { useTour } from "../context/TourContext.js";
import { UserRole } from "../types.js";

export function AdminLayout() {
  const { adminUser, logoutAdmin } = useAuth();
  const { startTour } = useTour();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (!adminUser) return null;

  return (
    <div 
      style={{ backgroundColor: "var(--color-background)", color: "var(--color-text-primary)" }}
      className="min-h-screen w-full flex select-text transition-colors duration-200"
    >
      {/* Sidebar Navigation */}
      <Sidebar
        userRole={UserRole.ADMIN}
        userName={adminUser.name}
        userEmail={adminUser.email}
        userAvatar={adminUser.profilePhoto}
        onLogout={logoutAdmin}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Panel */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen flex flex-col">
        {/* Mobile Top Header */}
        <div 
          style={{ 
            backgroundColor: "var(--color-sidebar)", 
            color: "var(--color-sidebar-text)", 
            borderColor: "var(--color-border)" 
          }}
          className="lg:hidden flex items-center justify-between px-4 py-3 border-b shrink-0 sticky top-0 z-20"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-sidebar-text)",
                borderColor: "var(--color-border)"
              }}
              className="p-2 rounded-xl border transition cursor-pointer hover:opacity-80"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link 
              to="/admin/dashboard"
              aria-label="MR TECHNOLOGIES Admin Dashboard"
              className="flex items-center gap-2.5 min-w-0 group cursor-pointer rounded-xl p-1 -m-1 hover:bg-white/5 active:opacity-90 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <img 
                src="/mr-logo-icon.png" 
                alt="MR Technologies" 
                className="w-7 h-7 object-contain shrink-0 brand-logo-preserve transition-transform duration-150 group-hover:scale-105" 
                style={{ filter: "none", mixBlendMode: "normal", opacity: 1 }}
              />
              <div className="min-w-0">
                <span 
                  style={{ color: "var(--color-text-primary)" }}
                  className="font-bold text-sm tracking-tight truncate block group-hover:opacity-95 transition-opacity"
                >
                  MR TECHNOLOGIES
                </span>
                <span 
                  style={{ color: "var(--color-text-muted)" }}
                  className="text-[9px] font-mono uppercase tracking-widest block"
                >
                  Admin Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startTour(true)}
              title="Take Interactive Tour"
              aria-label="Take Interactive Tour"
              className="h-8.5 sm:h-9 w-8.5 sm:w-9 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50/80 dark:bg-[#111C30] hover:bg-slate-100 dark:hover:bg-[#16243D] hover:border-slate-300 dark:hover:border-[#384b66] text-amber-500 transition cursor-pointer flex items-center justify-center shadow-2xs"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <NotificationBell />
            <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
          </div>
        </div>

        {/* Content Outlet */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
