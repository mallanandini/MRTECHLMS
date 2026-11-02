/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Users, Layers, Plus, Search, Filter, 
  Trash2, Edit, CheckCircle2, AlertCircle, Calendar, 
  UserCheck, BookOpen, Compass, Award, Shield, X, RefreshCw
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Department, Cohort, Group, User, Course, Assessment, LearningPath } from "../../types.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

type OrgTab = "groups" | "departments" | "cohorts";

export function AdminOrganizationPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<OrgTab>("groups");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [eligibleManagers, setEligibleManagers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "", managerId: "" });

  const [showCohortModal, setShowCohortModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [cohortForm, setCohortForm] = useState({ name: "", code: "", description: "", startDate: "", endDate: "", managerId: "", status: "active" as any });

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", type: "general" as any, departmentId: "", cohortId: "", managerId: "" });

  // Member Management Modal
  const [membershipEntity, setMembershipEntity] = useState<{ type: "group" | "department" | "cohort"; id: string; name: string } | null>(null);
  const [entityMembers, setEntityMembers] = useState<any[]>([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");

  // Assign Learning Modal
  const [assignEntity, setAssignEntity] = useState<{ type: "group" | "department" | "cohort"; id: string; name: string } | null>(null);
  const [assignKind, setAssignKind] = useState<"course" | "path" | "assessment">("course");
  const [selectedLearningId, setSelectedLearningId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignIsMandatory, setAssignIsMandatory] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [authToken]);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      const [deptRes, cohortRes, groupRes, userRes, mgrRes, courseRes, assessRes, pathRes] = await Promise.all([
        fetch("/api/admin/departments", { headers }),
        fetch("/api/admin/cohorts", { headers }),
        fetch("/api/admin/groups", { headers }),
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/managers", { headers }),
        fetch("/api/courses", { headers }),
        fetch("/api/assessments", { headers }),
        fetch("/api/learning-paths", { headers })
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (cohortRes.ok) setCohorts(await cohortRes.json());
      if (groupRes.ok) setGroups(await groupRes.json());
      if (userRes.ok) setAllUsers(await userRes.json());
      if (mgrRes.ok) setEligibleManagers(await mgrRes.json());
      if (courseRes.ok) setCourses(await courseRes.json());
      if (assessRes.ok) setAssessments(await assessRes.json());
      if (pathRes.ok) setLearningPaths(await pathRes.json());
    } catch (err: any) {
      setErrorMessage("Failed to load organization data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Department Handlers
  // -------------------------------------------------------------
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      setErrorMessage("Department name and code are required.");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };
      if (editingDept) {
        const res = await fetch(`/api/admin/departments/${editingDept.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(deptForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccessMessage(`Department '${deptForm.name}' updated successfully.`);
      } else {
        const res = await fetch("/api/admin/departments", {
          method: "POST",
          headers,
          body: JSON.stringify(deptForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccessMessage(`Department '${deptForm.name}' created successfully.`);
      }
      setShowDeptModal(false);
      setEditingDept(null);
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleArchiveDepartment = async (dept: Department) => {
    if (!window.confirm(`Are you sure you want to archive department '${dept.name}'?`)) return;
    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccessMessage(`Department '${dept.name}' archived.`);
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------
  // Cohort Handlers
  // -------------------------------------------------------------
  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohortForm.name.trim() || !cohortForm.code.trim()) {
      setErrorMessage("Cohort name and code are required.");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };
      if (editingCohort) {
        const res = await fetch(`/api/admin/cohorts/${editingCohort.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(cohortForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccessMessage(`Cohort '${cohortForm.name}' updated successfully.`);
      } else {
        const res = await fetch("/api/admin/cohorts", {
          method: "POST",
          headers,
          body: JSON.stringify(cohortForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccessMessage(`Cohort '${cohortForm.name}' created successfully.`);
      }
      setShowCohortModal(false);
      setEditingCohort(null);
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleArchiveCohort = async (cohort: Cohort) => {
    if (!window.confirm(`Are you sure you want to archive cohort '${cohort.name}'?`)) return;
    try {
      const res = await fetch(`/api/admin/cohorts/${cohort.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccessMessage(`Cohort '${cohort.name}' archived.`);
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------
  // Group Handlers
  // -------------------------------------------------------------
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      setErrorMessage("Group name is required.");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };
      if (editingGroup) {
        const res = await fetch(`/api/admin/groups/${editingGroup.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(groupForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccessMessage(`Group '${groupForm.name}' updated.`);
      } else {
        const res = await fetch("/api/admin/groups", {
          method: "POST",
          headers,
          body: JSON.stringify(groupForm)
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSuccessMessage(`Group '${groupForm.name}' created.`);
      }
      setShowGroupModal(false);
      setEditingGroup(null);
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleArchiveGroup = async (group: Group) => {
    if (!window.confirm(`Are you sure you want to archive group '${group.name}'?`)) return;
    try {
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccessMessage(`Group '${group.name}' archived.`);
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------
  // Membership Modal Handlers
  // -------------------------------------------------------------
  const handleOpenMemberships = async (type: "group" | "department" | "cohort", entity: any) => {
    setMembershipEntity({ type, id: entity.id, name: entity.name });
    setSelectedUserToAdd("");
    try {
      const res = await fetch(`/api/admin/${type === "group" ? "groups" : type === "department" ? "departments" : "cohorts"}/${entity.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEntityMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    if (!membershipEntity || !selectedUserToAdd) return;
    try {
      const endpoint = membershipEntity.type === "group"
        ? `/api/admin/groups/${membershipEntity.id}/members`
        : membershipEntity.type === "department"
        ? `/api/admin/departments/${membershipEntity.id}/members`
        : `/api/admin/cohorts/${membershipEntity.id}/members`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userIds: [selectedUserToAdd] })
      });
      if (!res.ok) throw new Error((await res.json()).error);

      // Refresh members
      const detailRes = await fetch(`/api/admin/${membershipEntity.type === "group" ? "groups" : membershipEntity.type === "department" ? "departments" : "cohorts"}/${membershipEntity.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (detailRes.ok) {
        const data = await detailRes.json();
        setEntityMembers(data.members || []);
      }
      setSelectedUserToAdd("");
      setSuccessMessage("Member added successfully.");
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!membershipEntity) return;
    try {
      const endpoint = membershipEntity.type === "group"
        ? `/api/admin/groups/${membershipEntity.id}/members/${userId}`
        : membershipEntity.type === "department"
        ? `/api/admin/departments/${membershipEntity.id}/members/${userId}`
        : `/api/admin/cohorts/${membershipEntity.id}/members/${userId}`;

      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error((await res.json()).error);

      setEntityMembers(prev => prev.filter(m => m.id !== userId && m.userId !== userId));
      setSuccessMessage("Member removed.");
      fetchAllData();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // -------------------------------------------------------------
  // Assignment Modal Handlers
  // -------------------------------------------------------------
  const handleOpenAssignModal = (type: "group" | "department" | "cohort", entity: any) => {
    setAssignEntity({ type, id: entity.id, name: entity.name });
    setAssignKind("course");
    setSelectedLearningId("");
    setAssignDueDate("");
    setAssignIsMandatory(false);
  };

  const handleExecuteAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEntity || !selectedLearningId) {
      setErrorMessage("Please select a course, path, or assessment to assign.");
      return;
    }

    setSubmittingAssign(true);
    setErrorMessage(null);

    try {
      let endpoint = "";
      const body: any = {
        dueDate: assignDueDate || null,
        isMandatory: assignIsMandatory
      };

      const entityPlural = assignEntity.type === "group" ? "groups" : assignEntity.type === "department" ? "departments" : "cohorts";

      if (assignKind === "course") {
        endpoint = `/api/admin/${entityPlural}/${assignEntity.id}/assign-course`;
        body.courseId = selectedLearningId;
      } else if (assignKind === "path") {
        endpoint = `/api/admin/${entityPlural}/${assignEntity.id}/assign-learning-path`;
        body.learningPathId = selectedLearningId;
      } else if (assignKind === "assessment") {
        endpoint = `/api/admin/${entityPlural}/${assignEntity.id}/assign-assessment`;
        body.assessmentId = selectedLearningId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Assignment failed.");
      }

      const resData = await res.json();
      setSuccessMessage(`Successfully assigned to ${resData.assignedCount || 0} members of ${assignEntity.name}.`);
      setAssignEntity(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Filtered lists
  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || (statusFilter === "archived" ? g.deletedAt : !g.deletedAt);
    return matchesSearch && matchesStatus;
  });

  const filteredDepts = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "archived" ? d.deletedAt : !d.deletedAt);
    return matchesSearch && matchesStatus;
  });

  const filteredCohorts = cohorts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5" style={{ borderColor: "var(--theme-border)" }}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--theme-text)" }}>
                Organization Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Configure departments, time-bound cohorts, student groups, and multi-tier manager hierarchies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ThemeQuickControls onOpenPreferences={() => navigate("/admin/profile")} />
          <button
            onClick={fetchAllData}
            className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center text-slate-600 dark:text-slate-300"
            title="Refresh Organization Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeTab === "groups" && (
            <button
              onClick={() => {
                setEditingGroup(null);
                setGroupForm({ name: "", description: "", type: "general", departmentId: "", cohortId: "", managerId: "" });
                setShowGroupModal(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          )}

          {activeTab === "departments" && (
            <button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ name: "", code: "", description: "", managerId: "" });
                setShowDeptModal(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </button>
          )}

          {activeTab === "cohorts" && (
            <button
              onClick={() => {
                setEditingCohort(null);
                setCohortForm({ name: "", code: "", description: "", startDate: "", endDate: "", managerId: "", status: "active" });
                setShowCohortModal(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Cohort</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Departments</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {departments.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cohorts / Batches</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {cohorts.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Groups</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {groups.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {allUsers.length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b gap-4" style={{ borderColor: "var(--theme-border)" }}>
        <button
          onClick={() => { setActiveTab("groups"); setSearchTerm(""); }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "groups"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Groups ({groups.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("departments"); setSearchTerm(""); }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "departments"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("cohorts"); setSearchTerm(""); }}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "cohorts"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cohorts / Batches ({cohorts.length})</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
            style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-xs font-semibold"
          style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          {activeTab === "cohorts" && <option value="completed">Completed</option>}
          {activeTab === "cohorts" && <option value="upcoming">Upcoming</option>}
        </select>
      </div>

      {/* Tab 1: Groups */}
      {activeTab === "groups" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Group Name</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Affiliation</th>
                  <th className="px-4 py-3.5">Manager</th>
                  <th className="px-4 py-3.5">Members</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No groups found. Create your first group using the button above.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map(g => (
                    <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        <div>{g.name}</div>
                        {g.description && <div className="text-[11px] font-normal text-slate-400 mt-0.5">{g.description}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {g.type || "general"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {g.departmentName ? <span>Dept: {g.departmentName}</span> : g.cohortName ? <span>Cohort: {g.cohortName}</span> : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {g.managerName || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-blue-600 dark:text-blue-400">
                        {g.memberCount || 0} members
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenMemberships("group", g)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px] transition"
                        >
                          Members
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal("group", g)}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-semibold rounded-lg text-[11px] transition"
                        >
                          Assign Learning
                        </button>
                        <button
                          onClick={() => {
                            setEditingGroup(g);
                            setGroupForm({
                              name: g.name,
                              description: g.description || "",
                              type: g.type || "general",
                              departmentId: g.departmentId || "",
                              cohortId: g.cohortId || "",
                              managerId: g.managerId || ""
                            });
                            setShowGroupModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Edit Group"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveGroup(g)}
                          className="p-1 text-rose-400 hover:text-rose-600 transition"
                          title="Archive Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === "departments" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Department Name</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Department Head / Manager</th>
                  <th className="px-4 py-3.5">Members</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDepts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No departments found. Create your first department using the button above.
                    </td>
                  </tr>
                ) : (
                  filteredDepts.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        <div>{d.name}</div>
                        {d.description && <div className="text-[11px] font-normal text-slate-400 mt-0.5">{d.description}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
                          {d.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {d.managerName ? (
                          <div>
                            <div className="font-semibold">{d.managerName}</div>
                            <div className="text-[11px] text-slate-400">{d.managerEmail}</div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-blue-600 dark:text-blue-400">
                        {d.memberCount || 0} members
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          d.deletedAt ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}>
                          {d.deletedAt ? "Archived" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenMemberships("department", d)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px] transition"
                        >
                          Members
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal("department", d)}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-semibold rounded-lg text-[11px] transition"
                        >
                          Assign Learning
                        </button>
                        <button
                          onClick={() => {
                            setEditingDept(d);
                            setDeptForm({
                              name: d.name,
                              code: d.code,
                              description: d.description || "",
                              managerId: d.managerId || ""
                            });
                            setShowDeptModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Edit Department"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveDepartment(d)}
                          className="p-1 text-rose-400 hover:text-rose-600 transition"
                          title="Archive Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cohorts */}
      {activeTab === "cohorts" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Cohort / Batch Name</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Dates</th>
                  <th className="px-4 py-3.5">Cohort Mentor / Manager</th>
                  <th className="px-4 py-3.5">Members</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCohorts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No cohorts found. Create your first batch using the button above.
                    </td>
                  </tr>
                ) : (
                  filteredCohorts.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        <div>{c.name}</div>
                        {c.description && <div className="text-[11px] font-normal text-slate-400 mt-0.5">{c.description}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"} to {c.endDate ? new Date(c.endDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {c.managerName || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-blue-600 dark:text-blue-400">
                        {c.memberCount || 0} members
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : c.status === "completed" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenMemberships("cohort", c)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px] transition"
                        >
                          Members
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal("cohort", c)}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 font-semibold rounded-lg text-[11px] transition"
                        >
                          Assign Learning
                        </button>
                        <button
                          onClick={() => {
                            setEditingCohort(c);
                            setCohortForm({
                              name: c.name,
                              code: c.code,
                              description: c.description || "",
                              startDate: c.startDate || "",
                              endDate: c.endDate || "",
                              managerId: c.managerId || "",
                              status: c.status || "active"
                            });
                            setShowCohortModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          title="Edit Cohort"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchiveCohort(c)}
                          className="p-1 text-rose-400 hover:text-rose-600 transition"
                          title="Archive Cohort"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Create / Edit Department */}
      {/* ------------------------------------------------------------- */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: "var(--theme-border)" }}>
              <h3 className="font-bold text-base" style={{ color: "var(--theme-text)" }}>
                {editingDept ? "Edit Department" : "Create New Department"}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Engineering, Sales, QA"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  placeholder="e.g. ENG, SLS, QA"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department Manager / Head
                </label>
                <select
                  value={deptForm.managerId}
                  onChange={(e) => setDeptForm({ ...deptForm, managerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  <option value="">No Manager Assigned</option>
                  {eligibleManagers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Optional mission or department overview..."
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  style={{ borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  {editingDept ? "Save Changes" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Create / Edit Cohort */}
      {/* ------------------------------------------------------------- */}
      {showCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: "var(--theme-border)" }}>
              <h3 className="font-bold text-base" style={{ color: "var(--theme-text)" }}>
                {editingCohort ? "Edit Cohort / Batch" : "Create New Cohort / Batch"}
              </h3>
              <button onClick={() => setShowCohortModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCohort} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cohort Name *
                </label>
                <input
                  type="text"
                  required
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  placeholder="e.g. Summer Interns 2026, Q3 Batch"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cohort Code *
                </label>
                <input
                  type="text"
                  required
                  value={cohortForm.code}
                  onChange={(e) => setCohortForm({ ...cohortForm, code: e.target.value })}
                  placeholder="e.g. BATCH-2026-Q3"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={cohortForm.startDate}
                    onChange={(e) => setCohortForm({ ...cohortForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={cohortForm.endDate}
                    onChange={(e) => setCohortForm({ ...cohortForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Mentor / Manager
                  </label>
                  <select
                    value={cohortForm.managerId}
                    onChange={(e) => setCohortForm({ ...cohortForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  >
                    <option value="">No Manager</option>
                    {eligibleManagers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Status
                  </label>
                  <select
                    value={cohortForm.status}
                    onChange={(e) => setCohortForm({ ...cohortForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={cohortForm.description}
                  onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })}
                  placeholder="Optional notes or goals for this batch..."
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCohortModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  style={{ borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  {editingCohort ? "Save Changes" : "Create Cohort"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 3: Create / Edit Group */}
      {/* ------------------------------------------------------------- */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: "var(--theme-border)" }}>
              <h3 className="font-bold text-base" style={{ color: "var(--theme-text)" }}>
                {editingGroup ? "Edit Group" : "Create New Group"}
              </h3>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g. Backend Fast-Track, High Performers"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Group Type
                  </label>
                  <select
                    value={groupForm.type}
                    onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  >
                    <option value="general">General</option>
                    <option value="department">Department</option>
                    <option value="cohort">Cohort</option>
                    <option value="team">Team</option>
                    <option value="track">Track</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Assigned Manager
                  </label>
                  <select
                    value={groupForm.managerId}
                    onChange={(e) => setGroupForm({ ...groupForm, managerId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  >
                    <option value="">No Manager</option>
                    {eligibleManagers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Parent Department
                  </label>
                  <select
                    value={groupForm.departmentId}
                    onChange={(e) => setGroupForm({ ...groupForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  >
                    <option value="">None (Independent)</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Parent Cohort
                  </label>
                  <select
                    value={groupForm.cohortId}
                    onChange={(e) => setGroupForm({ ...groupForm, cohortId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                    style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                  >
                    <option value="">None (Independent)</option>
                    {cohorts.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Optional description of the group's focus..."
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  style={{ borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  {editingGroup ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 4: Member Management Modal */}
      {/* ------------------------------------------------------------- */}
      {membershipEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]" style={{ borderColor: "var(--theme-border)" }}>
            <div className="px-6 py-4 border-b flex justify-between items-center shrink-0" style={{ borderColor: "var(--theme-border)" }}>
              <div>
                <h3 className="font-bold text-base" style={{ color: "var(--theme-text)" }}>
                  Manage Members
                </h3>
                <p className="text-xs text-slate-400 capitalize">
                  {membershipEntity.type}: <span className="font-semibold text-slate-700 dark:text-slate-200">{membershipEntity.name}</span>
                </p>
              </div>
              <button onClick={() => setMembershipEntity(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Member Form */}
            <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-800/20 shrink-0" style={{ borderColor: "var(--theme-border)" }}>
              <div className="flex gap-2">
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-xl text-xs font-medium"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  <option value="">Select a user to add...</option>
                  {allUsers
                    .filter(u => !entityMembers.some(m => m.id === u.id || m.userId === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) — {u.role}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedUserToAdd}
                  onClick={handleAddMember}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0"
                >
                  Add Member
                </button>
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
              {entityMembers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No members currently enrolled in this unit.
                </div>
              ) : (
                entityMembers.map(m => (
                  <div key={m.id || m.userId} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs" style={{ color: "var(--theme-text)" }}>
                        {m.name || m.userName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {m.email || m.userEmail} {m.jobTitle ? `• ${m.jobTitle}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(m.id || m.userId)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t flex justify-end shrink-0" style={{ borderColor: "var(--theme-border)" }}>
              <button
                onClick={() => setMembershipEntity(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 5: Assign Learning Modal */}
      {/* ------------------------------------------------------------- */}
      {assignEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: "var(--theme-border)" }}>
              <div>
                <h3 className="font-bold text-base" style={{ color: "var(--theme-text)" }}>
                  Assign Learning Program
                </h3>
                <p className="text-xs text-slate-400 capitalize">
                  Target: {assignEntity.type} — <span className="font-semibold text-slate-700 dark:text-slate-200">{assignEntity.name}</span>
                </p>
              </div>
              <button onClick={() => setAssignEntity(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Program Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAssignKind("course"); setSelectedLearningId(""); }}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      assignKind === "course"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Course</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssignKind("path"); setSelectedLearningId(""); }}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      assignKind === "path"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Learning Path</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssignKind("assessment"); setSelectedLearningId(""); }}
                    className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      assignKind === "assessment"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Assessment</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select {assignKind === "course" ? "Course" : assignKind === "path" ? "Learning Path" : "Assessment"} *
                </label>
                <select
                  required
                  value={selectedLearningId}
                  onChange={(e) => setSelectedLearningId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  <option value="">Choose program...</option>
                  {assignKind === "course" && courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.category})</option>
                  ))}
                  {assignKind === "path" && learningPaths.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
                  ))}
                  {assignKind === "assessment" && assessments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({a.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium"
                  style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={assignIsMandatory}
                  onChange={(e) => setAssignIsMandatory(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isMandatory" className="text-xs font-semibold cursor-pointer" style={{ color: "var(--theme-text)" }}>
                  Mark as Mandatory Learning
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignEntity(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  style={{ borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || !selectedLearningId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  {submittingAssign ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
