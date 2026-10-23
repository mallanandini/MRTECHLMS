/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, Plus, Search, Filter, RefreshCw, Upload, Download, 
  Building2, Users, BookOpen, Award, CheckCircle2, AlertCircle, 
  Calendar, Edit, Trash2, ArrowRight, X, FileSpreadsheet, AlertTriangle, ChevronDown,
  FolderTree, List, CheckSquare, Square, ChevronRight, BookCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { 
  Institution, Batch, BatchExcelPreviewRow, BatchStudentAssignPreviewRow, Course,
  BatchHierarchyInstitution, BatchHierarchyYear 
} from "../../types.js";

export function AdminBatchesPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  // View Mode: "tree" (Cohort Hierarchy) | "table"
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [hierarchy, setHierarchy] = useState<BatchHierarchyInstitution[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Data states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchForm, setBatchForm] = useState({
    name: "",
    code: "",
    institutionId: "",
    academicYear: "2024-2025",
    courseId: "",
    startDate: "",
    endDate: "",
    maxStudents: "",
    description: "",
    status: "active" as "active" | "inactive" | "archived"
  });

  // Bulk Upload Batches Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<{
    isValid: boolean;
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: BatchExcelPreviewRow[];
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Bulk Assign Students Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFile, setAssignFile] = useState<File | null>(null);
  const [assignPreview, setAssignPreview] = useState<{
    isValid: boolean;
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: BatchStudentAssignPreviewRow[];
  } | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Bulk Assign Courses Modal
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [assignCourseBatchId, setAssignCourseBatchId] = useState<string>("");
  const [assignCourseSelectedIds, setAssignCourseSelectedIds] = useState<string[]>([]);
  const [assignCourseSearch, setAssignCourseSearch] = useState<string>("");
  const [assigningCourses, setAssigningCourses] = useState(false);

  // Manage Institutions Modal
  const [showInstModal, setShowInstModal] = useState(false);
  const [instForm, setInstForm] = useState({
    name: "",
    code: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    academicYears: "2023-2024, 2024-2025, 2025-2026, 2026-2027, 2027-2028"
  });
  const [submittingInst, setSubmittingInst] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchInstitutions();
    fetchCourses();
  }, [authToken]);

  useEffect(() => {
    fetchBatches();
  }, [authToken, selectedInstitution, selectedAcademicYear, selectedStatus, searchTerm]);

  const fetchInstitutions = async () => {
    try {
      const res = await fetch("/api/admin/institutions", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInstitutions(data);
        if (data.length > 0 && !batchForm.institutionId) {
          setBatchForm(prev => ({ ...prev, institutionId: data[0].id }));
        }
      }
    } catch (err) {
      console.error("Error fetching institutions:", err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (selectedInstitution !== "all") params.append("institutionId", selectedInstitution);
      if (selectedAcademicYear !== "all") params.append("academicYear", selectedAcademicYear);
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const res = await fetch(`/api/batches?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to load batches");

      const data = await res.json();
      setBatches(data.batches || []);
      setTotalCount(data.total || 0);

      if (data.hierarchy && Array.isArray(data.hierarchy)) {
        setHierarchy(data.hierarchy);
        // Default expand all institutions and years on initial load
        setExpandedNodes(prev => {
          const next = { ...prev };
          data.hierarchy.forEach((inst: any) => {
            if (next[`inst-${inst.id}`] === undefined) next[`inst-${inst.id}`] = true;
            inst.years?.forEach((yr: any) => {
              if (next[`year-${inst.id}-${yr.year}`] === undefined) next[`year-${inst.id}-${yr.year}`] = true;
            });
          });
          return next;
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleAssignCoursesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCourseBatchId) {
      setErrorMessage("Please select a target batch.");
      return;
    }
    if (assignCourseSelectedIds.length === 0) {
      setErrorMessage("Please select at least one course to assign.");
      return;
    }

    setAssigningCourses(true);
    try {
      const res = await fetch("/api/batches/assign-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          batchId: assignCourseBatchId,
          courseIds: assignCourseSelectedIds
        })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to assign courses to batch");

      const result = await res.json();
      setSuccessMessage(`Successfully assigned ${result.assignedCount} courses to cohort! Active batch students have been granted access.`);
      setShowAssignCourseModal(false);
      setAssignCourseBatchId("");
      setAssignCourseSelectedIds([]);
      fetchBatches();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAssigningCourses(false);
    }
  };

  // Filtered cohort tree hierarchy
  const filteredHierarchy = useMemo(() => {
    return hierarchy.map(inst => {
      if (selectedInstitution !== "all" && inst.id !== selectedInstitution) {
        return null;
      }

      const filteredYears = (inst.years || []).map(yr => {
        if (selectedAcademicYear !== "all" && yr.year !== selectedAcademicYear) {
          return null;
        }

        const filteredBatches = yr.batches.filter(b => {
          if (selectedStatus !== "all" && b.status !== selectedStatus) return false;
          if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            const matchesName = b.name.toLowerCase().includes(q);
            const matchesCode = b.code.toLowerCase().includes(q);
            const matchesDesc = (b.description || "").toLowerCase().includes(q);
            const matchesStudent = (b.students || []).some((s: any) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
            const matchesCourse = (b.courses || []).some((c: any) => c.title?.toLowerCase().includes(q));
            return matchesName || matchesCode || matchesDesc || matchesStudent || matchesCourse;
          }
          return true;
        });

        if (filteredBatches.length === 0) return null;
        return {
          ...yr,
          batches: filteredBatches
        };
      }).filter(Boolean) as BatchHierarchyYear[];

      if (filteredYears.length === 0) return null;
      return {
        ...inst,
        years: filteredYears
      };
    }).filter(Boolean) as BatchHierarchyInstitution[];
  }, [hierarchy, selectedInstitution, selectedAcademicYear, selectedStatus, searchTerm]);

  // Collect unique academic years from institutions and batches
  const availableAcademicYears = useMemo(() => {
    const set = new Set<string>(["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"]);
    institutions.forEach(i => (i.academicYears || []).forEach(y => set.add(y)));
    batches.forEach(b => { if (b.academicYear) set.add(b.academicYear); });
    return Array.from(set).sort().reverse();
  }, [institutions, batches]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalBatches = batches.length;
    const activeBatches = batches.filter(b => b.status === "active").length;
    const totalStudents = batches.reduce((acc, b) => acc + (b.studentCount || 0), 0);
    const totalCoursesAssigned = batches.reduce((acc, b) => acc + (b.courseCount || 0), 0);
    return { totalBatches, activeBatches, totalStudents, totalCoursesAssigned };
  }, [batches]);

  // Handlers for Add/Edit Batch
  const handleOpenAddBatch = () => {
    setEditingBatch(null);
    setBatchForm({
      name: "",
      code: "",
      institutionId: institutions[0]?.id || "",
      academicYear: "2024-2025",
      courseId: "",
      startDate: "",
      endDate: "",
      maxStudents: "",
      description: "",
      status: "active"
    });
    setShowBatchModal(true);
  };

  const handleOpenEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setBatchForm({
      name: batch.name,
      code: batch.code,
      institutionId: batch.institutionId,
      academicYear: batch.academicYear,
      courseId: batch.courseId || "",
      startDate: batch.startDate || "",
      endDate: batch.endDate || "",
      maxStudents: batch.maxStudents ? String(batch.maxStudents) : "",
      description: batch.description || "",
      status: batch.status
    });
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name.trim() || !batchForm.code.trim() || !batchForm.institutionId) {
      setErrorMessage("Please fill all required fields (Name, Code, Institution).");
      return;
    }

    try {
      const payload: any = {
        name: batchForm.name.trim(),
        code: batchForm.code.trim().toUpperCase(),
        institutionId: batchForm.institutionId,
        academicYear: batchForm.academicYear,
        courseId: batchForm.courseId || null,
        startDate: batchForm.startDate || null,
        endDate: batchForm.endDate || null,
        maxStudents: batchForm.maxStudents ? Number(batchForm.maxStudents) : null,
        description: batchForm.description?.trim() || null,
        status: batchForm.status
      };

      const url = editingBatch ? `/api/admin/batches/${editingBatch.id}` : "/api/admin/batches";
      const method = editingBatch ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to save batch");

      setSuccessMessage(editingBatch ? "Batch updated successfully!" : "Batch created successfully!");
      setShowBatchModal(false);
      fetchBatches();
      fetchInstitutions();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteBatch = async (batch: Batch) => {
    if (!window.confirm(`Are you sure you want to archive batch "${batch.name}" (${batch.code})?`)) return;
    try {
      const res = await fetch(`/api/admin/batches/${batch.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to archive batch");

      setSuccessMessage("Batch archived successfully.");
      fetchBatches();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Bulk Batches File Selection & Preview
  const handleBatchFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/batches/excel/preview", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to parse batch excel file");

      const previewData = await res.json();
      setUploadPreview(previewData);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImportBatches = async () => {
    if (!uploadPreview || uploadPreview.validCount === 0) return;
    setUploading(true);
    try {
      const res = await fetch("/api/admin/batches/excel/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ rows: uploadPreview.rows })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to import batches");

      const result = await res.json();
      setSuccessMessage(`Successfully imported ${result.importedCount} batches!`);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadPreview(null);
      fetchBatches();
      fetchInstitutions();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Bulk Students File Selection & Preview
  const handleAssignFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssignFile(file);
    setAssignPreview(null);
    setAssigning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/batches/excel/student-preview", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to parse student assignment file");

      const previewData = await res.json();
      setAssignPreview(previewData);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleImportStudentAssignments = async () => {
    if (!assignPreview || assignPreview.validCount === 0) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/batches/excel/student-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ rows: assignPreview.rows })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to assign students");

      const result = await res.json();
      setSuccessMessage(`Successfully assigned ${result.assignedCount} student batch memberships!`);
      setShowAssignModal(false);
      setAssignFile(null);
      setAssignPreview(null);
      fetchBatches();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Manage Institution Handler
  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instForm.name.trim() || !instForm.code.trim()) {
      setErrorMessage("Institution name and code are required.");
      return;
    }

    setSubmittingInst(true);
    try {
      const years = instForm.academicYears
        .split(",")
        .map(y => y.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: instForm.name.trim(),
          code: instForm.code.trim().toUpperCase(),
          contactEmail: instForm.contactEmail.trim() || null,
          contactPhone: instForm.contactPhone.trim() || null,
          address: instForm.address.trim() || null,
          academicYears: years
        })
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to create institution");

      setSuccessMessage("Institution created successfully!");
      setInstForm({
        name: "",
        code: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        academicYears: "2023-2024, 2024-2025, 2025-2026, 2026-2027, 2027-2028"
      });
      fetchInstitutions();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingInst(false);
    }
  };

  // Download Excel template helper
  const handleDownloadTemplate = (type: "batch" | "student") => {
    const endpoint = type === "batch" 
      ? "/api/admin/batches/excel/template" 
      : "/api/admin/batches/excel/student-template";

    fetch(endpoint, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = type === "batch" ? "batch_import_template.xlsx" : "student_batch_assignment_template.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => setErrorMessage(`Failed to download template: ${err.message}`));
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-7 space-y-5 min-w-0 font-sans pb-16">
      {/* Toast Messages */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner: Text and description above, action buttons below */}
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Top: Icon, Title, Badge, and Full Description Paragraph */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                Batch Management
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                Academic Cohorts
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-4xl">
              Organize students into institutional batches, track academic years, and assign courses & assessments with multi-source access protection.
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar: Placed directly below the description paragraph */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={() => setShowInstModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Institutions ({institutions.length})</span>
          </button>

          <button
            onClick={() => {
              setShowAssignModal(true);
              setAssignFile(null);
              setAssignPreview(null);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bulk Assign Students</span>
          </button>

          <button
            onClick={() => {
              setAssignCourseBatchId(batches[0]?.id || "");
              setAssignCourseSelectedIds([]);
              setShowAssignCourseModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Bulk Assign Courses</span>
          </button>

          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadFile(null);
              setUploadPreview(null);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bulk Upload Batches</span>
          </button>

          <button
            onClick={handleOpenAddBatch}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Batch</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (Compact & Refined) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.totalBatches}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Batches ({stats.activeBatches} active)</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{institutions.length}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Institutions</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.totalStudents}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Enrolled Student Seats</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.totalCoursesAssigned}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned Curriculum Items</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar (Sleek, Compact Layout) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Institution Selector */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Institution
            </label>
            <div className="relative">
              <select
                value={selectedInstitution}
                onChange={e => setSelectedInstitution(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none transition-all shadow-2xs"
              >
                <option value="all">All Institutions ({institutions.length})</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Academic Year Selector */}
          <div className="sm:col-span-1 lg:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Academic Year
            </label>
            <div className="relative">
              <select
                value={selectedAcademicYear}
                onChange={e => setSelectedAcademicYear(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none transition-all shadow-2xs"
              >
                <option value="all">All Academic Years</option>
                {availableAcademicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Status Selector */}
          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white appearance-none transition-all shadow-2xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Search Box */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search Cohorts
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search name, code..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Bar if any filter applied */}
        {(selectedInstitution !== "all" || selectedAcademicYear !== "all" || selectedStatus !== "all" || searchTerm) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              Showing filtered results: <strong className="text-slate-900 dark:text-white">{batches.length}</strong> of {totalCount} cohorts
            </div>
            <button
              onClick={() => {
                setSelectedInstitution("all");
                setSelectedAcademicYear("all");
                setSelectedStatus("all");
                setSearchTerm("");
              }}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold hover:underline text-xs"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* View Switcher: Cohort Tree Hierarchy vs Table List */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "tree"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Cohort Tree Hierarchy</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table List View</span>
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            {viewMode === "tree" 
              ? "Nested View: Institution → Batch Year → Batch → Students & Courses" 
              : "Flat searchable cohorts table"}
          </span>
        </div>

        {viewMode === "tree" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allExpanded: Record<string, boolean> = {};
                filteredHierarchy.forEach(inst => {
                  allExpanded[`inst-${inst.id}`] = true;
                  inst.years?.forEach(yr => {
                    allExpanded[`year-${inst.id}-${yr.year}`] = true;
                    yr.batches?.forEach(b => {
                      allExpanded[`batch-students-${b.id}`] = true;
                      allExpanded[`batch-courses-${b.id}`] = true;
                    });
                  });
                });
                setExpandedNodes(allExpanded);
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={() => setExpandedNodes({})}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {viewMode === "tree" ? (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-2 text-slate-400 shadow-2xs">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading cohort hierarchy...</span>
            </div>
          ) : filteredHierarchy.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs">
              <div className="inline-flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                <FolderTree className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No hierarchical cohorts match</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                No batches found under current filters or search query.
              </p>
              <button
                onClick={handleOpenAddBatch}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Batch</span>
              </button>
            </div>
          ) : (
            filteredHierarchy.map(inst => {
              const instExpanded = expandedNodes[`inst-${inst.id}`] !== false;
              const totalBatchesInInst = inst.years.reduce((acc, y) => acc + (y.batches?.length || 0), 0);

              return (
                <div 
                  key={inst.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden"
                >
                  {/* Level 1: Institution Header */}
                  <div 
                    onClick={() => toggleNode(`inst-${inst.id}`)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                            {inst.name}
                          </h2>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                            {inst.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Institution Root • {inst.years.length} Academic {inst.years.length === 1 ? "Year" : "Years"} • {totalBatchesInInst} Batches
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBatch(null);
                          setBatchForm({
                            name: "",
                            code: "",
                            institutionId: inst.id,
                            academicYear: "2026",
                            courseId: "",
                            startDate: "",
                            endDate: "",
                            maxStudents: "",
                            description: "",
                            status: "active"
                          });
                          setShowBatchModal(true);
                        }}
                        className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Batch</span>
                      </button>
                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${instExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>

                  {/* Level 2: Batch Years */}
                  {instExpanded && (
                    <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
                      {inst.years.map(yr => {
                        const yearExpanded = expandedNodes[`year-${inst.id}-${yr.year}`] !== false;

                        return (
                          <div 
                            key={yr.year} 
                            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 shadow-2xs overflow-hidden"
                          >
                            {/* Year Node Header */}
                            <div 
                              onClick={() => toggleNode(`year-${inst.id}-${yr.year}`)}
                              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                      Batch Year: {yr.year}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      {yr.batches.length} {yr.batches.length === 1 ? "Batch" : "Batches"}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Cohort Academic Cycle {yr.year}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${yearExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </div>
                            </div>

                            {/* Level 3: Batches List */}
                            {yearExpanded && (
                              <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/40 grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                                {yr.batches.map(batch => {
                                  const showStudents = expandedNodes[`batch-students-${batch.id}`];
                                  const showCourses = expandedNodes[`batch-courses-${batch.id}`];

                                  return (
                                    <div 
                                      key={batch.id} 
                                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3"
                                    >
                                      {/* Batch Title & Status */}
                                      <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                            {batch.code.slice(0, 3)}
                                          </div>
                                          <div className="min-w-0">
                                            <h4 
                                              onClick={() => navigate(`/admin/batches/${batch.id}`)}
                                              className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer truncate"
                                            >
                                              {batch.name}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                                {batch.code}
                                              </span>
                                              <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded border ${
                                                batch.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" :
                                                batch.status === "inactive" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600"
                                              }`}>
                                                {batch.status}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => navigate(`/admin/batches/${batch.id}`)}
                                            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>Manage</span>
                                            <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {batch.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                          {batch.description}
                                        </p>
                                      )}

                                      {/* Sub-node: Students & Courses Previews */}
                                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                          {/* Students toggle pill */}
                                          <button
                                            type="button"
                                            onClick={() => toggleNode(`batch-students-${batch.id}`)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                                          >
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{batch.students?.length || batch.studentCount || 0} Students</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${showStudents ? "rotate-180" : ""}`} />
                                          </button>

                                          {/* Courses toggle pill */}
                                          <button
                                            type="button"
                                            onClick={() => toggleNode(`batch-courses-${batch.id}`)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-xs border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                                          >
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span>{batch.courses?.length || batch.courseCount || 0} Courses</span>
                                            <ChevronDown className={`w-3 h-3 transition-transform ${showCourses ? "rotate-180" : ""}`} />
                                          </button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAssignCourseBatchId(batch.id);
                                              setAssignCourseSelectedIds([]);
                                              setShowAssignCourseModal(true);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            title="Assign Courses to this Batch"
                                          >
                                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditBatch(batch)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            title="Edit Batch"
                                          >
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteBatch(batch)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                            title="Archive Batch"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Expanded Students Details */}
                                      {showStudents && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-150">
                                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>Enrolled Students</span>
                                            <span>{batch.students?.length || 0}</span>
                                          </div>
                                          {batch.students && batch.students.length > 0 ? (
                                            <div className="max-h-36 overflow-y-auto space-y-1">
                                              {batch.students.map((st: any) => (
                                                <div key={st.id} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-xs">
                                                  <div className="flex items-center gap-2 truncate">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
                                                      {st.name?.slice(0, 1) || "S"}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{st.name}</span>
                                                    <span className="text-[10px] text-slate-400 truncate">({st.email})</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">No students enrolled yet.</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Expanded Courses Details */}
                                      {showCourses && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-150">
                                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>Assigned Curriculum Courses</span>
                                            <span>{batch.courses?.length || 0}</span>
                                          </div>
                                          {batch.courses && batch.courses.length > 0 ? (
                                            <div className="max-h-36 overflow-y-auto space-y-1">
                                              {batch.courses.map((co: any) => (
                                                <div key={co.id} className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-xs">
                                                  <div className="flex items-center gap-2 truncate">
                                                    <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{co.title}</span>
                                                  </div>
                                                  {co.category && (
                                                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                                      {co.category}
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">No courses assigned yet.</p>
                                          )}
                                        </div>
                                      )}

                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Batches Table Card (High Density, Sleek Layout) */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading cohorts...</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No cohorts found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Create your first batch cohort or adjust your filters above.
            </p>
            <button
              onClick={handleOpenAddBatch}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Batch</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 w-[30%]">Batch Details</th>
                  <th className="py-3 px-3 w-[18%]">Institution</th>
                  <th className="py-3 px-3 w-[18%]">Academic Year & Schedule</th>
                  <th className="py-3 px-2.5 w-[11%]">Enrollment</th>
                  <th className="py-3 px-2.5 w-[11%]">Curriculum</th>
                  <th className="py-3 px-3 text-right w-[12%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {batches.map(batch => {
                  const statusColors = {
                    active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                    inactive: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                    archived: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  };

                  return (
                    <tr 
                      key={batch.id} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/batches/${batch.id}`)}
                    >
                      {/* Name & Code */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {batch.code.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                              <span className="truncate max-w-[150px] sm:max-w-[200px]">{batch.name}</span>
                              <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded border shrink-0 whitespace-nowrap ${statusColors[batch.status]}`}>
                                {batch.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300 shrink-0 max-w-[120px] truncate" title={batch.code}>
                                {batch.code}
                              </span>
                              {batch.description && (
                                <span className="truncate max-w-[120px] sm:max-w-[180px]" title={batch.description}>
                                  • {batch.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Institution */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[150px]" title={batch.institutionName}>
                          {batch.institutionName || "MR Technologies Academy"}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]" title={batch.institutionCode}>
                          {batch.institutionCode || "MRTECH-MAIN"}
                        </div>
                      </td>

                      {/* Academic Year & Schedule */}
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs whitespace-nowrap">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{batch.academicYear}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[160px]">
                          {batch.startDate ? (
                            <span>{batch.startDate} {batch.endDate ? `→ ${batch.endDate}` : ""}</span>
                          ) : (
                            <span className="italic text-slate-400">Continuous Schedule</span>
                          )}
                        </div>
                      </td>

                      {/* Students Count & Capacity Bar */}
                      <td className="py-2.5 px-2.5">
                        {batch.maxStudents ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs gap-1">
                              <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {batch.studentCount || 0} / {batch.maxStudents}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Math.round(((batch.studentCount || 0) / batch.maxStudents) * 100)}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.round(((batch.studentCount || 0) / batch.maxStudents) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {batch.studentCount || 0} enrolled
                            </span>
                            <span className="text-[10px] text-slate-400 block whitespace-nowrap">Open capacity</span>
                          </div>
                        )}
                      </td>

                      {/* Assigned Curriculum Items (Stacked) */}
                      <td className="py-2.5 px-2.5">
                        <div className="flex flex-col gap-1 items-start whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            <BookOpen className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{batch.courseCount || 0} Courses</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            <Award className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{batch.assessmentCount || 0} Exams</span>
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/admin/batches/${batch.id}`)}
                            title="Manage Cohort"
                            className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/60 rounded-md transition-colors flex items-center gap-0.5 whitespace-nowrap"
                          >
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleOpenEditBatch(batch)}
                            title="Edit Batch"
                            className="p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(batch)}
                            title="Archive Batch"
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 rounded-md transition-colors"
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
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT BATCH MODAL */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingBatch ? "Edit Batch" : "Create New Batch"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure batch code, institutional affiliation, and academic year
                </p>
              </div>
              <button 
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Institution */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institution *
                  </label>
                  <select
                    value={batchForm.institutionId}
                    onChange={e => setBatchForm(prev => ({ ...prev, institutionId: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  >
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Year *
                  </label>
                  <select
                    value={batchForm.academicYear}
                    onChange={e => setBatchForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  >
                    {availableAcademicYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Batch Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Name *
                  </label>
                  <input
                    type="text"
                    value={batchForm.name}
                    onChange={e => setBatchForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Fullstack Java 2025-A"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                {/* Batch Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Code *
                  </label>
                  <input
                    type="text"
                    value={batchForm.code}
                    onChange={e => setBatchForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. FS-JAVA-2025A"
                    className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    required
                  />
                </div>

                {/* Primary Initial Course */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Initial Course (Optional)
                  </label>
                  <select
                    value={batchForm.courseId}
                    onChange={e => setBatchForm(prev => ({ ...prev, courseId: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="">No primary course (Assign courses later)</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={batchForm.startDate}
                    onChange={e => setBatchForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={batchForm.endDate}
                    onChange={e => setBatchForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Student Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchForm.maxStudents}
                    onChange={e => setBatchForm(prev => ({ ...prev, maxStudents: e.target.value }))}
                    placeholder="Leave blank for unlimited"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={batchForm.status}
                    onChange={e => setBatchForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={batchForm.description}
                    onChange={e => setBatchForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide overview notes, program track, or batch objectives..."
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
                >
                  {editingBatch ? "Save Changes" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BULK UPLOAD BATCHES MODAL */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bulk Upload Batches</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Import multiple batches from an Excel (.xlsx) file with pre-validation
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Step 1: Template Download */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                    Step 1: Download Batch Import Template
                  </div>
                  <div className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                    Pre-configured with headers, institution codes, and sample rows
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("batch")}
                  className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-white dark:bg-slate-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .xlsx</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Step 2: Upload Completed Excel Sheet
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleBatchFileSelect}
                    id="batch-excel-upload"
                    className="hidden"
                  />
                  <label htmlFor="batch-excel-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {uploadFile ? uploadFile.name : "Click to select or drag and drop Excel file"}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">.XLSX or .XLS format up to 25MB</span>
                  </label>
                </div>
              </div>

              {/* Step 3: Validation Preview */}
              {uploading && (
                <div className="py-8 flex items-center justify-center gap-2 text-indigo-600">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Validating rows...</span>
                </div>
              )}

              {uploadPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Validation Preview</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {uploadPreview.totalRows} rows evaluated
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> {uploadPreview.validCount} Valid
                      </span>
                      {uploadPreview.errorCount > 0 && (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> {uploadPreview.errorCount} Errors
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Row</th>
                          <th className="py-2.5 px-3">Batch Name</th>
                          <th className="py-2.5 px-3">Code</th>
                          <th className="py-2.5 px-3">Institution</th>
                          <th className="py-2.5 px-3">Academic Year</th>
                          <th className="py-2.5 px-3">Status / Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {uploadPreview.rows.map(r => (
                          <tr key={r.rowNumber} className={r.isValid ? "bg-white dark:bg-slate-900" : "bg-rose-50/50 dark:bg-rose-950/20"}>
                            <td className="py-2 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">{r.code}</td>
                            <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">{r.institutionCode}</td>
                            <td className="py-2 px-3">{r.academicYear}</td>
                            <td className="py-2 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                                </span>
                              ) : (
                                <div className="text-rose-600 space-y-0.5">
                                  {r.errors.map((err, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      <span>{err}</span>
                                    </div>
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

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {uploadPreview ? `${uploadPreview.validCount} batches will be imported` : "Select a valid Excel file to proceed"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!uploadPreview || uploadPreview.validCount === 0 || uploading}
                  onClick={handleImportBatches}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm"
                >
                  Import {uploadPreview?.validCount || 0} Batches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BULK ASSIGN STUDENTS MODAL (WITH MULTI-BATCH CALLOUT) */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bulk Assign Students to Batches</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Map students to one or more batches with multi-batch membership support
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Multi-Batch Callout */}
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <span className="font-bold">Multi-Batch Enrollment Enabled:</span>
                  <p>
                    A single student can belong to multiple batches simultaneously. In the Excel file, you may include the same student's email across multiple rows with different batch codes. Each enrollment will be granted, and assigned courses will be merged without stripping existing access.
                  </p>
                </div>
              </div>

              {/* Template Download */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Step 1: Download Student Assignment Template
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pre-populated with active batch codes and instructions
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("student")}
                  className="px-3.5 py-1.5 text-xs font-semibold text-emerald-600 bg-white dark:bg-slate-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .xlsx</span>
                </button>
              </div>

              {/* Upload Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Step 2: Upload Student Assignment File
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleAssignFileSelect}
                    id="student-assign-upload"
                    className="hidden"
                  />
                  <label htmlFor="student-assign-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {assignFile ? assignFile.name : "Click to select or drag and drop Excel file"}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">.XLSX or .XLS format</span>
                  </label>
                </div>
              </div>

              {/* Validation Preview */}
              {assigning && (
                <div className="py-8 flex items-center justify-center gap-2 text-emerald-600">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Validating assignments...</span>
                </div>
              )}

              {assignPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Assignment Preview</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {assignPreview.totalRows} records
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> {assignPreview.validCount} Valid
                      </span>
                      {assignPreview.errorCount > 0 && (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> {assignPreview.errorCount} Errors
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Row</th>
                          <th className="py-2.5 px-3">Student Email</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Target Batch</th>
                          <th className="py-2.5 px-3">Validation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {assignPreview.rows.map(r => (
                          <tr key={r.rowNumber} className={r.isValid ? "bg-white dark:bg-slate-900" : "bg-rose-50/50 dark:bg-rose-950/20"}>
                            <td className="py-2 px-3 font-mono text-slate-500">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{r.studentEmail}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{r.studentName || "—"}</td>
                            <td className="py-2 px-3">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                                {r.batchCode}
                              </span>
                              {r.batchName && <span className="text-slate-400 text-[11px] ml-1.5">({r.batchName})</span>}
                            </td>
                            <td className="py-2 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                </span>
                              ) : (
                                <div className="text-rose-600 space-y-0.5">
                                  {r.errors.map((err, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      <span>{err}</span>
                                    </div>
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

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {assignPreview ? `${assignPreview.validCount} memberships will be created` : "Upload file to review"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!assignPreview || assignPreview.validCount === 0 || assigning}
                  onClick={handleImportStudentAssignments}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm"
                >
                  Assign {assignPreview?.validCount || 0} Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MANAGE INSTITUTIONS MODAL */}
      {/* ========================================================================= */}
      {showInstModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Institutions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure institutional partners, colleges, and training branches
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Existing Institutions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Institutions</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {institutions.map(inst => (
                    <div key={inst.id} className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>{inst.name}</span>
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">
                            {inst.code}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                          <span>{inst.batchCount || 0} Batches</span>
                          <span>•</span>
                          <span>{inst.studentCount || 0} Students</span>
                          {inst.contactEmail && (
                            <>
                              <span>•</span>
                              <span>{inst.contactEmail}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {inst.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Institution Form */}
              <form onSubmit={handleSaveInstitution} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  + Add New Institution
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      value={instForm.name}
                      onChange={e => setInstForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Oxford Engineering College"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Institution Code * (Unique)
                    </label>
                    <input
                      type="text"
                      value={instForm.code}
                      onChange={e => setInstForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. OEC-ENG"
                      className="w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={instForm.contactEmail}
                      onChange={e => setInstForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="admin@institution.edu"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Academic Years (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={instForm.academicYears}
                      onChange={e => setInstForm(prev => ({ ...prev, academicYears: e.target.value }))}
                      placeholder="2024-2025, 2025-2026..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submittingInst}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {submittingInst ? "Saving..." : "Add Institution"}
                  </button>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BULK ASSIGN COURSES MODAL */}
      {/* ========================================================================= */}
      {showAssignCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bulk Assign Courses to Batch</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select curriculum courses to assign. Active batch students will automatically receive course access.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAssignCourseModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignCoursesSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 flex flex-col">
              {/* Batch Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Cohort / Batch *
                </label>
                <select
                  value={assignCourseBatchId}
                  onChange={e => setAssignCourseBatchId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  required
                >
                  <option value="">Select a batch...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) - {b.academicYear}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Search & Selection */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Courses ({assignCourseSelectedIds.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAssignCourseSelectedIds(courses.map(c => c.id))}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={() => setAssignCourseSelectedIds([])}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={assignCourseSearch}
                    onChange={e => setAssignCourseSearch(e.target.value)}
                    placeholder="Search courses by title or category..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {courses
                    .filter(c => !assignCourseSearch.trim() || c.title.toLowerCase().includes(assignCourseSearch.toLowerCase()) || (c.category || "").toLowerCase().includes(assignCourseSearch.toLowerCase()))
                    .map(c => {
                      const isSelected = assignCourseSelectedIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setAssignCourseSelectedIds(prev =>
                              isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-indigo-600">
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="w-10 h-7 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                              <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.title}</div>
                              <div className="text-[10px] text-slate-400">{c.category || "General"} • {c.level || "Beginner"}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Multi-Batch Rule: Assigning courses will grant access to all students in this batch without overriding existing individual or other batch grants.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignCourseModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningCourses || !assignCourseBatchId || assignCourseSelectedIds.length === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {assigningCourses ? "Assigning..." : `Assign ${assignCourseSelectedIds.length} Course${assignCourseSelectedIds.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
