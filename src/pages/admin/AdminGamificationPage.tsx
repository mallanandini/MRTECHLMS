/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Trophy, Award, Flame, Settings, ShieldCheck, Plus, Check, 
  RotateCcw, AlertTriangle, Users, History, Filter, Search, 
  Calendar, Medal, Sparkles, CheckCircle2, XCircle, ArrowUpRight
} from "lucide-react";
import { useToast } from "../../context/NotificationContext.js";
import { useAuth } from "../../context/AuthContext.js";

interface GamificationConfig {
  id: string;
  organizationId: string;
  isEnabled: boolean;
  pointsLessonComplete: number;
  pointsCourseComplete: number;
  pointsAssessmentPass: number;
  pointsLearningPathComplete: number;
  pointsCodingChallengeSolve: number;
  pointsDailyStreakBonus: number;
  leaderboardEnabled: boolean;
  leaderboardScope: "organization" | "department" | "cohort" | "group";
  leaderboardAnonymity: "real_name" | "partial_name" | "optional_anonymous";
}

interface BadgeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  criteriaType: string;
  criteriaThreshold: number;
  bonusPoints: number;
  status: string;
  isSystem: boolean;
  totalIssued: number;
}

interface LedgerItem {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  eventType: string;
  points: number;
  balanceAfter: number;
  description: string;
  awardedBy: string;
  createdAt: string;
}

