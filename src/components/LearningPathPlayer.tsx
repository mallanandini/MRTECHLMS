/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Compass, ArrowLeft, ArrowRight, CheckCircle2, Lock, 
  Play, FileText, Video, File, Award, ExternalLink, 
  Download, Clock, Check, AlertCircle, RefreshCw, ShieldAlert,
  ChevronDown, ChevronRight, HelpCircle
} from "lucide-react";
import { LearningPath, LearningPathSection, LearningPathItem } from "../types.js";

interface LearningPathPlayerProps {
  pathId: string;
  authToken: string;
}

export function LearningPathPlayer({ pathId, authToken }: LearningPathPlayerProps) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorRestricted, setErrorRestricted] = useState<{ restricted: boolean; message: string; title?: string } | null>(null);
  const [path, setPath] = useState<any | null>(null);

  // Active Selected Item
  const [activeItem, setActiveItem] = useState<LearningPathItem | null>(null);
  const [isFinalActive, setIsFinalActive] = useState(false);

  // Submitting progress
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Quiz state for practice / final assessments
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; totalPoints: number; passed: boolean } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  // Fetch student player tree
  const loadPathTree = async () => {
    setLoading(true);
    setErrorRestricted(null);
    try {
      const res = await fetch(`/api/student/learning-paths/${pathId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (res.status === 403) {
        const errData = await res.json();
        setErrorRestricted({
          restricted: true,
          message: errData.error || "Access denied. You have not been assigned to this Learning Path.",
          title: errData.learningPathTitle || "Restricted Learning Path"
        });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load learning path details");
      }

      const data = await res.json();
      setPath(data);

      // Select the current or first unlocked item if none selected
      if (!activeItem && !isFinalActive) {
        let firstUnlocked: LearningPathItem | null = null;
        for (const sec of data.sections || []) {
          for (const it of sec.items || []) {
            if ((it.status === "current" || it.status === "completed") && !firstUnlocked) {
              firstUnlocked = it;
            }
            if (it.status === "current") {
              firstUnlocked = it;
              break;
            }
          }
          if (firstUnlocked?.status === "current") break;
        }

        if (firstUnlocked) {
          setActiveItem(firstUnlocked);
        } else if (data.sections?.[0]?.items?.[0]) {
          setActiveItem(data.sections[0].items[0]);
        }
      }
    } catch (err: any) {
      setErrorRestricted({
        restricted: false,
        message: err.message || "An unexpected error occurred while loading this path."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPathTree();
  }, [pathId, authToken]);

  // Reset quiz state when active item changes
  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
  }, [activeItem?.id, isFinalActive]);

  // Handle Mark Complete & Next
  const handleMarkCompleteAndNext = async () => {
    if (!activeItem) return;
    setUpdatingProgress(true);
    try {
      const res = await fetch(`/api/student/learning-path-items/${activeItem.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ completed: true, timeSpentSeconds: 60 })
      });

      if (!res.ok) throw new Error("Failed to save progress");
      
      // Reload tree to get updated status map
      const treeRes = await fetch(`/api/student/learning-paths/${pathId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (treeRes.ok) {
        const data = await treeRes.json();
        setPath(data);

        // Find next item
        const flatItems: LearningPathItem[] = [];
        for (const sec of data.sections || []) {
          for (const it of sec.items || []) {
            flatItems.push(it);
          }
        }
        const currentIndex = flatItems.findIndex(i => i.id === activeItem.id);
        if (currentIndex !== -1 && currentIndex < flatItems.length - 1) {
          const nextItem = flatItems[currentIndex + 1];
          setActiveItem(nextItem);
          setIsFinalActive(false);
        } else if (data.finalAssessment && data.finalAssessment.status !== "locked") {
          setIsFinalActive(true);
          setActiveItem(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProgress(false);
    }
  };

  // Handle assessment submit
  const handleSubmitAssessment = async (assessmentId: string) => {
    setQuizSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          answers: quizAnswers,
          timeTakenSeconds: 120
        })
      });

      if (!res.ok) throw new Error("Failed to submit assessment");
      const data = await res.json();
      setQuizResult({
        score: data.score,
        totalPoints: data.totalPoints,
        passed: data.passed
      });
      setQuizSubmitted(true);

      // Refresh tree to update unlocking status
      const treeRes = await fetch(`/api/student/learning-paths/${pathId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (treeRes.ok) {
        setPath(await treeRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuizSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium font-mono">Loading Learning Journey...</p>
      </div>
    );
  }

  // 2. Strict Access Control Block Screen
  if (errorRestricted) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200/80 dark:border-red-900/50 shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Course/Learning Path Access Restricted
            </h2>
            {errorRestricted.title && (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
                {errorRestricted.title}
              </p>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {errorRestricted.message}
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left text-xs text-slate-500 space-y-1.5 border border-slate-200/60 dark:border-slate-800">
            <p className="font-bold text-slate-700 dark:text-slate-300">Why am I seeing this?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Enrollment in this learning path is managed strictly by administrators</li>
              <li>Self-enrollment or direct link bypassing is not permitted</li>
              <li>Contact your program manager to grant access to your account</li>
            </ul>
          </div>

          <button
            onClick={() => navigate("/student/learning-paths")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Learning Paths</span>
          </button>
        </div>
      </div>
    );
  }

  if (!path) return null;

  // Flatten items to navigate easily
  const flatItems: LearningPathItem[] = [];
  for (const sec of path.sections || []) {
    for (const it of sec.items || []) {
      flatItems.push(it);
    }
  }
  const currentIndex = activeItem ? flatItems.findIndex(i => i.id === activeItem.id) : -1;
  const hasPrevious = currentIndex > 0 || isFinalActive;
  const isLastCurriculumItem = currentIndex === flatItems.length - 1;

  return (
    <div className="max-w-[1440px] w-full min-w-0 font-sans space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/student/learning-paths")}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="Back to Learning Paths"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {path.category} • {path.difficulty}
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {path.title}
            </h1>
          </div>
        </div>

        {/* Overall Path Progress */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              {path.progressPercent || 0}% Completed
            </span>
            <span className="text-[11px] text-slate-400">
              {path.completedItemsCount || 0} of {path.totalItemsCount || 0} items
            </span>
          </div>
          <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${path.progressPercent || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Outline & Right Content Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SYLLABUS OUTLINE (4 COLS) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Curriculum Outline
            </h2>
            <p className="text-[11px] text-slate-400">
              Complete each stage sequentially to unlock milestones.
            </p>
          </div>

          <div className="space-y-4">
            {path.sections?.map((section: LearningPathSection, sIdx: number) => (
              <div key={section.id} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] flex items-center justify-center font-mono">
                    {sIdx + 1}
                  </span>
                  <span className="truncate">{section.title}</span>
                </div>

                <div className="space-y-1 pl-3 border-l-2 border-slate-100 dark:border-slate-800">
                  {section.items?.map((item: any, iIdx: number) => {
                    const isSelected = activeItem?.id === item.id && !isFinalActive;
                    const isCompleted = item.status === "completed";
                    const isCurrent = item.status === "current";
                    const isLocked = item.status === "locked";

                    return (
                      <button
                        key={item.id}
                        disabled={isLocked}
                        onClick={() => {
                          setActiveItem(item);
                          setIsFinalActive(false);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-xs"
                            : isCompleted
                            ? "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            : isCurrent
                            ? "border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                            : "opacity-40 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isCompleted ? (
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-emerald-500"}`} />
                          ) : isLocked ? (
                            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          ) : (
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-blue-600 animate-pulse"}`} />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>

                        <span className="text-[10px] uppercase font-mono opacity-70 shrink-0">
                          {item.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Final Assessment in Sidebar */}
            {path.finalAssessment && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  disabled={path.finalAssessment.status === "locked"}
                  onClick={() => {
                    setIsFinalActive(true);
                    setActiveItem(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-all ${
                    isFinalActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : path.finalAssessment.status === "completed"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : path.finalAssessment.status === "unlocked"
                      ? "border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50/40"
                      : "opacity-40 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="w-4 h-4 shrink-0 text-amber-500" />
                    <span className="truncate">Final Assessment</span>
                  </div>

                  <span className="text-[10px] uppercase font-mono shrink-0">
                    {path.finalAssessment.status}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CONTENT VIEWER (8 COLS) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          {/* FINAL ASSESSMENT VIEW */}
          {isFinalActive && path.finalAssessment ? (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Certification Exam</span>
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {path.finalAssessment.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {path.finalAssessment.description || "Pass this final exam to successfully complete your learning path."}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
                  <span>Duration: {path.finalAssessment.durationMinutes} mins</span>
                  <span>•</span>
                  <span>Passing Score: {path.finalAssessment.passingScore}%</span>
                  <span>•</span>
                  <span>{path.finalAssessment.questions?.length || 0} Questions</span>
                </div>
              </div>

              {quizSubmitted && quizResult ? (
                <div className={`p-6 rounded-xl text-center space-y-3 ${
                  quizResult.passed 
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800"
                }`}>
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center">
                    {quizResult.passed ? (
                      <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {quizResult.passed ? "🎉 Congratulations! You Passed!" : "Assessment Not Passed"}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Your Score: <span className="font-bold">{quizResult.score}</span> / {quizResult.totalPoints} points
                  </p>
                  {quizResult.passed && (
                    <div className="pt-2">
                      <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                        Learning Path Completed
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {path.finalAssessment.questions?.map((q: any, qIdx: number) => (
                    <div key={q.id || qIdx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Q{qIdx + 1}. {q.questionText} ({q.points} pts)
                      </span>
                      <div className="space-y-2">
                        {q.options?.map((opt: string, optIdx: number) => {
                          const isSelected = (quizAnswers[q.id] || []).includes(opt);
                          return (
                            <label
                              key={optIdx}
                              onClick={() => {
                                setQuizAnswers(prev => ({
                                  ...prev,
                                  [q.id]: [opt]
                                }));
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={isSelected}
                                onChange={() => {}}
                                className="text-blue-600"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={() => handleSubmitAssessment(path.finalAssessment.id)}
                      disabled={quizSubmitting}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50"
                    >
                      {quizSubmitting ? "Submitting..." : "Submit Final Assessment"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeItem ? (
            /* ACTIVE LEARNING ITEM VIEW */
            <div className="space-y-6">
              {/* Item Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {activeItem.type} Module
                  </span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{activeItem.durationMinutes} mins</span>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeItem.title}
                </h2>
                {activeItem.description && (
                  <p className="text-xs text-slate-500 mt-1">{activeItem.description}</p>
                )}
              </div>

              {/* 1. TEXT ITEM (RICH FORMATTED MARKDOWN) */}
              {activeItem.type === "text" && (
                <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 space-y-3 leading-relaxed text-xs sm:text-sm">
                  {activeItem.content ? (
                    activeItem.content.split("\n").map((line, idx) => {
                      if (line.startsWith("# ")) {
                        return <h1 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-4 border-b border-slate-100 pb-1">{line.substring(2)}</h1>;
                      }
                      if (line.startsWith("## ")) {
                        return <h2 key={idx} className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-3">{line.substring(3)}</h2>;
                      }
                      if (line.startsWith("### ")) {
                        return <h3 key={idx} className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-2">{line.substring(4)}</h3>;
                      }
                      if (line.startsWith("- ") || line.startsWith("* ")) {
                        return <li key={idx} className="ml-5 list-disc text-slate-700 dark:text-slate-300">{line.substring(2)}</li>;
                      }
                      if (line.trim().startsWith("```")) {
                        return null;
                      }
                      if (line.startsWith("> ")) {
                        return <blockquote key={idx} className="border-l-4 border-blue-500 pl-3 py-1 italic text-slate-600 dark:text-slate-400">{line.substring(2)}</blockquote>;
                      }
                      return <p key={idx} className="text-slate-700 dark:text-slate-300">{line}</p>;
                    })
                  ) : (
                    <p className="text-slate-400 italic">No text content provided.</p>
                  )}
                </div>
              )}

              {/* 2. VIDEO ITEM */}
              {activeItem.type === "video" && (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-md">
                    {activeItem.videoSource === "upload" || activeItem.videoUrl?.startsWith("/storage/") ? (
                      <video src={activeItem.videoUrl} controls className="w-full h-full" />
                    ) : activeItem.videoUrl?.includes("youtube.com") || activeItem.videoUrl?.includes("youtu.be") ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${
                          activeItem.videoUrl.includes("v=") 
                            ? activeItem.videoUrl.split("v=")[1]?.split("&")[0] 
                            : activeItem.videoUrl.split("/").pop()
                        }`}
                        className="w-full h-full border-0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">
                        <Play className="w-10 h-10 text-white/50" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. PDF ITEM */}
              {activeItem.type === "pdf" && (
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <File className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {activeItem.fileName || "Study Material PDF"}
                        </h4>
                        <span className="text-xs text-slate-400">PDF Document • Read or download for offline study</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a
                        href={activeItem.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </a>
                      <a
                        href={activeItem.fileUrl}
                        download
                        className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {activeItem.fileUrl && (
                    <div className="h-[480px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100">
                      <iframe src={activeItem.fileUrl} className="w-full h-full border-0" />
                    </div>
                  )}
                </div>
              )}

              {/* 4. IN-SECTION PRACTICE ASSESSMENT */}
              {activeItem.type === "assessment" && (
                <div className="space-y-6">
                  {quizSubmitted && quizResult ? (
                    <div className={`p-6 rounded-xl text-center space-y-3 ${
                      quizResult.passed 
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800"
                    }`}>
                      <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center">
                        {quizResult.passed ? (
                          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-10 h-10 text-red-600" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {quizResult.passed ? "Checkpoint Passed!" : "Checkpoint Not Passed"}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Score: {quizResult.score} / {quizResult.totalPoints} points
                      </p>
                      <button
                        onClick={handleMarkCompleteAndNext}
                        className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs"
                      >
                        Proceed to Next Stage
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {activeItem.assessment?.questions?.map((q: any, qIdx: number) => (
                        <div key={q.id || qIdx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            Q{qIdx + 1}. {q.questionText} ({q.points} pts)
                          </span>
                          <div className="space-y-2">
                            {q.options?.map((opt: string, optIdx: number) => {
                              const isSelected = (quizAnswers[q.id] || []).includes(opt);
                              return (
                                <label
                                  key={optIdx}
                                  onClick={() => {
                                    setQuizAnswers(prev => ({
                                      ...prev,
                                      [q.id]: [opt]
                                    }));
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 font-semibold"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`pq-${q.id}`}
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="text-blue-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {activeItem.assessment?.id && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleSubmitAssessment(activeItem.assessment!.id)}
                            disabled={quizSubmitting}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors disabled:opacity-50"
                          >
                            {quizSubmitting ? "Evaluating..." : "Submit Checkpoint Quiz"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BOTTOM NAVIGATION FOOTER */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  disabled={!hasPrevious}
                  onClick={() => {
                    if (isFinalActive) {
                      setIsFinalActive(false);
                      setActiveItem(flatItems[flatItems.length - 1]);
                    } else if (currentIndex > 0) {
                      setActiveItem(flatItems[currentIndex - 1]);
                    }
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {activeItem.type !== "assessment" && (
                  <button
                    onClick={handleMarkCompleteAndNext}
                    disabled={updatingProgress}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <span>{updatingProgress ? "Saving..." : isLastCurriculumItem ? "Complete & Final Assessment" : "Complete & Next"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">
              Select a stage from the curriculum outline on the left to begin learning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
