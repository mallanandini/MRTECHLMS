/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  GraduationCap, BookOpen, Code, Award, Sparkles, Play, 
  ArrowRight, Clock, Star, BookMarked, Calendar, Send, 
  Terminal, CheckCircle2, XCircle, ChevronRight, TrendingUp, Info, Lock,
  AlertTriangle, Flame, Medal, Compass, Check, ArrowUpRight, Search, Filter,
  Copy, Loader2
} from "lucide-react";
import { User, Course } from "../types.js";
import { CourseOverviewModal } from "./student/CourseOverviewModal.js";

interface StudentDashboardProps {
  currentUser: User;
  authToken: string;
  myDashboardStats: any;
  catalogCourses: Course[];
  enrolledCourseIds: string[];
  onResumeCourse: (courseId: string) => void;
  onResumeLearningPath?: (pathId: string) => void;
  onStartAssessment: (assessmentId: string) => void;
  onEnrollCourse: (courseId: string) => void;
  onNavigate: (tab: string) => void;
}

export function StudentDashboard({
  currentUser,
  authToken,
  myDashboardStats,
  catalogCourses,
  enrolledCourseIds,
  onResumeCourse,
  onResumeLearningPath,
  onStartAssessment,
  onEnrollCourse,
  onNavigate
}: StudentDashboardProps) {
  // Course filter state: "all" | "in_progress" | "completed"
  const [courseFilter, setCourseFilter] = useState<"all" | "in_progress" | "completed">("all");
  
  // Selected course for overview modal
  const [inspectCourseId, setInspectCourseId] = useState<string | null>(null);

  // AI Tutor state
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedAi, setCopiedAi] = useState(false);
  const [lastAttemptedQuery, setLastAttemptedQuery] = useState("");
  const [aiHistory, setAiHistory] = useState<Array<{ role: "user" | "mentor"; content: string }>>([]);

  // Format dynamic dates
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handleAskAi = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : aiQuery).trim();
    if (!query || aiLoading) return;

    setLastAttemptedQuery(query);
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          content: query,
          context: "Student Dashboard Quick Help Widget",
          history: aiHistory.slice(-4),
          previousAnswer: aiAnswer || undefined
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.explanation) {
        setAiAnswer(data.explanation);
        setAiHistory(prev => [
          ...prev.slice(-6),
          { role: "user", content: query },
          { role: "mentor", content: data.explanation }
        ]);
        setAiError(null);
      } else {
        setAiError(data.error || "Failed to connect to the AI Mentor. Please try again.");
        setAiAnswer("");
      }
    } catch (err) {
      console.error("AI Explainer failed on dashboard", err);
      setAiError("Network connection error. Could not contact the AI Mentor.");
      setAiAnswer("");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAiAnswer = async () => {
    if (!aiAnswer) return;
    try {
      await navigator.clipboard.writeText(aiAnswer);
      setCopiedAi(true);
      setTimeout(() => setCopiedAi(false), 2000);
    } catch {}
  };

  // Safe data extractions from the 10-pillar backend
  const continueLearning = myDashboardStats?.continueLearning;
  const assignedCourses = myDashboardStats?.assignedCourses || myDashboardStats?.courseProgress || [];
  const learningPaths = myDashboardStats?.learningPaths || [];
  const upcomingAssessments = myDashboardStats?.upcomingAssessments || [];
  const dueSoon = myDashboardStats?.dueSoon || [];
  const overdue = myDashboardStats?.overdue || [];
  const recentActivity = myDashboardStats?.recentActivity || [];
  const certificates = myDashboardStats?.certificates || [];
  const progress = myDashboardStats?.progress || {
    totalAssignedCourses: myDashboardStats?.enrolledCount || 0,
    completedCourses: myDashboardStats?.completedCourses || 0,
    overallCompletionRate: myDashboardStats?.averageProgress || 0,
    passedAssessments: myDashboardStats?.passedAssessments || 0,
    averageAssessmentScore: 0,
    totalCertificates: 0,
    codingChallengesSolved: myDashboardStats?.codingChallengesSolved || 0,
    learningStreakDays: 1,
    estimatedLearningHours: 0
  };
  const recommendedLearning = myDashboardStats?.recommendedLearning || [];

  // Filtered assigned courses
  const filteredCourses = assignedCourses.filter((c: any) => {
    if (courseFilter === "completed") return c.status === "completed" || (c.progressPercentage || c.percentage) >= 100;
    if (courseFilter === "in_progress") return c.status !== "completed" && (c.progressPercentage || c.percentage) < 100;
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150 min-w-0 font-sans pb-10">
      
      {/* ========================================================================= */}
      {/* 1. URGENT OVERDUE & DUE-SOON CRITICAL ALERT STRIP */}
      {/* ========================================================================= */}
      {overdue.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                Attention: You have {overdue.length} overdue learning item{overdue.length === 1 ? "" : "s"}!
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                Past scheduled deadline: {overdue.map((o: any) => o.title).slice(0, 2).join(", ")}
                {overdue.length > 2 ? ` and ${overdue.length - 2} more` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const firstOverdue = overdue[0];
              if (firstOverdue?.type === "course") onResumeCourse(firstOverdue.id);
              else if (firstOverdue?.type === "assessment") onStartAssessment(firstOverdue.id);
              else onNavigate("courses");
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            Review Overdue Items
          </button>
        </div>
      )}

      {dueSoon.length > 0 && overdue.length === 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-semibold">
              Upcoming deadlines: {dueSoon.length} item{dueSoon.length === 1 ? "" : "s"} due in the next 7 days.
            </span>
          </div>
          <button
            onClick={() => onNavigate("courses")}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline shrink-0"
          >
            View Schedule
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DYNAMIC WELCOME BANNER & LEARNING STREAK */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden hero-gradient text-black rounded-3xl p-5 sm:p-6 md:p-8 shadow-md min-w-0">
        <div className="relative z-10 space-y-4 max-w-3xl min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-[10px] font-bold tracking-wider uppercase font-mono backdrop-blur-xs border border-blue-200 dark:border-slate-700">
              <Calendar className="w-3 h-3 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{formattedDate}</span>
            </div>
            {progress.learningStreakDays > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 text-[10px] font-bold tracking-wider uppercase font-mono backdrop-blur-xs">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{progress.learningStreakDays}-Day Streak</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white flex flex-wrap items-center gap-2">
              <span>Welcome Back, {currentUser.name}!</span> <span>👋</span>
            </h2>
            <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
              Keep your momentum moving forward today. Track assigned courses, tackle upcoming assessments, or consult your personal AI Mentor.
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap gap-2.5 sm:gap-4 pt-2">
            <div className="bg-white/75 dark:bg-slate-900/80 rounded-xl px-3.5 py-2 border border-blue-200 dark:border-slate-700 backdrop-blur-xs shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-300 block uppercase tracking-wider font-mono">
                Completion Rate
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-950 dark:text-white">
                {progress.overallCompletionRate}%
              </span>
            </div>
            <div className="bg-white/75 dark:bg-slate-900/80 rounded-xl px-3.5 py-2 border border-blue-200 dark:border-slate-700 backdrop-blur-xs shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-300 block uppercase tracking-wider font-mono">
                Courses In Progress
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-950 dark:text-white">
                {progress.inProgressCourses || (progress.totalAssignedCourses - progress.completedCourses)}
              </span>
            </div>
            <div className="bg-white/75 dark:bg-slate-900/80 rounded-xl px-3.5 py-2 border border-blue-200 dark:border-slate-700 backdrop-blur-xs shadow-2xs">
              <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-300 block uppercase tracking-wider font-mono">
                Certificates Earned
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-950 dark:text-white">
                {progress.totalCertificates || certificates.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Active Batches Cohort Panel */}
      {myDashboardStats?.batches && myDashboardStats.batches.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>My Academic Cohorts & Batches</span>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {myDashboardStats.batches.length} {myDashboardStats.batches.length === 1 ? "Cohort" : "Cohorts"}
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Assigned institutional learning tracks and cohort curriculum
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 self-start sm:self-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Enrollment</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myDashboardStats.batches.map((b: any) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-xs uppercase shrink-0">
                    {b.code.slice(0, 3)}
                  </div>
                  <span className="font-mono text-xs font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {b.code}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                    {b.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>{b.institutionName || "MR Technologies Academy"}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{b.academicYear}</span>
                  </div>
                </div>

                {b.department && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Track: <strong className="text-slate-700 dark:text-slate-300">{b.department}</strong>
                  </div>
                )}

                {b.courses && b.courses.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Curriculum Courses</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{b.courses.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {b.courses.map((course: any) => (
                        <button
                          key={course.id}
                          onClick={() => onResumeCourse(course.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-full cursor-pointer shadow-2xs"
                          title={course.title}
                        >
                          <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{course.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SECTION: CONTINUE LEARNING (PRIMARY HERO ACTION) */}
      {/* ========================================================================= */}
      {continueLearning && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Left: Thumbnail & Course Info */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
              <div className="w-24 sm:w-32 aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 relative">
                <img
                  src={continueLearning.courseThumbnail}
                  alt={continueLearning.courseTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-950/80 text-white">
                  {continueLearning.progressPercentage}%
                </span>
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    Continue Learning
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {continueLearning.category}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {continueLearning.courseTitle}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                  <span>Current: <strong>{continueLearning.lessonTitle}</strong></span>
                  <span>({continueLearning.durationMinutes} mins)</span>
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-md pt-1.5 space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${continueLearning.progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>{continueLearning.completedCount} / {continueLearning.totalCount} Lessons</span>
                    <span>{continueLearning.progressPercentage}% Complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Resume Action Button */}
            <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 pt-2 lg:pt-0">
              <button
                onClick={() => setInspectCourseId(continueLearning.courseId)}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Course Syllabus
              </button>
              <button
                onClick={() => onResumeCourse(continueLearning.courseId)}
                className="flex-1 lg:flex-initial py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Lesson</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SECTION: GLOBAL PROGRESS SCORECARD */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono block">Enrolled Courses</span>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {progress.totalAssignedCourses}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{progress.completedCourses} graduated</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono block">Completion Rate</span>
          <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {progress.overallCompletionRate}%
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Overall syllabus</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono block">Exams Passed</span>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {progress.passedAssessments}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Avg {progress.averageAssessmentScore}%</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono block">Learning Hours</span>
          <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {progress.estimatedLearningHours}h
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">{progress.totalLessonsCompleted} lessons</span>
        </div>

        <div 
          onClick={() => onNavigate("practice")}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-amber-400 transition group"
        >
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono block group-hover:text-amber-500">Coding Solved</span>
          <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {progress.codingChallengesSolved}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Algorithms</span>
        </div>

        <div 
          onClick={() => onNavigate("certificates")}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs cursor-pointer hover:border-indigo-400 transition group"
        >
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono block group-hover:text-indigo-500">Certificates</span>
          <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {progress.totalCertificates || certificates.length}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Official credentials</span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. MAIN CONTENT LAYOUT: 2 COLUMNS LEFT, 1 COLUMN RIGHT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Assigned Courses, Learning Paths, Assessments */}
        <div className="xl:col-span-2 space-y-8 min-w-0">
          
          {/* SECTION 2: ASSIGNED COURSES */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-blue-600" />
                  Assigned Courses ({assignedCourses.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Curriculum allocated by your department and LMS administrators</p>
              </div>

              {/* Filter Tabs */}
              <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  onClick={() => setCourseFilter("all")}
                  className={`px-3 py-1 rounded-md transition ${
                    courseFilter === "all" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-500"
                  }`}
                >
                  All ({assignedCourses.length})
                </button>
                <button
                  onClick={() => setCourseFilter("in_progress")}
                  className={`px-3 py-1 rounded-md transition ${
                    courseFilter === "in_progress" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-500"
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setCourseFilter("completed")}
                  className={`px-3 py-1 rounded-md transition ${
                    courseFilter === "completed" ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((c: any) => {
                  const pct = c.progressPercentage !== undefined ? c.progressPercentage : c.percentage || 0;
                  const isFinished = pct >= 100 || c.status === "completed";

                  return (
                    <div
                      key={c.courseId}
                      className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4.5 hover:shadow-md transition flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative border border-slate-100 dark:border-slate-800">
                          <img
                            src={c.thumbnail}
                            alt={c.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-950/80 text-white font-mono">
                            {c.category}
                          </span>
                          {c.isOverdue && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white font-mono">
                              Overdue
                            </span>
                          )}
                          {!c.isOverdue && c.isDueSoon && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white font-mono">
                              Due Soon
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                            {c.title}
                          </h4>
                          {c.batchNames && c.batchNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.batchNames.map((bn: string, idx: number) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0"
                                >
                                  <GraduationCap className="w-2.5 h-2.5" />
                                  <span>Batch: {bn}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {c.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 space-y-3">
                        {/* Progress meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                            <span>{c.completedCount || 0} / {c.totalCount || 0} LESSONS</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isFinished ? "bg-emerald-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setInspectCourseId(c.courseId)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition"
                            title="Inspect Course Syllabus"
                          >
                            Details
                          </button>
                          
                          {isFinished ? (
                            <button
                              onClick={() => {
                                if (c.assessmentId) onStartAssessment(c.assessmentId);
                                else onResumeCourse(c.courseId);
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{c.assessmentId ? "Assessment" : "Review Course"}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onResumeCourse(c.courseId)}
                              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{pct > 0 ? "Continue" : "Start Course"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 text-slate-400 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {assignedCourses.length === 0 ? "No courses assigned yet" : "No courses match this filter"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {assignedCourses.length === 0 
                      ? "You do not currently have any active course enrollments. Reach out to your instructor or LMS administrator to get started." 
                      : "All your active assignments will appear here."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: UPCOMING ASSESSMENTS */}
          {upcomingAssessments.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Upcoming & Assigned Assessments ({upcomingAssessments.length})
                </h3>
                <button
                  onClick={() => onNavigate("assessments")}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Assessment Center
                </button>
              </div>

              <div className="space-y-3">
                {upcomingAssessments.map((a: any) => (
                  <div
                    key={a.assessmentId}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {a.title}
                        </span>
                        {a.isOverdue && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded font-mono">
                            OVERDUE
                          </span>
                        )}
                        {a.status === "passed" && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-mono">
                            PASSED ({a.latestScore}%)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {a.courseTitle} • Pass: {a.passingScore}% • {a.durationMinutes} mins • {a.totalPoints} points
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {a.dueDate && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Due: {new Date(a.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        onClick={() => onStartAssessment(a.assessmentId)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                          a.status === "passed"
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            : "bg-amber-600 hover:bg-amber-700 text-white"
                        }`}
                      >
                        {a.status === "passed" ? "Retake Exam" : "Start Exam"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: RECOMMENDED LEARNING */}
          {recommendedLearning.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Recommended For Your Track
                  </h3>
                  <p className="text-xs text-slate-400">High-rated academy courses you haven't enrolled in yet</p>
                </div>
                <button
                  onClick={() => onNavigate("courses")}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Full Catalog
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedLearning.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative">
                        <img
                          src={rec.thumbnail}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-950/80 text-white font-mono">
                          {rec.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1">
                        {rec.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {rec.shortDescription}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{rec.rating.toFixed(1)}</span>
                      </div>
                      <button
                        onClick={() => setInspectCourseId(rec.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition"
                      >
                        View Overview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Column: AI Tutor, Certificates Showcase & Recent Activity */}
        <div className="space-y-6 min-w-0">
          
          {/* AI TUTOR QUICK CONSULTANT */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-5 shadow-md space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-orange-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                AI Learning Mentor
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 uppercase font-bold">
                Online
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Stuck on coding syntax, algorithms, or lesson concepts? Ask your AI tutor for instant explanation.
            </p>

            {/* Form - Stays fixed and usable at the top */}
            <form onSubmit={handleAskAi} className="space-y-2.5">
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (aiQuery.trim() && !aiLoading) {
                      handleAskAi(e);
                    }
                  }
                }}
                placeholder="Ask e.g. What is AI? Explain variables in Python with an example"
                className="w-full bg-slate-950 text-slate-100 text-xs p-3 rounded-xl border border-slate-800 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none h-20 leading-relaxed transition"
                spellCheck={false}
              />

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => { setAiQuery("what is AI"); handleAskAi(undefined, "what is AI"); }}
                  className="text-[10px] px-2 py-0.5 bg-slate-800/80 hover:bg-orange-950 hover:text-orange-300 hover:border-orange-800 border border-slate-700/60 text-slate-400 rounded-lg transition cursor-pointer"
                >
                  💡 What is AI?
                </button>
                <button
                  type="button"
                  onClick={() => { setAiQuery("Explain variables in Python with an example"); handleAskAi(undefined, "Explain variables in Python with an example"); }}
                  className="text-[10px] px-2 py-0.5 bg-slate-800/80 hover:bg-orange-950 hover:text-orange-300 hover:border-orange-800 border border-slate-700/60 text-slate-400 rounded-lg transition cursor-pointer"
                >
                  🐍 Python Variables
                </button>
                <button
                  type="button"
                  onClick={() => { setAiQuery("Explain inheritance in Java"); handleAskAi(undefined, "Explain inheritance in Java"); }}
                  className="text-[10px] px-2 py-0.5 bg-slate-800/80 hover:bg-orange-950 hover:text-orange-300 hover:border-orange-800 border border-slate-700/60 text-slate-400 rounded-lg transition cursor-pointer"
                >
                  ☕ Java Inheritance
                </button>
                <button
                  type="button"
                  onClick={() => { setAiQuery("Why am I getting a SyntaxError in Python?"); handleAskAi(undefined, "Why am I getting a SyntaxError in Python?"); }}
                  className="text-[10px] px-2 py-0.5 bg-slate-800/80 hover:bg-orange-950 hover:text-orange-300 hover:border-orange-800 border border-slate-700/60 text-slate-400 rounded-lg transition cursor-pointer"
                >
                  ⚠️ Syntax Error
                </button>
              </div>

              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Consulting Mentor...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask Question</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Notice */}
            {aiError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/70 rounded-xl text-xs text-rose-300 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    AI Mentor Notice
                  </span>
                  <div className="flex items-center gap-2">
                    {lastAttemptedQuery && (
                      <button
                        type="button"
                        onClick={() => handleAskAi(undefined, lastAttemptedQuery)}
                        className="text-amber-400 hover:text-amber-300 text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 hover:bg-amber-900/60 font-semibold cursor-pointer transition"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAiError(null)}
                      className="text-rose-400 hover:text-rose-200 text-[10px] px-1.5 py-0.5 rounded hover:bg-rose-900/50 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-200/90">{aiError}</p>
              </div>
            )}

            {/* Answer Display Area - Clean vertical scroll, no horizontal overflow */}
            {(aiAnswer || aiLoading) && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 max-h-72 overflow-y-auto overflow-x-hidden text-xs leading-relaxed text-slate-300 break-words space-y-2">
                {aiLoading ? (
                  <div className="space-y-2 py-1 animate-pulse">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      <span>Formulating expert explanation...</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-800 rounded w-5/6" />
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Header with copy & clear controls */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-[11px]">
                      <span className="font-semibold text-orange-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Mentor Explanation
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyAiAnswer}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-850 transition"
                          title="Copy explanation"
                        >
                          {copiedAi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedAi ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAiAnswer(""); setAiError(null); setAiHistory([]); }}
                          className="text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-850 transition"
                          title="Clear explanation"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Formatted Text Content */}
                    <div className="whitespace-pre-line text-xs leading-relaxed text-slate-300 break-words overflow-x-hidden">
                      {aiAnswer}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CERTIFICATES SHOWCASE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Medal className="w-4 h-4 text-indigo-600" />
                My Certificates ({certificates.length})
              </h3>
              <button
                onClick={() => onNavigate("certificates")}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </button>
            </div>

            {certificates.length > 0 ? (
              <div className="space-y-2.5">
                {certificates.slice(0, 3).map((cert: any) => (
                  <div
                    key={cert.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {cert.title}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded font-bold">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      #{cert.certificateNumber} • {new Date(cert.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <Medal className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p>Complete courses and assessments to earn verified certificates.</p>
              </div>
            )}
          </div>

          {/* RECENT ACTIVITY TIMELINE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-3xl p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Activity
            </h3>

            {recentActivity.length > 0 ? (
              <div className="space-y-3.5 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-800">
                {recentActivity.slice(0, 6).map((act: any, idx: number) => {
                  let badge = "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
                  let icon = <BookOpen className="w-3 h-3" />;

                  if (act.type === "assessment") {
                    badge = act.status === "success" 
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400";
                    icon = <Award className="w-3 h-3" />;
                  } else if (act.type === "certificate") {
                    badge = "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400";
                    icon = <Medal className="w-3 h-3" />;
                  } else if (act.type === "coding") {
                    badge = "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400";
                    icon = <Code className="w-3 h-3" />;
                  }

                  return (
                    <div key={idx} className="flex items-start gap-3 relative z-10 text-xs">
                      <div className={`w-8 h-8 rounded-lg ${badge} flex items-center justify-center shrink-0`}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white truncate leading-snug">
                          {act.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{act.detail}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {act.date ? new Date(act.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No recent activity recorded yet.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Course Overview & Syllabus Modal */}
      {inspectCourseId && (
        <CourseOverviewModal
          courseId={inspectCourseId}
          authToken={authToken}
          isOpen={!!inspectCourseId}
          onClose={() => setInspectCourseId(null)}
          onStartCourse={(cId) => onResumeCourse(cId)}
        />
      )}

    </div>
  );
}
