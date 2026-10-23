/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Trophy, Flame, Award, Medal, Shield, Sparkles, 
  Eye, EyeOff, Calendar, History, ArrowUpRight, CheckCircle2, 
  Lock, ChevronRight, User, Users, RefreshCw
} from "lucide-react";
import { useToast } from "../../context/NotificationContext.js";
import { useAuth } from "../../context/AuthContext.js";

interface GamificationOverview {
  isEnabled: boolean;
  profile: {
    totalPoints: number;
    currentStreakDays: number;
    longestStreakDays: number;
    lastActiveDate: string | null;
    tier: "novice" | "apprentice" | "scholar" | "master" | "grandmaster" | "legend";
    nextTier: string | null;
    pointsNeededForNext: number;
    tierProgressPct: number;
    leaderboardAnonymous: boolean;
  };
  config: {
    pointsLessonComplete: number;
    pointsCourseComplete: number;
    pointsAssessmentPass: number;
    pointsLearningPathComplete: number;
    pointsCodingChallengeSolve: number;
    pointsDailyStreakBonus: number;
    leaderboardEnabled: boolean;
  };
  earnedBadges: any[];
  lockedBadges: any[];
  recentLedger: any[];
  streakHistory: any[];
  leaderboardPreview: any;
}

interface LeaderboardData {
  enabled: boolean;
  timeframe: string;
  scope: string;
  anonymityMode: string;
  currentUserRank: number | null;
  totalParticipants: number;
  items: Array<{
    rank: number;
    studentId: string;
    displayName: string;
    isCurrentUser: boolean;
    isAnonymous: boolean;
    profilePhoto: string | null;
    points: number;
    currentStreak: number;
    longestStreak: number;
    tier: string;
    departmentName: string | null;
    badgesCount: number;
  }>;
}

interface StudentGamificationPageProps {
  defaultTab?: "overview" | "leaderboard" | "badges" | "ledger";
}

