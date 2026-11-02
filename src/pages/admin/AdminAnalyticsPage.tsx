/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, TrendingUp, Users, BookOpen, Award, Medal, Clock, 
  AlertTriangle, Calendar, Download, Search, Filter, ArrowUpRight, 
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, RefreshCw, 
  FileSpreadsheet, FileText, HelpCircle, Activity, Layers, X, ShieldAlert,
  Percent, ArrowRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { UserRole } from "../../types.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

interface AdminAnalyticsPageProps {
  isManagerView?: boolean;
}

export function AdminAnalyticsPage({ isManagerView = false }: AdminAnalyticsPageProps) {
  const { authToken, currentUser } = useAuth();
  const navigate = useNavigate();

  // Tab state: "overview" | "courses" | "assessments" | "learners" | "export"
  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "assessments" | "learners" | "export">("overview");

  // Date range filter
  const [dateFilterPreset, setDateFilterPreset] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Overview Data
  const [overviewData, setOverviewData] = useState<any>(null);

  // Courses List Data & Selection
  const [coursesData, setCoursesData] = useState<any>({ items: [], page: 1, limit: 10, total: 0, totalPages: 1 });
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<any>(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);

  // Assessments List Data & Selection
  const [assessmentsData, setAssessmentsData] = useState<any>({ items: [], page: 1, limit: 10, total: 0, totalPages: 1 });
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [selectedAssessmentDetail, setSelectedAssessmentDetail] = useState<any>(null);
  const [assessmentDetailLoading, setAssessmentDetailLoading] = useState(false);

  // Learners List Data & Scorecard Selection
  const [learnersData, setLearnersData] = useState<any>({ items: [], page: 1, limit: 15, total: 0, totalPages: 1 });
  const [learnerSearch, setLearnerSearch] = useState("");
  const [selectedLearnerScorecard, setSelectedLearnerScorecard] = useState<any>(null);
  const [learnerScorecardLoading, setLearnerScorecardLoading] = useState(false);

  // Export State
  const [exportType, setExportType] = useState<"learners" | "courses" | "assessments" | "overdue">("learners");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx");
  const [exporting, setExporting] = useState(false);

  // Initialize date presets
  useEffect(() => {
    updateDateFilterPreset("30d");
  }, []);

  const updateDateFilterPreset = (preset: "7d" | "30d" | "90d" | "all" | "custom") => {
    setDateFilterPreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    
    if (preset === "7d") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(endStr);
    } else if (preset === "30d") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(endStr);
    } else if (preset === "90d") {
      const past = new Date();
      past.setDate(now.getDate() - 90);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(endStr);
    } else if (preset === "all") {
      setStartDate("2020-01-01");
      setEndDate(endStr);
    }
  };

  // Load Overview Data
  useEffect(() => {
    if (!authToken) return;
    loadOverview();
  }, [authToken, startDate, endDate, isManagerView]);

  // Load Course List when on courses tab
  useEffect(() => {
    if (!authToken || activeTab !== "courses") return;
    loadCourses(1);
  }, [authToken, activeTab, courseSearch]);

  // Load Assessment List when on assessments tab
  useEffect(() => {
    if (!authToken || activeTab !== "assessments") return;
    loadAssessments(1);
  }, [authToken, activeTab, assessmentSearch]);

  // Load Learners List when on learners tab
  useEffect(() => {
    if (!authToken || activeTab !== "learners") return;
    loadLearners(1);
  }, [authToken, activeTab, learnerSearch]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", `${endDate} 23:59:59`);

      const endpoint = isManagerView 
        ? `/api/analytics/manager/team?${query.toString()}`
        : `/api/analytics/admin/overview?${query.toString()}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load overview analytics");
      }
      const data = await res.json();
      setOverviewData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async (page = 1) => {
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "10",
        search: courseSearch
      });
      const res = await fetch(`/api/analytics/courses?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCoursesData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadCourseDetail = async (courseId: string) => {
    setCourseDetailLoading(true);
    try {
      const res = await fetch(`/api/analytics/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCourseDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCourseDetailLoading(false);
    }
  };

  const loadAssessments = async (page = 1) => {
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "10",
        search: assessmentSearch
      });
      const res = await fetch(`/api/analytics/assessments?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessmentsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssessmentDetail = async (assessmentId: string) => {
    setAssessmentDetailLoading(true);
    try {
      const res = await fetch(`/api/analytics/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedAssessmentDetail(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssessmentDetailLoading(false);
    }
  };

  const loadLearners = async (page = 1) => {
    try {
      // Use users API to get list, then scorecard can be inspected
      const query = new URLSearchParams({
        search: learnerSearch,
        role: "student",
        page: String(page),
        limit: "15"
      });
      const res = await fetch(`/api/admin/users?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLearnersData({
          items: Array.isArray(data) ? data : data.users || [],
          page,
          limit: 15,
          total: Array.isArray(data) ? data.length : data.total || 0,
          totalPages: Math.ceil((Array.isArray(data) ? data.length : data.total || 1) / 15)
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadLearnerScorecard = async (learnerId: string) => {
    setLearnerScorecardLoading(true);
    try {
      const res = await fetch(`/api/analytics/learners/${learnerId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLearnerScorecard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLearnerScorecardLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({
        type: exportType,
        format: exportFormat
      });
      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", `${endDate} 23:59:59`);

      const res = await fetch(`/api/analytics/export?${query.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to download export report");
      }

      // Convert response to blob and trigger browser download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mrtechlms_${exportType}_report_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isManagerView ? "Team Analytics & Intelligence" : "Executive Analytics & Reporting"}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isManagerView 
              ? "Real-time compliance scorecard and metrics for your authorized team members" 
              : "Server-side aggregated platform KPIs, bottleneck analysis, score distributions, and enterprise exports"}
          </p>
        </div>

        {/* Global Date-Range Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => updateDateFilterPreset("7d")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilterPreset === "7d"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => updateDateFilterPreset("30d")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilterPreset === "30d"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => updateDateFilterPreset("90d")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilterPreset === "90d"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => updateDateFilterPreset("all")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                dateFilterPreset === "all"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={() => loadOverview()}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <ThemeQuickControls onOpenPreferences={() => navigate(isManagerView ? "/manager/profile" : "/admin/profile")} />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" />
          Platform Overview
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "courses"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Course Analytics
        </button>
        <button
          onClick={() => setActiveTab("assessments")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "assessments"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Award className="w-4 h-4" />
          Assessment Analytics
        </button>
        <button
          onClick={() => setActiveTab("learners")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "learners"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Learner Scorecards
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "export"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Download className="w-4 h-4" />
          Report Export Center
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PLATFORM / TEAM OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {loading && !overviewData ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Aggregating server-side statistics...</p>
            </div>
          ) : (
            <>
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Learners KPI */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {isManagerView ? "Team Learners" : "Total Learners"}
                    </span>
                    <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {overviewData?.totalLearners ?? overviewData?.teamLearnersCount ?? 0}
                    </span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                      {overviewData?.activeLearners ?? overviewData?.activeLearnersCount ?? 0} active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Active learners engaged in selected period</p>
                </div>

                {/* 2. Completion Rate KPI */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Course Completion Rate</span>
                    <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {overviewData?.completionRate ?? overviewData?.courseStats?.completionRate ?? 0}%
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {overviewData?.enrollments?.completed ?? overviewData?.courseStats?.totalCompleted ?? 0} finished
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Out of {overviewData?.enrollments?.total ?? overviewData?.courseStats?.totalAssigned ?? 0} total enrollments
                  </p>
                </div>

                {/* 3. Assessment Pass Rate & Average Score */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Assessment Pass Rate</span>
                    <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                      <Award className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {overviewData?.assessmentStats?.passRate ?? 0}%
                    </span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      Avg {overviewData?.assessmentStats?.averageScore ?? 0}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Across {overviewData?.assessmentStats?.totalAttempts ?? 0} total exam attempts
                  </p>
                </div>

                {/* 4. Overdue Compliance Warning */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Overdue Training</span>
                    <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-3xl font-extrabold ${
                      (overviewData?.overdueCount ?? overviewData?.overdueItemsCount ?? 0) > 0 
                        ? "text-rose-600 dark:text-rose-400" 
                        : "text-slate-900 dark:text-white"
                    }`}>
                      {overviewData?.overdueCount ?? overviewData?.overdueItemsCount ?? 0}
                    </span>
                    <span className="text-xs font-medium text-slate-500">items</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Past assigned deadline and incomplete</p>
                </div>

              </div>

              {/* Secondary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Courses Catalog Breakdown */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Courses Status
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Published Courses</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {overviewData?.courses?.published ?? 0}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ 
                          width: `${overviewData?.courses?.total ? Math.round(((overviewData?.courses?.published || 0) / overviewData.courses.total) * 100) : 0}%` 
                        }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 pt-1">
                      <span>Draft: {overviewData?.courses?.draft ?? 0}</span>
                      <span>Archived: {overviewData?.courses?.archived ?? 0}</span>
                      <span>Total: {overviewData?.courses?.total ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Certificates Issued */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-amber-500" />
                    Certificates Awarded
                  </h3>
                  <div className="flex items-baseline gap-3 my-2">
                    <span className="text-4xl font-extrabold text-amber-600 dark:text-amber-400">
                      {overviewData?.certificatesIssued ?? overviewData?.totalCertificates ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Official verified credentials issued</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Active credentials verified via SHA-256 integrity</p>
                </div>

                {/* Enrollment Funnel Distribution */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Enrollment Funnel
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Not Started:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {overviewData?.enrollments?.notStarted ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">In Progress:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {overviewData?.enrollments?.inProgress ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Completed:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {overviewData?.enrollments?.completed ?? overviewData?.courseStats?.totalCompleted ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Learning Activity Time-Series Trend */}
              {overviewData?.activityTrend && overviewData.activityTrend.length > 0 && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-600" />
                        Platform Activity Velocity (14-Day Trajectory)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Daily course enrollments, lesson completions, and exam attempts</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="text-slate-500">Enrollments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-500">Completions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-500">Submissions</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar Time Series */}
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-6 items-end h-44">
                    {overviewData.activityTrend.map((t: any, idx: number) => {
                      const totalActivity = t.enrollments + t.completions + t.submissions;
                      const maxVal = Math.max(...overviewData.activityTrend.map((x: any) => x.enrollments + x.completions + x.submissions), 5);
                      const heightPct = Math.min(100, Math.max(12, Math.round((totalActivity / maxVal) * 100)));

                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-12 bg-slate-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10">
                            {t.date}: {t.enrollments} enr, {t.completions} comp, {t.submissions} sub
                          </div>

                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-md flex flex-col justify-end overflow-hidden h-28">
                            <div 
                              className="w-full bg-indigo-500 transition-all rounded-t-sm"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono rotate-45 sm:rotate-0 mt-1">
                            {t.date ? t.date.slice(5) : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COURSE PERFORMANCE & DROP-OFF BOTTLENECK ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses by title..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Courses Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Course</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Enrollments</th>
                    <th className="py-3.5 px-4 text-right">Started</th>
                    <th className="py-3.5 px-4 text-right">Completed</th>
                    <th className="py-3.5 px-4 text-right">Completion Rate</th>
                    <th className="py-3.5 px-4 text-right">Avg Progress</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {coursesData.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No courses found
                      </td>
                    </tr>
                  ) : (
                    coursesData.items.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                          {c.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{c.category || "General"}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.status === "published"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                          {c.totalEnrollments}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-400">
                          {c.startsCount}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {c.completionsCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          {c.completionRate}%
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-400">
                          {c.avgProgressPercentage}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => loadCourseDetail(c.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-100 transition text-xs"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {coursesData.totalPages > 1 && (
              <div className="py-3 px-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Page {coursesData.page} of {coursesData.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={coursesData.page <= 1}
                    onClick={() => loadCourses(coursesData.page - 1)}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={coursesData.page >= coursesData.totalPages}
                    onClick={() => loadCourses(coursesData.page + 1)}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal / Detailed Drawer: Course Drop-off Analysis */}
          {selectedCourseDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
                
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Course Drop-Off Intelligence</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedCourseDetail.course?.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCourseDetail(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Key Course Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Enrollments</span>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedCourseDetail.metrics?.totalEnrollments || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Completions</span>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {selectedCourseDetail.metrics?.completionsCount || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Completion Rate</span>
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      {selectedCourseDetail.metrics?.completionPercentage || 0}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Avg Days to Finish</span>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedCourseDetail.metrics?.avgCompletionDays || 0} days
                    </p>
                  </div>
                </div>

                {/* Drop-Off Points Waterfall */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    Lesson-by-Lesson Drop-Off & Bottleneck Analysis
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Sequential completion rates through course modules. Drop-off indicates points where learners stall.
                  </p>

                  <div className="space-y-3">
                    {selectedCourseDetail.dropOffPoints?.map((l: any, idx: number) => (
                      <div key={l.lessonId} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                          <span>
                            {idx + 1}. {l.lessonTitle} <span className="text-slate-400 font-normal">({l.moduleTitle})</span>
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {l.completedStudents} learners ({l.completionRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${l.completionRate}%` }}
                          />
                        </div>
                        {l.dropOff > 0 && idx > 0 && (
                          <span className="text-[10px] text-rose-500 font-medium mt-1 inline-block">
                            🔻 {l.dropOff} student drop-off from previous lesson
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ASSESSMENT INTELLIGENCE & ITEM ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === "assessments" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={assessmentSearch}
                onChange={(e) => setAssessmentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Assessments Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Assessment Title</th>
                    <th className="py-3.5 px-4 text-right">Pass Mark</th>
                    <th className="py-3.5 px-4 text-right">Attempts</th>
                    <th className="py-3.5 px-4 text-right">Unique Students</th>
                    <th className="py-3.5 px-4 text-right">Passed</th>
                    <th className="py-3.5 px-4 text-right">Pass Rate</th>
                    <th className="py-3.5 px-4 text-right">Avg Score</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assessmentsData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No assessments found
                      </td>
                    </tr>
                  ) : (
                    assessmentsData.items.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                          {a.title}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500">{a.passingScore}%</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                          {a.totalAttempts}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-400">
                          {a.uniqueStudents}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          {a.passedCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          {a.passRate}%
                        </td>
                        <td className="py-3.5 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                          {a.averageScore}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => loadAssessmentDetail(a.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-100 transition text-xs"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {assessmentsData.totalPages > 1 && (
              <div className="py-3 px-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Page {assessmentsData.page} of {assessmentsData.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={assessmentsData.page <= 1}
                    onClick={() => loadAssessments(assessmentsData.page - 1)}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={assessmentsData.page >= assessmentsData.totalPages}
                    onClick={() => loadAssessments(assessmentsData.page + 1)}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal / Detailed Drawer: Assessment Item Analysis */}
          {selectedAssessmentDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
                
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Assessment Intelligence & Item Difficulty</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedAssessmentDetail.assessment?.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedAssessmentDetail(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score Distribution Buckets */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Score Distribution</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedAssessmentDetail.scoreDistribution?.map((bucket: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold">{bucket.label}</span>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{bucket.count} learners</p>
                        <span className="text-[10px] text-indigo-500 font-mono">{bucket.range}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Question-by-Question Item Analysis Table */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    Question Item Difficulty & Success Rate
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Item discrimination analysis based on student responses. Questions with low success rates indicate confusing or challenging curriculum points.
                  </p>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Question Prompt</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Correct</th>
                          <th className="py-2.5 px-3 text-right">Unanswered</th>
                          <th className="py-2.5 px-3 text-right">Success Rate</th>
                          <th className="py-2.5 px-3 text-center">Difficulty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedAssessmentDetail.questionAnalysis?.map((q: any) => (
                          <tr key={q.questionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-mono font-bold text-slate-500">{q.index}</td>
                            <td className="py-2 px-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">{q.questionText}</td>
                            <td className="py-2 px-3 text-slate-400 text-[10px] uppercase font-mono">{q.type}</td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-medium">{q.correctAnswersCount}</td>
                            <td className="py-2 px-3 text-right text-slate-400">{q.unansweredCount}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">{q.successRate}%</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                q.difficulty === "Easy"
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                  : q.difficulty === "Hard"
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                                  : "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                              }`}>
                                {q.difficulty}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEARNER SCORECARDS */}
      {/* ========================================================================= */}
      {activeTab === "learners" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search learners by name or email..."
                value={learnerSearch}
                onChange={(e) => setLearnerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Learner Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Job Title</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Scorecard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {learnersData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No learners found
                      </td>
                    </tr>
                  ) : (
                    learnersData.items.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="py-3.5 px-4 text-slate-500">{u.email}</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{u.jobTitle || "Student"}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                            {u.status || "active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => loadLearnerScorecard(u.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-100 transition text-xs"
                          >
                            <span>View Scorecard</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal / Drawer: Individual Learner Scorecard */}
          {selectedLearnerScorecard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
                
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Learner Compliance Scorecard</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedLearnerScorecard.learner?.name}
                    </h2>
                    <p className="text-xs text-slate-400">{selectedLearnerScorecard.learner?.email}</p>
                  </div>
                  <button
                    onClick={() => setSelectedLearnerScorecard(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scorecard Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Courses Completed</span>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                      {selectedLearnerScorecard.summary?.completedCourses} / {selectedLearnerScorecard.summary?.totalAssignedCourses}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Assessments Passed</span>
                    <p className="text-xl font-bold text-indigo-600 mt-1">
                      {selectedLearnerScorecard.summary?.passedAssessments} / {selectedLearnerScorecard.summary?.totalSubmissions}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Average Exam Score</span>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedLearnerScorecard.summary?.avgAssessmentScore}%
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Overdue Items</span>
                    <p className={`text-xl font-bold mt-1 ${
                      selectedLearnerScorecard.summary?.overdueCount > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}>
                      {selectedLearnerScorecard.summary?.overdueCount}
                    </p>
                  </div>
                </div>

                {/* Assigned Courses List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Assigned Courses & Progress</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedLearnerScorecard.courses?.map((c: any) => (
                      <div key={c.enrollmentId} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{c.courseTitle}</span>
                          {c.dueDate && <p className="text-[10px] text-slate-400">Due: {new Date(c.dueDate).toLocaleDateString()}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-indigo-600">{c.progressPercent}%</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            c.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ENTERPRISE REPORT EXPORT CENTER */}
      {/* ========================================================================= */}
      {activeTab === "export" && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Enterprise Report Export Center
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Generate paginated, tenant-safe exports formatted according to RFC 4180 CSV or native Microsoft Excel (.xlsx) spreadsheets.
            </p>
          </div>

          {/* Report Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Report Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "learners", title: "Learners Compliance Roster", desc: "User progress, completion rates, overdue counts" },
                { id: "courses", title: "Course Performance Report", desc: "Catalog enrollments, completions, drop-off days" },
                { id: "assessments", title: "Assessment Submissions Log", desc: "Individual scores, pass/fail status, attempt numbers" },
                { id: "overdue", title: "Overdue Training Audit", desc: "Actionable compliance audit for past-due learners" }
              ].map((rpt) => (
                <div
                  key={rpt.id}
                  onClick={() => setExportType(rpt.id as any)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    exportType === rpt.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{rpt.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{rpt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={exportFormat === "xlsx"}
                  onChange={() => setExportFormat("xlsx")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Microsoft Excel Workbook (.xlsx)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={() => setExportFormat("csv")}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Standard CSV (RFC 4180)</span>
              </label>
            </div>
          </div>

          {/* Export Action Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Secure Server-Side Export...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {exportType.toUpperCase()} ({exportFormat.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
