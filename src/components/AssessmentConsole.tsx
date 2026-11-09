/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, Clock, FileText, CheckCircle2, XCircle, 
  Lock, Play, BookOpen, AlertCircle, RefreshCw, Search, 
  GraduationCap, Sparkles, RotateCcw, ShieldCheck, 
  AlertTriangle, Filter, ArrowRight, X, BarChart3, Check
} from "lucide-react";

interface AssessmentItem {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  courseTitle?: string;
  category?: string;
  difficulty?: string;
  durationMinutes?: number;
  passingScore?: number;
  questionsCount?: number;
  totalPoints?: number;
  isEnrolled?: boolean;
  isStandalone?: boolean;
  status?: "unattempted" | "in_progress" | "passed" | "failed";
  bestScore?: number | null;
  latestScore?: number | null;
  attemptsCount?: number;
  maxAttempts?: number;
  lastAttemptedAt?: string | null;
  dueDate?: string | null;
  isOverdue?: boolean;
  isMandatory?: boolean;
  proctoringConfig?: {
    cameraRequired?: boolean;
    screenShareRequired?: boolean;
  };
}

interface AssessmentConsoleProps {
  authToken: string;
  onStartAssessment: (assessmentId: string) => void;
  onNavigate: (tab: string) => void;
}

export function AssessmentConsole({
  authToken,
  onStartAssessment,
  onNavigate
}: AssessmentConsoleProps) {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/student/assessments", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssessments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load assessments", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [authToken]);

  // Compute distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach(a => {
      const cat = a.category || (a.courseTitle ? a.courseTitle.split(" ")[0] : "General");
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [assessments]);

  // Aggregate KPI Statistics
  const totalCount = assessments.length;
  const passedCount = assessments.filter(a => a.status === "passed").length;
  const attemptedCount = assessments.filter(a => (a.attemptsCount || 0) > 0).length;
  const pendingCount = assessments.filter(a => a.isEnrolled && (a.status === "unattempted" || a.status === "in_progress")).length;
  const passRate = attemptedCount > 0 ? Math.round((passedCount / attemptedCount) * 100) : 0;

  // Filter and sort assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      // Safe string checks
      const title = (a.title || "").toLowerCase();
      const course = (a.courseTitle || "").toLowerCase();
      const cat = (a.category || "").toLowerCase();
      const desc = (a.description || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || title.includes(query) || course.includes(query) || cat.includes(query) || desc.includes(query);
      if (!matchesSearch) return false;

      // Category filter
      if (selectedCategory !== "all") {
        const itemCat = a.category || (a.courseTitle ? a.courseTitle.split(" ")[0] : "General");
        if (itemCat !== selectedCategory) return false;
      }

      // Status filter
      if (selectedStatus === "all") return true;
      if (selectedStatus === "ready") return a.isEnrolled && (a.status === "unattempted" || a.status === "in_progress");
      if (selectedStatus === "passed") return a.status === "passed";
      if (selectedStatus === "failed") return a.status === "failed";
      if (selectedStatus === "locked") return !a.isEnrolled;
      return true;
    }).sort((a, b) => {
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "duration-asc") {
        return (a.durationMinutes || 0) - (b.durationMinutes || 0);
      }
      if (sortBy === "duration-desc") {
        return (b.durationMinutes || 0) - (a.durationMinutes || 0);
      }
      if (sortBy === "passing-desc") {
        return (b.passingScore || 0) - (a.passingScore || 0);
      }
      // Default: mandatory & pending first, then in_progress, unattempted, passed, locked
      if (a.isMandatory && !b.isMandatory) return -1;
      if (!a.isMandatory && b.isMandatory) return 1;
      if (a.isEnrolled && !b.isEnrolled) return -1;
      if (!a.isEnrolled && b.isEnrolled) return 1;
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (a.status !== "in_progress" && b.status === "in_progress") return 1;
      if (a.status === "unattempted" && b.status === "passed") return -1;
      if (a.status === "passed" && b.status === "unattempted") return 1;
      return 0;
    });
  }, [assessments, searchTerm, selectedStatus, selectedCategory, sortBy]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedCategory("all");
    setSortBy("default");
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header Hero Banner (Theme Token Aware) */}
      <div 
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-sm transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)"
        }}
      >
        {/* Subtle decorative background gradient accent */}
        <div 
          className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full opacity-10 pointer-events-none blur-2xl"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
        <div className="absolute right-6 bottom-4 top-4 hidden md:flex items-center opacity-10 pointer-events-none">
          <Award className="w-48 h-48 transform rotate-12" style={{ color: "var(--color-primary)" }} />
        </div>

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase font-mono border"
            style={{ 
              backgroundColor: "var(--color-surface-elevated)", 
              borderColor: "var(--color-border)",
              color: "var(--color-primary)" 
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Academy Standards & Exams
          </div>

          <h2 
            className="text-2xl sm:text-3xl font-black tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Assessment Console
          </h2>

          <p 
            className="text-xs sm:text-sm leading-relaxed font-normal"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Test your programming comprehension, complete course syllabus exams, and track your scoring metrics. High-stakes tests feature integrated proctoring safeguards and immediate pass/fail certification.
          </p>
        </div>
      </div>

      {/* 2. Top KPI Metrics Strip (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Quizzes */}
        <div 
          className="p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)"
          }}
        >
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-secondary)"
            }}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p 
              className="text-[10px] font-bold uppercase tracking-wider font-mono truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              Total Tests
            </p>
            <p 
              className="text-xl sm:text-2xl font-black font-mono mt-0.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {totalCount}
            </p>
          </div>
        </div>

        {/* Exams Passed */}
        <div 
          className="p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)"
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p 
              className="text-[10px] font-bold uppercase tracking-wider font-mono truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              Exams Passed
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p 
                className="text-xl sm:text-2xl font-black font-mono"
                style={{ color: "var(--color-text-primary)" }}
              >
                {passedCount}
              </p>
              {attemptedCount > 0 && (
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {Math.round((passedCount / totalCount) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ready / Pending */}
        <div 
          className="p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)"
          }}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p 
              className="text-[10px] font-bold uppercase tracking-wider font-mono truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              Pending / Ready
            </p>
            <p 
              className="text-xl sm:text-2xl font-black font-mono mt-0.5"
              style={{ color: "var(--color-text-primary)" }}
            >
              {pendingCount}
            </p>
          </div>
        </div>

        {/* Passing Rate */}
        <div 
          className="p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)"
          }}
        >
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: "rgba(var(--theme-primary-rgb, 59, 130, 246), 0.1)",
              borderColor: "var(--color-border)",
              color: "var(--color-primary)"
            }}
          >
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p 
              className="text-[10px] font-bold uppercase tracking-wider font-mono truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              Pass Rate
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <p 
                className="text-xl sm:text-2xl font-black font-mono"
                style={{ color: "var(--color-text-primary)" }}
              >
                {attemptedCount > 0 ? `${passRate}%` : "—"}
              </p>
              <span className="text-[10px] font-medium font-mono text-[var(--color-text-muted)]">
                ({attemptedCount} tried)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Navigation & Search Strip */}
      <div 
        className="rounded-2xl border p-4 shadow-xs space-y-3.5 transition-all"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)"
        }}
      >
        {/* Top row: Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Tests", count: assessments.length },
            { id: "ready", label: "Ready to Take", count: pendingCount },
            { id: "passed", label: "Passed", count: passedCount },
            { id: "failed", label: "Needs Review", count: assessments.filter(a => a.status === "failed").length },
            { id: "locked", label: "Locked", count: assessments.filter(a => !a.isEnrolled).length },
          ].map(tab => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isActive 
                    ? "shadow-2xs font-bold" 
                    : "hover:bg-[var(--color-surface-elevated)]"
                }`}
                style={isActive ? {
                  backgroundColor: "var(--color-button-primary)",
                  color: "var(--color-button-primary-foreground)"
                } : {
                  color: "var(--color-text-secondary)"
                }}
              >
                <span>{tab.label}</span>
                <span 
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive 
                      ? "bg-white/20 text-white" 
                      : "bg-black/5 dark:bg-white/10"
                  }`}
                  style={!isActive ? { color: "var(--color-text-muted)" } : {}}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom row: Search input, Category selector, Sort, Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search 
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" 
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assessment title, topic, or syllabus..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-1 transition"
              style={{
                backgroundColor: "var(--color-input-background)",
                borderColor: "var(--color-input-border)",
                color: "var(--color-text-primary)"
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>

          {/* Right controls: Category, Sort, Refresh */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            {/* Category select */}
            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--color-surface-elevated)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)"
                }}
              >
                <option value="all">All Topics</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {/* Sort select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none cursor-pointer"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)"
              }}
            >
              <option value="default">Default Sort</option>
              <option value="title-asc">Title: A to Z</option>
              <option value="duration-asc">Duration: Shortest</option>
              <option value="duration-desc">Duration: Longest</option>
              <option value="passing-desc">Passing Threshold (High)</option>
            </select>

            {/* Reload button */}
            <button
              type="button"
              onClick={loadAssessments}
              className="p-2 border rounded-xl transition cursor-pointer shrink-0"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)"
              }}
              title="Reload Assessments"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--color-primary)]" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Assessments Grid or Empty State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
            style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
          />
          <p className="text-xs font-semibold font-mono" style={{ color: "var(--color-text-muted)" }}>
            Loading examination modules...
          </p>
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredAssessments.map((assessment) => {
            const isEnrolled = assessment.isEnrolled !== false;
            const courseLabel = assessment.courseTitle || assessment.category || "General Assessment";
            const isPassed = assessment.status === "passed";
            const isFailed = assessment.status === "failed";
            const isInProgress = assessment.status === "in_progress";
            const isProctored = Boolean(assessment.proctoringConfig?.cameraRequired);

            // Determine status pill
            let statusPill = null;
            if (!isEnrolled) {
              statusPill = (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-500 flex items-center gap-1 font-mono uppercase border border-slate-500/20">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              );
            } else if (isPassed) {
              statusPill = (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono uppercase border border-emerald-500/25">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Passed {assessment.bestScore != null ? `(${assessment.bestScore}%)` : ""}</span>
                </span>
              );
            } else if (isFailed) {
              statusPill = (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center gap-1 font-mono uppercase border border-rose-500/25">
                  <XCircle className="w-3 h-3" />
                  <span>Review {assessment.bestScore != null ? `(${assessment.bestScore}%)` : ""}</span>
                </span>
              );
            } else if (isInProgress) {
              statusPill = (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono uppercase border border-blue-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>In Progress</span>
                </span>
              );
            } else {
              statusPill = (
                <span 
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 font-mono uppercase border"
                  style={{
                    backgroundColor: "var(--color-surface-elevated)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-muted)"
                  }}
                >
                  <Clock className="w-2.5 h-2.5" />
                  <span>Not Attempted</span>
                </span>
              );
            }

            return (
              <div 
                key={assessment.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-150 relative overflow-hidden group ${
                  isEnrolled 
                    ? "hover:shadow-lg hover:-translate-y-0.5" 
                    : "opacity-80"
                }`}
                style={{
                  backgroundColor: "var(--color-surface)",
                  borderColor: "var(--color-border)"
                }}
              >
                {/* Top highlight indicator if mandatory or overdue */}
                {assessment.isOverdue ? (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                ) : assessment.isMandatory ? (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                ) : null}

                <div className="space-y-4">
                  {/* Category and status badge row */}
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md uppercase tracking-wider border truncate max-w-[150px]"
                      style={{
                        backgroundColor: "var(--color-surface-elevated)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-primary)"
                      }}
                      title={courseLabel}
                    >
                      {courseLabel.split(" ").slice(0, 3).join(" ")}
                    </span>
                    {statusPill}
                  </div>

                  {/* Special indicator tags: Mandatory, Overdue, Proctored */}
                  {(assessment.isMandatory || assessment.isOverdue || isProctored) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {assessment.isMandatory && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 uppercase">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Mandatory
                        </span>
                      )}
                      {assessment.isOverdue && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 uppercase">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Overdue
                        </span>
                      )}
                      {isProctored && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 uppercase">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Proctored
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title and description */}
                  <div className="space-y-1">
                    <h4 
                      className="font-bold text-sm sm:text-base leading-snug line-clamp-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {assessment.title}
                    </h4>
                    <p 
                      className="text-xs font-medium line-clamp-1"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {courseLabel}
                    </p>
                    {assessment.description && (
                      <p 
                        className="text-xs line-clamp-2 leading-relaxed pt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {assessment.description}
                      </p>
                    )}
                  </div>

                  {/* Parameters specs matrix */}
                  <div 
                    className="grid grid-cols-3 gap-2 border rounded-xl p-3 text-[10px] font-semibold font-mono"
                    style={{
                      backgroundColor: "var(--color-surface-elevated)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)"
                    }}
                  >
                    <div className="text-center space-y-1 border-r" style={{ borderColor: "var(--color-border)" }}>
                      <FileText className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--color-text-muted)" }} />
                      <p>{assessment.questionsCount || 0} Qs</p>
                    </div>
                    <div className="text-center space-y-1 border-r" style={{ borderColor: "var(--color-border)" }}>
                      <Clock className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--color-text-muted)" }} />
                      <p>{assessment.durationMinutes || 0} Min</p>
                    </div>
                    <div className="text-center space-y-1">
                      <Award className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--color-text-muted)" }} />
                      <p>{assessment.passingScore || 70}% Pass</p>
                    </div>
                  </div>

                  {/* Visual Progress / Score Gauge (if attempted) */}
                  {(assessment.attemptsCount || 0) > 0 && assessment.bestScore !== null && assessment.bestScore !== undefined && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                        <span style={{ color: "var(--color-text-muted)" }}>
                          BEST: {assessment.bestScore}% ({assessment.bestScore >= (assessment.passingScore || 70) ? "Met Pass Mark" : "Below Pass Mark"})
                        </span>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          REQ: {assessment.passingScore || 70}%
                        </span>
                      </div>
                      <div 
                        className="h-1.5 w-full rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--color-border)" }}
                      >
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            assessment.bestScore >= (assessment.passingScore || 70)
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, assessment.bestScore))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Due Date if present */}
                  {assessment.dueDate && (
                    <div 
                      className="text-[10px] font-semibold font-mono flex items-center gap-1.5"
                      style={{ color: assessment.isOverdue ? "var(--color-danger)" : "var(--color-text-muted)" }}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Due: {new Date(assessment.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  )}
                </div>

                {/* Score & Launch Button Footer */}
                <div 
                  className="space-y-2.5 pt-3 border-t mt-4"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {(assessment.attemptsCount || 0) > 0 && (
                    <div 
                      className="flex justify-between items-center text-[10px] font-bold font-mono"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <span>ATTEMPTS: {assessment.attemptsCount}</span>
                      {assessment.totalPoints ? (
                        <span>TOTAL PTS: {assessment.totalPoints}</span>
                      ) : null}
                    </div>
                  )}

                  {!isEnrolled ? (
                    <button
                      type="button"
                      onClick={() => onNavigate("courses")}
                      className="w-full font-bold text-xs py-2.5 rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: "var(--color-surface-elevated)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-secondary)"
                      }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Course Assignment Required
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartAssessment(assessment.id)}
                      className="w-full font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:opacity-95 active:scale-[0.99]"
                      style={{
                        backgroundColor: "var(--color-button-primary)",
                        color: "var(--color-button-primary-foreground)"
                      }}
                    >
                      {isPassed ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake Assessment</span>
                        </>
                      ) : isInProgress ? (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Resume Assessment</span>
                        </>
                      ) : (assessment.attemptsCount || 0) > 0 ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retake Assessment</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Assessment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty Results State */
        <div 
          className="py-16 px-6 text-center rounded-3xl border space-y-4 shadow-xs"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)"
          }}
        >
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)"
            }}
          >
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 
              className="text-base font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              No assessments found
            </h3>
            <p 
              className="text-xs leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              {searchTerm || selectedStatus !== "all" || selectedCategory !== "all"
                ? "No quizzes or examinations match your current search and filter selections."
                : "No assessments have been published or assigned to your learning track yet."}
            </p>
          </div>
          {(searchTerm || selectedStatus !== "all" || selectedCategory !== "all") && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer inline-flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--color-surface-elevated)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)"
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
