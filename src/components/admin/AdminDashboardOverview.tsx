/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  Award,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Calendar,
  RefreshCw,
  PlusCircle,
  UserPlus,
  ShieldAlert,
  BarChart3,
  Lock,
  ChevronRight,
  FileCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
  GraduationCap,
  AlertTriangle,
  Plus,
  Search,
  Check,
  X,
  Download,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext.js";
import { ThemeQuickControls } from "../ThemeQuickControls.js";

interface AdminDashboardOverviewProps {
  authToken: string;
}

interface ActivityItem {
  id: string;
  activityType: "submission" | "enrollment" | "user_onboarded";
  actorName: string;
  actorEmail: string;
  targetTitle: string;
  detail: string;
  timestamp: string;
}

interface CourseItem {
  id: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string | null;
  createdAt: string;
  enrollmentsCount: number;
}

interface AssessmentItem {
  id: string;
  title: string;
  category: string;
  status: string;
  passingScore: number;
  updatedAt: string | null;
  createdAt: string;
  submissionsCount: number;
  questionsCount: number;
}

interface DashboardData {
  studentsCount: number;
  coursesCount: number;
  enrollmentsCount: number;
  submissionsCount: number;
  activeLearners: number;
  completionRate: number;
  batchesCount?: number;
  activeBatchesCount?: number;
  overdueCount?: number;
  courses?: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  enrollments?: {
    total: number;
    inProgress: number;
    completed: number;
    notStarted: number;
  };
  assessmentStats?: {
    totalAttempts: number;
    passedCount: number;
    passRate: number;
    failRate: number;
    averageScore: number;
  };
  assessments?: {
    total: number;
    published: number;
    draft: number;
  };
  activityTrend?: Array<{
    date: string;
    enrollments: number;
    completions: number;
    submissions: number;
  }>;
  recentCourses?: CourseItem[];
  recentAssessments?: AssessmentItem[];
  recentActivity?: ActivityItem[];
}

