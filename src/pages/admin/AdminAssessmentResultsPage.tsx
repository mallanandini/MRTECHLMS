/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Award, BarChart3, Search, Filter, RefreshCw, Download, 
  Users, CheckCircle2, XCircle, Clock, Eye, AlertCircle, 
  Layers, ArrowUpDown, ChevronRight, BookOpen, Check, X
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/NotificationContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { Assessment, AdminAssessmentResultRow, AdminResultsSummary } from "../../types.js";
import { AssessmentSubmissionDetailModal } from "../../components/admin/AssessmentSubmissionDetailModal.js";

export function AdminAssessmentResultsPage() {
  const { authToken } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Data states
  const [summary, setSummary] = useState<AdminResultsSummary | null>(null);
  const [assessmentsList, setAssessmentsList] = useState<Assessment[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const initialAssessmentId = searchParams.get("assessmentId") || "all";
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(initialAssessmentId);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fromUrl = searchParams.get("assessmentId");
    if (fromUrl) {
      setSelectedAssessmentId(fromUrl);
    }
  }, [searchParams]);

  // Detail modal state
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);

  // 1. Fetch metadata (assessments and categories for dropdowns)
  useEffect(() => {
    if (!authToken) return;

    const fetchMeta = async () => {
      try {
        const [assRes, catRes] = await Promise.all([
          fetch("/api/admin/assessments", { headers: { "Authorization": `Bearer ${authToken}` } }),
          fetch("/api/admin/assessments/categories", { headers: { "Authorization": `Bearer ${authToken}` } })
        ]);
        if (assRes.ok) {
          const assData = await assRes.json();
          setAssessmentsList(assData || []);
        }
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategoriesList(catData || []);
        }
      } catch (err) {
        console.error("Failed to load assessments/categories metadata", err);
      }
    };
    fetchMeta();
  }, [authToken]);

  // 2. Fetch Results with active filters
  const fetchResults = useCallback(async (isRefresh = false) => {
    if (!authToken) return;
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (selectedAssessmentId && selectedAssessmentId !== "all") {
        params.append("assessmentId", selectedAssessmentId);
      }
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/results?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        toast.error("Failed to fetch assessment results");
      }
    } catch (err: any) {
      console.error("Error fetching admin results", err);
      toast.error("Error fetching results: " + err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [authToken, selectedAssessmentId, selectedCategory, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedAssessmentId("all");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSearchQuery("");
  };

  // Export filtered rows to Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = summary?.results || [];
    if (rows.length === 0) {
      toast.warning("No data to export for current filters.");
      return;
    }

    try {
      const exportData = rows.map((r, idx) => ({
        "No.": idx + 1,
        "Student Name": r.studentName,
        "Student Email": r.studentEmail,
        "Assessment Title": r.assessmentTitle,
        "Category": r.assessmentCategory,
        "Status": r.status.toUpperCase(),
        "Score Obtained": r.score !== null ? r.score : "N/A",
        "Total Points": r.totalPoints,
        "Percentage (%)": r.percentage !== null ? `${r.percentage}%` : "N/A",
        "Correct Count": r.correctCount,
        "Incorrect Count": r.incorrectCount,
        "Unanswered Count": r.unansweredCount,
        "Time Taken (Seconds)": r.timeTakenSeconds,
        "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "Not Submitted",
        "Assigned At": r.assignedAt ? new Date(r.assignedAt).toLocaleString() : "N/A"
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Results");

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `MRTECHLMS_Assessment_Results_${timestamp}.xlsx`);
      toast.success("Excel report exported successfully!");
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel file: " + err.message);
    }
  };

  const formatDuration = (secs: number) => {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const results = summary?.results || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Top Breadcrumb & Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <Link to="/admin/dashboard" className="hover:text-slate-600 transition">Admin</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link to="/admin/assessments" className="hover:text-slate-600 transition">Assessments</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-800">Results & Reporting</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <BarChart3 className="w-7 h-7 text-blue-600 shrink-0" />
                <span>Assessment Results & Analytics</span>
              </h1>
            </div>

            {/* Header Right Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <ThemeQuickControls />
              <button
                onClick={() => fetchResults(true)}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Refresh results"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Export current table to Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <Link
                to="/admin/assessments"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>Manage Tests</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Cards Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Total Assigned</span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{summary?.totalAssigned ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Submissions</span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{summary?.totalSubmissions ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Pass Rate</span>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{summary?.passRate ?? 0}%</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Average Score</span>
              <p className="text-2xl font-black text-violet-600 mt-0.5">{summary?.averageScore ?? 0}%</p>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                Filter Candidates & Submissions
              </h3>
            </div>
            {(selectedAssessmentId !== "all" || selectedCategory !== "all" || selectedStatus !== "all" || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Assessment Selector */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">
                Assessment
              </label>
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              >
                <option value="all">All Assessments</option>
                {assessmentsList.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Attempt Status */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="assigned">Assigned / Pending</option>
              </select>
            </div>

            {/* Candidate Search */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">
                Search Candidate
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Candidate name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Candidate Performance Records ({results.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Showing filtered candidate results
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Assessment Records Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No candidate attempts or assignments match the selected filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-5 font-bold">Candidate</th>
                    <th className="py-3.5 px-5 font-bold">Assessment</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-center">Score</th>
                    <th className="py-3.5 px-4 font-bold text-center">Percentage</th>
                    <th className="py-3.5 px-4 font-bold text-center">Metrics</th>
                    <th className="py-3.5 px-4 font-bold text-center">Duration</th>
                    <th className="py-3.5 px-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {results.map((row) => {
                    const isSubmitted = row.status === "passed" || row.status === "failed";

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition group">
                        {/* Candidate */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {row.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{row.studentName}</p>
                              <p className="text-[11px] text-slate-400 truncate">{row.studentEmail}</p>
                            </div>
                          </div>
                        </td>

                        {/* Assessment */}
                        <td className="py-4 px-5">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{row.assessmentTitle}</p>
                            <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {row.assessmentCategory}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                            row.status === "passed"
                              ? "bg-emerald-100 text-emerald-800"
                              : row.status === "failed"
                                ? "bg-rose-100 text-rose-800"
                                : row.status === "in_progress"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                          }`}>
                            {row.status === "assigned" ? "Assigned" : row.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-900">
                          {row.score !== null ? `${row.score} / ${row.totalPoints}` : "—"}
                        </td>

                        {/* Percentage */}
                        <td className="py-4 px-4 text-center font-mono">
                          {row.percentage !== null ? (
                            <span className={`font-bold ${
                              row.status === "passed" ? "text-emerald-600" : "text-rose-600"
                            }`}>
                              {row.percentage}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Metrics Breakdown */}
                        <td className="py-4 px-4 text-center font-mono text-[11px]">
                          {isSubmitted ? (
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              <span className="text-emerald-700 font-bold" title="Correct">
                                ✓{row.correctCount}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-rose-700 font-bold" title="Incorrect">
                                ✗{row.incorrectCount}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="text-slate-500" title="Unanswered">
                                ?{row.unansweredCount}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-sans text-[11px]">Not attempted</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4 text-center font-mono text-slate-600">
                          {isSubmitted ? formatDuration(row.timeTakenSeconds) : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          {row.submissionId ? (
                            <button
                              onClick={() => setViewingSubmissionId(row.submissionId!)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="View Question-by-Question Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Details</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No attempt</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Question-Wise Result Details Modal */}
      {viewingSubmissionId && authToken && (
        <AssessmentSubmissionDetailModal
          submissionId={viewingSubmissionId}
          authToken={authToken}
          onClose={() => setViewingSubmissionId(null)}
        />
      )}
    </div>
  );
}