export function AdminGamificationPage() {
  const { authToken } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"settings" | "badges" | "ledger">("settings");

  // Config State
  const [config, setConfig] = useState<GamificationConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Badges State
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  // Form State for Custom Badge
  const [newBadge, setNewBadge] = useState({
    name: "",
    code: "",
    description: "",
    icon: "Award",
    tier: "bronze" as "bronze" | "silver" | "gold" | "platinum" | "diamond",
    criteriaType: "lessons_completed",
    criteriaThreshold: 5,
    bonusPoints: 50
  });

  // Manual Issue / Revoke State
  const [studentIdInput, setStudentIdInput] = useState("");
  const [awardNote, setAwardNote] = useState("");
  const [revocationReason, setRevocationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Ledger State
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerFilterEvent, setLedgerFilterEvent] = useState("");
  const [ledgerSearchStudent, setLedgerSearchStudent] = useState("");
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    studentId: "",
    points: 50,
    reason: ""
  });

  const getEffectiveToken = () => {
    return authToken || localStorage.getItem("lms_token") || localStorage.getItem("token");
  };

  // 1. Fetch Configuration
  const fetchConfig = async (signal?: AbortSignal) => {
    setLoadingConfig(true);
    try {
      const token = getEffectiveToken();
      if (!token) return;
      const res = await fetch("/api/gamification/admin/config", {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        toast.showError("Failed to fetch gamification settings.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      toast.showError("Network error loading gamification configuration.");
    } finally {
      setLoadingConfig(false);
    }
  };

  // 2. Fetch Badges
  const fetchBadges = async (signal?: AbortSignal) => {
    setLoadingBadges(true);
    try {
      const token = getEffectiveToken();
      if (!token) return;
      const res = await fetch("/api/gamification/admin/badges", {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setBadges(data);
      } else {
        toast.showError("Failed to load badges.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      toast.showError("Failed to load badges.");
    } finally {
      setLoadingBadges(false);
    }
  };

  // 3. Fetch Points Ledger
  const fetchLedger = async (signal?: AbortSignal) => {
    setLoadingLedger(true);
    try {
      const token = getEffectiveToken();
      if (!token) return;
      const params = new URLSearchParams();
      if (ledgerFilterEvent) params.append("eventType", ledgerFilterEvent);
      if (ledgerSearchStudent) params.append("studentId", ledgerSearchStudent);

      const res = await fetch(`/api/gamification/admin/ledger?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setLedgerItems(data.items || []);
      } else {
        toast.showError("Failed to load points ledger.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      toast.showError("Failed to load points ledger.");
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    const token = getEffectiveToken();
    if (!token) return;
    const controller = new AbortController();
    fetchConfig(controller.signal);
    return () => {
      controller.abort();
    };
  }, [authToken]);

  useEffect(() => {
    const token = getEffectiveToken();
    if (!token) return;
    const controller = new AbortController();
    if (activeTab === "badges") fetchBadges(controller.signal);
    if (activeTab === "ledger") fetchLedger(controller.signal);
    return () => {
      controller.abort();
    };
  }, [activeTab, authToken, ledgerFilterEvent]);

  // Handle Save Configuration
  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const token = getEffectiveToken();
      const res = await fetch("/api/gamification/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        toast.showSuccess("Gamification settings saved successfully.");
      } else {
        toast.showError("Failed to update gamification settings.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Network error saving configuration.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Create Badge
  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBadge.name.trim()) {
      toast.showError("Please enter a badge name.");
      return;
    }
    setActionLoading(true);
    try {
      const token = getEffectiveToken();
      const res = await fetch("/api/gamification/admin/badges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBadge)
      });
      if (res.ok) {
        toast.showSuccess(`Badge "${newBadge.name}" created successfully.`);
        setIsCreateModalOpen(false);
        setNewBadge({
          name: "",
          code: "",
          description: "",
          icon: "Award",
          tier: "bronze",
          criteriaType: "lessons_completed",
          criteriaThreshold: 5,
          bonusPoints: 50
        });
        fetchBadges();
      } else {
        const err = await res.json();
        toast.showError(err.error || "Failed to create badge.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error creating badge.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Issue Badge
  const handleIssueBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBadge || !studentIdInput.trim()) {
      toast.showError("Please provide a valid student ID.");
      return;
    }
    setActionLoading(true);
    try {
      const token = getEffectiveToken();
      const res = await fetch(`/api/gamification/admin/badges/${selectedBadge.id}/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentIdInput.trim(),
          note: awardNote.trim()
        })
      });
      if (res.ok) {
        toast.showSuccess(`Badge "${selectedBadge.name}" issued successfully!`);
        setIsIssueModalOpen(false);
        setStudentIdInput("");
        setAwardNote("");
        fetchBadges();
      } else {
        const err = await res.json();
        toast.showError(err.error || "Failed to issue badge.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error issuing badge.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Revoke Badge
  const handleRevokeBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBadge || !studentIdInput.trim() || !revocationReason.trim()) {
      toast.showError("Student ID and revocation reason are required for audit compliance.");
      return;
    }
    setActionLoading(true);
    try {
      const token = getEffectiveToken();
      const res = await fetch(`/api/gamification/admin/badges/${selectedBadge.id}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentIdInput.trim(),
          reason: revocationReason.trim()
        })
      });
      if (res.ok) {
        toast.showSuccess(`Badge "${selectedBadge.name}" revoked successfully.`);
        setIsRevokeModalOpen(false);
        setStudentIdInput("");
        setRevocationReason("");
        fetchBadges();
      } else {
        const err = await res.json();
        toast.showError(err.error || "Failed to revoke badge.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error revoking badge.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Manual Points Adjustment
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustData.studentId.trim() || !adjustData.reason.trim()) {
      toast.showError("Student ID and reason are mandatory.");
      return;
    }
    setActionLoading(true);
    try {
      const token = getEffectiveToken();
      const res = await fetch("/api/gamification/admin/adjust-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adjustData)
      });
      if (res.ok) {
        toast.showSuccess(`Points adjustment applied successfully.`);
        setIsAdjustModalOpen(false);
        setAdjustData({ studentId: "", points: 50, reason: "" });
        fetchLedger();
      } else {
        const err = await res.json();
        toast.showError(err.error || "Failed to adjust points.");
      }
    } catch (err) {
      console.error(err);
      toast.showError("Error applying points adjustment.");
    } finally {
      setActionLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "diamond": return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700";
      case "platinum": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700";
      case "gold": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700";
      case "silver": return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600";
      case "bronze":
      default: return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Enterprise Gamification & Recognition
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gamification & Badges Engine</h1>
            <p className="text-amber-100 text-sm mt-1 max-w-2xl">
              Configure tenant point rewards, define achievement badges, manage streaks, and monitor audit ledgers.
              Gamification is optional and fully configurable per organization.
            </p>
          </div>

          {/* Quick Toggle Status */}
          {config && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider block text-white/80 font-medium">Status</span>
                <span className={`text-base font-bold ${config.isEnabled ? "text-emerald-300" : "text-slate-300"}`}>
                  {config.isEnabled ? "Active" : "Disabled"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  config.isEnabled ? "bg-emerald-500" : "bg-slate-500"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    config.isEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inactive System Alert if Disabled */}
      {config && !config.isEnabled && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300">Gamification Is Disabled</h4>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              Learners in this organization will not earn points, maintain streaks, or see leaderboards while gamification is turned off. 
              Toggle the switch above and click "Save Settings" to activate.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          Point Rules & Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("badges")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "badges"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          Badges & Achievements ({badges.length})
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "ledger"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-4 h-4" />
          Points Ledger & Audit
        </button>
      </div>

      {/* TAB 1: SETTINGS & RULES */}
      {activeTab === "settings" && (
        loadingConfig ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <RotateCcw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading gamification settings...</span>
          </div>
        ) : !config ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-center p-6">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Gamification Settings Unavailable</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
              Could not retrieve settings for this organization. Ensure your account is authorized.
            </p>
            <button
              onClick={() => fetchConfig()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controlled Points Matrix */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Controlled Points Matrix</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Points are awarded server-side exclusively upon verified completion events. Client manipulation is blocked.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lesson Completed (+Pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.pointsLessonComplete}
                    onChange={(e) => setConfig({ ...config, pointsLessonComplete: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course 100% Completed (+Pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.pointsCourseComplete}
                    onChange={(e) => setConfig({ ...config, pointsCourseComplete: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Passed (+Pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.pointsAssessmentPass}
                    onChange={(e) => setConfig({ ...config, pointsAssessmentPass: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Learning Path Completed (+Pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.pointsLearningPathComplete}
                    onChange={(e) => setConfig({ ...config, pointsLearningPathComplete: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Coding Challenge Solved (+Pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.pointsCodingChallengeSolve}
                    onChange={(e) => setConfig({ ...config, pointsCodingChallengeSolve: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Streak Bonus (+Pts)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.pointsDailyStreakBonus}
                    onChange={(e) => setConfig({ ...config, pointsDailyStreakBonus: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Leaderboard & Privacy Settings */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Medal className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Leaderboard & Privacy Scope</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Configure who appears on rankings and respect student privacy with configurable anonymity modes.
                </p>

                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                        Enable Leaderboard
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Allow learners to view relative ranks and weekly standings
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, leaderboardEnabled: !config.leaderboardEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        config.leaderboardEnabled ? "bg-indigo-600" : "bg-slate-400"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.leaderboardEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Leaderboard Scope
                    </label>
                    <select
                      value={config.leaderboardScope}
                      onChange={(e) => setConfig({ ...config, leaderboardScope: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="organization">Organization-Wide (All learners in organization)</option>
                      <option value="department">Department-Scoped (Only peer department learners)</option>
                      <option value="cohort">Cohort-Scoped (Batch learners)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Student Anonymity & Privacy Mode
                    </label>
                    <select
                      value={config.leaderboardAnonymity}
                      onChange={(e) => setConfig({ ...config, leaderboardAnonymity: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="optional_anonymous">Student Preference (Learners choose if they wish to show real name or Anonymous)</option>
                      <option value="partial_name">Partial Name Masking (Displays "First L." e.g. "Sarah M.")</option>
                      <option value="real_name">Full Real Name (Displays full profile names to all peers)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingConfig ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Gamification Settings
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* TAB 2: BADGES & ACHIEVEMENTS */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Badge Definitions & Criteria</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System and custom badges awarded upon meeting automated criteria or manual faculty recognition.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Define Custom Badge
              </button>
            </div>
          </div>

          {loadingBadges ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <RotateCcw className="w-6 h-6 text-amber-500 animate-spin mb-2" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Loading badges...</span>
            </div>
          ) : badges.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
              <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No Badges Found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">No badge definitions have been created yet.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
              >
                Define Custom Badge
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xl border border-amber-300 dark:border-amber-700 shadow-inner">
                          🏆
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{badge.name}</h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTierColor(badge.tier)}`}>
                            {badge.tier}
                          </span>
                        </div>
                      </div>
                      {badge.isSystem ? (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono">
                          System
                        </span>
                      ) : (
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono border border-indigo-200 dark:border-indigo-800">
                          Custom
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                      {badge.description}
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800 text-xs space-y-1 mb-4">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Criteria:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {badge.criteriaType.replace(/_/g, " ")} ≥ {badge.criteriaThreshold}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Bonus Award:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          +{badge.bonusPoints} Pts
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Learners Awarded:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {badge.totalIssued}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setSelectedBadge(badge);
                        setIsIssueModalOpen(true);
                      }}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold transition-colors"
                    >
                      Issue to Student
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBadge(badge);
                        setIsRevokeModalOpen(true);
                      }}
                      className="py-1.5 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-xs font-semibold transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: POINTS LEDGER & AUDITING */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Points Ledger Audit Trail</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable, tenant-scoped ledger tracking all awarded and adjusted points with balance snapshots.
              </p>
            </div>
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adjust Learner Points
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Student ID..."
                value={ledgerSearchStudent}
                onChange={(e) => setLedgerSearchStudent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLedger()}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              />
            </div>
            <select
              value={ledgerFilterEvent}
              onChange={(e) => {
                setLedgerFilterEvent(e.target.value);
                setTimeout(fetchLedger, 50);
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="">All Event Types</option>
              <option value="lesson_completed">Lesson Completed</option>
              <option value="course_completed">Course Completed</option>
              <option value="assessment_passed">Assessment Passed</option>
              <option value="learning_path_completed">Learning Path Completed</option>
              <option value="coding_solved">Coding Challenge Solved</option>
              <option value="streak_bonus">Streak Daily Bonus</option>
              <option value="badge_unlocked">Badge Achievement Unlocked</option>
              <option value="manual_adjustment">Admin Manual Adjustment</option>
            </select>
            <button
              onClick={fetchLedger}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>

          {/* Ledger Table */}
          <div className="w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="w-full min-w-0 overflow-x-auto focus:outline-none">
              <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Points</th>
                    <th className="py-3 px-4">Balance After</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Awarded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingLedger ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        Loading points transactions...
                      </td>
                    </tr>
                  ) : ledgerItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No points ledger records found for this criteria.
                      </td>
                    </tr>
                  ) : (
                    ledgerItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {item.studentName || item.studentId}
                          </span>
                          {item.studentEmail && (
                            <span className="text-[10px] text-slate-400 block">{item.studentEmail}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-bold font-mono ${
                              item.points >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {item.points > 0 ? `+${item.points}` : item.points}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {item.balanceAfter}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 text-[10px] font-mono text-slate-400">
                          {item.awardedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM BADGE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Define Custom Badge</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new achievement badge tailored to your organization's learning curriculum.
            </p>

            <form onSubmit={handleCreateBadge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Badge Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Architect"
                  value={newBadge.name}
                  onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe achievement criteria..."
                  value={newBadge.description}
                  onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tier</label>
                  <select
                    value={newBadge.tier}
                    onChange={(e) => setNewBadge({ ...newBadge, tier: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bonus Points</label>
                  <input
                    type="number"
                    min="0"
                    value={newBadge.bonusPoints}
                    onChange={(e) => setNewBadge({ ...newBadge, bonusPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Criteria Type</label>
                  <select
                    value={newBadge.criteriaType}
                    onChange={(e) => setNewBadge({ ...newBadge, criteriaType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="lessons_completed">Lessons Completed</option>
                    <option value="courses_completed">Courses Completed</option>
                    <option value="assessments_passed">Assessments Passed</option>
                    <option value="coding_challenges_solved">Coding Solved</option>
                    <option value="streak_days">Streak Days</option>
                    <option value="total_points">Total Points</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={newBadge.criteriaThreshold}
                    onChange={(e) => setNewBadge({ ...newBadge, criteriaThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Create Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE BADGE MANUAL */}
      {isIssueModalOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Issue Badge: {selectedBadge.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Manually award this badge to recognize outstanding learner contributions.
            </p>

            <form onSubmit={handleIssueBadge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Student UUID (e.g. user-123)"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Recognition Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Awarded for exceptional capstone performance"
                  value={awardNote}
                  onChange={(e) => setAwardNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Confirm Award
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVOKE BADGE (MANDATORY AUDIT REASON) */}
      {isRevokeModalOpen && selectedBadge && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Revoke Badge: {selectedBadge.name}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Revoking a badge removes it from the student profile and records an audit compliance log entry.
            </p>

            <form onSubmit={handleRevokeBadge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Student UUID"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">
                  Mandatory Revocation Audit Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide explicit rationale for revocation (e.g. academic integrity violation or erroneous manual issuance)..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-rose-300 dark:border-rose-800 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRevokeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Revoke Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL POINTS ADJUSTMENT */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Adjust Learner Points
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Directly credit or debit learner points with full ledger logging and audit trail.
            </p>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student User ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Student UUID"
                  value={adjustData.studentId}
                  onChange={(e) => setAdjustData({ ...adjustData, studentId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Points Adjustment (Positive or Negative Integer)
                </label>
                <input
                  type="number"
                  required
                  value={adjustData.points}
                  onChange={(e) => setAdjustData({ ...adjustData, points: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Hackathon winner bonus points"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
