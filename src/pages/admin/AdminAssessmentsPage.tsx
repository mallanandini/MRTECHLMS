/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Award, Plus, Search, Filter, Clock, FileText, CheckCircle2, 
  XCircle, Users, BarChart3, Edit3, Trash2, Archive, Eye, 
  AlertCircle, RefreshCw, Layers, ShieldCheck, ChevronRight,
  FolderOpen, HelpCircle, Check, X, ArrowRight, BookOpen, AlertTriangle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { Assessment, Question } from "../../types.js";
import { AssessmentAssignmentsModal } from "../../components/admin/AssessmentAssignmentsModal.js";
import { AssessmentResultsModal } from "../../components/admin/AssessmentResultsModal.js";
import { useToast, useConfirm } from "../../context/NotificationContext.js";

interface AssessmentPreviewData {
  assessment: Assessment;
  questions: Question[];
}

export function AdminAssessmentsPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  // Category & Filter State
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryValidationError, setCategoryValidationError] = useState<string | null>(null);

  // Assessments Data State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // In-List Filter State (active after category loaded)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  // Modals state
  const [assigningAssessment, setAssigningAssessment] = useState<Assessment | null>(null);
  const [viewingResultsAssessment, setViewingResultsAssessment] = useState<Assessment | null>(null);
  const [previewData, setPreviewData] = useState<AssessmentPreviewData | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  // 1. Fetch distinct categories from backend
  const fetchCategories = useCallback(async () => {
    if (!authToken) return;
    try {
      setLoadingCategories(true);
      const res = await fetch("/api/admin/assessments/categories", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data: string[] = await res.json();
        setCategories(data || []);
      } else {
        console.error("Failed to fetch assessment categories");
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 2. Fetch assessments for a specific category (or all if specified)
  const loadAssessmentsForCategory = useCallback(async (cat: string) => {
    if (!authToken) return;
    try {
      setLoadingAssessments(true);
      setFetchError(null);
      const url = cat === "all" 
        ? "/api/admin/assessments"
        : `/api/admin/assessments?category=${encodeURIComponent(cat)}`;

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAssessments(data || []);
      } else {
        if (res.status === 401) {
          setFetchError("Your session has expired. Please log in again.");
          toast.error("Your session has expired. Please log in again.");
        } else if (res.status === 403) {
          setFetchError("You do not have permission to manage assessments.");
          toast.error("You do not have permission to manage assessments.");
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err.error || "Unable to load assessments. Please try again.";
          setFetchError(msg);
          toast.error(msg);
        }
      }
    } catch (err: any) {
      console.error("Failed to load assessments:", err);
      setFetchError("Unable to load assessments. Please try again.");
      toast.error("Unable to load assessments. Please try again.");
    } finally {
      setLoadingAssessments(false);
    }
  }, [authToken, toast]);

  // 3. Handle GO button
  const handleGo = () => {
    if (!selectedCategory || !selectedCategory.trim()) {
      setCategoryValidationError("Please select a category.");
      toast.warning("Please select a category.");
      return;
    }
    setCategoryValidationError(null);
    setActiveCategory(selectedCategory);
    loadAssessmentsForCategory(selectedCategory);
  };

  // 4. Handle CLEAR button
  const handleClear = () => {
    setSelectedCategory("");
    setActiveCategory(null);
    setAssessments([]);
    setCategoryValidationError(null);
    setSearchQuery("");
    setStatusFilter("all");
    setDifficultyFilter("all");
  };

  // 5. Handle REFRESH button
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchCategories();
      if (activeCategory) {
        await loadAssessmentsForCategory(activeCategory);
      }
      toast.success("Assessments refreshed successfully.");
    } catch (err) {
      toast.error("Unable to refresh assessments. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 6. Handle PUBLISH action
  const handlePublish = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Assessment published successfully!");
        if (activeCategory) loadAssessmentsForCategory(activeCategory);
      } else {
        toast.error(
          data.checklistErrors?.join(", ") || data.error || "Cannot publish: validation checklist failed"
        );
      }
    } catch (err: any) {
      toast.error("Publish failed: " + err.message);
    }
  };

  // 7. Handle ARCHIVE action
  const handleArchive = async (assessment: Assessment) => {
    const confirmed = await confirm({
      title: "Archive Assessment?",
      message: `Are you sure you want to archive "${assessment.title}"? Students will no longer see it in catalogs, but attempt records are preserved.`,
      confirmText: "Archive Assessment",
      variant: "warning"
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/assessments/${assessment.id}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        toast.success("Assessment archived successfully.");
        if (activeCategory) loadAssessmentsForCategory(activeCategory);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to archive assessment");
      }
    } catch (err: any) {
      toast.error("Archive failed: " + err.message);
    }
  };

  // 8. Handle DELETE action
  const handleDelete = async (assessment: Assessment) => {
    const confirmed = await confirm({
      title: "Delete Assessment?",
      message: `Are you sure you want to delete assessment "${assessment.title}"? This action cannot be undone.`,
      confirmText: "Delete Assessment",
      variant: "danger"
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/assessments/${assessment.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Assessment deleted successfully.");
        if (activeCategory) loadAssessmentsForCategory(activeCategory);
      } else {
        toast.error(data.error || "Failed to delete assessment");
      }
    } catch (err: any) {
      toast.error("Delete error: " + err.message);
    }
  };

  // 9. Handle PREVIEW action (fetch details & questions)
  const handleOpenPreview = async (assessmentId: string) => {
    try {
      setLoadingPreviewId(assessmentId);
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData({
          assessment: data.assessment,
          questions: data.questions || []
        });
      } else {
        toast.error("Failed to load assessment preview");
      }
    } catch (err: any) {
      toast.error("Preview error: " + err.message);
    } finally {
      setLoadingPreviewId(null);
    }
  };

  // Filter loaded assessments
  const filteredAssessments = assessments.filter(a => {
    const matchesSearch = !searchQuery || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.category && a.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesDiff = difficultyFilter === "all" || (a.difficulty || "medium").toLowerCase() === difficultyFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesDiff;
  });

  const formatTypeLabel = (type?: string) => {
    switch (type) {
      case "standalone": return "Standalone Assessment";
      case "lesson_practice": return "Lesson Practice Test";
      case "course_final": return "Course Final Exam";
      case "path_practice": return "Path Practice Test";
      case "path_final": return "Path Final Exam";
      default: return "Assessment";
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return iso;
    }
  };

  if (!authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] w-full min-w-0 font-sans mx-auto">
      
      {/* 1. Breadcrumb & Top Action Header */}
      <div className="space-y-3">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link 
            to="/admin/dashboard" 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Admin
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-semibold" aria-current="page">
            Assessments
          </span>
        </nav>

        {/* Page Title & Top-Right Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Assessments</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Author and organize quizzes, manage assignments, and monitor student test results
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/admin/assessment-results")}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="View comprehensive results & reporting analytics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Results & Reporting</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-60 cursor-pointer"
              title="Reload categories and assessments from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/assessments/new")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter Assessments Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Filter Assessments
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3.5">
          <div className="w-full sm:max-w-md space-y-1.5">
            <label htmlFor="assessment-category-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Category
            </label>
            <div className="relative">
              <select
                id="assessment-category-select"
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  if (categoryValidationError) setCategoryValidationError(null);
                }}
                disabled={loadingCategories}
                className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-lg border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  categoryValidationError 
                    ? "border-rose-400 bg-rose-50/50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/20"
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                }`}
              >
                <option value="">Choose a category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            {categoryValidationError && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{categoryValidationError}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleGo}
              disabled={loadingAssessments}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loadingAssessments ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Go</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Body: Initial Empty State vs Loading vs Assessments Table */}
      {!activeCategory ? (
        /* Initial Empty State before selecting category */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 sm:p-16 shadow-2xs text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Select a Category
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Please select a category from the dropdown above to view and manage its assessments.
            </p>
          </div>
        </div>
      ) : loadingAssessments ? (
        /* Loading Indicator */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 sm:p-16 shadow-2xs text-center">
          <div className="max-w-sm mx-auto space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Loading assessments...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fetching assessments in &quot;{activeCategory}&quot; from database
            </p>
          </div>
        </div>
      ) : fetchError ? (
        /* Error State */
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-8 shadow-2xs text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
            Unable to load assessments. Please try again.
          </h3>
          <p className="text-xs text-slate-500">{fetchError}</p>
          <button
            onClick={() => loadAssessmentsForCategory(activeCategory)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      ) : assessments.length === 0 ? (
        /* Zero Results in Selected Category */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No assessments found in this category.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            There are currently no assessment records filed under &quot;{activeCategory}&quot;. You can create one now.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/assessments/new")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Assessment</span>
          </button>
        </div>
      ) : (
        /* Assessment Results & Table */
        <div className="space-y-4">
          {/* Sub-Filters Header (Search & Status) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={`Search ${activeCategory} assessments...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">
                Status:
              </span>
              {(["all", "published", "draft", "archived"] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition cursor-pointer ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {st}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />

              <span className="text-xs font-mono font-bold text-slate-500">
                {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Desktop/Tablet Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    <th scope="col" className="py-3.5 px-4">Assessment Title</th>
                    <th scope="col" className="py-3.5 px-3">Type</th>
                    <th scope="col" className="py-3.5 px-3">Duration</th>
                    <th scope="col" className="py-3.5 px-3">Questions</th>
                    <th scope="col" className="py-3.5 px-3">Pass Rate</th>
                    <th scope="col" className="py-3.5 px-3">Status</th>
                    <th scope="col" className="py-3.5 px-3">Created</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredAssessments.map(assessment => {
                    const isDraft = assessment.status === "draft";
                    const isPublished = assessment.status === "published";
                    const isArchived = assessment.status === "archived";

                    return (
                      <tr 
                        key={assessment.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Title & Category */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 max-w-xs sm:max-w-sm">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {assessment.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {assessment.shortDescription || assessment.description || "No description provided"}
                            </p>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                            {formatTypeLabel(assessment.type)}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {assessment.durationMinutes} mins
                        </td>

                        {/* Questions Count */}
                        <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {assessment.questionsCount || 0} Qs
                        </td>

                        {/* Pass Score */}
                        <td className="py-3.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {assessment.passingScore}%
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPublished
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              : isDraft
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                              : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isPublished ? "bg-emerald-500" : isDraft ? "bg-amber-500" : "bg-slate-400"
                            }`} />
                            <span className="capitalize">{assessment.status || "draft"}</span>
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                          {formatDate(assessment.createdAt)}
                        </td>

                        {/* Actions Toolbar */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Preview / View */}
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(assessment.id)}
                              disabled={loadingPreviewId === assessment.id}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                              title="Preview Assessment Questions"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit / Build */}
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/assessments/${assessment.id}/builder`)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                              title="Edit in Assessment Builder"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Assign Students */}
                            <button
                              type="button"
                              onClick={() => setAssigningAssessment(assessment)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition cursor-pointer"
                              title="Assign to Students"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>

                            {/* Results */}
                            <button
                              type="button"
                              onClick={() => setViewingResultsAssessment(assessment)}
                              className="p-1.5 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition cursor-pointer"
                              title="View Student Results"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Publish (if draft) */}
                            {isDraft && (
                              <button
                                type="button"
                                onClick={() => handlePublish(assessment.id)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                                title="Publish Assessment"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Archive (if published) */}
                            {isPublished && (
                              <button
                                type="button"
                                onClick={() => handleArchive(assessment)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                                title="Archive Assessment"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDelete(assessment)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="Delete Assessment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View (< md) */}
          <div className="md:hidden space-y-3">
            {filteredAssessments.map(assessment => {
              const isDraft = assessment.status === "draft";
              const isPublished = assessment.status === "published";

              return (
                <div 
                  key={assessment.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                        {assessment.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {assessment.shortDescription || assessment.description || "No description"}
                      </p>
                    </div>

                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPublished 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400" 
                        : isDraft 
                        ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400"
                        : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {assessment.status || "draft"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-center text-[10px] font-mono text-slate-600 dark:text-slate-300">
                    <div>
                      <p className="text-slate-400 text-[9px] uppercase">Duration</p>
                      <p className="font-bold">{assessment.durationMinutes}m</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] uppercase">Questions</p>
                      <p className="font-bold">{assessment.questionsCount || 0} Qs</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] uppercase">Pass Rate</p>
                      <p className="font-bold">{assessment.passingScore}%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPreview(assessment.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => navigate(`/admin/assessments/${assessment.id}/builder`)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setAssigningAssessment(assessment)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1"
                      >
                        <Users className="w-3 h-3" />
                        <span>Assign</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {isDraft && (
                        <button
                          onClick={() => handlePublish(assessment.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"
                          title="Publish"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(assessment)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Assessment Preview Modal */}
      {previewData && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="assessment-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs font-sans animate-in fade-in"
          onClick={() => setPreviewData(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase font-mono">
                    {previewData.assessment.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    • {formatTypeLabel(previewData.assessment.type)}
                  </span>
                </div>
                <h3 id="assessment-preview-title" className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {previewData.assessment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                aria-label="Close Preview"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assessment Specifications Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono shrink-0">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Duration</span>
                <span className="font-bold text-slate-900 dark:text-white">{previewData.assessment.durationMinutes} mins</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Passing Score</span>
                <span className="font-bold text-slate-900 dark:text-white">{previewData.assessment.passingScore}%</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Questions</span>
                <span className="font-bold text-slate-900 dark:text-white">{previewData.questions.length} items</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Status</span>
                <span className="font-bold capitalize text-slate-900 dark:text-white">{previewData.assessment.status}</span>
              </div>
            </div>

            {/* Questions Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Questions ({previewData.questions.length})
              </h4>

              {previewData.questions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <HelpCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No questions have been added to this assessment yet.</p>
                </div>
              ) : (
                previewData.questions.map((q, idx) => (
                  <div 
                    key={q.id || idx}
                    className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                        Q{idx + 1}.
                      </span>
                      <p className="flex-1 text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                        {q.questionText}
                      </p>
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                        {q.points || 10} pts
                      </span>
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 pl-4">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctAnswers?.includes(opt);
                          return (
                            <div 
                              key={oIdx}
                              className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                                isCorrect
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold"
                                  : "bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-mono shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="flex-1 truncate">{opt}</span>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 pl-4 border-t border-slate-100 dark:border-slate-700/50">
                        💡 Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Created on {formatDate(previewData.assessment.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/admin/assessments/${previewData.assessment.id}/builder`);
                    setPreviewData(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1"
                >
                  <span>Open in Builder</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Assign Students Modal */}
      {assigningAssessment && (
        <AssessmentAssignmentsModal
          assessment={assigningAssessment}
          authToken={authToken}
          onClose={() => setAssigningAssessment(null)}
          onUpdated={() => {
            if (activeCategory) loadAssessmentsForCategory(activeCategory);
          }}
        />
      )}

      {/* 6. View Results Modal */}
      {viewingResultsAssessment && (
        <AssessmentResultsModal
          assessment={viewingResultsAssessment}
          authToken={authToken}
          onClose={() => setViewingResultsAssessment(null)}
        />
      )}

    </div>
  );
}