export function StudentGamificationPage({ defaultTab = "overview" }: StudentGamificationPageProps) {
  const { authToken } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "badges" | "ledger">(defaultTab);

  const [overview, setOverview] = useState<GamificationOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Leaderboard filter states
  const [timeframe, setTimeframe] = useState<"all_time" | "this_month" | "this_week">("all_time");
  const [scope, setScope] = useState<"organization" | "department">("organization");
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Privacy toggle loading
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  const getEffectiveToken = () => {
    return authToken || localStorage.getItem("lms_token") || localStorage.getItem("token");
  };

  // Fetch Student Gamification Overview
  const fetchOverview = async (signal?: AbortSignal) => {
    try {
      const token = getEffectiveToken();
      if (!token) return;
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await fetch("/api/gamification/student/overview", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "x-timezone": userTz
        },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Failed to load gamification overview", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Leaderboard
  const fetchLeaderboard = async (signal?: AbortSignal) => {
    setLoadingLeaderboard(true);
    try {
      const token = getEffectiveToken();
      if (!token) return;
      const res = await fetch(`/api/gamification/student/leaderboard?timeframe=${timeframe}&scope=${scope}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Failed to load leaderboard", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    const token = getEffectiveToken();
    if (!token) return;
    const controller = new AbortController();
    fetchOverview(controller.signal);
    return () => {
      controller.abort();
    };
  }, [authToken]);

  useEffect(() => {
    const token = getEffectiveToken();
    if (!token) return;
    if (activeTab === "leaderboard") {
      const controller = new AbortController();
      fetchLeaderboard(controller.signal);
      return () => {
        controller.abort();
      };
    }
  }, [activeTab, timeframe, scope, authToken]);

  // Handle Privacy Toggle
  const handleTogglePrivacy = async (anonymous: boolean) => {
    setUpdatingPrivacy(true);
    try {
      const token = getEffectiveToken();
      const res = await fetch("/api/gamification/student/privacy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ anonymous })
      });
      if (res.ok) {
        if (overview) {
          setOverview({
            ...overview,
            profile: {
              ...overview.profile,
              leaderboardAnonymous: anonymous
            }
          });
        }
        toast.showSuccess(anonymous ? "Leaderboard anonymity enabled." : "Leaderboard real name enabled.");
        if (activeTab === "leaderboard") fetchLeaderboard();
      }
    } catch (err) {
      console.error(err);
      toast.showError("Failed to update privacy preference.");
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const getTierDetails = (tier: string) => {
    switch (tier) {
      case "legend":
        return {
          title: "Legend",
          gradient: "from-amber-500 via-rose-500 to-purple-600",
          textColor: "text-amber-500",
          bgColor: "bg-amber-50 dark:bg-amber-950/40",
          borderColor: "border-amber-400 dark:border-amber-600"
        };
      case "grandmaster":
        return {
          title: "Grandmaster",
          gradient: "from-purple-600 to-indigo-600",
          textColor: "text-purple-500",
          bgColor: "bg-purple-50 dark:bg-purple-950/40",
          borderColor: "border-purple-400 dark:border-purple-600"
        };
      case "master":
        return {
          title: "Master",
          gradient: "from-indigo-600 to-blue-600",
          textColor: "text-indigo-500",
          bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
          borderColor: "border-indigo-400 dark:border-indigo-600"
        };
      case "scholar":
        return {
          title: "Scholar",
          gradient: "from-emerald-600 to-teal-600",
          textColor: "text-emerald-500",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
          borderColor: "border-emerald-400 dark:border-emerald-600"
        };
      case "apprentice":
        return {
          title: "Apprentice",
          gradient: "from-blue-600 to-cyan-600",
          textColor: "text-blue-500",
          bgColor: "bg-blue-50 dark:bg-blue-950/40",
          borderColor: "border-blue-400 dark:border-blue-600"
        };
      case "novice":
      default:
        return {
          title: "Novice",
          gradient: "from-slate-600 to-slate-800",
          textColor: "text-slate-500",
          bgColor: "bg-slate-50 dark:bg-slate-800/40",
          borderColor: "border-slate-300 dark:border-slate-700"
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // If organization has disabled gamification
  if (overview && !overview.isEnabled) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Gamification Is Inactive
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
          Your organization administrator has currently disabled gamification, points, and leaderboards. 
          When activated, you will be able to track points, earn achievement badges, and view rankings.
        </p>
      </div>
    );
  }

  if (!overview) return null;

  const currentTier = getTierDetails(overview.profile.tier);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HERO STATUS CARD */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Learner Rewards & Achievements
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Gamification Dashboard
            </h1>
            <p className="text-amber-100 text-sm max-w-xl">
              Complete lessons, conquer assessments, and solve coding challenges to climb ranks and earn badges!
            </p>
          </div>

          {/* Quick Metrics Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Points Pillar */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-white/80 block">
                Total Points
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5 block text-amber-300">
                {overview.profile.totalPoints}
              </span>
              <span className="text-[10px] text-white/70">Points Balance</span>
            </div>

            {/* Streak Pillar */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-white/80 block flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-300 fill-orange-300" />
                Streak
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5 block text-orange-300">
                {overview.profile.currentStreakDays}d
              </span>
              <span className="text-[10px] text-white/70">Best: {overview.profile.longestStreakDays}d</span>
            </div>

            {/* Badges Pillar */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-white/80 block flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5 text-yellow-300" />
                Badges
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono mt-0.5 block text-yellow-300">
                {overview.earnedBadges.length}
              </span>
              <span className="text-[10px] text-white/70">Unlocked</span>
            </div>
          </div>
        </div>

        {/* Level Progression Bar */}
        <div className="mt-8 pt-6 border-t border-white/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2 gap-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-300" />
              Current Rank: <span className="uppercase text-amber-300 font-bold">{currentTier.title}</span>
            </span>
            {overview.profile.nextTier ? (
              <span className="text-white/80">
                {overview.profile.pointsNeededForNext} points needed for <strong className="text-white uppercase">{overview.profile.nextTier}</strong>
              </span>
            ) : (
              <span className="text-amber-300 font-bold">Max Rank Reached (Legendary Scholar)</span>
            )}
          </div>
          <div className="w-full bg-black/25 rounded-full h-3 overflow-hidden p-0.5 border border-white/20">
            <div
              className="bg-gradient-to-r from-amber-300 to-yellow-400 h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${overview.profile.tierProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Navigation & Privacy Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs sm:text-sm rounded-lg transition-colors ${
              activeTab === "overview"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Overview & Streak
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs sm:text-sm rounded-lg transition-colors ${
              activeTab === "leaderboard"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("badges")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs sm:text-sm rounded-lg transition-colors ${
              activeTab === "badges"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Award className="w-4 h-4" />
            Badges ({overview.earnedBadges.length}/{overview.earnedBadges.length + overview.lockedBadges.length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-xs sm:text-sm rounded-lg transition-colors ${
              activeTab === "ledger"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            Points Ledger
          </button>
        </div>

        {/* Privacy Anonymity Switch */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs">
          {overview.profile.leaderboardAnonymous ? (
            <EyeOff className="w-4 h-4 text-purple-500" />
          ) : (
            <Eye className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-slate-700 dark:text-slate-300">
            {overview.profile.leaderboardAnonymous ? "Anonymous on Leaderboard" : "Visible Real Name"}
          </span>
          <button
            type="button"
            disabled={updatingPrivacy}
            onClick={() => handleTogglePrivacy(!overview.profile.leaderboardAnonymous)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ml-1 ${
              overview.profile.leaderboardAnonymous ? "bg-purple-600" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                overview.profile.leaderboardAnonymous ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & STREAK */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Streaks & How to Earn */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Streak Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
                    <Flame className="w-6 h-6 fill-orange-500 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      Daily Learning Streak
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Log in and complete at least one lesson or assessment each day to protect your streak.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-orange-500 block">
                    {overview.profile.currentStreakDays} Days
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Current Streak
                  </span>
                </div>
              </div>

              {/* 14-day calendar strip */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Recent 14-Day Activity Checkpoints:
                </span>
                <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (13 - i));
                    const dateStr = date.toISOString().split("T")[0];
                    const dayLabel = date.toLocaleDateString("en-US", { weekday: "narrow" });
                    const isDone = overview.streakHistory.some((s: any) => s.activityDate === dateStr);

                    return (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-[28px]">
                        <span className="text-[10px] text-slate-400">{dayLabel}</span>
                        <div
                          title={`${dateStr}: ${isDone ? "Active" : "No Activity"}`}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                            isDone
                              ? "bg-orange-500 text-white shadow-sm ring-2 ring-orange-200 dark:ring-orange-900"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isDone ? <Flame className="w-3.5 h-3.5 fill-current" /> : "·"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* How to Earn Points Guide */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                How to Earn Controlled Points
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      📖
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Lesson Completed</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    +{overview.config.pointsLessonComplete} Pts
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      🎓
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Course 100% Complete</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    +{overview.config.pointsCourseComplete} Pts
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      📝
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Assessment Passed</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    +{overview.config.pointsAssessmentPass} Pts
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      🧭
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Learning Path Finished</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    +{overview.config.pointsLearningPathComplete} Pts
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                      💻
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Coding Problem Solved</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    +{overview.config.pointsCodingChallengeSolve} Pts
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                      🔥
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Daily Streak Bonus</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                    +{overview.config.pointsDailyStreakBonus} Pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Badges Showcase & Leaderboard Teaser */}
          <div className="space-y-6">
            {/* Top Badges */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Earned Achievements
                </h3>
                <button
                  onClick={() => setActiveTab("badges")}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  View All ({overview.earnedBadges.length})
                </button>
              </div>

              {overview.earnedBadges.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Award className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No badges unlocked yet. Complete your first lesson to begin!
                </div>
              ) : (
                <div className="space-y-3">
                  {overview.earnedBadges.slice(0, 4).map((b: any) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center text-lg font-bold">
                        🏆
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate block">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {b.description}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        +{b.bonusPoints} Pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard Teaser Card */}
            {overview.config.leaderboardEnabled && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-indigo-500" />
                    Top Scholars
                  </h3>
                  <button
                    onClick={() => setActiveTab("leaderboard")}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    Leaderboard <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {overview.leaderboardPreview?.items?.slice(0, 3).map((item: any, idx: number) => (
                  <div
                    key={item.studentId}
                    className="flex items-center justify-between py-2 border-b border-indigo-100/60 dark:border-slate-700/40 last:border-none text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-slate-300 text-slate-700" : "bg-amber-700 text-white"
                      }`}>
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.displayName}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {item.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Timeframe:</span>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setTimeframe("all_time")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    timeframe === "all_time"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimeframe("this_month")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    timeframe === "this_month"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setTimeframe("this_week")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    timeframe === "this_week"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  This Week
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Scope:</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="organization">Organization-Wide</option>
                <option value="department">My Department</option>
              </select>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loadingLeaderboard ? (
              <div className="text-center py-16 text-slate-500">Loading standings...</div>
            ) : !leaderboard || leaderboard.items.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                No leaderboard standings found for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                      <th className="py-3.5 px-4">Learner</th>
                      <th className="py-3.5 px-4">Tier</th>
                      <th className="py-3.5 px-4 text-center">Streak</th>
                      <th className="py-3.5 px-4 text-center">Badges</th>
                      <th className="py-3.5 px-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leaderboard.items.map((item) => (
                      <tr
                        key={item.studentId}
                        className={`transition-colors ${
                          item.isCurrentUser
                            ? "bg-amber-50/70 dark:bg-amber-950/30 font-semibold"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          {item.rank === 1 ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-amber-400 text-white items-center justify-center font-bold text-xs shadow-sm">
                              🥇
                            </span>
                          ) : item.rank === 2 ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-white items-center justify-center font-bold text-xs shadow-sm">
                              🥈
                            </span>
                          ) : item.rank === 3 ? (
                            <span className="inline-flex w-7 h-7 rounded-full bg-amber-700 text-white items-center justify-center font-bold text-xs shadow-sm">
                              🥉
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500 font-bold">
                              #{item.rank}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs">
                              {item.isAnonymous ? "👤" : item.displayName.charAt(0)}
                            </div>
                            <div>
                              <span className={`text-slate-900 dark:text-slate-100 block ${item.isCurrentUser ? "text-amber-800 dark:text-amber-400 font-bold" : ""}`}>
                                {item.displayName}
                              </span>
                              {item.departmentName && (
                                <span className="text-[10px] text-slate-400 block">{item.departmentName}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.tier}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-mono text-orange-500 font-bold">
                            <Flame className="w-3.5 h-3.5 fill-current" />
                            {item.currentStreak}d
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {item.badgesCount}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                            {item.points}
                          </span>
                          <span className="text-[10px] text-slate-400 block">pts</span>
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

      {/* TAB 3: BADGES */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Your Badge Showcase
            </h3>
            <p className="text-xs text-slate-500">
              Collect badges across courses, assessments, coding problems, and streak records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Earned Badges */}
            {overview.earnedBadges.map((badge: any) => (
              <div
                key={badge.id}
                className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl p-5 shadow-sm relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                        🏆
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{badge.name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {badge.tier}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                    {badge.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[10px]">
                    Awarded: {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : "Active"}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    +{badge.bonusPoints} Pts
                  </span>
                </div>
              </div>
            ))}

            {/* Locked Badges */}
            {overview.lockedBadges.map((badge: any) => (
              <div
                key={badge.id}
                className="bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 opacity-75 hover:opacity-100 transition-opacity flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xl">
                        <Lock className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">{badge.name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {badge.tier}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                      Locked
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {badge.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[10px]">
                    Goal: {badge.criteriaType.replace(/_/g, " ")} ≥ {badge.criteriaThreshold}
                  </span>
                  <span className="font-bold text-slate-400">
                    +{badge.bonusPoints} Pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: POINTS LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Personal Points Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Verified record of all points awarded to your profile by the system.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-center">Points</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overview.recentLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    overview.recentLedger.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tx.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            +{tx.points}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {tx.balanceAfter}
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
    </div>
  );
}
