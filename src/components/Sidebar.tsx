/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  BookOpen, GraduationCap, Award, PenSquare, Users, 
  Settings, LogOut, Code, BarChart2, ShieldAlert 
} from "lucide-react";
import { UserRole } from "../types.js";

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ 
  userRole, userName, userEmail, activeTab, setActiveTab, onLogout 
}: SidebarProps) {
  
  const getMenuItems = () => {
    const studentItems = [
      { id: "dashboard", label: "My Learning", icon: GraduationCap },
      { id: "courses", label: "Browse Courses", icon: BookOpen },
      { id: "practice", label: "Coding Practice", icon: Code },
      { id: "blogs", label: "Blog Community", icon: PenSquare },
    ];

    const trainerItems = [
      { id: "trainer-dashboard", label: "Trainer Panel", icon: BarChart2 },
      { id: "trainer-courses", label: "My Courses", icon: BookOpen },
      { id: "blogs", label: "Publish Blogs", icon: PenSquare },
    ];

    const adminItems = [
      { id: "admin-dashboard", label: "Admin Panel", icon: ShieldAlert },
      { id: "admin-users", label: "Manage Users", icon: Users },
      { id: "courses", label: "Manage Courses", icon: BookOpen },
      { id: "blogs", label: "Moderate Blogs", icon: PenSquare },
    ];

    switch (userRole) {
      case UserRole.ADMIN:
        return adminItems;
      case UserRole.TRAINER:
        return trainerItems;
      case UserRole.STUDENT:
      default:
        return studentItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">L</div>
        <div>
          <h1 className="font-semibold text-white text-md tracking-tight leading-none">Lumina LMS</h1>
          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest block mt-1.5">{userRole} Portal</span>
        </div>
      </div>

      {/* User Status Profile */}
      <div className="p-5 border-b border-slate-800/60 flex items-center gap-3 bg-slate-900/30">
        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-blue-400 text-sm shadow-inner shrink-0">
          {userName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate text-slate-100">{userName}</p>
          <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{userEmail}</p>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition duration-150 border ${
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-sm" 
                  : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Account Info */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800/60">
          <div className="text-[9px] uppercase text-slate-500 font-bold mb-1 tracking-wider font-mono">Current Tier</div>
          <div className="text-xs text-white mb-3 font-bold">Standard Learner</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[72%] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/40 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-slate-800/60 text-slate-400 rounded-xl text-xs font-semibold transition duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
