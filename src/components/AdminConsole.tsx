/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, BookOpen, Award, ShieldAlert, CheckCircle2, 
  XCircle, Search, ToggleLeft, ToggleRight, Star, ArrowRight 
} from "lucide-react";
import { User, Course, UserRole } from "../types.js";

interface AdminConsoleProps {
  authToken: string;
}

export function AdminConsole({ authToken }: AdminConsoleProps) {
  const [adminStats, setAdminStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<"users" | "courses">("users");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAdminDashboard = async () => {
    try {
      // Load stats
      const statsRes = await fetch("/api/admin/dashboard", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setAdminStats(stats);
      }

      // Load all users
      const usersRes = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Load all courses
      const coursesRes = await fetch("/api/courses", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      }
    } catch (e) {
      console.error("Error loading admin system configs", e);
    }
  };

  useEffect(() => {
    loadAdminDashboard();
  }, [authToken]);

  const handleToggleUserStatus = async (userId: string, currentStatus: "active" | "suspended") => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        loadAdminDashboard(); // Refresh
      }
    } catch (err) {
      console.error("Error toggling user status", err);
    }
  };

  const handleToggleCourseStatus = async (courseId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        loadAdminDashboard();
      }
    } catch (err) {
      console.error("Error toggling course approval", err);
    }
  };

  const handleToggleFeatured = async (courseId: string, isFeatured: boolean) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ isFeatured: !isFeatured })
      });
      if (res.ok) {
        loadAdminDashboard();
      }
    } catch (err) {
      console.error("Error toggling course feature", err);
    }
  };

  const filteredUsers = users.filter(u => {
    return u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           u.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Admin KPI Panel */}
      {adminStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Total Students</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.studentsCount}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Total Trainers</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.trainersCount}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Platform Courses</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.coursesCount}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Exam Submissions</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.submissionsCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Directory Management Interface */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="flex gap-2.5">
            <button
              onClick={() => { setActiveSubTab("users"); setSearchQuery(""); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                activeSubTab === "users" 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"
              }`}
            >
              System User Moderation
            </button>
            <button
              onClick={() => { setActiveSubTab("courses"); setSearchQuery(""); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                activeSubTab === "courses" 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"
              }`}
            >
              Course Approval Catalog
            </button>
          </div>

          {activeSubTab === "users" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Dynamic Tables rendering */}
        {activeSubTab === "users" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Platform Role</th>
                  <th className="py-3 px-4">System Status</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                        <p className="text-gray-400 font-mono mt-0.5">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold uppercase text-slate-500">
                      {u.role}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                        u.status === "active" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {u.role !== UserRole.ADMIN && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition flex items-center gap-1 ml-auto shadow-xs ${
                            u.status === "active"
                              ? "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100"
                              : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {u.status === "active" ? "Suspend Account" : "Activate Account"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Course Details</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4 text-right">Catalogue Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{c.title}</p>
                        <p className="text-gray-400 font-mono mt-0.5">{c.category}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-600">
                      {c.instructorName}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                        c.status === "published" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === "published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleToggleFeatured(c.id, c.isFeatured)}
                          className={`p-1.5 border rounded-lg transition ${
                            c.isFeatured 
                              ? "bg-amber-50 border-amber-200 text-amber-600" 
                              : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                          }`}
                          title={c.isFeatured ? "Unfeature Course" : "Feature Course"}
                        >
                          <Star className={`w-4 h-4 ${c.isFeatured ? "fill-amber-400" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleToggleCourseStatus(c.id, c.status)}
                          className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-xs ${
                            c.status === "published"
                              ? "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100"
                              : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {c.status === "published" ? "Withdraw Approval" : "Approve & Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
