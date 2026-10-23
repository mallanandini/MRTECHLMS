/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, Search, UserCheck, UserX, Calendar, AlertCircle, 
  CheckCircle2, Users, Clock, Award, ShieldCheck, ChevronRight
} from "lucide-react";
import { Assessment } from "../../types.js";
import { useToast, useConfirm } from "../../context/NotificationContext.js";

interface StudentItem {
  id: string;
  name: string;
  email: string;
  isAssigned: boolean;
  assignmentId?: string;
  assignedAt?: string;
  dueDate?: string;
  status: "unassigned" | "assigned" | "in_progress" | "completed";
  attemptsCount: number;
  bestScore?: number | null;
  latestScore?: number | null;
  lastAttemptedAt?: string | null;
}

interface AssessmentAssignmentsModalProps {
  assessment: Assessment;
  authToken: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export function AssessmentAssignmentsModal({
  assessment,
  authToken,
  onClose,
  onUpdated
}: AssessmentAssignmentsModalProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/assessments/${assessment.id}/students`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data || []);
      }
    } catch (err) {
      console.error("Failed to load students for assignment", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [assessment.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSelectAll = () => {
    const unassignedInView = filteredStudents.filter(s => !s.isAssigned);
    if (selectedIds.length === unassignedInView.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unassignedInView.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSingleAssign = async (studentId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessments/${assessment.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ studentId, dueDate: dueDate || undefined })
      });
      if (res.ok) {
        showToast("Student assigned successfully");
        await fetchStudents();
        onUpdated?.();
      }
    } catch (err) {
      console.error("Assign error", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessments/${assessment.id}/bulk-assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ studentIds: selectedIds, dueDate: dueDate || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || `Successfully assigned ${selectedIds.length} student(s)`);
        setSelectedIds([]);
        await fetchStudents();
        onUpdated?.();
      }
    } catch (err) {
      console.error("Bulk assign error", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (studentId: string, studentName: string) => {
    const confirmed = await confirm({
      title: "Revoke Assessment Access?",
      message: `Revoke assessment access for ${studentName}? Historical attempt records will remain safe.`,
      confirmText: "Revoke Access",
      variant: "danger"
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/assessments/${assessment.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ studentId })
      });
      if (res.ok) {
        showToast(`Revoked access for ${studentName}`);
        await fetchStudents();
        onUpdated?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to revoke access");
      }
    } catch (err: any) {
      console.error("Revoke error", err);
      toast.error(err.message || "Failed to revoke access");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "assigned") return s.isAssigned;
    if (filter === "unassigned") return !s.isAssigned;
    return true;
  });

  const totalAssigned = students.filter(s => s.isAssigned).length;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Manage Student Assignments</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {totalAssigned} Assigned
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Assessment: <span className="font-semibold text-slate-700">{assessment.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast alert banner */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Toolbar: Search, Filters & Bulk Actions */}
        <div className="p-5 border-b border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search students by name or email..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto justify-center">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({students.length})
              </button>
              <button
                onClick={() => setFilter("assigned")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filter === "assigned" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Assigned ({totalAssigned})
              </button>
              <button
                onClick={() => setFilter("unassigned")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filter === "unassigned" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unassigned ({students.length - totalAssigned})
              </button>
            </div>
          </div>

          {/* Bulk Assign Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    filteredStudents.filter(s => !s.isAssigned).length > 0 &&
                    selectedIds.length === filteredStudents.filter(s => !s.isAssigned).length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Select All Unassigned</span>
              </label>

              {selectedIds.length > 0 && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedIds.length} Selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  placeholder="Optional Due Date"
                  className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Optional Due Date"
                />
              </div>

              <button
                onClick={handleBulkAssign}
                disabled={selectedIds.length === 0 || actionLoading}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                  selectedIds.length > 0 && !actionLoading
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Bulk Assign ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Student Table / List */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No students found</p>
              <p className="text-xs">Try adjusting your search terms or status filters.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 w-10 text-center"></th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Assignment Status</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Attempts & Scores</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map(student => {
                    const isSelected = selectedIds.includes(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 text-center">
                          {!student.isAssigned ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudent(student.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 text-xs">{student.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{student.email}</p>
                        </td>
                        <td className="p-3">
                          {student.isAssigned ? (
                            student.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Completed
                              </span>
                            ) : student.status === "in_progress" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                Assigned
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px]">
                          {student.dueDate ? student.dueDate : "No deadline"}
                        </td>
                        <td className="p-3">
                          {student.attemptsCount > 0 ? (
                            <div className="space-y-0.5">
                              <p className="font-mono text-xs font-bold text-slate-800">
                                Best: {student.bestScore} / {assessment.totalPoints} pts
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Attempts: {student.attemptsCount}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No attempts</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {student.isAssigned ? (
                            <button
                              onClick={() => handleRevoke(student.id, student.name)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer border border-rose-100"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSingleAssign(student.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer border border-blue-100"
                            >
                              Assign
                            </button>
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

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <p className="text-slate-500">
            Total Enrolled Students: <span className="font-bold text-slate-800">{students.length}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
