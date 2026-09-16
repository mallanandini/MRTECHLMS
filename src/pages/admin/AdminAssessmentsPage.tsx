/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Award, Plus, Search, Filter, Clock, FileText, CheckCircle2, 
  XCircle, Users, BarChart3, Edit3, Trash2, Archive, Eye, 
  AlertCircle, RefreshCw, Layers, ShieldCheck, MoreVertical
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { Assessment } from "../../types.js";
import { AssessmentAssignmentsModal } from "../../components/admin/AssessmentAssignmentsModal.js";
import { AssessmentResultsModal } from "../../components/admin/AssessmentResultsModal.js";

export function AdminAssessmentsPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Selected modals
  const [assigningAssessment, setAssigningAssessment] = useState<Assessment | null>(null);
  const [viewingResultsAssessment, setViewingResultsAssessment] = useState<Assessment | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await fetch("/api/admin/assessments", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessments(data || []);
      }
    } catch (err: any) {
      console.error("Failed to load assessments", err);
      setActionError("Failed to load assessments catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) fetchAssessments();
  }, [authToken]);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 5000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handlePublish = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Assessment published successfully!");
        await fetchAssessments();
      } else {
        showNotification(
          data.checklistErrors?.join(", ") || data.error || "Cannot publish: validation checklist failed",
          true
        );
      }
    } catch (err: any) {
      showNotification("Publish failed: " + err.message, true);
    }
  };

  const handleArchive = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/archive`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        showNotification("Assessment archived");
        await fetchAssessments();
      }
    } catch (err: any) {
      showNotification("Archive failed: " + err.message, true);
    }
  };

  const handleDelete = async (assessment: Assessment) => {
    if (!confirm(`Are you sure you want to delete assessment "${assessment.title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/assessments/${assessment.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Assessment deleted successfully");
        await fetchAssessments();
      } else {
        // Show reason (e.g. existing submissions)
        showNotification(data.error || "Failed to delete assessment", true);
      }
    } catch (err: any) {
      showNotification("Delete error: " + err.message, true);
    }
  };

  // Metrics computation
  const totalCount = assessments.length;
  const publishedCount = assessments.filter(a => a.status === "published").length;
  const totalAssigned = assessments.reduce((sum, a) => sum + (a.assignedStudentsCount || 0), 0);
  const totalSubmissions = assessments.reduce((sum, a) => sum + (a.attemptsCount || 0), 0);

  // Filtering
  const filtered = assessments.filter(a => {
    const matchesSearch = 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.category && a.category.toLowerCase().includes(search.toLowerCase())) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (typeFilter !== "all") {
      if (typeFilter === "standalone" && a.type !== "standalone") return false;
      if (typeFilter !== "standalone" && a.assessmentType !== typeFilter && a.type !== typeFilter) return false;
    }
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (difficultyFilter !== "all" && (a.difficulty || "medium").toLowerCase() !== difficultyFilter.toLowerCase()) return false;

    return true;
  });

  if (!authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <Award className="w-6 h-6 text-rose-500" />
            <span>Assessments Management</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Author MCQ Quizzes, Assign Students & Track Graded Results
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2">
            <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
          </div>

          <button
            onClick={() => navigate("/admin/assessments/new")}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/70 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Total Assessments</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{totalCount}</p>
          <p className="text-[11px] text-slate-500">{assessments.filter(a => a.type === "standalone").length} standalone tests</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/70 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">{publishedCount}</p>
          <p className="text-[11px] text-emerald-600 font-medium">Ready for student testing</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/70 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">Active Assignments</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700 font-mono">{totalAssigned}</p>
          <p className="text-[11px] text-blue-600 font-medium">Enrolled student seats</p>
        </div>

        <div className="p-5 bg-white border border-slate-200/70 rounded-2xl shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-violet-600 uppercase font-mono">Total Submissions</span>
            <BarChart3 className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-black text-violet-700 font-mono">{totalSubmissions}</p>
          <p className="text-[11px] text-violet-600 font-medium">Graded attempt logs</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, category, keyword..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end text-xs">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="standalone">Standalone Only</option>
            <option value="technical">Technical</option>
            <option value="practice_test">Practice Test</option>
            <option value="mock_test">Mock Test</option>
            <option value="aptitude">Aptitude</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <button
            onClick={fetchAssessments}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition cursor-pointer"
            title="Reload Assessments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assessments Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold">Loading assessments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="text-base font-bold text-slate-700">No Assessments Match Your Filter</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search query or create a new assessment using the button below.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/admin/assessments/new")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              + Create Assessment
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(assessment => {
            const isPublished = assessment.status === "published";
            const isArchived = assessment.status === "archived";

            return (
              <div
                key={assessment.id}
                className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3.5">
                  {/* Category & Status badges */}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase">
                      {assessment.category || "General"}
                    </span>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                      isPublished
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isArchived
                        ? "bg-slate-100 text-slate-500 border-slate-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {assessment.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {assessment.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {assessment.shortDescription || assessment.description || "No description provided."}
                    </p>
                  </div>

                  {/* Parameters Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-[10px] font-mono font-semibold text-slate-600 text-center">
                    <div className="border-r border-slate-200/60">
                      <p className="text-slate-400 text-[9px] uppercase font-bold">Questions</p>
                      <p className="font-bold text-slate-900 mt-0.5">{assessment.questionsCount || 0} Qs</p>
                    </div>
                    <div className="border-r border-slate-200/60">
                      <p className="text-slate-400 text-[9px] uppercase font-bold">Duration</p>
                      <p className="font-bold text-slate-900 mt-0.5">{assessment.durationMinutes} Min</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] uppercase font-bold">Pass Rate</p>
                      <p className="font-bold text-slate-900 mt-0.5">{assessment.passingScore}%</p>
                    </div>
                  </div>

                  {/* Live Student Stats */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                    <span>Assigned: <strong className="text-slate-800">{assessment.assignedStudentsCount || 0}</strong></span>
                    <span>Attempts: <strong className="text-slate-800">{assessment.attemptsCount || 0}</strong></span>
                    <span>Avg: <strong className="text-slate-800">{assessment.averageScore || 0} pts</strong></span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => navigate(`/admin/assessments/${assessment.id}/builder`)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Build</span>
                    </button>

                    <button
                      onClick={() => setAssigningAssessment(assessment)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>

                    <button
                      onClick={() => setViewingResultsAssessment(assessment)}
                      className="px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Results</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    {!isPublished ? (
                      <button
                        onClick={() => handlePublish(assessment.id)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(assessment.id)}
                        className="text-slate-500 hover:text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(assessment)}
                      className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                      title="Delete Assessment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ASSIGN STUDENTS */}
      {assigningAssessment && (
        <AssessmentAssignmentsModal
          assessment={assigningAssessment}
          authToken={authToken}
          onClose={() => setAssigningAssessment(null)}
          onUpdated={fetchAssessments}
        />
      )}

      {/* MODAL: RESULTS & ANALYTICS */}
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
