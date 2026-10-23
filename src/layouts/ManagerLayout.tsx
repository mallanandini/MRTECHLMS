/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "../components/Sidebar.js";
import { ThemeQuickControls } from "../components/ThemeQuickControls.js";
import { NotificationBell } from "../components/NotificationBell.js";
import { useAuth } from "../context/AuthContext.js";
import { UserRole } from "../types.js";

export function ManagerLayout() {
  const { adminUser, logoutAdmin } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  if (!adminUser) return null;

  return (
    <div 
      style={{ backgroundColor: "var(--theme-background)", color: "var(--theme-text)" }}
      className="min-h-screen w-full flex select-text transition-colors duration-200"
    >
      {/* Sidebar Navigation */}
      <Sidebar
        userRole={UserRole.MANAGER}
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
            backgroundColor: "var(--theme-sidebar)", 
            color: "var(--theme-sidebar-text)", 
            borderColor: "var(--theme-sidebar-border)" 
          }}
          className="lg:hidden flex items-center justify-between px-4 py-3 border-b shrink-0 sticky top-0 z-20"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              style={{
                backgroundColor: "var(--theme-sidebar-card)",
                color: "var(--theme-sidebar-text)",
                borderColor: "var(--theme-sidebar-border)"
              }}
              className="p-2 rounded-xl border transition cursor-pointer hover:opacity-80"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-7 h-7 object-contain shrink-0" />
              <div className="min-w-0">
                <span 
                  style={{ color: "var(--theme-text)" }}
                  className="font-bold text-sm tracking-tight truncate block"
                >
                  MR TECHNOLOGIES
                </span>
                <span 
                  style={{ color: "var(--theme-sidebar-muted)" }}
                  className="text-[9px] font-mono uppercase tracking-widest block"
                >
                  Manager Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeQuickControls onOpenPreferences={() => navigate("/manager/profile")} />
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
