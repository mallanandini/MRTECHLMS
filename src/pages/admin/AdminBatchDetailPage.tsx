/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  GraduationCap, ArrowLeft, Users, BookOpen, Award, Plus, Search, 
  Trash2, Calendar, CheckCircle2, AlertCircle, RefreshCw, X, 
  Building2, Shield, Layers, UserCheck, AlertTriangle, ExternalLink,
  Compass, Clock
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Batch, BatchStudent, BatchCourse, BatchAssessment, User, Course, Assessment } from "../../types.js";

type DetailTab = "students" | "courses" | "learning-paths" | "assessments" | "overview";

export function AdminBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DetailTab>("students");
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<Batch | null>(null);

  // Lists
  const [batchStudents, setBatchStudents] = useState<BatchStudent[]>([]);
  const [batchCourses, setBatchCourses] = useState<BatchCourse[]>([]);
  const [batchLearningPaths, setBatchLearningPaths] = useState<any[]>([]);
  const [batchAssessments, setBatchAssessments] = useState<BatchAssessment[]>([]);

  // Available pools for assignment
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allLearningPaths, setAllLearningPaths] = useState<any[]>([]);
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([]);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search in tabs
  const [studentSearch, setStudentSearch] = useState("");

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [showAssignLearningPathModal, setShowAssignLearningPathModal] = useState(false);
  const [selectedLearningPathId, setSelectedLearningPathId] = useState("");

  const [showAssignAssessmentModal, setShowAssignAssessmentModal] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");

  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    if (batchId) {
      fetchAllDetails();
    }
  }, [batchId, authToken]);

  const fetchAllDetails = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      const [batchRes, studentsRes, coursesRes, lpRes, assessmentsRes, allUsersRes, allCoursesRes, allLpRes, allAssessRes] = await Promise.all([
        fetch(`/api/admin/batches/${batchId}`, { headers }),
        fetch(`/api/admin/batches/${batchId}/students`, { headers }),
        fetch(`/api/admin/batches/${batchId}/courses`, { headers }),
        fetch(`/api/admin/batches/${batchId}/learning-paths`, { headers }),
        fetch(`/api/admin/batches/${batchId}/assessments`, { headers }),
        fetch(`/api/admin/users`, { headers }),
        fetch(`/api/courses`, { headers }),
        fetch(`/api/admin/learning-paths`, { headers }),
        fetch(`/api/assessments`, { headers })
      ]);

      if (!batchRes.ok) throw new Error("Batch not found");

      const batchData = await batchRes.json();
      setBatch(batchData);

      if (studentsRes.ok) setBatchStudents(await studentsRes.json());
      if (coursesRes.ok) setBatchCourses(await coursesRes.json());
      if (lpRes.ok) setBatchLearningPaths(await lpRes.json());
      if (assessmentsRes.ok) setBatchAssessments(await assessmentsRes.json());

      if (allUsersRes.ok) {
        const users = await allUsersRes.json();
        setAllStudents(users.filter((u: any) => u.role === "student" && !u.deletedAt));
      }
      if (allCoursesRes.ok) setAllCourses(await allCoursesRes.json());
      if (allLpRes.ok) setAllLearningPaths(await allLpRes.json());
      if (allAssessRes.ok) setAllAssessments(await allAssessRes.json());
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered students for search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return batchStudents;
    const term = studentSearch.toLowerCase().trim();
    return batchStudents.filter(s => 
      s.studentName?.toLowerCase().includes(term) ||
      s.studentEmail?.toLowerCase().includes(term)
    );
  }, [batchStudents, studentSearch]);

  // Available students not already active in this batch
  const candidateStudents = useMemo(() => {
    const existingIds = new Set(batchStudents.filter(s => s.status === "active").map(s => s.studentId));
    return allStudents.filter(s => !existingIds.has(s.id));
  }, [allStudents, batchStudents]);

  // Available courses not already active in this batch
  const candidateCourses = useMemo(() => {
    const existingIds = new Set(batchCourses.filter(c => c.status === "active").map(c => c.courseId));
    return allCourses.filter(c => !existingIds.has(c.id));
  }, [allCourses, batchCourses]);

  // Available assessments not already active in this batch
  const candidateAssessments = useMemo(() => {
    const existingIds = new Set(batchAssessments.filter(a => a.status === "active").map(a => a.assessmentId));
    return allAssessments.filter(a => !existingIds.has(a.id));
  }, [allAssessments, batchAssessments]);

  // Available learning paths not already active in this batch
  const candidateLearningPaths = useMemo(() => {
    const existingIds = new Set(batchLearningPaths.map((lp: any) => lp.learningPathId || lp.id));
    return allLearningPaths.filter((lp: any) => !existingIds.has(lp.id) && lp.status === "published");
  }, [allLearningPaths, batchLearningPaths]);

  // -------------------------------------------------------------------------
  // Handlers: Student Add / Remove
  // -------------------------------------------------------------------------
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ studentId: selectedStudentId })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to add student");

      setSuccessMessage("Student added to batch successfully!");
      setShowAddStudentModal(false);
      setSelectedStudentId("");
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(
      `Remove ${studentName} from batch "${batch?.name}"?\n\n` +
      `Note: If this student belongs to another active batch that provides the same courses, or has a direct enrollment grant, their course access will be safely preserved.`
    )) return;

    try {
      const res = await fetch(`/api/admin/batches/${batchId}/students/${studentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to remove student");

      setSuccessMessage(`Removed ${studentName} from batch.`);
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Handlers: Course Assign / Revoke
  // -------------------------------------------------------------------------
  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ courseId: selectedCourseId })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to assign course");

      setSuccessMessage("Course assigned to batch and enrolled all active batch students!");
      setShowAssignCourseModal(false);
      setSelectedCourseId("");
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRevokeCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(
      `Remove course "${courseTitle}" from this batch?\n\n` +
      `Course access will be removed for batch students, UNLESS they have access from another active batch or direct individual grant.`
    )) return;

    try {
      const res = await fetch(`/api/admin/batches/${batchId}/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to revoke course");

      setSuccessMessage(`Course "${courseTitle}" removed from batch.`);
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Handlers: Assessment Assign / Revoke
  // -------------------------------------------------------------------------
  const handleAssignAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentId) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ assessmentId: selectedAssessmentId })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to assign assessment");

      setSuccessMessage("Assessment assigned to batch successfully!");
      setShowAssignAssessmentModal(false);
      setSelectedAssessmentId("");
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRevokeAssessment = async (assessmentId: string, title: string) => {
    if (!window.confirm(`Remove assessment "${title}" from this batch?`)) return;

    try {
      const res = await fetch(`/api/admin/batches/${batchId}/assessments/${assessmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to revoke assessment");

      setSuccessMessage(`Assessment "${title}" removed from batch.`);
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------------------
  // Handlers: Learning Path Assign / Revoke
  // -------------------------------------------------------------------------
  const handleAssignLearningPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearningPathId) return;

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/batches/${batchId}/learning-paths`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ learningPathId: selectedLearningPathId })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to assign learning path");

      setSuccessMessage("Learning Path assigned to batch successfully!");
      setShowAssignLearningPathModal(false);
      setSelectedLearningPathId("");
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRevokeLearningPath = async (learningPathId: string, title: string) => {
    if (!window.confirm(`Remove Learning Path "${title}" from this batch? All batch members without an individual direct grant will lose access.`)) return;

    try {
      const res = await fetch(`/api/admin/batches/${batchId}/learning-paths/${learningPathId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to revoke learning path");

      setSuccessMessage(`Learning Path "${title}" removed from batch.`);
      fetchAllDetails();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading batch details...</span>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Batch Not Found</h2>
        <button
          onClick={() => navigate("/admin/batches")}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl"
        >
          Return to Batches
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-7 space-y-5 min-w-0 font-sans pb-16">
      {/* Toast Notifications */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation & Batch Header */}
      <div>
        <div className="mb-2.5">
          <button
            onClick={() => navigate("/admin/batches")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Batches</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-6.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-13 h-13 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg uppercase shrink-0 shadow-xs">
              {batch.code.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {batch.name}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  {batch.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-300 text-xs">
                  {batch.code}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {batch.institutionName || "MR Technologies Academy"} ({batch.institutionCode || "MRTECH-MAIN"})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Academic Year: <strong className="text-slate-700 dark:text-slate-300">{batch.academicYear}</strong>
                </span>
                {batch.startDate && (
                  <>
                    <span>•</span>
                    <span>{batch.startDate} {batch.endDate ? `→ ${batch.endDate}` : ""}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800">
            <div className="text-right pr-5 border-r border-slate-200 dark:border-slate-800">
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {batchStudents.length}
                {batch.maxStudents ? ` / ${batch.maxStudents}` : ""}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Enrolled Students</div>
            </div>
            <div className="text-right pr-5 border-r border-slate-200 dark:border-slate-800">
              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {batchCourses.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Assigned Courses</div>
            </div>
            <div className="text-right pr-5 border-r border-slate-200 dark:border-slate-800">
              <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {batchLearningPaths.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Learning Paths</div>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {batchAssessments.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Assigned Exams</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl inline-flex flex-wrap gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab("students")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === "students"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Students ({batchStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("courses")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === "courses"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Courses ({batchCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("learning-paths")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === "learning-paths"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Learning Paths ({batchLearningPaths.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("assessments")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === "assessments"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Assessments ({batchAssessments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
            activeTab === "overview"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview & Info</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: STUDENTS (MULTI-BATCH MEMBERSHIP) */}
      {/* ===================================================================== */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search students in this batch by name or email..."
                className="w-full pl-10 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-2xs"
              />
            </div>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student to Batch</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No students enrolled in this batch</div>
                <div className="text-xs text-slate-500 max-w-md mx-auto">Click "Add Student to Batch" or use Bulk Assign from the batches page to enroll students.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-5 xl:px-6">Student</th>
                      <th className="py-3 px-5 xl:px-6">Enrolled Date</th>
                      <th className="py-3 px-5 xl:px-6">
                        Active Batch Memberships (Multi-Batch)
                      </th>
                      <th className="py-3 px-5 xl:px-6">Status</th>
                      <th className="py-3 px-5 xl:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-5 xl:px-6">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {student.studentName || "Unnamed Student"}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {student.studentEmail}
                          </div>
                        </td>

                        <td className="py-3 px-5 xl:px-6 text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {student.enrolledAt ? new Date(student.enrolledAt).toLocaleDateString() : "—"}
                        </td>

                        {/* Multi-Batch Badges (Unconstrained, spacious layout) */}
                        <td className="py-3 px-5 xl:px-6">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(student.batches || []).map(b => {
                              const isCurrent = b.id === batchId;
                              return (
                                <span
                                  key={b.id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded-md border transition-all ${
                                    isCurrent 
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 font-bold shadow-2xs" 
                                      : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                  }`}
                                  title={`${b.name} (${b.code})`}
                                >
                                  <span>{b.code}</span>
                                  {isCurrent && <span className="text-indigo-500 font-black">★ Current</span>}
                                </span>
                              );
                            })}
                            {(student.batches || []).length > 1 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                                {(student.batches || []).length} Cohorts
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-5 xl:px-6">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            {student.status}
                          </span>
                        </td>

                        <td className="py-3 px-5 xl:px-6 text-right">
                          <button
                            onClick={() => handleRemoveStudent(student.studentId, student.studentName || student.studentEmail || "student")}
                            title="Remove student from this batch"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: COURSES */}
      {/* ===================================================================== */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active batch students automatically receive course enrollment access for these assigned courses.
            </p>
            <button
              onClick={() => setShowAssignCourseModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Course to Batch</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {batchCourses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No courses assigned to this batch</div>
                <div className="text-xs text-slate-500 max-w-md mx-auto">Assign courses to provide curriculum access to all students in this cohort.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchCourses.map(course => (
                  <div key={course.id} className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      {course.courseThumbnail ? (
                        <img 
                          src={course.courseThumbnail} 
                          alt={course.courseTitle} 
                          className="w-16 h-11 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs" 
                        />
                      ) : (
                        <div className="w-16 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {course.courseTitle}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2.5">
                          <span>Assigned on: {new Date(course.assignedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold">Active for all {batchStudents.length} batch students</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        onClick={() => handleRevokeCourse(course.courseId, course.courseTitle || "Course")}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Course</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: LEARNING PATHS */}
      {/* ===================================================================== */}
      {activeTab === "learning-paths" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active batch students automatically receive structured access to these assigned Learning Paths, unless explicitly blocked.
            </p>
            <button
              onClick={() => setShowAssignLearningPathModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Learning Path to Batch</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {batchLearningPaths.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Compass className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No learning paths assigned to this batch</div>
                <div className="text-xs text-slate-500 max-w-md mx-auto">Assign full learning tracks with guided modules and assessments to this cohort.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchLearningPaths.map(lp => (
                  <div key={lp.id} className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {lp.learningPathTitle || lp.title || `Learning Path (${lp.learningPathId || lp.id})`}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2.5">
                          {lp.category && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">{lp.category}</span>}
                          <span>Assigned on: {lp.assignedAt ? new Date(lp.assignedAt).toLocaleDateString() : "Active"}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeLearningPath(lp.learningPathId || lp.id, lp.learningPathTitle || lp.title || "Learning Path")}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove from Batch</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ASSESSMENTS */}
      {/* ===================================================================== */}
      {activeTab === "assessments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign targeted assessments and exams to all students enrolled in this batch.
            </p>
            <button
              onClick={() => setShowAssignAssessmentModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Assessment to Batch</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {batchAssessments.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Award className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">No assessments assigned to this batch</div>
                <div className="text-xs text-slate-500 max-w-md mx-auto">Assign batch examinations to track performance across this student cohort.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchAssessments.map(assess => (
                  <div key={assess.id} className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {assess.assessmentTitle}
                        </h4>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2.5">
                          <span>Assigned on: {new Date(assess.assignedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeAssessment(assess.assessmentId, assess.assessmentTitle || "Assessment")}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Assessment</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: OVERVIEW & DETAILS (Responsive 3-column grid) */}
      {/* ===================================================================== */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Cohort Identifiers</span>
            </h3>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{batch.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Code:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-xs">{batch.code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{batch.department || "General / Technology"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-600 uppercase text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">{batch.status}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Institution & Academic Year</span>
            </h3>
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Institution:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {batch.institutionName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Institution Code:</span>
                <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{batch.institutionCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Academic Year:</span>
                <span className="font-bold text-slate-900 dark:text-white">{batch.academicYear}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Max Capacity:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {batch.maxStudents ? `${batch.maxStudents} seats` : "Unlimited"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 md:col-span-2 lg:col-span-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>Schedule & Curriculum</span>
            </h3>
            <div className="space-y-3.5 text-sm">
              <div>
                <span className="text-slate-500 block mb-1 text-xs font-semibold uppercase">Description:</span>
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                  {batch.description || "No specific cohort description registered."}
                </p>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Start Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{batch.startDate || "Continuous / Open"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">End Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{batch.endDate || "Ongoing"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD STUDENT */}
      {/* ========================================================================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Student to Batch</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Student *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Choose a student...</option>
                  {candidateStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  Multi-batch support: Even if this student is already in another batch, adding them here creates an additional simultaneous membership.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudentId || submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {submittingAction ? "Adding..." : "Add to Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN COURSE */}
      {/* ========================================================================= */}
      {showAssignCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Course to Batch</h3>
              <button onClick={() => setShowAssignCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Course *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Choose a course...</option>
                  {candidateCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  All {batchStudents.length} active students in this batch will immediately gain enrollment access to this course.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignCourseModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedCourseId || submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {submittingAction ? "Assigning..." : "Assign Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN LEARNING PATH */}
      {/* ========================================================================= */}
      {showAssignLearningPathModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Learning Path to Batch</h3>
              <button onClick={() => setShowAssignLearningPathModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignLearningPath} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Learning Path *
                </label>
                <select
                  value={selectedLearningPathId}
                  onChange={e => setSelectedLearningPathId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Choose a learning path...</option>
                  {candidateLearningPaths.map(lp => (
                    <option key={lp.id} value={lp.id}>{lp.title} {lp.category ? `(${lp.category})` : ""}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  All {batchStudents.length} students in this cohort will immediately gain access to this Learning Path unless an explicit individual denial is active.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignLearningPathModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedLearningPathId || submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {submittingAction ? "Assigning..." : "Assign Learning Path"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN ASSESSMENT */}
      {/* ========================================================================= */}
      {showAssignAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Assessment to Batch</h3>
              <button onClick={() => setShowAssignAssessmentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Assessment *
                </label>
                <select
                  value={selectedAssessmentId}
                  onChange={e => setSelectedAssessmentId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Choose an assessment...</option>
                  {candidateAssessments.map(a => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignAssessmentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedAssessmentId || submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {submittingAction ? "Assigning..." : "Assign Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
