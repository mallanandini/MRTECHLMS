/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Compass, Plus, Search, Filter, Layers, Users, Award, 
  Sparkles, CheckCircle2, Clock, Trash2, Copy, Edit3, 
  ExternalLink, Eye, ArrowRight, X, AlertCircle 
} from "lucide-react";
import { LearningPath } from "../../types.js";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function AdminLearningPathsPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Student Access Modal State
  const [accessModalPath, setAccessModalPath] = useState<LearningPath | null>(null);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPaths = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/learning-paths", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch learning paths");
      const data = await res.json();
      setPaths(data);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
  }, [authToken]);

  const handleDuplicate = async (pathId: string) => {
    try {
      const res = await fetch(`/api/admin/learning-paths/${pathId}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to duplicate learning path");
      showToast("Learning Path duplicated successfully", "success");
      fetchPaths();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (pathId: string) => {
    if (!confirm("Are you sure you want to delete this Learning Path? This will remove all sections, items, and student progress.")) return;
    try {
      const res = await fetch(`/api/admin/learning-paths/${pathId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to delete learning path");
      showToast("Learning Path deleted", "success");
      fetchPaths();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleOpenAccessModal = async (path: LearningPath) => {
    setAccessModalPath(path);
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/admin/learning-paths/${path.id}/students`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleToggleAccess = async (studentId: string, currentlyAssigned: boolean) => {
    if (!accessModalPath) return;
    try {
      const endpoint = currentlyAssigned
        ? `/api/admin/learning-paths/${accessModalPath.id}/revoke`
        : `/api/admin/learning-paths/${accessModalPath.id}/assign`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ studentIds: [studentId] })
      });

      if (!res.ok) throw new Error("Failed to change access");
      showToast(currentlyAssigned ? "Access revoked" : "Access granted", "success");
      
      // Refresh modal roster & main list
      const rosterRes = await fetch(`/api/admin/learning-paths/${accessModalPath.id}/students`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setStudentsList(data);
      }
      fetchPaths();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filteredPaths = paths.filter(path => {
    const matchesSearch = path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          path.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          path.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || path.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAssignedStudents = paths.reduce((sum, p) => sum + (p.assignedStudentsCount || 0), 0);
  const publishedPathsCount = paths.filter(p => p.status === "published").length;
  const avgCompletion = paths.length > 0
    ? Math.round(paths.reduce((sum, p) => sum + (p.completionRate || 0), 0) / paths.length)
    : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 text-sm font-medium transition-all ${
          toastMessage.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-blue-600" />
            <span>Learning Paths</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 font-mono">
            Structured Multi-Stage Learning Journeys, Milestone Progression & Access Management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
          <button
            onClick={() => navigate("/admin/learning-paths/new")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Learning Path</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Paths</span>
            <Compass className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{paths.length}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{publishedPathsCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Assignments</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalAssignedStudents}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Completion</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{avgCompletion}%</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg">
          {(["all", "published", "draft", "archived"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                statusFilter === tab
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search learning paths..."
            className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Learning Paths Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-medium">Loading learning paths...</div>
      ) : filteredPaths.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Learning Paths Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery ? "No learning paths matched your search query." : "Get started by authoring your first structured student learning path."}
          </p>
          <button
            onClick={() => navigate("/admin/learning-paths/new")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            + Create Learning Path
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaths.map(path => (
            <div
              key={path.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Thumbnail banner */}
              <div className="h-36 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={path.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"}
                  alt={path.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs ${
                    path.status === "published"
                      ? "bg-emerald-600/90 text-white"
                      : path.status === "archived"
                      ? "bg-slate-700/90 text-white"
                      : "bg-amber-600/90 text-white"
                  }`}>
                    {path.status}
                  </span>
                </div>

                <div className="absolute bottom-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/60 text-white backdrop-blur-xs">
                    {path.category}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {path.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {path.shortDescription || path.description}
                  </p>
                </div>

                {/* Metrics */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{path.sectionsCount || 0} Sections • {path.itemsCount || 0} Items</span>
                    </span>
                    <span className="font-mono text-[11px]">{path.estimatedDuration || "Flexible"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{path.assignedStudentsCount || 0} Assigned</span>
                    </span>
                    <span className="text-emerald-600 font-semibold">{path.completionRate || 0}% Completed</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/admin/learning-paths/${path.id}/edit`)}
                    className="flex-1 py-1.5 px-3 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Open Studio</span>
                  </button>

                  <button
                    onClick={() => handleOpenAccessModal(path)}
                    className="py-1.5 px-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                    title="Manage Student Access"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(path.id)}
                    className="py-1.5 px-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                    title="Duplicate Path"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(path.id)}
                    className="py-1.5 px-2.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete Path"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STUDENT ACCESS MODAL */}
      {accessModalPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Manage Access: {accessModalPath.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grant or revoke student permissions to start this learning path.
                </p>
              </div>
              <button
                onClick={() => setAccessModalPath(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Filter students by name or email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {loadingStudents ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading student roster...</div>
              ) : (
                studentsList
                  .filter(s => 
                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.email.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                  .map(student => (
                    <div key={student.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">
                          {student.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block truncate">
                          {student.email}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          student.isAssigned
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {student.isAssigned ? "Assigned" : "Not Assigned"}
                        </span>

                        <button
                          onClick={() => handleToggleAccess(student.id, student.isAssigned)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            student.isAssigned
                              ? "bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {student.isAssigned ? "Revoke Access" : "Grant Access"}
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAccessModalPath(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
