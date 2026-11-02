/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  BookOpen, Layers, Plus, Search, Filter, Lock, Edit3, Star, 
  Trash2, Users, Award, FileText, CheckCircle2, Clock, Sparkles, 
  RefreshCw, ArrowRight, ChevronRight, AlertCircle, Video
} from "lucide-react";
import { CourseAuthoringStudio } from "../../components/admin/CourseAuthoringStudio.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { useAuth } from "../../context/AuthContext.js";
import { Course } from "../../types.js";

interface AdminStats {
  studentsCount: number;
  trainersCount: number;
  coursesCount: number;
  submissionsCount: number;
}

export function AdminCoursesPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary authoritative navigation parameters
  const actionParam = searchParams.get("action"); // "new" | "content" | null (all)
  const courseIdParam = searchParams.get("courseId"); // selected course ID if any

  // Courses data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters for All Courses & Content Selection views
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch courses and stats from backend
  const fetchCoursesAndStats = useCallback(async () => {
    if (!authToken) return;
    try {
      setErrorMessage(null);
      const [coursesRes, statsRes] = await Promise.all([
        fetch("/api/admin/courses", {
          headers: { "Authorization": `Bearer ${authToken}` }
        }),
        fetch("/api/admin/stats", {
          headers: { "Authorization": `Bearer ${authToken}` }
        })
      ]);

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      } else {
        const err = await coursesRes.json().catch(() => ({}));
        setErrorMessage(err.error || "Failed to load courses");
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminStats(statsData);
      }
    } catch (err: any) {
      console.error("Error fetching courses and stats", err);
      setErrorMessage(err.message || "Network error loading courses");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchCoursesAndStats();
  }, [fetchCoursesAndStats]);

  // Status & Featured toggles
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
        fetchCoursesAndStats();
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
        fetchCoursesAndStats();
      }
    } catch (err) {
      console.error("Error toggling course featured", err);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}" and all its modules, lessons, and tests? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        fetchCoursesAndStats();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete course");
      }
    } catch (err) {
      console.error("Error deleting course", err);
    }
  };

  // Distinct categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach(c => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats);
  }, [courses]);

  // Filtered courses list
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        c.title.toLowerCase().includes(q) || 
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.instructorName && c.instructorName.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [courses, searchQuery, statusFilter, categoryFilter]);

  if (!authToken) return null;

  // =========================================================================
  // VIEW 1: CREATE NEW COURSE WORKFLOW (action="new")
  // =========================================================================
  if (actionParam === "new") {
    return (
      <div className="w-full min-h-screen">
        <CourseAuthoringStudio
          courseId={courseIdParam || "new"}
          authToken={authToken}
          backButtonLabel="Back to All Courses"
          onBack={() => {
            navigate("/admin/courses");
          }}
          onCourseSaved={(savedCourse) => {
            if (savedCourse && savedCourse.id) {
              setSearchParams({ action: "new", courseId: savedCourse.id, step: "curriculum" }, { replace: true });
            }
            fetchCoursesAndStats();
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: COURSE CONTENT & ASSESSMENTS (action="content")
  // =========================================================================
  if (actionParam === "content") {
    // If a course is selected, render the dedicated content and assessment studio
    if (courseIdParam) {
      return (
        <div className="w-full min-h-screen">
          <CourseAuthoringStudio
            courseId={courseIdParam}
            authToken={authToken}
            backButtonLabel="Back to Course Selection"
            onBack={() => {
              navigate("/admin/courses?action=content");
            }}
            onCourseSaved={() => {
              fetchCoursesAndStats();
            }}
          />
        </div>
      );
    }

    // Otherwise, render the dedicated Course Selection Interface
    return (
      <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1600px] w-full min-w-0 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-indigo-600" />
              <span>Course Content & Assessments</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
              Curriculum Modules, Video Sessions, Reading Resources, Practice Tests & Exams
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setIsRefreshing(true); fetchCoursesAndStats(); }}
              disabled={isRefreshing}
              className="h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh courses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Course Selection for Content & Assessment Management
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Select an existing course below to manage its curriculum modules, video sessions, reading materials, practice tests, and final exam configurations.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/courses?action=new")}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer whitespace-nowrap shrink-0 self-end md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses by title, category, or instructor..."
                className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                aria-label="Filter courses by category"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                aria-label="Filter courses by status"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Course Selection Cards */}
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-600" />
              <p className="text-xs font-medium">Loading courses...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No courses match your filter.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting your search query or create a fresh course.</p>
              <button
                onClick={() => navigate("/admin/courses?action=new")}
                className="mt-4 inline-flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Course</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredCourses.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-4.5 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {c.category || "General"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                        c.status === "published"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === "published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span>{c.status}</span>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" title={c.title}>
                        {c.title}
                      </h3>
                      {c.shortDescription && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {c.shortDescription}
                        </p>
                      )}
                    </div>

                    {/* Metrics Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold">{c.modulesCount || 0} Modules</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-semibold">{c.lessonsCount || 0} Lessons</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-semibold">{c.assessmentsCount || 0} Assessments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-semibold">{c.studentsCount || 0} Enrolled</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      onClick={() => navigate(`/admin/courses?action=content&courseId=${c.id}&step=curriculum`)}
                      className="w-full h-9 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Manage Content & Assessments</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ALL COURSES (DEFAULT / CATALOG VIEW)
  // =========================================================================
  // If an existing course is opened directly from All Courses catalog
  if (courseIdParam) {
    return (
      <div className="w-full min-h-screen">
        <CourseAuthoringStudio
          courseId={courseIdParam}
          authToken={authToken}
          backButtonLabel="Back to Course Catalog"
          onBack={() => {
            navigate("/admin/courses");
          }}
          onCourseSaved={() => {
            fetchCoursesAndStats();
          }}
        />
      </div>
    );
  }

  // All Courses Catalog View
  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1600px] w-full min-w-0 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>Courses — Catalog & Authoring Studio</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Course Curriculum, Modules, Lessons, Practice Tests, and Publication Lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/admin/courses?action=new")}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
          <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
        </div>
      </div>

      {/* KPI Stats Panel */}
      {adminStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Total Students</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{adminStats.studentsCount}</p>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Total Trainers</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{adminStats.trainersCount}</p>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Platform Courses</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{adminStats.coursesCount}</p>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Exam Submissions</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{adminStats.submissionsCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Course Catalog & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by title or category..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
              aria-label="Filter courses by category"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition cursor-pointer"
              aria-label="Filter courses by status"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold">Course Details</th>
                <th className="py-3 px-3 font-bold">Instructor</th>
                <th className="py-3 px-3 font-bold">Students</th>
                <th className="py-3 px-3 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-emerald-600" />
                    <span>Loading courses catalog...</span>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No courses available in catalog.</p>
                    <button
                      onClick={() => navigate("/admin/courses?action=new")}
                      className="mt-3 h-8.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Course</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start gap-3">
                        <img
                          src={c.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"}
                          alt={c.title}
                          className="w-14 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-xs xl:max-w-md" title={c.title}>
                            {c.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{c.category || "General"}</span>
                            <span>•</span>
                            <span>{c.duration || "Self-Paced"}</span>
                            <span>•</span>
                            <span>{c.modulesCount || 0} Modules</span>
                            <span>•</span>
                            <span>{c.lessonsCount || 0} Lessons</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {c.instructorName || "Administrator"}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]">
                        {c.instructorEmail || "admin@lms.com"}
                      </p>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold whitespace-nowrap">
                        <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{c.studentsCount || 0} Students</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 align-top">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono whitespace-nowrap ${
                        c.status === "published"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === "published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span>{c.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="w-[164px] ml-auto flex flex-col gap-1.5">
                        {/* Course Access */}
                        <button
                          onClick={() => navigate(`/admin/access?view=assign&courseId=${c.id}`)}
                          className="w-full h-7.5 px-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 active:bg-indigo-200 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Assign Access to Students & Batches"
                          aria-label="Manage Course Access"
                        >
                          <Lock className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                          <span className="truncate">Course Access</span>
                        </button>

                        {/* Edit / Build Content */}
                        <button
                          onClick={() => navigate(`/admin/courses?courseId=${c.id}&step=info`)}
                          className="w-full h-7.5 px-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 active:bg-blue-200 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Edit Course Information & Content"
                          aria-label="Edit Course"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span className="truncate">Edit / Build Content</span>
                        </button>

                        {/* Featured, Status, and Delete row */}
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            onClick={() => handleToggleFeatured(c.id, c.isFeatured || false)}
                            className={`h-7.5 w-7.5 rounded-lg border transition inline-flex items-center justify-center cursor-pointer shrink-0 ${
                              c.isFeatured 
                                ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400" 
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500"
                            }`}
                            title={c.isFeatured ? "Unfeature Course" : "Mark as Featured"}
                            aria-label={c.isFeatured ? "Unfeature Course" : "Mark as Featured"}
                          >
                            <Star className={`w-3.5 h-3.5 ${c.isFeatured ? "fill-amber-400 text-amber-500" : ""}`} />
                          </button>

                          <button
                            onClick={() => handleToggleCourseStatus(c.id, c.status)}
                            className={`flex-1 h-7.5 px-1 border rounded-lg text-[11px] font-semibold transition inline-flex items-center justify-center text-center cursor-pointer shadow-2xs ${
                              c.status === "published"
                                ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                                : "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                            }`}
                            title={c.status === "published" ? "Unpublish Course to Draft" : "Publish Course to Students"}
                            aria-label={c.status === "published" ? "Unpublish Course" : "Publish Course"}
                          >
                            <span className="truncate">{c.status === "published" ? "Unpublish" : "Publish"}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCourse(c.id, c.title)}
                            className="h-7.5 w-7.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition inline-flex items-center justify-center cursor-pointer shrink-0"
                            title="Delete Course and All Content"
                            aria-label="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}