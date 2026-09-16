/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Code, Terminal, Globe, CheckCircle2, Clock, 
  Search, Filter, Play, Sparkles, Check, 
  Award, ArrowRight, Layers, Cpu, AlertCircle, RefreshCw,
  Binary, Coffee, Database, Code2, FolderCode, ChevronRight,
  Home, BookOpen, ExternalLink
} from "lucide-react";
import { CodingChallenge, RuntimeInfo, CodingChapter, CodingTopic, StudentPlaygroundProgram } from "../../types.js";
import { PlaygroundProgramsModal } from "./PlaygroundProgramsModal.js";

interface CodingCatalogProps {
  authToken: string;
  onSelectChallenge: (challengeId: string) => void;
  onOpenPlayground: () => void;
  studentName?: string;
}

export function CodingCatalog({
  authToken,
  onSelectChallenge,
  onOpenPlayground,
  studentName = "Student"
}: CodingCatalogProps) {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<"curriculum" | "all_challenges">("curriculum");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Hierarchy Data
  const [chapters, setChapters] = useState<CodingChapter[]>([]);
  const [currentChapterDetails, setCurrentChapterDetails] = useState<any | null>(null);
  const [currentTopicDetails, setCurrentTopicDetails] = useState<any | null>(null);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Challenges & Runtimes Data
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [runtimes, setRuntimes] = useState<RuntimeInfo[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Saved Programs Modal State
  const [myPrograms, setMyPrograms] = useState<StudentPlaygroundProgram[]>([]);
  const [isProgramsModalOpen, setIsProgramsModalOpen] = useState(false);

  // 1. Fetch Chapters and Overall Challenges
  const loadData = useCallback(async () => {
    setLoadingChallenges(true);
    setError(null);
    try {
      const [rtRes, chRes, chaptersRes, progsRes] = await Promise.all([
        fetch("/api/coding/runtimes"),
        fetch("/api/coding/challenges", {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch("/api/coding/chapters", {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetch("/api/playground/programs", {
          headers: { Authorization: `Bearer ${authToken}` }
        })
      ]);

      if (chRes.ok) {
        const chData = await chRes.json();
        setChallenges(Array.isArray(chData) ? chData : []);
      }

      if (chaptersRes.ok) {
        const chapData = await chaptersRes.json();
        setChapters(Array.isArray(chapData) ? chapData : []);
      }

      if (rtRes.ok) {
        const rtData = await rtRes.json();
        setRuntimes(Array.isArray(rtData) ? rtData : []);
      }

      if (progsRes.ok) {
        const pData = await progsRes.json();
        setMyPrograms(Array.isArray(pData) ? pData : []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load coding catalog");
    } finally {
      setLoadingChallenges(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Load Chapter Details when selected
  useEffect(() => {
    if (!selectedChapterId) {
      setCurrentChapterDetails(null);
      return;
    }

    async function fetchChapter() {
      setLoadingHierarchy(true);
      try {
        const res = await fetch(`/api/coding/chapters/${selectedChapterId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentChapterDetails(data);
        }
      } catch (err) {
        console.error("Failed to load chapter:", err);
      } finally {
        setLoadingHierarchy(false);
      }
    }
    fetchChapter();
  }, [selectedChapterId, authToken]);

  // 3. Load Topic Details when selected
  useEffect(() => {
    if (!selectedTopicId) {
      setCurrentTopicDetails(null);
      return;
    }

    async function fetchTopic() {
      setLoadingHierarchy(true);
      try {
        const res = await fetch(`/api/coding/topics/${selectedTopicId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentTopicDetails(data);
        }
      } catch (err) {
        console.error("Failed to load topic:", err);
      } finally {
        setLoadingHierarchy(false);
      }
    }
    fetchTopic();
  }, [selectedTopicId, authToken]);

  // Derived Metrics
  const totalCount = challenges.length;
  const solvedCount = challenges.filter(c => c.isSolved || c.status === "solved").length;
  const inProgressCount = challenges.filter(c => c.status === "in_progress").length;
  const successRate = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  // Filtered Challenges for "All Challenges" tab
  const filteredChallenges = useMemo(() => {
    return challenges.filter(c => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        const matchCat = c.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      // Difficulty
      if (selectedDifficulty !== "all" && c.difficulty !== selectedDifficulty) {
        return false;
      }

      // Type
      if (selectedType !== "all" && c.challengeType !== selectedType) {
        return false;
      }

      // Language
      if (selectedLanguage !== "all") {
        if (c.challengeType === "web" && selectedLanguage === "web") {
          // match
        } else if (!c.supportedLanguages?.includes(selectedLanguage)) {
          return false;
        }
      }

      // Status
      if (selectedStatus !== "all") {
        if (selectedStatus === "solved" && !(c.isSolved || c.status === "solved")) return false;
        if (selectedStatus === "in_progress" && c.status !== "in_progress") return false;
        if (selectedStatus === "unsolved" && (c.isSolved || c.status === "solved")) return false;
      }

      return true;
    });
  }, [challenges, searchQuery, selectedDifficulty, selectedType, selectedLanguage, selectedStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("all");
    setSelectedType("all");
    setSelectedLanguage("all");
    setSelectedStatus("all");
  };

  const getChapterIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case "binary": return <Binary className="w-5 h-5 text-blue-400" />;
      case "globe": return <Globe className="w-5 h-5 text-emerald-400" />;
      case "code2": return <Code2 className="w-5 h-5 text-amber-400" />;
      case "coffee": return <Coffee className="w-5 h-5 text-orange-400" />;
      case "database": return <Database className="w-5 h-5 text-purple-400" />;
      default: return <Code className="w-5 h-5 text-blue-400" />;
    }
  };

  // Saved Programs Management handlers
  const handleOpenSavedProgram = (prog: StudentPlaygroundProgram) => {
    onOpenPlayground();
  };

  const handleDeleteSavedProgram = async (id: string) => {
    try {
      const res = await fetch(`/api/playground/programs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setMyPrograms(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete program:", err);
    }
  };

  const handleRenameSavedProgram = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/playground/programs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setMyPrograms(prev => prev.map(p => p.id === id ? { ...p, title: newTitle } : p));
      }
    } catch (err) {
      console.error("Failed to rename program:", err);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 pb-12">
      {/* Hero & Header with Playground Launcher */}
      <div 
        style={{
          backgroundColor: "var(--theme-card-bg, #ffffff)",
          borderColor: "var(--theme-border, #e2e8f0)"
        }}
        className="rounded-2xl border p-6 sm:p-8 shadow-sm relative overflow-hidden"
      >
        <div className="absolute right-0 bottom-0 top-0 w-1/4 opacity-5 dark:opacity-10 flex items-center justify-center pointer-events-none overflow-hidden">
          <img src="/mr-logo-icon.png" alt="" className="w-48 h-48 object-contain transform translate-x-12 translate-y-6" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <img src="/mr-logo-icon.png" alt="MR Logo" className="w-4 h-4 object-contain" />
              <span>MR TECHNOLOGIES • Coding Practice & DSA Curriculum</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Coding Challenges & Online Playground
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Structured curriculum from Data Structures & Algorithms to Full Stack Web Development and Database Queries. Practice with live compilers and instant test case evaluation.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenPlayground}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
              >
                <Terminal className="w-4 h-4" />
                <span>Open Free Code Playground</span>
                <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded font-mono">IDE</span>
              </button>

              <button
                onClick={() => setIsProgramsModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                <FolderCode className="w-4 h-4 text-blue-400" />
                <span>My Saved Programs</span>
                {myPrograms.length > 0 && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded-full font-bold">
                    {myPrograms.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div 
              style={{ backgroundColor: "var(--theme-bg-muted, #f8fafc)", borderColor: "var(--theme-border, #e2e8f0)" }}
              className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center min-w-[100px]"
            >
              <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Problems</div>
            </div>

            <div 
              style={{ backgroundColor: "var(--theme-bg-muted, #f8fafc)", borderColor: "var(--theme-border, #e2e8f0)" }}
              className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center min-w-[100px]"
            >
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5" />
                <span>{solvedCount}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Solved</div>
            </div>

            <div 
              style={{ backgroundColor: "var(--theme-bg-muted, #f8fafc)", borderColor: "var(--theme-border, #e2e8f0)" }}
              className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center min-w-[100px]"
            >
              <div className="text-2xl font-black text-amber-500 flex items-center gap-1">
                <Clock className="w-5 h-5" />
                <span>{inProgressCount}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">In Progress</div>
            </div>

            <div 
              style={{ backgroundColor: "var(--theme-bg-muted, #f8fafc)", borderColor: "var(--theme-border, #e2e8f0)" }}
              className="p-3.5 rounded-xl border flex flex-col items-center justify-center text-center min-w-[100px]"
            >
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{successRate}%</div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Runtime Engines Strip */}
        {runtimes.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-2">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Verified Compiler Runtimes:
            </span>
            {runtimes.filter(r => r.available).map(rt => (
              <span
                key={rt.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                title={`${rt.name} (${rt.version || "Active"})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {rt.name}
                {rt.version && <span className="opacity-75">v{rt.version.split(" ")[0]}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Mode Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setViewMode("curriculum")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === "curriculum"
              ? "bg-blue-600 text-white shadow-md shadow-blue-950/30"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Curriculum Explorer (DSA & Topics)</span>
        </button>

        <button
          onClick={() => {
            setViewMode("all_challenges");
            setSelectedChapterId(null);
            setSelectedTopicId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === "all_challenges"
              ? "bg-blue-600 text-white shadow-md shadow-blue-950/30"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <Code className="w-4 h-4" />
          <span>All Problems Catalog ({totalCount})</span>
        </button>
      </div>

      {/* ==========================================
          CURRICULUM EXPLORER MODE
          ========================================== */}
      {viewMode === "curriculum" && (
        <div className="space-y-6">
          {/* Breadcrumb Bar */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => {
                setSelectedChapterId(null);
                setSelectedTopicId(null);
              }}
              className="flex items-center gap-1 hover:text-blue-500 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>All Chapters</span>
            </button>

            {selectedChapterId && currentChapterDetails && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <button
                  onClick={() => setSelectedTopicId(null)}
                  className={`hover:text-blue-500 transition-colors ${!selectedTopicId ? "font-bold text-white" : ""}`}
                >
                  {currentChapterDetails.title}
                </button>
              </>
            )}

            {selectedTopicId && currentTopicDetails && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-bold text-white">{currentTopicDetails.title}</span>
              </>
            )}
          </div>

          {/* LEVEL 1: ALL CHAPTERS GRID */}
          {!selectedChapterId && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {chapters.map((ch) => {
                const percent = ch.problemsCount && ch.problemsCount > 0 
                  ? Math.round(((ch.solvedCount || 0) / ch.problemsCount) * 100) 
                  : 0;

                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChapterId(ch.id)}
                    style={{
                      backgroundColor: "var(--theme-card-bg, #ffffff)",
                      borderColor: "var(--theme-border, #e2e8f0)"
                    }}
                    className="group rounded-2xl border p-6 shadow-sm hover:shadow-lg hover:border-blue-500/50 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 group-hover:scale-105 transition-transform">
                          {getChapterIcon(ch.icon)}
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {ch.topicsCount || 0} Topics
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                          {ch.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {ch.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>{ch.problemsCount || 0} Problems</span>
                        <span className="text-emerald-500 font-semibold">{ch.solvedCount || 0} Solved ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-end text-xs font-bold text-blue-500 pt-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Explore Chapter</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LEVEL 2: TOPICS GRID (Inside Chapter) */}
          {selectedChapterId && !selectedTopicId && currentChapterDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentChapterDetails.title}
                  </h2>
                  <p className="text-xs text-slate-400">{currentChapterDetails.description}</p>
                </div>
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 rounded-lg hover:bg-slate-800 transition"
                >
                  ← Back to Chapters
                </button>
              </div>

              {loadingHierarchy ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading topics...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(currentChapterDetails.topics || []).map((topic: any, idx: number) => {
                    const hasProblems = (topic.problemsCount || 0) > 0;
                    return (
                      <div
                        key={topic.id}
                        onClick={() => hasProblems && setSelectedTopicId(topic.id)}
                        style={{
                          backgroundColor: "var(--theme-card-bg, #ffffff)",
                          borderColor: "var(--theme-border, #e2e8f0)"
                        }}
                        className={`rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                          hasProblems 
                            ? "hover:shadow-md hover:border-blue-500/40 cursor-pointer group" 
                            : "opacity-75"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-500">
                              #{idx + 1}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                              {topic.problemsCount || 0} Problems
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                            {topic.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {topic.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-emerald-500 font-semibold">
                            {topic.solvedCount || 0} solved
                          </span>
                          {hasProblems ? (
                            <span className="font-bold text-blue-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              Practice ({topic.problemsCount})
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Curriculum Guide</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* LEVEL 3: PROBLEMS LIST (Inside Topic) */}
          {selectedTopicId && currentTopicDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {currentTopicDetails.title}
                  </h2>
                  <p className="text-xs text-slate-400">{currentTopicDetails.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTopicId(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 rounded-lg hover:bg-slate-800 transition"
                >
                  ← Back to Topics
                </button>
              </div>

              {loadingHierarchy ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading topic problems...
                </div>
              ) : (currentTopicDetails.problems || []).length === 0 ? (
                <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No coding problems assigned to this topic yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Check other topics or browse all challenges.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(currentTopicDetails.problems || []).map((problem: any) => {
                    const isSolved = problem.isSolved || problem.status === "solved";
                    const isInProgress = problem.status === "in_progress";

                    return (
                      <div
                        key={problem.id}
                        style={{
                          backgroundColor: "var(--theme-card-bg, #ffffff)",
                          borderColor: "var(--theme-border, #e2e8f0)"
                        }}
                        className={`group rounded-2xl border p-5 shadow-sm hover:shadow-md transition duration-200 hover:border-blue-500/40 flex flex-col justify-between ${
                          isSolved ? "border-emerald-500/30" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                problem.difficulty === "easy"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : problem.difficulty === "medium"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {problem.difficulty}
                            </span>

                            {isSolved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Solved</span>
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>In Progress</span>
                              </span>
                            ) : null}
                          </div>

                          <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-500 transition line-clamp-1">
                              {problem.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              {problem.description?.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "")}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {problem.challengeType === "web" ? (
                              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                                HTML5 • CSS3 • JS
                              </span>
                            ) : (
                              (problem.supportedLanguages || []).map((lang: string) => (
                                <span
                                  key={lang}
                                  className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                                >
                                  {lang}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            {problem.challengeType === "web" ? "Web Sandbox" : `${problem.publicTestCases?.length || 0} Test Cases`}
                          </span>

                          <button
                            onClick={() => onSelectChallenge(problem.id)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                              isSolved
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                            }`}
                          >
                            <span>{isSolved ? "Solve Again" : isInProgress ? "Resume" : "Solve Challenge"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          ALL CHALLENGES (Flat Discovery Mode)
          ========================================== */}
      {viewMode === "all_challenges" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div 
            style={{
              backgroundColor: "var(--theme-card-bg, #ffffff)",
              borderColor: "var(--theme-border, #e2e8f0)"
            }}
            className="rounded-2xl border p-4 shadow-sm space-y-4"
          >
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search challenges by title, keyword, or concept..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Filter Selects */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="programming">Algorithms & SQL</option>
                  <option value="web">Web Development</option>
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={e => setSelectedDifficulty(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <select
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Languages</option>
                  <option value="python">Python 3</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="sql">SQL (SQLite)</option>
                  <option value="web">Web (HTML/CSS)</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="solved">Solved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="unsolved">Unsolved</option>
                </select>

                {(searchQuery || selectedDifficulty !== "all" || selectedType !== "all" || selectedLanguage !== "all" || selectedStatus !== "all") && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-500 transition"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Challenges Grid */}
          {loadingChallenges ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading challenge catalog...</p>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div 
              style={{
                backgroundColor: "var(--theme-card-bg, #ffffff)",
                borderColor: "var(--theme-border, #e2e8f0)"
              }}
              className="rounded-2xl border p-12 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <Code className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No challenges match your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query, difficulty, or category filter to discover available challenges.
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChallenges.map(challenge => {
                const isSolved = challenge.isSolved || challenge.status === "solved";
                const isInProgress = challenge.status === "in_progress";

                return (
                  <div
                    key={challenge.id}
                    style={{
                      backgroundColor: "var(--theme-card-bg, #ffffff)",
                      borderColor: "var(--theme-border, #e2e8f0)"
                    }}
                    className={`group rounded-2xl border p-5 shadow-sm transition duration-200 hover:shadow-md hover:border-blue-500/40 flex flex-col justify-between relative ${
                      isSolved ? "border-emerald-500/30" : ""
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {challenge.challengeType === "web" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              <Globe className="w-3 h-3" />
                              Web Dev
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <Terminal className="w-3 h-3" />
                              Algorithm
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              challenge.difficulty === "easy"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : challenge.difficulty === "medium"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {challenge.difficulty}
                          </span>
                        </div>

                        {isSolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Solved</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" />
                            <span>In Progress</span>
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-500 transition line-clamp-1">
                          {challenge.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {challenge.description?.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "")}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {challenge.category}
                        </span>
                        {challenge.challengeType === "web" ? (
                          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                            HTML5 • CSS3 • JS
                          </span>
                        ) : (
                          challenge.supportedLanguages?.map(lang => (
                            <span
                              key={lang}
                              className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                            >
                              {lang}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400 font-medium">
                        {challenge.challengeType === "web"
                          ? "Interactive Sandbox"
                          : `${challenge.publicTestCases?.length || 0} Test Cases`}
                      </div>

                      <button
                        onClick={() => onSelectChallenge(challenge.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          isSolved
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                        }`}
                      >
                        <span>{isSolved ? "Practice Again" : isInProgress ? "Resume" : "Solve Challenge"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Programs Modal */}
      <PlaygroundProgramsModal
        isOpen={isProgramsModalOpen}
        onClose={() => setIsProgramsModalOpen(false)}
        programs={myPrograms}
        onOpenProgram={handleOpenSavedProgram}
        onDeleteProgram={handleDeleteSavedProgram}
        onRenameProgram={handleRenameSavedProgram}
      />
    </div>
  );
}
