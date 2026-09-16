/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  BookOpen, GraduationCap, Award, PenSquare, Users, 
  Settings, LogOut, Code, ShieldAlert, User as UserIcon, X, Compass
} from "lucide-react";
import { UserRole } from "../types.js";

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ 
  userRole, userName, userEmail, activeTab, setActiveTab, onLogout,
  isMobileOpen = false, onMobileClose
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getMenuItems = () => {
    const studentItems = [
      { id: "dashboard", label: "My Learning", icon: GraduationCap, path: "/student/dashboard" },
      { id: "courses", label: "Browse Courses", icon: BookOpen, path: "/student/courses" },
      { id: "learning-paths", label: "Learning Paths", icon: Compass, path: "/student/learning-paths" },
      { id: "practice", label: "Coding Practice", icon: Code, path: "/student/coding-practice" },
      { id: "assessments", label: "My Assessments", icon: Award, path: "/student/assessments" },
      { id: "blogs", label: "Blog Community", icon: PenSquare, path: "/student/blogs" },
      { id: "profile", label: "Preferences & Profile", icon: UserIcon, path: "/student/profile" },
    ];

    const adminItems = [
      { id: "admin-dashboard", label: "Admin Overview", icon: ShieldAlert, path: "/admin/dashboard" },
      { id: "admin-users", label: "Manage Users", icon: Users, path: "/admin/users" },
      { id: "courses", label: "Manage Courses", icon: BookOpen, path: "/admin/courses" },
      { id: "learning-paths", label: "Learning Paths", icon: Compass, path: "/admin/learning-paths" },
      { id: "assessments", label: "Manage Assessments", icon: Award, path: "/admin/assessments" },
      { id: "blogs", label: "Moderate Blogs", icon: PenSquare, path: "/admin/blogs" },
      { id: "profile", label: "Preferences & Profile", icon: Settings, path: "/admin/profile" },
    ];

    switch (userRole) {
      case UserRole.ADMIN:
        return adminItems;
      case UserRole.STUDENT:
      default:
        return studentItems;
    }
  };

  const menuItems = getMenuItems();

  const handleItemClick = (item: { id: string; path: string }) => {
    navigate(item.path);
    if (setActiveTab) {
      setActiveTab(item.id);
    }
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const isItemActive = (item: { id: string; path: string }) => {
    if (location.pathname === item.path) return true;
    if (item.path !== "/student/dashboard" && item.path !== "/admin/dashboard") {
      if (location.pathname.startsWith(item.path)) return true;
    }
    if (activeTab && activeTab === item.id) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Drawer (Visible only on screens < lg when opened) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          
          {/* Sliding drawer */}
          <aside 
            style={{ 
              width: "260px", 
              maxWidth: "85vw", 
              backgroundColor: "var(--theme-sidebar)", 
              color: "var(--theme-sidebar-text)",
              borderColor: "var(--theme-sidebar-border)" 
            }}
            className="fixed inset-y-0 left-0 z-50 border-r flex flex-col h-full shadow-2xl select-none animate-in slide-in-from-left duration-200"
          >
            {/* Brand Header */}
            <div 
              style={{ borderColor: "var(--theme-sidebar-border)" }}
              className="p-5 border-b flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src="/mr-logo-icon.png" 
                  alt="MR Technologies" 
                  className="w-9 h-9 object-contain shrink-0 drop-shadow-xs" 
                />
                <div className="min-w-0">
                  <h1 
                    style={{ color: "var(--theme-text)" }}
                    className="font-bold text-sm tracking-tight leading-none truncate"
                  >
                    MR TECHNOLOGIES
                  </h1>
                  <span 
                    style={{ color: "var(--theme-sidebar-muted)" }}
                    className="text-[9px] font-mono font-bold uppercase tracking-widest block mt-1.5 truncate capitalize"
                  >
                    {userRole} Portal • Medha - Rubiks
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onMobileClose}
                style={{ color: "var(--theme-sidebar-muted)" }}
                className="p-1.5 rounded-lg hover:opacity-80 cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Status Profile */}
            <div 
              style={{ backgroundColor: "var(--theme-sidebar-card)", borderColor: "var(--theme-sidebar-border)" }}
              className="p-4 border-b flex items-center gap-3"
            >
              <div 
                className="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-xs shrink-0"
                style={{ backgroundColor: "var(--theme-sidebar)", borderColor: "var(--theme-sidebar-border)", color: "var(--theme-primary)" }}
              >
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p 
                  style={{ color: "var(--theme-text)" }}
                  className="text-xs font-bold truncate"
                >
                  {userName}
                </p>
                <p 
                  style={{ color: "var(--theme-text-muted)" }}
                  className="text-[10px] truncate font-mono mt-0.5"
                >
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Navigation menu */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = isItemActive(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    style={{
                      backgroundColor: isActive ? "var(--theme-primary-light)" : undefined,
                      color: isActive ? "var(--theme-primary)" : "var(--theme-sidebar-text)",
                      borderColor: isActive ? "var(--theme-primary)" : "transparent",
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition duration-150 border cursor-pointer ${
                      isActive 
                        ? "shadow-xs font-bold" 
                        : "hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-text)]"
                    }`}
                  >
                    <IconComponent 
                      className="w-4 h-4 shrink-0"
                      style={{ color: isActive ? "var(--theme-primary)" : "var(--theme-sidebar-muted)" }}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Account Info */}
            <div 
              style={{ borderColor: "var(--theme-sidebar-border)" }}
              className="p-4 border-t"
            >
              <div 
                style={{ backgroundColor: "var(--theme-sidebar-card)", borderColor: "var(--theme-sidebar-border)" }}
                className="rounded-xl p-3.5 border"
              >
                <div 
                  style={{ color: "var(--theme-sidebar-muted)" }}
                  className="text-[9px] uppercase font-bold mb-1 tracking-wider font-mono"
                >
                  Current Tier
                </div>
                <div 
                  style={{ color: "var(--theme-text)" }}
                  className="text-xs mb-2.5 font-bold"
                >
                  {userRole === UserRole.ADMIN ? "Academy Administrator" : "Standard Learner"}
                </div>
                <div 
                  style={{ backgroundColor: "var(--theme-border)" }}
                  className="w-full h-1.5 rounded-full overflow-hidden"
                >
                  <div 
                    className="h-full w-[100%] rounded-full transition-all"
                    style={{ backgroundColor: "var(--theme-primary)" }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Logout Footer */}
            <div 
              style={{ borderColor: "var(--theme-sidebar-border)" }}
              className="p-4 border-t"
            >
              <button
                type="button"
                onClick={onLogout}
                style={{ 
                  backgroundColor: "var(--theme-sidebar-card)", 
                  borderColor: "var(--theme-sidebar-border)",
                  color: "var(--theme-sidebar-text)"
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 border rounded-xl text-xs font-semibold transition duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop In-Flow Sidebar (Fixed 260px wide, sticky, flex item in normal layout flow) */}
      <aside 
        style={{ 
          width: "260px", 
          minWidth: "260px", 
          maxWidth: "260px", 
          backgroundColor: "var(--theme-sidebar)", 
          color: "var(--theme-sidebar-text)",
          borderColor: "var(--theme-sidebar-border)" 
        }}
        className="hidden lg:flex border-r flex-col h-screen sticky top-0 shrink-0 select-none z-30"
      >
        {/* Brand Header */}
        <div 
          style={{ borderColor: "var(--theme-sidebar-border)" }}
          className="p-5 border-b flex items-center gap-3"
        >
          <img 
            src="/mr-logo-icon.png" 
            alt="MR Technologies" 
            className="w-9 h-9 object-contain shrink-0 drop-shadow-xs" 
          />
          <div className="min-w-0">
            <h1 
              style={{ color: "var(--theme-text)" }}
              className="font-bold text-sm tracking-tight leading-none truncate"
            >
              MR TECHNOLOGIES
            </h1>
            <span 
              style={{ color: "var(--theme-sidebar-muted)" }}
              className="text-[9px] font-mono font-bold uppercase tracking-widest block mt-1.5 truncate capitalize"
            >
              {userRole} Portal • Medha - Rubiks
            </span>
          </div>
        </div>

        {/* User Status Profile */}
        <div 
          style={{ backgroundColor: "var(--theme-sidebar-card)", borderColor: "var(--theme-sidebar-border)" }}
          className="p-4 border-b flex items-center gap-3"
        >
          <div 
            className="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-xs shrink-0"
            style={{ backgroundColor: "var(--theme-sidebar)", borderColor: "var(--theme-sidebar-border)", color: "var(--theme-primary)" }}
          >
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p 
              style={{ color: "var(--theme-text)" }}
              className="text-xs font-bold truncate"
            >
              {userName}
            </p>
            <p 
              style={{ color: "var(--theme-text-muted)" }}
              className="text-[10px] truncate font-mono mt-0.5"
            >
              {userEmail}
            </p>
          </div>
        </div>

        {/* Navigation menu - independently scrollable */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = isItemActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                style={{
                  backgroundColor: isActive ? "var(--theme-primary-light)" : undefined,
                  color: isActive ? "var(--theme-primary)" : "var(--theme-sidebar-text)",
                  borderColor: isActive ? "var(--theme-primary)" : "transparent",
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition duration-150 border cursor-pointer ${
                  isActive 
                    ? "shadow-xs font-bold" 
                    : "hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-text)]"
                }`}
              >
                <IconComponent 
                  className="w-4 h-4 shrink-0"
                  style={{ color: isActive ? "var(--theme-primary)" : "var(--theme-sidebar-muted)" }}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Account Info */}
        <div 
          style={{ borderColor: "var(--theme-sidebar-border)" }}
          className="p-4 border-t"
        >
          <div 
            style={{ backgroundColor: "var(--theme-sidebar-card)", borderColor: "var(--theme-sidebar-border)" }}
            className="rounded-xl p-3.5 border"
          >
            <div 
              style={{ color: "var(--theme-sidebar-muted)" }}
              className="text-[9px] uppercase font-bold mb-1 tracking-wider font-mono"
            >
              Current Tier
            </div>
            <div 
              style={{ color: "var(--theme-text)" }}
              className="text-xs mb-2.5 font-bold"
            >
              {userRole === UserRole.ADMIN ? "Academy Administrator" : "Standard Learner"}
            </div>
            <div 
              style={{ backgroundColor: "var(--theme-border)" }}
              className="w-full h-1.5 rounded-full overflow-hidden"
            >
              <div 
                className="h-full w-[100%] rounded-full transition-all"
                style={{ backgroundColor: "var(--theme-primary)" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Logout Footer */}
        <div 
          style={{ borderColor: "var(--theme-sidebar-border)" }}
          className="p-4 border-t"
        >
          <button
            type="button"
            onClick={onLogout}
            style={{ 
              backgroundColor: "var(--theme-sidebar-card)", 
              borderColor: "var(--theme-sidebar-border)",
              color: "var(--theme-sidebar-text)"
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 border rounded-xl text-xs font-semibold transition duration-150 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