export function AdminDashboardOverview({ authToken }: AdminDashboardOverviewProps) {
  const navigate = useNavigate();
  const { adminUser, currentUser } = useAuth();
  const user = adminUser || currentUser;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard data (HTTP ${res.status})`);
      }

      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Dashboard overview fetch error:", err);
      setError(err.message || "Failed to retrieve dashboard overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Modal states for Primary Top Actions
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [activeBatches, setActiveBatches] = useState<Array<{ id: string; name: string; code: string; academicYear: string }>>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Fetch active batches for user creation
  const fetchActiveBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/batches?status=active", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        const batchList = json.batches || (Array.isArray(json) ? json : []);
        setActiveBatches(batchList);
      }
    } catch (e) {
      console.error("Failed to load active batches", e);
    } finally {
      setLoadingBatches(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchActiveBatches();
  }, [fetchActiveBatches]);

  // Create Batch Form State
  const [batchForm, setBatchForm] = useState({
    name: "",
    code: "",
    academicYear: "2024-2025",
    description: "",
    status: "active" as "active" | "inactive"
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  // Create User Form State (Mandatory Multi-Batch)
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as "student" | "trainer" | "admin",
    status: "active" as "active" | "suspended",
    phone: "",
    location: "",
    batchIds: [] as string[]
  });
  const [userBatchSearch, setUserBatchSearch] = useState("");
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userModalTab, setUserModalTab] = useState<"single" | "bulk">("single");

  // Bulk Excel Upload State
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkValidationResult, setBulkValidationResult] = useState<{
    total: number;
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    rows: Array<{
      rowNumber: number;
      fullName: string;
      email: string;
      phoneNumber?: string;
      location?: string;
      password?: string;
      status: string;
      batchCodes: string;
      isValid: boolean;
      errors: string[];
    }>;
  } | null>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Download official Excel template for bulk users import
  const handleDownloadTemplate = async () => {
    try {
      setBulkError(null);
      const res = await fetch("/api/admin/users/template", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to generate student import template");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading template", err);
      setBulkError("Error downloading template spreadsheet.");
    }
  };

  // Parse & Authoritatively Validate Uploaded Excel File
  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError(null);
    setBulkSuccess(null);
    setBulkLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setBulkError("Spreadsheet has no sheets.");
        setBulkLoading(false);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        setBulkError("Spreadsheet is empty. Please add student rows to import.");
        setBulkLoading(false);
        return;
      }

      const res = await fetch("/api/admin/users/bulk-validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ rows: rawRows })
      });

      if (res.ok) {
        const valData = await res.json();
        setBulkValidationResult(valData);
      } else {
        const err = await res.json();
        setBulkError(err.error || "Failed to validate spreadsheet rows.");
      }
    } catch (err) {
      console.error("Error parsing spreadsheet", err);
      setBulkError("Could not read Excel file. Please ensure it is a valid .xlsx file.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Execute Bulk Import of Validated Rows
  const handleExecuteBulkImport = async () => {
    if (!bulkValidationResult || bulkValidationResult.validCount === 0) return;

    const validRows = bulkValidationResult.rows.filter(r => r.isValid);
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);

    try {
      const res = await fetch("/api/admin/users/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ rows: validRows })
      });

      if (res.ok) {
        const result = await res.json();
        setBulkSuccess(`Successfully imported and created ${result.importedCount} student account(s) with batch assignment!`);
        setBulkValidationResult(null);
        setBulkFileName("");
        if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
        fetchDashboardData(true);
      } else {
        const err = await res.json();
        setBulkError(err.error || "Bulk import failed.");
      }
    } catch (err) {
      setBulkError("Network error during bulk import. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  const hasNoActiveBatches = useMemo(() => {
    if (data?.activeBatchesCount !== undefined) {
      return data.activeBatchesCount === 0;
    }
    return activeBatches.length === 0 && !loadingBatches;
  }, [data?.activeBatchesCount, activeBatches.length, loadingBatches]);

  const handleCreateBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setBatchSuccess(null);

    if (!batchForm.name.trim()) {
      setBatchError("Batch name is required.");
      return;
    }
    if (!batchForm.code.trim()) {
      setBatchError("Batch code is required.");
      return;
    }
    if (!batchForm.academicYear.trim()) {
      setBatchError("Academic year is required (format: YYYY or YYYY-YYYY).");
      return;
    }

    setBatchSubmitting(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: batchForm.name.trim(),
          code: batchForm.code.trim().toUpperCase(),
          academicYear: batchForm.academicYear.trim(),
          description: batchForm.description?.trim() || null,
          status: batchForm.status,
          institutionId: "inst-main"
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create batch");
      }

      setBatchSuccess(`Batch "${json.name}" (${json.academicYear}) created successfully!`);
      fetchDashboardData(true);
      fetchActiveBatches();
      setBatchForm({
        name: "",
        code: "",
        academicYear: "2024-2025",
        description: "",
        status: "active"
      });
      setTimeout(() => {
        setShowCreateBatchModal(false);
        setBatchSuccess(null);
      }, 1500);
    } catch (err: any) {
      setBatchError(err.message || "Failed to create batch");
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      setUserError("Please fill out all required fields.");
      return;
    }
    if (userForm.password.length < 8) {
      setUserError("Password must be at least 8 characters long.");
      return;
    }
    if (!userForm.batchIds || userForm.batchIds.length === 0) {
      setUserError("Mandatory membership: User must be assigned to at least one active batch cohort.");
      return;
    }

    setUserSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
          status: userForm.status,
          phoneNumber: userForm.phone.trim() || undefined,
          location: userForm.location.trim() || undefined,
          batchIds: userForm.batchIds
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create user");
      }

      setUserSuccess(`User "${json.name}" created with ${userForm.batchIds.length} batch cohort(s)!`);
      fetchDashboardData(true);
      setUserForm({
        name: "",
        email: "",
        password: "",
        role: "student",
        status: "active",
        phone: "",
        location: "",
        batchIds: []
      });
      setTimeout(() => {
        setShowCreateUserModal(false);
        setUserSuccess(null);
      }, 1500);
    } catch (err: any) {
      setUserError(err.message || "Failed to create user");
    } finally {
      setUserSubmitting(false);
    }
  };

  // Current formatted date
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(new Date());
  }, []);

  // Format relative time for recent activity
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Continuous 14-day normalized timeline for Activity Velocity Chart
  const normalized14DayTrend = useMemo(() => {
    const trendMap = new Map<string, { enrollments: number; completions: number; submissions: number }>();
    if (data?.activityTrend && Array.isArray(data.activityTrend)) {
      data.activityTrend.forEach((item) => {
        trendMap.set(item.date, {
          enrollments: Number(item.enrollments) || 0,
          completions: Number(item.completions) || 0,
          submissions: Number(item.submissions) || 0
        });
      });
    }

    const days: Array<{ date: string; displayDate: string; enrollments: number; completions: number; submissions: number }> = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const record = trendMap.get(isoDate) || { enrollments: 0, completions: 0, submissions: 0 };
      days.push({
        date: isoDate,
        displayDate,
        ...record
      });
    }
    return days;
  }, [data?.activityTrend]);

  // Quick action items definition
  const quickActions = [
    {
      title: "Create New Course",
      description: "Author modules, lessons & curriculum",
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
      onClick: () => navigate("/admin/courses?action=new")
    },
    {
      title: "Add Student",
      description: "Provision a learner account",
      icon: UserPlus,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
      onClick: () => navigate("/admin/users?action=new")
    },
    {
      title: "Assign Course Access",
      description: "Individual & batch enrollments",
      icon: Lock,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60",
      onClick: () => navigate("/admin/access?view=assign")
    },
    {
      title: "Create Assessment",
      description: "Build evaluations & questions",
      icon: Award,
      color: "text-[var(--color-primary)]",
      bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60",
      onClick: () => navigate("/admin/assessments/new")
    },
    {
      title: "Executive Reports",
      description: "Platform analytics & drop-off",
      icon: BarChart3,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
      onClick: () => navigate("/admin/analytics")
    }
  ];

  // 1. Loading Skeleton View
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Welcome header skeleton */}
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        {/* Stats row skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        {/* Quick action skeleton */}
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        {/* Activity & catalog skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // 2. Error State View
  if (error && !data) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load LMS Dashboard</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => fetchDashboardData(false)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const statCards = [
    {
      id: "students",
      label: "Total Students",
      value: data?.studentsCount ?? 0,
      subtext: `${data?.activeLearners ?? 0} active learners`,
      icon: Users,
      badge: "Learners",
      accent: "text-blue-600 dark:text-blue-400",
      accentBg: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60",
      link: "/admin/users"
    },
    {
      id: "courses",
      label: "Total Courses",
      value: data?.courses?.total ?? data?.coursesCount ?? 0,
      subtext: `${data?.courses?.published ?? 0} published • ${data?.courses?.draft ?? 0} draft`,
      icon: BookOpen,
      badge: "Curriculum",
      accent: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60",
      link: "/admin/courses"
    },
    {
      id: "assessments",
      label: "Published Assessments",
      value: data?.assessments?.published ?? 0,
      subtext: `${data?.assessments?.total ?? 0} total assessments`,
      icon: Award,
      badge: "Evaluations",
      accent: "text-[var(--color-primary)]",
      accentBg: "bg-[var(--color-secondary)] border-purple-200 dark:border-purple-800/60",
      link: "/admin/assessments"
    },
    {
      id: "submissions",
      label: "Assessment Submissions",
      value: data?.assessmentStats?.totalAttempts ?? data?.submissionsCount ?? 0,
      subtext: `${data?.assessmentStats?.passedCount ?? 0} passed (${data?.assessmentStats?.passRate ?? 0}%)`,
      icon: CheckCircle2,
      badge: "Results",
      accent: "text-teal-600 dark:text-teal-400",
      accentBg: "bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800/60",
      link: "/admin/assessment-results"
    },
    {
      id: "active-users",
      label: "Active Users (14d)",
      value: data?.activeLearners ?? 0,
      subtext: "Recent platform engagement",
      icon: Activity,
      badge: "Velocity",
      accent: "text-amber-600 dark:text-amber-400",
      accentBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60",
      link: "/admin/analytics"
    },
    {
      id: "enrollments",
      label: "Course Enrollments",
      value: data?.enrollments?.total ?? data?.enrollmentsCount ?? 0,
      subtext: `${data?.enrollments?.inProgress ?? 0} active • ${data?.completionRate ?? 0}% completed`,
      icon: Layers,
      badge: "Access",
      accent: "text-indigo-600 dark:text-indigo-400",
      accentBg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/60",
      link: "/admin/access"
    }
  ];

  return (
    <div className="space-y-6 lg:space-y-8 font-sans min-w-0 w-full">
      {/* ========================================================================= */}
      {/* SECTION A: UNIFIED LMS DASHBOARD HEADER                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono">
              LMS Executive Overview
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 break-words">
            <img 
              src="/mr-logo-icon.png" 
              alt="MR Technologies" 
              className="w-7 h-7 object-contain shrink-0 brand-logo-preserve" 
              style={{ filter: "none", mixBlendMode: "normal", opacity: 1 }}
            />
            <span>Welcome back, {user?.name || "Administrator"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            Platform Overview, Learning Velocity & Operational Intelligence across MRTECHLMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard metrics"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer disabled:opacity-60 min-w-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>
          <div className="hidden lg:flex items-center">
            <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: TOP PRIMARY ACTIONS — CREATE BATCH & CREATE USER                 */}
      {/* ========================================================================= */}
      <section aria-label="Top Administrative Actions" className="space-y-4 min-w-0 w-full">
        {/* Guidance Alert if No Active Batches Exist */}
        {hasNoActiveBatches && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200">Action Required: No Active Batches Configured</p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  MRTECHLMS requires all user accounts to belong to at least one active batch cohort. Create your first batch to enable student and trainer onboarding.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setBatchError(null);
                setBatchSuccess(null);
                setShowCreateBatchModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Create First Batch Now
            </button>
          </div>
        )}

        {/* 2-Column Responsive Action Cards Grid (Side-by-side on desktop, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
          {/* Action Card 1: Create Batch */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setBatchError(null);
              setBatchSuccess(null);
              setShowCreateBatchModal(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setBatchError(null);
                setBatchSuccess(null);
                setShowCreateBatchModal(true);
              }
            }}
            className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-[var(--color-primary)] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] text-left min-w-0"
          >
            <div>
              {/* Header row with icon, titles, badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary)] border border-[var(--color-border)] group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 group-hover:scale-105 transition-all shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--color-primary)] bg-[var(--color-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)] inline-block">
                      Cohort Management
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-[var(--color-primary)] transition-colors mt-0.5">
                      Create Batch
                    </h3>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {data?.activeBatchesCount ?? activeBatches.length} Active
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Create and manage student batches.
              </p>
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/90 flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--color-primary)] group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Create Batch</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/admin/batches");
                }}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batch Hub &rarr;
              </button>
            </div>
          </div>

          {/* Action Card 2: Create User */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (hasNoActiveBatches) return;
              setUserError(null);
              setUserSuccess(null);
              setUserModalTab("single");
              fetchActiveBatches();
              setShowCreateUserModal(true);
            }}
            onKeyDown={(e) => {
              if (hasNoActiveBatches) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setUserError(null);
                setUserSuccess(null);
                setUserModalTab("single");
                fetchActiveBatches();
                setShowCreateUserModal(true);
              }
            }}
            className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl border transition-all duration-200 text-left min-w-0 ${
              hasNoActiveBatches
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-[var(--color-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            }`}
          >
            <div>
              {/* Header row with icon, titles, badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:scale-105 transition-all shrink-0">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40 inline-block">
                      User Provisioning
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-[var(--color-primary)] transition-colors mt-0.5">
                      Create User
                    </h3>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shrink-0">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Single / Excel
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Add individual students or bulk upload users using Excel.
              </p>
            </div>

            {/* Bottom Actions Row */}
            <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Create User</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                </span>

                <span className="text-slate-300 dark:text-slate-700">•</span>

                <button
                  type="button"
                  disabled={hasNoActiveBatches}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasNoActiveBatches) return;
                    setUserError(null);
                    setUserSuccess(null);
                    setUserModalTab("bulk");
                    fetchActiveBatches();
                    setShowCreateUserModal(true);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold inline-flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60"
                >
                  <Upload className="w-3 h-3" />
                  <span>Bulk Excel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/admin/users");
                }}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                User Directory &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: PLATFORM STATISTICS GRID (6 METRIC CARDS)                      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Platform Metrics Summary
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Live database counts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
          {statCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.link)}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-600 min-w-0 h-full"
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(card.link);
                  }
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${card.accentBg} ${card.accent}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 font-mono">
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate" title={card.label}>
                    {card.label}
                  </p>
                  <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 min-w-0">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium min-w-0 flex-1" title={card.subtext}>
                    {card.subtext}
                  </p>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION C: QUICK ACTIONS AREA                                             */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Administrative Quick Actions
            </h2>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Direct shortcuts to primary management workspaces
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={action.onClick}
                className="group p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition duration-150 text-left flex flex-col justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 min-w-0 h-full"
              >
                <div className="flex items-center justify-between mb-3 w-full">
                  <div className={`p-2 rounded-lg border ${action.bg} ${action.color} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition shrink-0" />
                </div>
                <div className="min-w-0 w-full space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-primary)] transition truncate" title={action.title}>
                    {action.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 break-words" title={action.description}>
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION D: LEARNING ACTIVITY VELOCITY (14-DAY TRAJECTORY CHART)           */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Platform Learning Velocity (14-Day Trajectory)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily course enrollments, lesson completions, and assessment submissions across the organization
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400">Enrollments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400">Completions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400">Submissions</span>
            </div>
          </div>
        </div>

        {normalized14DayTrend.length > 0 ? (
          <div className="space-y-4 pt-2 min-w-0">
            {/* Visual Bar Time Series across 14 continuous equal columns */}
            <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 sm:gap-2 pt-6 items-end h-48 border-b border-slate-100 dark:border-slate-800 pb-2 min-w-0">
              {normalized14DayTrend.map((t, idx) => {
                const totalActivity = t.enrollments + t.completions + t.submissions;
                const maxVal = Math.max(
                  ...normalized14DayTrend.map((x) => x.enrollments + x.completions + x.submissions),
                  5
                );
                const heightPct = totalActivity > 0 ? Math.min(100, Math.max(14, Math.round((totalActivity / maxVal) * 100))) : 4;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group relative min-w-0">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-20 shadow-md">
                      <div className="font-bold">{t.displayDate || t.date}</div>
                      <div className="text-slate-300">
                        {t.enrollments} enr • {t.completions} comp • {t.submissions} sub
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg flex flex-col justify-end overflow-hidden h-32">
                      <div
                        className={`w-full transition-all rounded-t-sm ${
                          totalActivity > 0
                            ? "bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                            : "bg-slate-200 dark:bg-slate-700/60"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate text-center w-full">
                      {t.date ? t.date.slice(8) : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Performance indicators row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">Course Completion Rate</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                    {data?.completionRate ?? 0}%
                  </p>
                </div>
                <div className="w-16 sm:w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden shrink-0">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, data?.completionRate ?? 0)}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">Assessment Pass Rate</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                    {data?.assessmentStats?.passRate ?? 0}%
                  </p>
                </div>
                <div className="w-16 sm:w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden shrink-0">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, data?.assessmentStats?.passRate ?? 0)}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block truncate">Average Evaluation Score</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                    {data?.assessmentStats?.averageScore ?? 0} pts
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-[var(--color-primary)] shrink-0 font-mono">
                  Benchmarked
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No learning activity velocity recorded over the last 14 days.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION E: COURSE & ASSESSMENT OVERVIEW (TWO BALANCED CARDS)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 1. Courses Overview Panel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 h-full min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">Course Catalog Overview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {data?.courses?.published ?? 0} Published • {data?.courses?.draft ?? 0} Draft
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/courses")}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition shrink-0 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {data?.recentCourses && data.recentCourses.length > 0 ? (
                data.recentCourses.slice(0, 4).map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-3 group min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-[var(--color-primary)] transition" title={c.title}>
                          {c.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize shrink-0 ${
                            c.status === "published"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">{c.category || "General"}</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">{c.enrollmentsCount} learners</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">{formatTimeAgo(c.updatedAt || c.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/courses`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                      title="Open Course"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">No courses authored yet.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate("/admin/courses?action=new")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Author New Course in Studio</span>
            </button>
          </div>
        </div>

        {/* 2. Assessments Overview Panel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 h-full min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-[var(--color-secondary)] text-[var(--color-primary)] rounded-lg border border-purple-200 dark:border-purple-800/60 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">Assessment & Exam Overview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {data?.assessments?.published ?? 0} Published • {data?.assessments?.draft ?? 0} Draft
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/assessments")}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition shrink-0 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {data?.recentAssessments && data.recentAssessments.length > 0 ? (
                data.recentAssessments.slice(0, 4).map((a) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-3 group min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-[var(--color-primary)] transition" title={a.title}>
                          {a.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize shrink-0 ${
                            a.status === "published"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="whitespace-nowrap">{a.questionsCount} questions</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">Pass: {a.passingScore}%</span>
                        <span>•</span>
                        <span className="whitespace-nowrap">{a.submissionsCount} submissions</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/assessments/${a.id}/builder`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                      title="Edit in Assessment Builder"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">No assessments created yet.</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate("/admin/assessments/new")}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Create New Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION F: RECENT PLATFORM ACTIVITY STREAM                                */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Real-Time Operational Activity</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit events: learner onboardings, enrollments, and test submissions
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono shrink-0">
            Last {data?.recentActivity?.length || 0} events
          </span>
        </div>

        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {data.recentActivity.map((act) => {
              let badgeColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
              let Icon = UserPlus;
              let label = "Onboarding";

              if (act.activityType === "enrollment") {
                badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
                Icon = BookOpen;
                label = "Course Access";
              } else if (act.activityType === "submission") {
                badgeColor = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
                Icon = Award;
                label = "Assessment";
              }

              return (
                <div key={act.id} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 min-w-0">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${badgeColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white break-words">
                          {act.actorName}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                          {label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          ({act.actorEmail})
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 break-words">
                        <span className="font-semibold text-slate-900 dark:text-white">{act.targetTitle}</span>
                        {act.detail && <span className="text-slate-500 dark:text-slate-400"> — {act.detail}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-mono sm:mt-1 self-start sm:self-auto">
                    {formatTimeAgo(act.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No recent activity recorded yet.
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE BATCH MODAL */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-[min(100%-1rem,580px)] max-h-[calc(100dvh-2rem)] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-0 min-w-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                <div className="p-2 bg-[var(--color-secondary)] text-[var(--color-primary)] rounded-xl border border-purple-200 dark:border-purple-800/60">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Create New Cohort Batch</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Define cohort year, capacity & course tracks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateBatchModal(false);
                  setBatchError(null);
                  setBatchSuccess(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBatchSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
                {batchError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{batchError}</span>
                  </div>
                )}

                {batchSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{batchSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                      Batch Name *
                    </label>
                    <input
                      type="text"
                      value={batchForm.name}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Python Full Stack 2026"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      required
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                      Batch Code *
                    </label>
                    <input
                      type="text"
                      value={batchForm.code}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. PYFS-2026-A"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 uppercase"
                      required
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                      Batch Year *
                    </label>
                    <input
                      type="text"
                      value={batchForm.academicYear}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, academicYear: e.target.value }))}
                      placeholder="e.g. 2024-2025"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      required
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                      Status
                    </label>
                    <select
                      value={batchForm.status}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="active">Active (Enrolling)</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={batchForm.description}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Cohort goals, prerequisites, or schedules..."
                    rows={3}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBatchModal(false);
                    setBatchError(null);
                    setBatchSuccess(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-sm shadow-purple-500/20 cursor-pointer text-xs"
                >
                  {batchSubmitting ? "Creating..." : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE USER MODAL WITH DUAL-MODE (INDIVIDUAL & BULK EXCEL UPLOAD) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-[min(100%-1rem,780px)] max-h-[calc(100dvh-2rem)] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-0 min-w-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800/60">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">Create User</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Add individual students or bulk upload users using Excel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateUserModal(false);
                  setUserError(null);
                  setUserSuccess(null);
                  setBulkError(null);
                  setBulkSuccess(null);
                  setBulkValidationResult(null);
                  setBulkFileName("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tab Switcher */}
            <div className="shrink-0 flex border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 pt-2 bg-slate-50/70 dark:bg-slate-800/40 gap-3">
              <button
                type="button"
                onClick={() => setUserModalTab("single")}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  userModalTab === "single"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Individual User</span>
              </button>
              <button
                type="button"
                onClick={() => setUserModalTab("bulk")}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  userModalTab === "bulk"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Bulk Excel Upload (.xlsx)</span>
              </button>
            </div>

            {/* TAB 1: SINGLE USER FORM */}
            {userModalTab === "single" ? (
              <form onSubmit={handleCreateUserSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                {/* Scrollable Form Body */}
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
                  {userError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{userError}</span>
                    </div>
                  )}

                  {userSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{userSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Maya Patel"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. maya@example.com"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Password * (Min 8 Characters)
                      </label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Min 8 characters (auto-hashed with bcrypt)"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Platform Role
                      </label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as any }))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="student">Student</option>
                        <option value="trainer">Trainer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Status
                      </label>
                      <select
                        value={userForm.status}
                        onChange={(e) => setUserForm(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Phone Number {userForm.role === "student" ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                      </label>
                      <input
                        type="tel"
                        value={userForm.phone}
                        onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 9876543210"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 dark:text-slate-300 uppercase font-mono tracking-wider block mb-1">
                        Location {userForm.role === "student" ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                      </label>
                      <input
                        type="text"
                        value={userForm.location}
                        onChange={(e) => setUserForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g. Bangalore, India"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* MANDATORY MULTI-BATCH MEMBERSHIP SELECTOR */}
                  <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                        <label className="font-bold text-slate-800 dark:text-slate-200 uppercase font-mono text-[11px] tracking-wider">
                          Assign Cohort Batches <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        userForm.batchIds.length > 0 
                          ? "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          : "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}>
                        {userForm.batchIds.length} {userForm.batchIds.length === 1 ? "Batch" : "Batches"} Selected
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Every user must belong to at least 1 batch. Users can be assigned to multiple batches simultaneously.
                    </p>

                    {activeBatches.length > 3 && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={userBatchSearch}
                          onChange={(e) => setUserBatchSearch(e.target.value)}
                          placeholder="Filter batches by name, code or year..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                    )}

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-700/50">
                      {activeBatches
                        .filter(b => {
                          if (!userBatchSearch.trim()) return true;
                          const q = userBatchSearch.toLowerCase();
                          return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || b.academicYear.toLowerCase().includes(q);
                        })
                        .map((batch) => {
                          const isChecked = userForm.batchIds.includes(batch.id);
                          return (
                            <label
                              key={batch.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition select-none ${
                                isChecked
                                  ? "bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUserForm(prev => ({ ...prev, batchIds: [...prev.batchIds, batch.id] }));
                                    } else {
                                      setUserForm(prev => ({ ...prev, batchIds: prev.batchIds.filter(id => id !== batch.id) }));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                                    {batch.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                    Code: {batch.code}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {batch.academicYear}
                              </span>
                            </label>
                          );
                        })}
                    </div>

                    {userForm.batchIds.length === 0 && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Please check at least one batch above.
                      </p>
                    )}
                  </div>
                </div>

                {/* Pinned Modal Footer */}
                <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setUserError(null);
                      setUserSuccess(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={userSubmitting || userForm.batchIds.length === 0}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-sm shadow-blue-500/20 cursor-pointer text-xs"
                  >
                    {userSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            ) : (
              /* TAB 2: BULK EXCEL UPLOAD WORKFLOW */
              <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
                  {bulkError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{bulkError}</span>
                    </div>
                  )}

                  {bulkSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{bulkSuccess}</span>
                    </div>
                  )}

                  {/* Step 1 & Step 2 Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase font-mono tracking-wider bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        Step 1
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Download Template</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Get the official Excel spreadsheet with pre-formatted columns (<code className="text-slate-700 dark:text-slate-300 font-mono">fullName</code>, <code className="text-slate-700 dark:text-slate-300 font-mono">email</code>, <code className="text-slate-700 dark:text-slate-300 font-mono">Batch Codes</code>) and active batch codes pre-filled.
                      </p>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="mt-2 w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Download .xlsx Template</span>
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono tracking-wider bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Step 2
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Upload Spreadsheet</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Upload your completed workbook (.xlsx). The system validates emails, format, uniqueness, and cohort batch assignments in real-time.
                      </p>
                      <label className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{bulkFileName ? "Choose Another File" : "Select .xlsx File"}</span>
                        <input
                          ref={bulkFileInputRef}
                          type="file"
                          accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          onChange={handleBulkFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {bulkLoading && (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                      <p className="text-xs font-semibold">Validating and checking database records...</p>
                    </div>
                  )}

                  {/* Validation Preview */}
                  {bulkValidationResult && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono">
                          Validation Preview: {bulkFileName}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {bulkValidationResult.total} rows parsed
                        </span>
                      </div>

                      {/* Summary Badges */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total</p>
                          <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">{bulkValidationResult.total}</p>
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 font-mono">Valid</p>
                          <p className="text-base sm:text-lg font-extrabold text-emerald-800 dark:text-emerald-300 font-mono">{bulkValidationResult.validCount}</p>
                        </div>
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 font-mono">Invalid</p>
                          <p className="text-base sm:text-lg font-extrabold text-rose-800 dark:text-rose-300 font-mono">{bulkValidationResult.invalidCount}</p>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 font-mono">Duplicates</p>
                          <p className="text-base sm:text-lg font-extrabold text-amber-800 dark:text-amber-300 font-mono">{bulkValidationResult.duplicateCount}</p>
                        </div>
                      </div>

                      {/* Parsed Rows Table */}
                      <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                            <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">
                              <th className="py-2 px-3">Row</th>
                              <th className="py-2 px-3">Full Name</th>
                              <th className="py-2 px-3">Email</th>
                              <th className="py-2 px-3">Batch Codes</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Validation Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {bulkValidationResult.rows.map((row) => (
                              <tr key={row.rowNumber} className={row.isValid ? "hover:bg-slate-50/50 dark:hover:bg-slate-800/40" : "bg-rose-50/40 dark:bg-rose-950/30"}>
                                <td className="py-2 px-3 font-mono text-slate-400">{row.rowNumber}</td>
                                <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{row.fullName || "—"}</td>
                                <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">{row.email || "—"}</td>
                                <td className="py-2 px-3 font-mono text-[var(--color-primary)] text-[11px] font-semibold">{row.batchCodes || "—"}</td>
                                <td className="py-2 px-3">
                                  <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {row.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  {row.isValid ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
                                    </span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      {row.errors.map((err, errIdx) => (
                                        <p key={errIdx} className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 shrink-0" /> {err}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bulk Tab Footer */}
                <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setBulkError(null);
                      setBulkSuccess(null);
                      setBulkValidationResult(null);
                      setBulkFileName("");
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!bulkValidationResult || bulkValidationResult.validCount === 0 || bulkLoading}
                    onClick={handleExecuteBulkImport}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-sm shadow-emerald-500/20 cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {bulkLoading
                        ? "Importing..."
                        : `Import ${bulkValidationResult ? bulkValidationResult.validCount : 0} Valid Student(s)`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
