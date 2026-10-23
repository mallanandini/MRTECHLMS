/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, BookOpen, BarChart3, AlertTriangle, Medal, 
  CheckCircle2, Clock, Search, Filter, RefreshCw, 
  Layers, ArrowUpRight, ShieldCheck, AlertCircle, X, ExternalLink
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { 
  TeamLearnerSummary, TeamCourseProgressItem, 
  TeamAssessmentResultItem, TeamOverdueItem, TeamStatsSummary 
} from "../../types.js";

type ManagerTab = "learners" | "progress" | "assessments" | "overdue" | "assigned" | "certificates";

export function ManagerTeamPage() {
  const { authToken, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ManagerTab>("learners");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<TeamStatsSummary>({
    totalLearners: 0,
    totalAssignedCourses: 0,
    totalCompletedCourses: 0,
    courseCompletionRate: 0,
    totalAssignedAssessments: 0,
    totalPassedAssessments: 0,
    assessmentPassRate: 0,
    totalOverdueItems: 0,
    totalCertificatesEarned: 0,
    departmentBreakdown: []
  });

  const [learners, setLearners] = useState<TeamLearnerSummary[]>([]);
  const [progressItems, setProgressItems] = useState<TeamCourseProgressItem[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<TeamAssessmentResultItem[]>([]);
  const [overdueItems, setOverdueItems] = useState<TeamOverdueItem[]>([]);
  const [assignedOverview, setAssignedOverview] = useState<{ courses: any[]; assessments: any[]; learningPaths: any[] }>({
    courses: [],
    assessments: [],
    learningPaths: []
  });
  const [certificates, setCertificates] = useState<any[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLearnerModal, setSelectedLearnerModal] = useState<TeamLearnerSummary | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, [authToken]);

  const fetchTeamData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      const [statsRes, learnersRes, progressRes, assessRes, overdueRes, assignedRes, certsRes] = await Promise.all([
        fetch("/api/manager/team/stats", { headers }),
        fetch("/api/manager/team/learners", { headers }),
        fetch("/api/manager/team/progress", { headers }),
        fetch("/api/manager/team/assessments", { headers }),
        fetch("/api/manager/team/overdue", { headers }),
        fetch("/api/manager/team/assigned-learning", { headers }),
        fetch("/api/manager/team/certificates", { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (learnersRes.ok) setLearners(await learnersRes.json());
      if (progressRes.ok) setProgressItems(await progressRes.json());
      if (assessRes.ok) setAssessmentResults(await assessRes.json());
      if (overdueRes.ok) setOverdueItems(await overdueRes.json());
      if (assignedRes.ok) setAssignedOverview(await assignedRes.json());
      if (certsRes.ok) setCertificates(await certsRes.json());
    } catch (err: any) {
      setErrorMessage("Failed to load manager team data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredLearners = learners.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.jobTitle && l.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.department && l.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProgress = progressItems.filter(p =>
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssessments = assessmentResults.filter(a =>
    a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.assessmentTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOverdue = overdueItems.filter(o =>
    o.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.itemTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5" style={{ borderColor: "var(--theme-border)" }}>
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--theme-text)" }}>
                Team Management & Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Track learning progress, assessment results, and compliance across your authorized direct reports and team members.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border" style={{ borderColor: "var(--theme-border)" }}>
            Scope: {stats.totalLearners} Managed Learners
          </div>
          <a
            href="/manager/analytics"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Team Analytics</span>
          </a>
          <button
            onClick={fetchTeamData}
            className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center text-slate-600 dark:text-slate-300"
            title="Refresh Team Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error alert */}
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

      {/* Executive KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Learners */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Team Learners</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {stats.totalLearners}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Direct & Dept Reports</div>
        </div>

        {/* Card 2: Course Completion */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Course Completion</span>
            <BookOpen className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {stats.courseCompletionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.totalCompletedCourses} of {stats.totalAssignedCourses} completed
          </div>
        </div>

        {/* Card 3: Assessment Pass Rate */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Assessment Pass</span>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {stats.assessmentPassRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.totalPassedAssessments} passes recorded
          </div>
        </div>

        {/* Card 4: Overdue Items */}
        <div className={`p-4 rounded-2xl border shadow-xs transition ${
          stats.totalOverdueItems > 0 
            ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900" 
            : "bg-white dark:bg-slate-900"
        }`} style={{ borderColor: stats.totalOverdueItems > 0 ? undefined : "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Overdue Learning</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {stats.totalOverdueItems}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.totalOverdueItems > 0 ? "Requires learner attention" : "All learning on track"}
          </div>
        </div>

        {/* Card 5: Certificates */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-xs col-span-2 lg:col-span-1" style={{ borderColor: "var(--theme-border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Certificates Earned</span>
            <Medal className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold" style={{ color: "var(--theme-text)" }}>
            {stats.totalCertificatesEarned}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified credentials</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-3 overflow-x-auto" style={{ borderColor: "var(--theme-border)" }}>
        <button
          onClick={() => { setActiveTab("learners"); setSearchTerm(""); }}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "learners"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Learners ({learners.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("progress"); setSearchTerm(""); }}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "progress"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Progress ({progressItems.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("assessments"); setSearchTerm(""); }}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "assessments"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Assessment Results ({assessmentResults.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("overdue"); setSearchTerm(""); }}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "overdue"
              ? "border-rose-600 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Overdue Learning ({overdueItems.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("assigned"); setSearchTerm(""); }}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "assigned"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Assigned Learning</span>
        </button>

        <button
          onClick={() => { setActiveTab("certificates"); setSearchTerm(""); }}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
            activeTab === "certificates"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Medal className="w-4 h-4" />
          <span>Certificates ({certificates.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search team learners or programs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          style={{ backgroundColor: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
        />
      </div>

      {/* Tab 1: Learners List */}
      {activeTab === "learners" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Learner</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Batches / Groups</th>
                  <th className="px-4 py-3.5">Courses</th>
                  <th className="px-4 py-3.5">Assessments</th>
                  <th className="px-4 py-3.5">Compliance</th>
                  <th className="px-4 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLearners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No learners found in your managed scope.
                    </td>
                  </tr>
                ) : (
                  filteredLearners.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold" style={{ color: "var(--theme-text)" }}>{l.name}</div>
                        <div className="text-[11px] text-slate-400">{l.email} {l.jobTitle ? `• ${l.jobTitle}` : ""}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        {l.department ? `${l.department.name} (${l.department.code})` : "Unassigned"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {l.cohorts.length > 0 && <div>Cohort: {l.cohorts.map(c => c.name).join(", ")}</div>}
                        {l.groups.length > 0 && <div className="text-slate-400">Groups: {l.groups.map(g => g.name).join(", ")}</div>}
                        {l.cohorts.length === 0 && l.groups.length === 0 && "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">{l.completedCoursesCount}</span>
                        <span className="text-slate-400"> / {l.assignedCoursesCount} completed</span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        <span className="text-purple-600 dark:text-purple-400">{l.completedAssessmentsCount}</span>
                        <span className="text-slate-400"> / {l.assignedAssessmentsCount} passed</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {l.overdueCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" />
                            {l.overdueCount} Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            On Track
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedLearnerModal(l)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px] transition"
                        >
                          View Profile
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

      {/* Tab 2: Course Progress */}
      {activeTab === "progress" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Course Title</th>
                  <th className="px-4 py-3.5">Progress</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProgress.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No course progress records found.
                    </td>
                  </tr>
                ) : (
                  filteredProgress.map(p => (
                    <tr key={p.enrollmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold" style={{ color: "var(--theme-text)" }}>{p.studentName}</div>
                        <div className="text-[11px] text-slate-400">{p.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        {p.courseTitle}
                      </td>
                      <td className="px-4 py-3.5 w-44">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                p.progressPercent >= 100 ? "bg-emerald-500" : "bg-blue-600"
                              }`}
                              style={{ width: `${Math.min(100, p.progressPercent)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px]">{p.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === "completed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : p.isOverdue ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}>
                          {p.isOverdue ? "Overdue" : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "No deadline"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Assessment Results */}
      {activeTab === "assessments" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Assessment</th>
                  <th className="px-4 py-3.5">Score</th>
                  <th className="px-4 py-3.5">Result</th>
                  <th className="px-4 py-3.5">Submitted Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No assessment results recorded for your team.
                    </td>
                  </tr>
                ) : (
                  filteredAssessments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold" style={{ color: "var(--theme-text)" }}>{a.studentName}</div>
                        <div className="text-[11px] text-slate-400">{a.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        {a.assessmentTitle}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold">
                        {a.score} / {a.totalPoints} ({a.percentage}%)
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.passed 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}>
                          {a.passed ? "Passed" : "Failed"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(a.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Overdue Learning */}
      {activeTab === "overdue" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/50 dark:bg-rose-950/20 border-b text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Item Title</th>
                  <th className="px-4 py-3.5">Due Date</th>
                  <th className="px-4 py-3.5">Delay</th>
                  <th className="px-4 py-3.5">Mandatory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOverdue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-emerald-600 font-semibold">
                      🎉 Excellent! There are no overdue assignments across your team.
                    </td>
                  </tr>
                ) : (
                  filteredOverdue.map(o => (
                    <tr key={o.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-rose-800 dark:text-rose-300">{o.studentName}</div>
                        <div className="text-[11px] text-slate-400">{o.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {o.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        {o.itemTitle}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(o.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-rose-600 dark:text-rose-400">
                        {o.daysOverdue} days overdue
                      </td>
                      <td className="px-4 py-3.5">
                        {o.isMandatory && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                            Required
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Assigned Learning Overview */}
      {activeTab === "assigned" && (
        <div className="space-y-6">
          {/* Courses */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--theme-text)" }}>
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Assigned Courses ({assignedOverview.courses.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedOverview.courses.map(c => (
                <div key={c.id} className="p-3.5 border rounded-xl flex items-center justify-between" style={{ borderColor: "var(--theme-border)" }}>
                  <div>
                    <div className="font-bold text-xs" style={{ color: "var(--theme-text)" }}>{c.title}</div>
                    <div className="text-[11px] text-slate-400">{c.category} • Avg Progress: {c.averageProgress}%</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-blue-600 dark:text-blue-400">{c.completedCount} / {c.enrolledCount}</span>
                    <div className="text-[10px] text-slate-400 uppercase">Completed</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assessments */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs" style={{ borderColor: "var(--theme-border)" }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--theme-text)" }}>
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span>Assigned Assessments ({assignedOverview.assessments.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedOverview.assessments.map(a => (
                <div key={a.id} className="p-3.5 border rounded-xl flex items-center justify-between" style={{ borderColor: "var(--theme-border)" }}>
                  <div>
                    <div className="font-bold text-xs" style={{ color: "var(--theme-text)" }}>{a.title}</div>
                    <div className="text-[11px] text-slate-400">Pass mark: {a.passingScore}%</div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-purple-600 dark:text-purple-400">{a.completedCount} / {a.assignedCount}</span>
                    <div className="text-[10px] text-slate-400 uppercase">Completed</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Team Certificates */}
      {activeTab === "certificates" && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-xs overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b text-slate-500 font-bold uppercase tracking-wider" style={{ borderColor: "var(--theme-border)" }}>
                <tr>
                  <th className="px-4 py-3.5">Learner</th>
                  <th className="px-4 py-3.5">Certificate Title</th>
                  <th className="px-4 py-3.5">Certificate ID</th>
                  <th className="px-4 py-3.5">Issued Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No certificates earned yet by your managed learners.
                    </td>
                  </tr>
                ) : (
                  certificates.map(cert => (
                    <tr key={cert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold" style={{ color: "var(--theme-text)" }}>{cert.studentName}</div>
                        <div className="text-[11px] text-slate-400">{cert.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold" style={{ color: "var(--theme-text)" }}>
                        {cert.title}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        {cert.certificateNumber}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          cert.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <a
                          href={`/verify-certificate/${cert.verificationCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-[11px] transition"
                        >
                          <span>Verify</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Learner Drilldown Modal */}
      {selectedLearnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border rounded-2xl shadow-xl overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: "var(--theme-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  {selectedLearnerModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: "var(--theme-text)" }}>
                    {selectedLearnerModal.name}
                  </h3>
                  <div className="text-xs text-slate-400">{selectedLearnerModal.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedLearnerModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Department</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {selectedLearnerModal.department?.name || "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Job Title</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {selectedLearnerModal.jobTitle || "Student"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Courses Completed</span>
                  <span className="font-semibold text-emerald-600">
                    {selectedLearnerModal.completedCoursesCount} of {selectedLearnerModal.assignedCoursesCount}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Certificates</span>
                  <span className="font-semibold text-amber-600">
                    {selectedLearnerModal.certificatesCount} earned
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px] mb-1">Assigned Cohorts / Batches</span>
                {selectedLearnerModal.cohorts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLearnerModal.cohorts.map(c => (
                      <span key={c.id} className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono text-[11px]">
                        {c.name} ({c.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No batches assigned.</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px] mb-1">Assigned Groups</span>
                {selectedLearnerModal.groups.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLearnerModal.groups.map(g => (
                      <span key={g.id} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px]">
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No groups assigned.</span>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end" style={{ borderColor: "var(--theme-border)" }}>
              <button
                onClick={() => setSelectedLearnerModal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition"
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
