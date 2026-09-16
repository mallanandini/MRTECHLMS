/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, BookOpen, Award, ShieldAlert, CheckCircle2, 
  XCircle, Search, ToggleLeft, ToggleRight, Star, ArrowRight,
  UserPlus, Upload, FileSpreadsheet, Download, RefreshCw,
  Key, Mail, UserCheck, AlertTriangle, Trash2, Plus, Filter,
  Lock, BookCheck, Shield, ChevronRight, X, Calendar, Clock,
  Layers, Video, Edit3, Sparkles
} from "lucide-react";
import * as XLSX from "xlsx";
import { User, Course, UserRole } from "../types.js";
import { CourseAuthoringStudio } from "./admin/CourseAuthoringStudio.js";

interface AdminConsoleProps {
  authToken: string;
  initialTab?: "users" | "access" | "courses";
}

export function AdminConsole({ authToken, initialTab = "users" }: AdminConsoleProps) {
  const [adminStats, setAdminStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>("all");
  const [authoringCourseId, setAuthoringCourseId] = useState<string | null>(null);
  
  const [activeSubTab, setActiveSubTab] = useState<"users" | "access" | "courses">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Single User Creation State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<UserRole>(UserRole.STUDENT);
  const [addStatus, setAddStatus] = useState<"active" | "suspended">("active");
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState("");
  const [addUserSuccess, setAddUserSuccess] = useState("");

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkValidationResult, setBulkValidationResult] = useState<{
    total: number;
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    rows: any[];
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Course Access Control State
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState<string>("");
  const [accessMessage, setAccessMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dedicated User Access Management Modal State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessModalStudent, setAccessModalStudent] = useState<User | null>(null);
  const [accessModalData, setAccessModalData] = useState<{
    student: any;
    courses: any[];
    assessments: any[];
  } | null>(null);
  const [accessModalLoading, setAccessModalLoading] = useState(false);
  const [accessModalSubTab, setAccessModalSubTab] = useState<"courses" | "assessments">("courses");
  const [accessModalMessage, setAccessModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [accessSearchQuery, setAccessSearchQuery] = useState("");

  const loadAdminDashboard = async () => {
    try {
      // Load stats
      const statsRes = await fetch("/api/admin/dashboard", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setAdminStats(stats);
      }

      // Load all users
      const usersRes = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
        if (!selectedStudentId) {
          const firstStudent = usersData.find((u: User) => u.role === UserRole.STUDENT);
          if (firstStudent) setSelectedStudentId(firstStudent.id);
        }
      }

      // Load all courses with authoring metrics
      const coursesRes = await fetch("/api/admin/courses", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      }
    } catch (e) {
      console.error("Error loading admin system configs", e);
    }
  };

  useEffect(() => {
    loadAdminDashboard();
  }, [authToken]);

  // Load student enrollments when selectedStudentId changes
  const loadStudentEnrollments = async (studentId: string) => {
    if (!studentId) return;
    setEnrollmentsLoading(true);
    setAccessMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${studentId}/enrollments`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentEnrollments(data);
      }
    } catch (err) {
      console.error("Error loading student enrollments", err);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId && activeSubTab === "access") {
      loadStudentEnrollments(selectedStudentId);
    }
  }, [selectedStudentId, activeSubTab]);

  const handleToggleUserStatus = async (userId: string, currentStatus: "active" | "suspended") => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        loadAdminDashboard();
      }
    } catch (err) {
      console.error("Error toggling user status", err);
    }
  };

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
        loadAdminDashboard();
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
        loadAdminDashboard();
      }
    } catch (err) {
      console.error("Error toggling course featured", err);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}" and all its modules, lessons, and practice tests? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        loadAdminDashboard();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete course");
      }
    } catch (err) {
      console.error("Error deleting course", err);
      alert("Error deleting course");
    }
  };

  // Single User Creation Handler
  const handleCreateSingleUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError("");
    setAddUserSuccess("");

    if (!addName.trim() || !addEmail.trim() || !addPassword) {
      setAddUserError("Please fill out all required fields.");
      return;
    }

    if (addPassword.length < 6) {
      setAddUserError("Password must be at least 6 characters long.");
      return;
    }

    setAddUserLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
          status: addStatus
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAddUserSuccess(`User ${data.name} (${data.role}) created successfully!`);
        setAddName("");
        setAddEmail("");
        setAddPassword("");
        setAddRole(UserRole.STUDENT);
        setAddStatus("active");
        loadAdminDashboard();
      } else {
        setAddUserError(data.error || "Failed to create user");
      }
    } catch (err) {
      setAddUserError("Network error. Please try again.");
    } finally {
      setAddUserLoading(false);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/admin/users/template", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to generate template");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading template", err);
      alert("Error downloading template spreadsheet.");
    }
  };

  // Process uploaded Excel file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError("");
    setBulkSuccess("");
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
        setBulkError("Spreadsheet is empty. Please add rows to import.");
        setBulkLoading(false);
        return;
      }

      // Send to server for authoritative duplicate & validation check against database
      const res = await fetch("/api/admin/users/bulk-validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
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

  // Execute Bulk Import of Valid Rows
  const handleExecuteBulkImport = async () => {
    if (!bulkValidationResult || bulkValidationResult.validCount === 0) return;

    const validRows = bulkValidationResult.rows.filter(r => r.isValid);
    setBulkLoading(true);
    setBulkError("");
    setBulkSuccess("");

    try {
      const res = await fetch("/api/admin/users/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ rows: validRows })
      });

      if (res.ok) {
        const result = await res.json();
        setBulkSuccess(`Successfully imported and created ${result.importedCount} student account(s) with bcrypt password hashing!`);
        setBulkValidationResult(null);
        setBulkFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setBulkError(err.error || "Bulk import failed.");
      }
    } catch (err) {
      setBulkError("Network error during import. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Course Access: Grant Access
  const handleGrantCourseAccess = async () => {
    if (!selectedStudentId || !selectedCourseToGrant) return;
    setAccessMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedStudentId}/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ courseId: selectedCourseToGrant })
      });

      if (res.ok) {
        const grantedCourse = courses.find(c => c.id === selectedCourseToGrant);
        setAccessMessage({ 
          type: "success", 
          text: `Access to "${grantedCourse?.title || 'course'}" granted successfully!` 
        });
        setSelectedCourseToGrant("");
        loadStudentEnrollments(selectedStudentId);
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setAccessMessage({ type: "error", text: err.error || "Failed to grant access." });
      }
    } catch (err) {
      setAccessMessage({ type: "error", text: "Network error granting course access." });
    }
  };

  // Course Access: Revoke Access
  const handleRevokeCourseAccess = async (courseId: string, courseTitle: string) => {
    if (!selectedStudentId || !confirm(`Revoke access to "${courseTitle}" for this student?`)) return;
    setAccessMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedStudentId}/enrollments/${courseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });

      if (res.ok) {
        setAccessMessage({ 
          type: "success", 
          text: `Access to "${courseTitle}" revoked successfully.` 
        });
        loadStudentEnrollments(selectedStudentId);
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setAccessMessage({ type: "error", text: err.error || "Failed to revoke access." });
      }
    } catch (err) {
      setAccessMessage({ type: "error", text: "Network error revoking course access." });
    }
  };

  // User Access Modal Handlers
  const handleOpenAccessModal = async (student: User) => {
    setAccessModalStudent(student);
    setShowAccessModal(true);
    setAccessModalMessage(null);
    setAccessSearchQuery("");
    setAccessModalSubTab("courses");
    await loadAccessModalData(student.id);
  };

  const loadAccessModalData = async (studentId: string) => {
    setAccessModalLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${studentId}/access`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccessModalData(data);
      }
    } catch (err) {
      console.error("Failed to load student access details", err);
    } finally {
      setAccessModalLoading(false);
    }
  };

  const handleGrantCourseInModal = async (courseId: string, courseTitle: string) => {
    if (!accessModalStudent) return;
    setAccessModalMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${accessModalStudent.id}/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ courseId })
      });
      if (res.ok) {
        setAccessModalMessage({
          type: "success",
          text: `Access to course "${courseTitle}" granted successfully!`
        });
        await loadAccessModalData(accessModalStudent.id);
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setAccessModalMessage({ type: "error", text: err.error || "Failed to grant course access." });
      }
    } catch (err) {
      setAccessModalMessage({ type: "error", text: "Network error granting course access." });
    }
  };

  const handleRevokeCourseInModal = async (courseId: string, courseTitle: string) => {
    if (!accessModalStudent) return;
    setAccessModalMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${accessModalStudent.id}/enrollments/${courseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        setAccessModalMessage({
          type: "success",
          text: `Access to course "${courseTitle}" revoked successfully.`
        });
        await loadAccessModalData(accessModalStudent.id);
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setAccessModalMessage({ type: "error", text: err.error || "Failed to revoke course access." });
      }
    } catch (err) {
      setAccessModalMessage({ type: "error", text: "Network error revoking course access." });
    }
  };

  const handleGrantAssessmentInModal = async (assessmentId: string, assessmentTitle: string) => {
    if (!accessModalStudent) return;
    setAccessModalMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${accessModalStudent.id}/assessment-access/${assessmentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        setAccessModalMessage({
          type: "success",
          text: `Access to assessment "${assessmentTitle}" granted successfully!`
        });
        await loadAccessModalData(accessModalStudent.id);
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setAccessModalMessage({ type: "error", text: err.error || "Failed to grant assessment access." });
      }
    } catch (err) {
      setAccessModalMessage({ type: "error", text: "Network error granting assessment access." });
    }
  };

  const handleRevokeAssessmentInModal = async (assessmentId: string, assessmentTitle: string) => {
    if (!accessModalStudent) return;
    setAccessModalMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${accessModalStudent.id}/assessment-access/${assessmentId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        setAccessModalMessage({
          type: "success",
          text: `Access to assessment "${assessmentTitle}" revoked successfully.`
        });
        await loadAccessModalData(accessModalStudent.id);
        loadAdminDashboard();
      } else {
        const err = await res.json();
        setAccessModalMessage({ type: "error", text: err.error || "Failed to revoke assessment access." });
      }
    } catch (err) {
      setAccessModalMessage({ type: "error", text: "Network error revoking assessment access." });
    }
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const studentsList = users.filter(u => u.role === UserRole.STUDENT);
  const selectedStudent = users.find(u => u.id === selectedStudentId);

  // Available courses for assignment (published courses not currently enrolled)
  const enrolledCourseIdSet = new Set(studentEnrollments.map(e => e.courseId));
  const availableCoursesToGrant = courses.filter(c => c.status === "published" && !enrolledCourseIdSet.has(c.id));

  // If Course Authoring Studio is active, render dedicated Studio workspace
  if (authoringCourseId !== null) {
    return (
      <CourseAuthoringStudio
        courseId={authoringCourseId}
        authToken={authToken}
        onBack={() => {
          setAuthoringCourseId(null);
          loadAdminDashboard();
        }}
        onCourseSaved={() => {
          loadAdminDashboard();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin KPI Panel */}
      {adminStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Total Students</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.studentsCount}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Total Trainers</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.trainersCount}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Platform Courses</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.coursesCount}</p>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Exam Submissions</p>
              <p className="text-2xl font-extrabold text-gray-950 font-mono">{adminStats.submissionsCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Directory & Access Management Interface */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
        {/* Navigation Tabs & Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveSubTab("users"); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "users" 
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("access"); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "access" 
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Course Access Control</span>
            </button>
            <button
              onClick={() => { setActiveSubTab("courses"); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "courses" 
                  ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Course Management & Authoring</span>
            </button>
          </div>

          {/* User Directory Action Buttons */}
          {activeSubTab === "users" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setAddUserError("");
                  setAddUserSuccess("");
                  setShowAddUserModal(true);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
              <button
                onClick={() => {
                  setBulkError("");
                  setBulkSuccess("");
                  setBulkValidationResult(null);
                  setShowBulkModal(true);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Import (.xlsx)</span>
              </button>
            </div>
          )}

          {/* Courses Action Buttons */}
          {activeSubTab === "courses" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAuthoringCourseId("new")}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create New Course</span>
              </button>
            </div>
          )}
        </div>

        {/* SUBTAB 1: USER DIRECTORY */}
        {activeSubTab === "users" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or email..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="trainer">Trainers</option>
                  <option value="admin">Admins</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Users Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Platform Role</th>
                    <th className="py-3 px-4">System Status</th>
                    <th className="py-3 px-4">Assigned Courses</th>
                    <th className="py-3 px-4">Assessments</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                        No users found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                            <p className="text-gray-400 font-mono text-[11px] mt-0.5">{u.email}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            u.role === UserRole.ADMIN 
                              ? "bg-amber-50 text-amber-700 border border-amber-200/60" 
                              : u.role === UserRole.TRAINER
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-blue-50 text-blue-700 border border-blue-200/60"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                            u.status === "active" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {u.assignedCoursesCount ?? 0} {u.assignedCoursesCount === 1 ? "course" : "courses"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          <span className="font-bold text-slate-800">{u.assignedAssessmentsCount ?? 0}</span> assigned
                          {u.completedAssessmentsCount ? ` (${u.completedAssessmentsCount} passed)` : ""}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.role === UserRole.STUDENT && (
                              <button
                                onClick={() => handleOpenAccessModal(u)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Manage User Access"
                              >
                                <Lock className="w-3 h-3 text-blue-500" />
                                <span>Access</span>
                              </button>
                            )}
                            {u.role !== UserRole.ADMIN && (
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.status)}
                                className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer ${
                                  u.status === "active"
                                    ? "bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100"
                                    : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {u.status === "active" ? "Suspend" : "Activate"}
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
        )}

        {/* SUBTAB 2: COURSE ACCESS CONTROL */}
        {activeSubTab === "access" && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Admin Course Access Management
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a student to inspect their active course enrollments, grant access to new courses, or revoke existing access.
                </p>
              </div>

              {/* Student Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-600 uppercase font-mono tracking-wider shrink-0">Student:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full sm:w-64 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Choose a Student --</option>
                  {studentsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Access Status Notification */}
            {accessMessage && (
              <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                accessMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                {accessMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{accessMessage.text}</span>
              </div>
            )}

            {selectedStudent ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Currently Enrolled Courses */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                      Currently Assigned Courses ({studentEnrollments.length})
                    </h5>
                    <span className="text-[11px] font-mono text-slate-400">
                      for {selectedStudent.name}
                    </span>
                  </div>

                  {enrollmentsLoading ? (
                    <div className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      <p className="text-xs">Loading course enrollments...</p>
                    </div>
                  ) : studentEnrollments.length === 0 ? (
                    <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                      <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">No active course enrollments</p>
                      <p className="text-[11px] text-slate-400">This student does not have access to any platform courses yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase font-mono text-[10px] border-b border-slate-100">
                            <th className="py-2.5 px-3">Course Title</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Instructor</th>
                            <th className="py-2.5 px-3">Enrolled At</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentEnrollments.map((en) => (
                            <tr key={en.enrollmentId} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-bold text-slate-900">{en.courseTitle}</td>
                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{en.category}</td>
                              <td className="py-3 px-3 text-slate-600">{en.instructorName}</td>
                              <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">
                                {new Date(en.enrolledAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleRevokeCourseAccess(en.courseId, en.courseTitle)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 rounded text-[10px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                                  title="Revoke student course access"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Revoke</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right 1 Col: Grant Course Access Card */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase font-mono tracking-wider">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Grant Course Access</span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select a published course from the catalog to grant full syllabus and assessment access to <strong className="text-slate-800">{selectedStudent.name}</strong>.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase font-mono tracking-wider block mb-1">
                        Available Courses
                      </label>
                      <select
                        value={selectedCourseToGrant}
                        onChange={(e) => setSelectedCourseToGrant(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">-- Select Course --</option>
                        {availableCoursesToGrant.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleGrantCourseAccess}
                      disabled={!selectedCourseToGrant}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Grant Access to Student</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Please select a student from above to manage their course access.</p>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: COURSE CATALOG & AUTHORING MANAGEMENT */}
        {activeSubTab === "courses" && (
          <div className="space-y-4">
            {/* Search & Status Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    placeholder="Search courses by title or category..."
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(["all", "published", "draft", "archived"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setCourseStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                      courseStatusFilter === st
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {st === "all" ? "All Courses" : st}
                    <span className="ml-1.5 text-[10px] opacity-70 font-mono">
                      ({st === "all" ? courses.length : courses.filter(c => c.status === st).length})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Courses Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono bg-slate-50/70">
                    <th className="py-3 px-4">Course Info</th>
                    <th className="py-3 px-4">Category / Level</th>
                    <th className="py-3 px-4">Curriculum Structure</th>
                    <th className="py-3 px-4">Enrolled Students</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs bg-white">
                  {courses
                    .filter(c => {
                      const matchesSearch = !courseSearchQuery || 
                        c.title.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
                        c.category?.toLowerCase().includes(courseSearchQuery.toLowerCase());
                      const matchesStatus = courseStatusFilter === "all" || c.status === courseStatusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={c.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"} 
                              alt={c.title}
                              className="w-12 h-8 rounded-lg object-cover border border-slate-200 shrink-0" 
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-xs">{c.title}</p>
                              {c.shortDescription ? (
                                <p className="text-slate-400 text-[11px] truncate max-w-xs">{c.shortDescription}</p>
                              ) : (
                                <p className="text-slate-400 text-[11px]">Instructor: {c.instructorName || "Admin"}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-semibold text-slate-700">{c.category || "General"}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{c.difficulty || "Beginner"}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11px] text-slate-600 font-mono">
                            <span className="flex items-center gap-1 font-semibold text-blue-700">
                              <Layers className="w-3 h-3 text-blue-500" />
                              {c.modulesCount || 0} Modules • {c.lessonsCount || 0} Lessons
                            </span>
                            <span className="flex items-center gap-1 text-emerald-700">
                              <Award className="w-3 h-3 text-emerald-500" />
                              {c.assessmentsCount || 0} Practice Tests / Exam
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold font-mono">
                            <Users className="w-3 h-3" />
                            {c.studentsCount || 0} Students
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                            c.status === "published"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : c.status === "draft"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              c.status === "published" ? "bg-emerald-500" : c.status === "draft" ? "bg-amber-500" : "bg-slate-400"
                            }`} />
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setAuthoringCourseId(c.id)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                              title="Open Course Authoring Studio (Modules, Lessons, Tests)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit / Build Content</span>
                            </button>
                            <button
                              onClick={() => handleToggleFeatured(c.id, c.isFeatured)}
                              className={`p-1.5 border rounded-xl transition cursor-pointer ${
                                c.isFeatured 
                                  ? "bg-amber-50 border-amber-200 text-amber-600" 
                                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
                              }`}
                              title={c.isFeatured ? "Unfeature Course" : "Feature Course"}
                            >
                              <Star className={`w-3.5 h-3.5 ${c.isFeatured ? "fill-amber-400" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleToggleCourseStatus(c.id, c.status)}
                              className={`px-2.5 py-1.5 border rounded-xl text-[11px] font-bold transition cursor-pointer ${
                                c.status === "published"
                                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={c.status === "published" ? "Unpublish to Draft" : "Publish Course"}
                            >
                              {c.status === "published" ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(c.id, c.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
                              title="Delete Course and All Content"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {courses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700">No courses available in catalog.</p>
                        <button
                          onClick={() => setAuthoringCourseId("new")}
                          className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Create Your First Course</span>
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD SINGLE USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span>Create New User Account</span>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{addUserError}</span>
              </div>
            )}

            {addUserSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{addUserSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSingleUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase font-mono tracking-wider block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase font-mono tracking-wider block mb-1">Email Address *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. john.doe@example.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase font-mono tracking-wider block mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Password will be hashed with bcryptjs (cost factor 10).</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase font-mono tracking-wider block mb-1">Platform Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={UserRole.STUDENT}>Student</option>
                    <option value={UserRole.TRAINER}>Trainer</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase font-mono tracking-wider block mb-1">Status</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as "active" | "suspended")}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-sm shadow-blue-500/10 cursor-pointer"
                >
                  {addUserLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK EXCEL IMPORT */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bulk Student Import (Excel .xlsx)</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Batch create student accounts with automatic bcrypt password hashing</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bulkError}</span>
              </div>
            )}

            {bulkSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{bulkSuccess}</span>
              </div>
            )}

            {/* Step 1 & 2: Template Download & File Select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase font-mono tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                  Step 1
                </span>
                <h5 className="font-bold text-slate-800 text-xs">Download Template</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Get the official spreadsheet with pre-formatted column headers: <code className="text-slate-700 bg-slate-200/60 px-1 rounded">fullName</code>, <code className="text-slate-700 bg-slate-200/60 px-1 rounded">email</code>, <code className="text-slate-700 bg-slate-200/60 px-1 rounded">password</code>, <code className="text-slate-700 bg-slate-200/60 px-1 rounded">status</code>.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-2 w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Download .xlsx Template</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                  Step 2
                </span>
                <h5 className="font-bold text-slate-800 text-xs">Upload Spreadsheet</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Upload your completed Excel workbook (<code className="text-slate-700">.xlsx</code>). The system validates all rows and prevents duplicates.
                </p>
                <label className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{bulkFileName ? "Choose Another File" : "Select .xlsx File"}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {bulkLoading && (
              <div className="p-6 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-semibold">Validating and checking database records...</p>
              </div>
            )}

            {/* Step 3: Validation Preview */}
            {bulkValidationResult && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                    Validation Preview: {bulkFileName}
                  </h5>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {bulkValidationResult.total} rows parsed
                  </span>
                </div>

                {/* Counter Pills */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-100 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Rows</p>
                    <p className="text-lg font-extrabold text-slate-900 font-mono">{bulkValidationResult.total}</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 font-mono">Valid</p>
                    <p className="text-lg font-extrabold text-emerald-800 font-mono">{bulkValidationResult.validCount}</p>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200/60 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-rose-600 font-mono">Invalid</p>
                    <p className="text-lg font-extrabold text-rose-800 font-mono">{bulkValidationResult.invalidCount}</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200/60 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-amber-600 font-mono">Duplicates</p>
                    <p className="text-lg font-extrabold text-amber-800 font-mono">{bulkValidationResult.duplicateCount}</p>
                  </div>
                </div>

                {/* Table of Parsed Records */}
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Full Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Validation Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkValidationResult.rows.map((row) => (
                        <tr key={row.rowNumber} className={row.isValid ? "hover:bg-slate-50/50" : "bg-rose-50/40"}>
                          <td className="py-2 px-3 font-mono text-slate-400">{row.rowNumber}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{row.fullName || "—"}</td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{row.email || "—"}</td>
                          <td className="py-2 px-3">
                            <span className="text-[9px] font-mono font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Ready to Import
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                                <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                {row.errors.join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Step 4: Confirm Import Button */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkValidationResult(null);
                      setBulkFileName("");
                    }}
                    className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkImport}
                    disabled={bulkValidationResult.validCount === 0 || bulkLoading}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/10 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import {bulkValidationResult.validCount} Valid Student(s)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: DEDICATED USER ACCESS MANAGEMENT MODAL */}
      {showAccessModal && accessModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">User Access Management</h3>
                  <p className="text-[11px] text-slate-500">Administer course enrollments and assessment permissions</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAccessModal(false);
                  setAccessModalStudent(null);
                  setAccessModalData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Information Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-100 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-extrabold text-slate-900">{accessModalStudent.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono tracking-wider ${
                      accessModalStudent.status === "active" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {accessModalStudent.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                      {accessModalStudent.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1.5 font-mono text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {accessModalStudent.email}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Joined {new Date(accessModalStudent.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Quick Stats Badges */}
                {accessModalData && (
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-center shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 font-mono uppercase block">Assigned Courses</span>
                      <span className="text-xs font-extrabold text-blue-700 font-mono">
                        {accessModalData.courses.filter(c => c.isAssigned).length} / {accessModalData.courses.length}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-center shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 font-mono uppercase block">Assessments</span>
                      <span className="text-xs font-extrabold text-violet-700 font-mono">
                        {accessModalData.assessments.filter(a => a.isAssigned).length} / {accessModalData.assessments.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-tab Navigation & Search */}
            <div className="px-4 sm:px-5 pt-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAccessModalSubTab("courses")}
                  className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    accessModalSubTab === "courses"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Course Access</span>
                  {accessModalData && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold">
                      {accessModalData.courses.filter(c => c.isAssigned).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAccessModalSubTab("assessments")}
                  className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    accessModalSubTab === "assessments"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Assessment Access</span>
                  {accessModalData && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full font-bold">
                      {accessModalData.assessments.filter(a => a.isAssigned).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="pb-2.5">
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={accessModalSubTab === "courses" ? "Filter courses..." : "Filter assessments..."}
                    value={accessSearchQuery}
                    onChange={(e) => setAccessSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Notification Banner */}
            {accessModalMessage && (
              <div className={`mx-4 sm:mx-5 mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 ${
                accessModalMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                {accessModalMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{accessModalMessage.text}</span>
              </div>
            )}

            {/* Content Scroll Area */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {accessModalLoading ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                  <p className="text-xs">Loading access permissions...</p>
                </div>
              ) : !accessModalData ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No access data available.
                </div>
              ) : accessModalSubTab === "courses" ? (
                /* COURSES ACCESS TABLE */
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase font-mono text-[10px] border-b border-slate-100">
                        <th className="py-3 px-4">Course Title</th>
                        <th className="py-3 px-4">Course Status</th>
                        <th className="py-3 px-4">Assigned Date</th>
                        <th className="py-3 px-4">Access Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accessModalData.courses
                        .filter(c => 
                          c.title.toLowerCase().includes(accessSearchQuery.toLowerCase()) ||
                          c.category.toLowerCase().includes(accessSearchQuery.toLowerCase())
                        )
                        .map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-xs">{course.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{course.category}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                                course.status === "published"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {course.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                              {course.assignedDate ? new Date(course.assignedDate).toLocaleDateString() : "—"}
                            </td>
                            <td className="py-3 px-4">
                              {course.isAssigned ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  ASSIGNED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 font-mono">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  NOT ASSIGNED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {course.isAssigned ? (
                                <button
                                  onClick={() => handleRevokeCourseInModal(course.id, course.title)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                                  title="Revoke course access"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Revoke Access</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGrantCourseInModal(course.id, course.title)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer shadow-xs"
                                  title="Grant course access"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Grant Access</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ASSESSMENTS ACCESS TABLE */
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase font-mono text-[10px] border-b border-slate-100">
                        <th className="py-3 px-4">Assessment Title</th>
                        <th className="py-3 px-4">Associated Course</th>
                        <th className="py-3 px-4">Duration & Passing</th>
                        <th className="py-3 px-4">Access Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accessModalData.assessments
                        .filter(a => 
                          a.title.toLowerCase().includes(accessSearchQuery.toLowerCase()) ||
                          a.courseTitle.toLowerCase().includes(accessSearchQuery.toLowerCase())
                        )
                        .map((assessment) => (
                          <tr key={assessment.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-xs">{assessment.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {assessment.questionsCount} Questions • {assessment.totalPoints} Total Points
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-700 text-xs">{assessment.courseTitle}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                              <span>{assessment.durationMinutes} mins</span> • <span className="font-bold text-violet-700">{assessment.passingScore}% pass</span>
                            </td>
                            <td className="py-3 px-4">
                              {assessment.isAssigned ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  ASSIGNED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 font-mono">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  NOT ASSIGNED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {assessment.isAssigned ? (
                                <button
                                  onClick={() => handleRevokeAssessmentInModal(assessment.id, assessment.title)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                                  title="Revoke assessment access"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Revoke Access</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGrantAssessmentInModal(assessment.id, assessment.title)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 ml-auto cursor-pointer shadow-xs"
                                  title="Grant assessment access"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Grant Access</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setShowAccessModal(false);
                  setAccessModalStudent(null);
                  setAccessModalData(null);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
