/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Lock, Users, GraduationCap, BookOpen, CheckCircle2, AlertTriangle, 
  Search, RefreshCw, Plus, Trash2, RotateCcw, ShieldAlert, Filter,
  Check, X, ChevronRight, UserCheck, Layers, Sparkles, Calendar, Clock,
  ShieldCheck, Eye, ShieldX
} from "lucide-react";
import { Course, User } from "../../types.js";

interface AccessRosterItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  category: string;
  instructorName: string;
  accessStatus: "active" | "revoked";
  assignmentSource: "individual" | "batch" | "individual_and_batch";
  sourceDetails: string;
  batches: Array<{ id: string; name: string; code: string; assignedAt: string }>;
  hasDirectAccess: boolean;
  hasBatchAccess: boolean;
  isExplicitlyRevoked: boolean;
  canRevoke: boolean;
  canRestore: boolean;
  assignedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
}

interface BatchOption {
  id: string;
  name: string;
  code: string;
  status: string;
  students?: number;
  academicYear?: string;
}

interface AccessManagementConsoleProps {
  authToken: string;
}

export function AccessManagementConsole({ authToken }: AccessManagementConsoleProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get("view") as "assign" | "students" | "batches" | "revocations") || "assign";

  // Data States
  const [roster, setRoster] = useState<AccessRosterItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchCourseMappings, setBatchCourseMappings] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment Form State (Unified Multi-Course Assignment)
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState<"student" | "batch" | "both">("student");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<string>("");
  const [isMandatory, setIsMandatory] = useState<boolean>(false);

  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [batchSearchTerm, setBatchSearchTerm] = useState("");
  const [courseSearchTerm, setCourseSearchTerm] = useState("");

  // Views search filters
  const [studentViewSearch, setStudentViewSearch] = useState("");
  const [batchViewSearch, setBatchViewSearch] = useState("");

  // Notification Banners
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Roster Filters
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "revoked">("all");
  const [searchRoster, setSearchRoster] = useState("");

  // Action Confirmation Dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: "revoke_all" | "revoke_direct" | "restore";
    item: AccessRosterItem;
  } | null>(null);

  const handleViewChange = (view: "assign" | "students" | "batches" | "revocations") => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", view);
    setSearchParams(newParams);
  };

  const loadData = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const [rosterRes, coursesRes, usersRes, batchesRes] = await Promise.all([
        fetch("/api/admin/access/roster", { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch("/api/courses", { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch("/api/admin/batches", { headers: { Authorization: `Bearer ${authToken}` } })
      ]);

      if (rosterRes.ok) {
        const data = await rosterRes.json();
        setRoster(data);
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData.filter((c: Course) => c.status === "published"));
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        const userList = Array.isArray(uData) ? uData : uData.data || [];
        setStudents(userList.filter((u: User) => u.role === "student" && u.status === "active"));
      }
      if (batchesRes.ok) {
        const bData = await batchesRes.json();
        const batchList = Array.isArray(bData) ? bData : bData.batches || [];
        setBatches(batchList);

        // Fetch courses for each batch to populate batch view
        const mapping: Record<string, string[]> = {};
        for (const b of batchList) {
          try {
            const bRes = await fetch(`/api/admin/batches/${b.id}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (bRes.ok) {
              const bDetail = await bRes.json();
              mapping[b.id] = (bDetail.courses || []).map((c: any) => c.id || c.courseId);
            }
          } catch {
            // fallback
          }
        }
        setBatchCourseMappings(mapping);
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "Failed to load access control data. Check network connection." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  // Support pre-populating targets from query parameters
  useEffect(() => {
    const sid = searchParams.get("studentId");
    if (sid) {
      setSelectedStudentIds(new Set([sid]));
      setAssignTo("student");
    }
    const bid = searchParams.get("batchId");
    if (bid) {
      setSelectedBatchIds(new Set([bid]));
      setAssignTo("batch");
    }
    const cid = searchParams.get("courseId");
    if (cid) {
      setSelectedCourseIds(new Set([cid]));
    }
  }, [searchParams]);

  // Handle Multi-Grant Submission
  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (selectedCourseIds.size === 0) {
      setNotification({ type: "error", message: "Please select at least one course." });
      return;
    }

    const needsStudents = assignTo === "student" || assignTo === "both";
    const needsBatches = assignTo === "batch" || assignTo === "both";

    if (needsStudents && selectedStudentIds.size === 0) {
      setNotification({ type: "error", message: "Please select at least one student." });
      return;
    }
    if (needsBatches && selectedBatchIds.size === 0) {
      setNotification({ type: "error", message: "Please select at least one batch." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/access/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          courseIds: Array.from(selectedCourseIds),
          assignTo,
          studentIds: needsStudents ? Array.from(selectedStudentIds) : [],
          batchIds: needsBatches ? Array.from(selectedBatchIds) : [],
          dueDate: dueDate || undefined,
          isMandatory
        })
      });

      const result = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          message: result.message || "Course access granted successfully!"
        });
        // Clear selection
        setSelectedCourseIds(new Set());
        setSelectedStudentIds(new Set());
        setSelectedBatchIds(new Set());
        setDueDate("");
        setIsMandatory(false);
        // Reload roster
        await loadData();
      } else {
        setNotification({ type: "error", message: result.error || "Failed to grant course access." });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "Network error occurred while granting course access." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Confirmed Revocation / Restoration
  const handleExecuteConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, item } = confirmAction;
    setConfirmAction(null);
    setIsSubmitting(true);

    try {
      if (type === "revoke_direct" || type === "revoke_all") {
        const mode = type === "revoke_direct" ? "direct_only" : "all";
        const res = await fetch("/api/admin/access/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            studentId: item.studentId,
            courseId: item.courseId,
            mode,
            reason: type === "revoke_all" 
              ? "Access revoked by administrator (explicit override blocking all grants)" 
              : "Direct course assignment removed"
          })
        });

        const data = await res.json();
        if (res.ok) {
          setNotification({ type: "success", message: data.message || "Access revoked successfully." });
          await loadData();
        } else {
          setNotification({ type: "error", message: data.error || "Failed to revoke access." });
        }
      } else if (type === "restore") {
        const res = await fetch("/api/admin/access/restore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            studentId: item.studentId,
            courseId: item.courseId
          })
        });

        const data = await res.json();
        if (res.ok) {
          setNotification({ type: "success", message: data.message || "Access restored successfully." });
          await loadData();
        } else {
          setNotification({ type: "error", message: data.error || "Failed to restore access." });
        }
      }
    } catch (err: any) {
      setNotification({ type: "error", message: "Network error processing action." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Roster Items
  const filteredRoster = roster.filter(item => {
    if (filterCourse !== "all" && item.courseId !== filterCourse) return false;
    if (filterStatus !== "all" && item.accessStatus !== filterStatus) return false;
    if (filterBatch !== "all") {
      const hasThisBatch = item.batches && item.batches.some(b => b.id === filterBatch);
      if (!hasThisBatch) return false;
    }
    if (searchRoster.trim()) {
      const q = searchRoster.toLowerCase();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchEmail = item.studentEmail.toLowerCase().includes(q);
      const matchCourse = item.courseTitle.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchCourse) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner Alert / Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150 ${
          notification.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        <button
          type="button"
          onClick={() => handleViewChange("assign")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
            currentView === "assign"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Assign Courses</span>
        </button>

        <button
          type="button"
          onClick={() => handleViewChange("students")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
            currentView === "students"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Student Course Access</span>
          <span className={`ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
            currentView === "students" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {students.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleViewChange("batches")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
            currentView === "batches"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <GraduationCap className="w-4 h-4 text-purple-400" />
          <span>Batch Course Access</span>
          <span className={`ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
            currentView === "batches" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {batches.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleViewChange("revocations")}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
            currentView === "revocations"
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Access History & Revocations</span>
          <span className={`ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
            currentView === "revocations" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
          }`}>
            {roster.filter(r => r.accessStatus === "revoked").length}
          </span>
        </button>
      </div>

      {/* VIEW 1: ASSIGN COURSES (UNIFIED MULTI-COURSE ASSIGNMENT WORKFLOW) */}
      {currentView === "assign" && (
        <div className="space-y-8 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Assign Courses
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Select one or multiple courses, choose targets (students, batches, or both), and grant access in a single workflow.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full">
                  Unified Course Allocation
                </span>
              </div>
            </div>

            <form onSubmit={handleGrantAccess} className="p-6 space-y-6">
              {/* STEP 1: SELECT COURSE(S) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Select Course(s) *</span>
                    <span className="text-slate-400 font-normal font-sans text-[11px]">
                      ({selectedCourseIds.size} of {courses.length} selected)
                    </span>
                  </label>

                  {courses.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIds(new Set(courses.map(c => c.id)))}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIds(new Set())}
                        className="text-slate-500 hover:text-slate-700 font-medium hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Course Search filter */}
                <div className="relative max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={courseSearchTerm}
                    onChange={(e) => setCourseSearchTerm(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Courses Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {courses
                    .filter(c => !courseSearchTerm || c.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) || c.category?.toLowerCase().includes(courseSearchTerm.toLowerCase()))
                    .map(course => {
                      const isSelected = selectedCourseIds.has(course.id);
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourseIds(prev => {
                              const next = new Set(prev);
                              if (next.has(course.id)) next.delete(course.id);
                              else next.add(course.id);
                              return next;
                            });
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                            isSelected 
                              ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs" 
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{course.title}</p>
                            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {course.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* STEP 2: ASSIGN TO TARGET (STUDENT / BATCH / BOTH) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Assign To *</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAssignTo("student")}
                    className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      assignTo === "student"
                        ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Individual Students</p>
                      <p className="text-[11px] text-slate-400">Direct student enrollments</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignTo("batch")}
                    className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      assignTo === "batch"
                        ? "bg-purple-50/60 border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Batch Cohort</p>
                      <p className="text-[11px] text-slate-400">All learners in batch</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignTo("both")}
                    className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      assignTo === "both"
                        ? "bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Both Students & Batches</p>
                      <p className="text-[11px] text-slate-400">Hybrid combined allocation</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* STEP 3: RECIPIENT SELECTORS */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Select Recipients *</span>
                </label>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Student Selector */}
                  {(assignTo === "student" || assignTo === "both") && (
                    <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-900">Individual Students</span>
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            {selectedStudentIds.size} selected
                          </span>
                        </div>
                        {students.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentIds(new Set(students.map(s => s.id)))}
                              className="text-blue-600 hover:underline font-bold"
                            >
                              All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentIds(new Set())}
                              className="text-slate-500 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          placeholder="Search students..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {students
                          .filter(s => !studentSearchTerm || s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.email.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                          .map(s => {
                            const isSelected = selectedStudentIds.has(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudentIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(s.id)) next.delete(s.id);
                                    else next.add(s.id);
                                    return next;
                                  });
                                }}
                                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                                  isSelected ? "bg-blue-50 border-blue-400 font-bold text-blue-900" : "bg-white border-slate-200 hover:bg-slate-100/60 text-slate-700"
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="truncate text-xs font-semibold">{s.name}</p>
                                  <p className="text-[11px] text-slate-400 truncate font-mono">{s.email}</p>
                                </div>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Batch Selector */}
                  {(assignTo === "batch" || assignTo === "both") && (
                    <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold text-slate-900">Batches & Cohorts</span>
                          <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            {selectedBatchIds.size} selected
                          </span>
                        </div>
                        {batches.length > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedBatchIds(new Set(batches.map(b => b.id)))}
                              className="text-purple-600 hover:underline font-bold"
                            >
                              All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedBatchIds(new Set())}
                              className="text-slate-500 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={batchSearchTerm}
                          onChange={(e) => setBatchSearchTerm(e.target.value)}
                          placeholder="Search batches..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                        {batches
                          .filter(b => !batchSearchTerm || b.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) || b.code.toLowerCase().includes(batchSearchTerm.toLowerCase()))
                          .map(b => {
                            const isSelected = selectedBatchIds.has(b.id);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBatchIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(b.id)) next.delete(b.id);
                                    else next.add(b.id);
                                    return next;
                                  });
                                }}
                                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                                  isSelected ? "bg-purple-50 border-purple-400 font-bold text-purple-900" : "bg-white border-slate-200 hover:bg-slate-100/60 text-slate-700"
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="truncate text-xs font-semibold">{b.name}</p>
                                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{b.code}</span>
                                </div>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 bg-white"
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 4: PARAMETERS & ACTION BAR */}
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Due Date (Optional):</span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMandatory}
                      onChange={(e) => setIsMandatory(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Mark as Mandatory Training</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourseIds(new Set());
                      setSelectedStudentIds(new Set());
                      setSelectedBatchIds(new Set());
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Reset Form
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || selectedCourseIds.size === 0 || (assignTo !== "batch" && selectedStudentIds.size === 0 && assignTo !== "both") || (assignTo === "both" && selectedStudentIds.size === 0 && selectedBatchIds.size === 0)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Granting Access...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Grant Course Access ({selectedCourseIds.size} Courses)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Active Roster Summary Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Active Access Allocation Roster</h3>
                <p className="text-xs text-slate-500">Live roster of all granted course authorizations with computed sources.</p>
              </div>
            </div>
            {renderRosterTable()}
          </div>
        </div>
      )}

      {/* VIEW 2: STUDENT COURSE ACCESS */}
      {currentView === "students" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Student Course Access Directory</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect effective course access for each learner, identify assignment sources, and manage overrides.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentViewSearch}
                  onChange={(e) => setStudentViewSearch(e.target.value)}
                  placeholder="Filter student by name or email..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Students List with Assigned Courses */}
            <div className="space-y-4">
              {students
                .filter(s => !studentViewSearch || s.name.toLowerCase().includes(studentViewSearch.toLowerCase()) || s.email.toLowerCase().includes(studentViewSearch.toLowerCase()))
                .map(student => {
                  const studentCourses = roster.filter(r => r.studentId === student.id);
                  return (
                    <div key={student.id} className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center font-mono">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{student.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{student.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentIds(new Set([student.id]));
                              setAssignTo("student");
                              handleViewChange("assign");
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign Courses to Student</span>
                          </button>
                        </div>
                      </div>

                      {/* Enrolled Courses Badges / List */}
                      {studentCourses.length === 0 ? (
                        <div className="py-4 text-center text-slate-400 text-xs">
                          No courses currently granted to this student.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {studentCourses.map(item => (
                            <div key={item.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.courseTitle}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.assignmentSource === "individual_and_batch" ? (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Individual + Batch
                                    </span>
                                  ) : item.assignmentSource === "batch" ? (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                      Batch Grant
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                      Individual
                                    </span>
                                  )}

                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                    item.accessStatus === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                  }`}>
                                    {item.accessStatus}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.canRevoke && (
                                  <>
                                    {item.assignmentSource === "individual_and_batch" ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmAction({ type: "revoke_direct", item })}
                                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                          title="Revoke direct enrollment only (keeps batch access)"
                                        >
                                          Revoke Direct
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmAction({ type: "revoke_all", item })}
                                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                          title="Revoke all access (explicit override blocking batch access)"
                                        >
                                          Revoke All
                                        </button>
                                      </>
                                    ) : item.assignmentSource === "batch" ? (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmAction({ type: "revoke_all", item })}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                        title="Explicit override blocking inherited batch access"
                                      >
                                        Revoke All
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmAction({ type: "revoke_direct", item })}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                      >
                                        Revoke
                                      </button>
                                    )}
                                  </>
                                )}

                                {item.canRestore && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction({ type: "restore", item })}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Restore</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: BATCH COURSE ACCESS */}
      {currentView === "batches" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <span>Batch Course Access & Cohort Allocation</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View courses allocated to entire cohorts and assign learning tracks to batches.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={batchViewSearch}
                  onChange={(e) => setBatchViewSearch(e.target.value)}
                  placeholder="Filter batch by name or code..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Batches Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batches
                .filter(b => !batchViewSearch || b.name.toLowerCase().includes(batchViewSearch.toLowerCase()) || b.code.toLowerCase().includes(batchViewSearch.toLowerCase()))
                .map(batch => {
                  const assignedCourseIds = batchCourseMappings[batch.id] || [];
                  const assignedCoursesList = courses.filter(c => assignedCourseIds.includes(c.id));
                  return (
                    <div key={batch.id} className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition shadow-xs space-y-4">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{batch.name}</p>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 mt-1 inline-block">
                            {batch.code}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {batch.status}
                        </span>
                      </div>

                      {/* Assigned Courses to this Batch */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                          Allocated Courses ({assignedCoursesList.length})
                        </p>
                        {assignedCoursesList.length === 0 ? (
                          <p className="text-xs text-slate-400">No courses allocated to this batch yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {assignedCoursesList.map(c => (
                              <div key={c.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 truncate pr-2">{c.title}</span>
                                <span className="text-[10px] font-mono text-slate-500">{c.category}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBatchIds(new Set([batch.id]));
                            setAssignTo("batch");
                            handleViewChange("assign");
                          }}
                          className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Assign Courses to Batch</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: ACCESS HISTORY & REVOCATIONS */}
      {currentView === "revocations" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <span>Access History & Revocations Auditing</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit explicitly revoked student course permissions and restore authorized access with one click.
              </p>
            </div>

            {/* Revoked Table */}
            {(() => {
              const revokedItems = roster.filter(r => r.accessStatus === "revoked");
              if (revokedItems.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                    <p className="text-xs font-bold text-slate-700">No Revoked Course Authorizations</p>
                    <p className="text-[11px] text-slate-400">All registered course grants are currently active and authorized.</p>
                  </div>
                );
              }
              return (
                <div className="overflow-x-auto border border-slate-200/70 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase font-mono text-[10px] border-b border-slate-200/70">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Course</th>
                        <th className="py-3 px-4">Revocation Reason</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {revokedItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{item.studentName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{item.studentEmail}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{item.courseTitle}</p>
                            <span className="text-[10px] font-mono text-slate-500">{item.category}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 font-mono text-[10px] font-semibold border border-rose-100">
                              {item.isExplicitlyRevoked ? "Explicit Override Blocking Batch" : "Direct Revocation"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-rose-100 text-rose-800">
                              REVOKED
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: "restore", item })}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore Access</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <div className={`p-3 rounded-2xl ${
                confirmAction.type === "restore" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {confirmAction.type === "restore" ? <RotateCcw className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {confirmAction.type === "restore" 
                    ? "Restore Course Access" 
                    : confirmAction.type === "revoke_all" 
                    ? "Revoke All Course Access (Override)" 
                    : "Remove Direct Course Assignment"}
                </h3>
                <p className="text-xs text-slate-400">Please confirm authorization changes</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 space-y-1.5">
              <p><strong className="text-slate-800">Student:</strong> {confirmAction.item.studentName} ({confirmAction.item.studentEmail})</p>
              <p><strong className="text-slate-800">Course:</strong> {confirmAction.item.courseTitle}</p>
              {confirmAction.type === "revoke_all" && (
                <p className="text-rose-600 font-semibold pt-1">
                  ⚠️ This creates an explicit denial rule that overrides any batch memberships. The student will be blocked from accessing this course until access is explicitly restored.
                </p>
              )}
              {confirmAction.type === "revoke_direct" && (
                <p className="text-amber-600 font-semibold pt-1">
                  ℹ️ Only the direct student enrollment will be removed. If this student belongs to a batch with this course, they will continue to retain course access via batch inheritance.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition ${
                  confirmAction.type === "restore" 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" 
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                }`}
              >
                {confirmAction.type === "restore" ? "Confirm Restoration" : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper method for Roster Table rendering
  function renderRosterTable() {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by student or course..."
              value={searchRoster}
              onChange={(e) => setSearchRoster(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Access Statuses</option>
              <option value="active">Active Access Only</option>
              <option value="revoked">Revoked / Blocked Only</option>
            </select>
          </div>
        </div>

        {/* ROSTER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase font-mono text-[10px] border-b border-slate-200/70">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Assignment Source</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Assigned At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-xs font-medium">Loading access roster...</p>
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 space-y-2">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No course access records found</p>
                    <p className="text-[11px] text-slate-400">Try adjusting your filters or grant access using the form above.</p>
                  </td>
                </tr>
              ) : (
                filteredRoster.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.studentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.studentEmail}</p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.courseTitle}</p>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {item.assignmentSource === "individual_and_batch" ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Layers className="w-3 h-3 text-emerald-500" />
                            <span>Individual + Batch</span>
                          </span>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{item.sourceDetails}</p>
                        </div>
                      ) : item.assignmentSource === "batch" ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200">
                            <GraduationCap className="w-3 h-3 text-purple-500" />
                            <span>Batch Cohort</span>
                          </span>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{item.sourceDetails}</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            <Users className="w-3 h-3 text-blue-500" />
                            <span>Individual Grant</span>
                          </span>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{item.sourceDetails}</p>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {item.accessStatus === "active" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Revoked</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.canRevoke && (
                          <>
                            {item.assignmentSource === "individual_and_batch" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmAction({ type: "revoke_direct", item })}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Revoke direct enrollment only (keeps batch access)"
                                >
                                  Revoke Direct
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmAction({ type: "revoke_all", item })}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title="Revoke all access (explicit override blocking batch access)"
                                >
                                  Revoke All
                                </button>
                              </>
                            ) : item.assignmentSource === "batch" ? (
                              <button
                                type="button"
                                onClick={() => setConfirmAction({ type: "revoke_all", item })}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                title="Explicit override blocking inherited batch access"
                              >
                                Revoke All
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmAction({ type: "revoke_direct", item })}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                              >
                                Revoke
                              </button>
                            )}
                          </>
                        )}

                        {item.canRestore && (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: "restore", item })}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
