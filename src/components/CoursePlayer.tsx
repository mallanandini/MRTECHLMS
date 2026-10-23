/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, FileText, Code, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, 
  ThumbsUp, Star, MessageSquare, ArrowLeft, Download, Send, ShieldAlert,
  Award, ExternalLink, X, Check, Clock, AlertCircle, Image as ImageIcon,
  Lock, RotateCcw, BookOpen, GripVertical, Copy
} from "lucide-react";
import { Course, Module, Lesson, LessonType, Review, Assessment, Question, QuestionType } from "../types.js";

function getEmbedVideo(url?: string) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: "native", videoUrl: url };
}

interface CoursePlayerProps {
  courseId: string;
  authToken: string;
  onBack: () => void;
  onLessonCompleteChange: (lessonId: string, completed: boolean) => void;
  completedLessons: string[];
}

export function CoursePlayer({ 
  courseId, authToken, onBack, onLessonCompleteChange, completedLessons 
}: CoursePlayerProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [finalAssessment, setFinalAssessment] = useState<Assessment | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [resumeData, setResumeData] = useState<{ lastLessonId: string | null; lastPositionSeconds: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Interactive Assessment Runner State
  const [takingAssessmentId, setTakingAssessmentId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<{ assessment: Assessment; questions: Question[] } | null>(null);
  const [testAnswers, setTestAnswers] = useState<{ [qId: string]: string[] }>({});
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ score: number; totalPoints: number; passed: boolean } | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const [activeTab, setActiveTab] = useState<"content" | "reviews">("content");
  
  // Mobile Syllabus & Locked Lesson Navigation States
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [enforceSequential, setEnforceSequential] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<{ lesson: Lesson; prereq: Lesson | null } | null>(null);
  const [expandedModules, setExpandedModules] = useState<{ [modId: string]: boolean }>({});

  // Review form state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // AI Explainer State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  // Collapsible & Resizable Supporting Panel State (AI & Curriculum)
  const [isSupportPanelOpen, setIsSupportPanelOpen] = useState(false); // Collapsed by default!
  const [activeSupportTab, setActiveSupportTab] = useState<"ai" | "curriculum">("ai");
  const [panelWidth, setPanelWidth] = useState(400); // Default width 400px (approx 380-420px)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(400);
  const didDragRef = useRef<boolean>(false);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setModules(data.modules);
        setLessons(data.lessons);
        setReviews(data.reviews || []);
        setFinalAssessment(data.finalAssessment || null);

        // Fetch resume state
        let targetLesson: Lesson | undefined;
        try {
          const resRes = await fetch(`/api/student/courses/${courseId}/resume`, {
            headers: { "Authorization": `Bearer ${authToken}` }
          });
          if (resRes.ok) {
            const rData = await resRes.json();
            setResumeData(rData);
            if (rData.lastLessonId) {
              targetLesson = data.lessons.find((l: Lesson) => l.id === rData.lastLessonId);
            }
          }
        } catch (e) {
          // ignore resume load error
        }

        if (!activeLesson) {
          setActiveLesson(targetLesson || (data.lessons.length > 0 ? data.lessons[0] : null));
        }
      }
    } catch (e) {
      console.error("Error loading course details", e);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  // Restore video playback position if resuming
  useEffect(() => {
    if (videoRef.current && resumeData?.lastPositionSeconds && activeLesson?.id === resumeData.lastLessonId) {
      videoRef.current.currentTime = resumeData.lastPositionSeconds;
    }
  }, [activeLesson?.id, resumeData]);

  const handleStartAssessment = async (assessmentId: string) => {
    setTakingAssessmentId(assessmentId);
    setTestResult(null);
    setTestAnswers({});
    setLoadingTest(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTest(data);
      }
    } catch (err) {
      console.error("Error loading assessment", err);
    } finally {
      setLoadingTest(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!takingAssessmentId) return;
    setTestSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${takingAssessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ answers: testAnswers, timeTakenSeconds: 60 })
      });
      if (res.ok) {
        const result = await res.json();
        setTestResult({
          score: result.score,
          totalPoints: result.totalPoints || result.submission?.totalPoints || activeTest?.assessment?.totalPoints || 0,
          passed: result.passed
        });
        if (result.passed) {
          if (activeLesson && (activeLesson.assessmentId === takingAssessmentId || activeLesson.practiceTest?.id === takingAssessmentId)) {
            onLessonCompleteChange(activeLesson.id, true);
          }
          fetchCourseDetails();
        }
      }
    } catch (err) {
      console.error("Error submitting assessment", err);
    } finally {
      setTestSubmitting(false);
    }
  };

  const lastReportedTimeRef = useRef<number>(-1);
  const activeTimeSpentRef = useRef<number>(0);
  const hasReportedConsumptionRef = useRef<boolean>(false);

  const reportLessonProgress = async (
    lessonId: string,
    updates: {
      lastPositionSeconds?: number;
      progressPercent?: number;
      timeSpentSeconds?: number;
      event?: string;
    }
  ) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/student/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.progress?.completed && !completedLessons.includes(lessonId)) {
          onLessonCompleteChange(lessonId, true);
        }
      }
    } catch (err) {
      console.error("Progress report failed:", err);
    }
  };

  // Automatically expand all modules when course modules load
  useEffect(() => {
    if (modules.length > 0) {
      const map: { [key: string]: boolean } = {};
      modules.forEach(m => { map[m.id] = true; });
      setExpandedModules(map);
    }
  }, [modules]);

  // Track consumption time for reading, PDF, image, and coding activities
  useEffect(() => {
    hasReportedConsumptionRef.current = false;
    activeTimeSpentRef.current = 0;
    lastReportedTimeRef.current = -1;

    const timer = setInterval(() => {
      activeTimeSpentRef.current += 1;

      if (
        activeLesson &&
        !completedLessons.includes(activeLesson.id) &&
        activeLesson.type !== LessonType.VIDEO &&
        activeLesson.type !== LessonType.ASSESSMENT &&
        !activeLesson.practiceTest &&
        !hasReportedConsumptionRef.current &&
        activeTimeSpentRef.current >= 8
      ) {
        hasReportedConsumptionRef.current = true;
        reportLessonProgress(activeLesson.id, {
          progressPercent: 100,
          timeSpentSeconds: activeTimeSpentRef.current,
          event: "material_read"
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeLesson?.id, completedLessons]);

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!activeLesson || completedLessons.includes(activeLesson.id)) return;
    if (activeLesson.type === LessonType.VIDEO || activeLesson.type === LessonType.ASSESSMENT || activeLesson.practiceTest) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 60 || ((scrollTop + clientHeight) / scrollHeight) >= 0.85;

    if (isNearBottom && !hasReportedConsumptionRef.current && activeTimeSpentRef.current >= 3) {
      hasReportedConsumptionRef.current = true;
      reportLessonProgress(activeLesson.id, {
        progressPercent: 100,
        timeSpentSeconds: activeTimeSpentRef.current,
        event: "material_read"
      });
    }
  };

  const currentLessonIndex = lessons.findIndex(l => l.id === activeLesson?.id);
  const prevLesson = currentLessonIndex > 0 ? lessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1 ? lessons[currentLessonIndex + 1] : null;

  // Locked lesson detection based on sequential flow
  const isLessonLocked = (lesson: Lesson): boolean => {
    if (!enforceSequential) return false;
    const idx = lessons.findIndex(l => l.id === lesson.id);
    if (idx <= 0) return false;
    if (completedLessons.includes(lesson.id)) return false;
    const prev = lessons[idx - 1];
    return !!prev && !completedLessons.includes(prev.id);
  };

  const handleNavigateLesson = (targetLesson: Lesson) => {
    setActiveLesson(targetLesson);
    // Track access and set resume pointer
    fetch(`/api/student/lessons/${targetLesson.id}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ lastPositionSeconds: 0, timeSpentSeconds: 1 })
    }).catch(() => {});
  };

  const handleSelectLesson = (targetLesson: Lesson) => {
    if (isLessonLocked(targetLesson)) {
      const idx = lessons.findIndex(l => l.id === targetLesson.id);
      const prereq = idx > 0 ? lessons[idx - 1] : null;
      setLockedNotice({ lesson: targetLesson, prereq });
      return;
    }
    setLockedNotice(null);
    handleNavigateLesson(targetLesson);
    setShowMobileSidebar(false);
  };

  // Keyboard accessibility shortcuts: Alt + ArrowRight for next, Alt + ArrowLeft for previous
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.altKey && e.key === "ArrowRight") {
        if (nextLesson && !isLessonLocked(nextLesson)) {
          handleSelectLesson(nextLesson);
        }
      } else if (e.altKey && e.key === "ArrowLeft") {
        if (prevLesson) {
          handleSelectLesson(prevLesson);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextLesson, prevLesson, lessons, completedLessons, enforceSequential]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && activeLesson) {
      const current = Math.floor(videoRef.current.currentTime);
      const duration = Math.floor(videoRef.current.duration) || 1;
      const percent = Math.min(100, Math.round((current / duration) * 100));

      if (
        (current > 0 && current % 5 === 0 && current !== lastReportedTimeRef.current) ||
        (percent >= 90 && !completedLessons.includes(activeLesson.id))
      ) {
        lastReportedTimeRef.current = current;
        reportLessonProgress(activeLesson.id, {
          lastPositionSeconds: current,
          progressPercent: percent,
          timeSpentSeconds: 5
        });
      }
    }
  };

  const handleVideoEnded = () => {
    if (activeLesson && !completedLessons.includes(activeLesson.id)) {
      const duration = Math.floor(videoRef.current?.duration || 0);
      reportLessonProgress(activeLesson.id, {
        lastPositionSeconds: duration,
        progressPercent: 100,
        timeSpentSeconds: 5,
        event: "video_ended"
      });
    }
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        setComment("");
        setRating(5);
        fetchCourseDetails(); // Reload course with new reviews and average ratings
      }
    } catch (err) {
      console.error("Error submitting review", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAskAI = async () => {
    const textToQuery = aiQuery.trim() || (activeLesson ? activeLesson.title : course?.title) || "";
    if (!textToQuery) return;

    setIsAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          content: textToQuery, 
          context: `Course: ${course?.title || ""}. Active Lesson: ${activeLesson?.title || ""}` 
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.explanation) {
        setAiResponse(data.explanation);
      } else {
        setAiResponse(data.error || "AI assistant is currently unavailable. Please try again.");
      }
    } catch (err) {
      console.error("AI Error", err);
      setAiResponse("Could not reach AI services. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle pointer down on the divider between Lesson Content and Support Panel
  const handleDividerPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = panelWidth;
    didDragRef.current = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = dragStartXRef.current - moveEvent.clientX; // dragging left widens panel
      if (Math.abs(delta) > 3) {
        if (!didDragRef.current) {
          didDragRef.current = true;
          setIsDragging(true);
        }
      }
      const rawWidth = dragStartWidthRef.current + delta;
      
      // If user drags towards right edge (< 220px), collapse it
      if (rawWidth < 220) {
        setIsSupportPanelOpen(false);
      } else {
        setIsSupportPanelOpen(true);
        const clamped = Math.min(540, Math.max(320, rawWidth));
        setPanelWidth(clamped);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Handle pointer down on the collapsed vertical handle on the right edge
  const handleCollapsedHandlePointerDown = (e: React.PointerEvent) => {
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = 0;
    didDragRef.current = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = dragStartXRef.current - moveEvent.clientX;
      if (delta > 8) {
        if (!didDragRef.current) {
          didDragRef.current = true;
          setIsDragging(true);
        }
        setIsSupportPanelOpen(true);
        setActiveSupportTab("ai");
        const clamped = Math.min(540, Math.max(320, delta));
        setPanelWidth(clamped);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (didDragRef.current) {
        setIsDragging(false);
      } else {
        // Direct click/tap without drag
        setIsSupportPanelOpen(true);
        setActiveSupportTab("ai");
        setPanelWidth(400);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleCollapsedHandleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!didDragRef.current) {
      setIsSupportPanelOpen(true);
      setActiveSupportTab("ai");
      setPanelWidth(400);
    }
  };

  const handleDividerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPanelWidth(w => Math.min(540, w + 20));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPanelWidth(w => {
        const next = w - 20;
        if (next < 320) {
          setIsSupportPanelOpen(false);
          return 400;
        }
        return next;
      });
    } else if (e.key === "Escape" || e.key === "Home") {
      e.preventDefault();
      setIsSupportPanelOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsSupportPanelOpen(prev => !prev);
    }
  };

  const handleCopyAiResponse = async () => {
    if (!aiResponse) return;
    try {
      await navigator.clipboard.writeText(aiResponse);
      setCopiedAi(true);
      setTimeout(() => setCopiedAi(false), 2000);
    } catch {}
  };

  const renderAiInstructorContent = () => (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-blue-500/20" />
          <span>Lesson Context Aware</span>
        </div>
        <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 truncate">
          Active: {activeLesson?.title || course?.title}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
          Ask Course AI
        </label>
        <textarea
          rows={3}
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
          placeholder={`Ask about ${activeLesson ? activeLesson.title : "this lesson"}, code examples, or concepts...`}
          className="w-full border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-850 transition"
        />

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setAiQuery("Explain the core concept in simple terms with an analogy.")}
            className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
          >
            💡 Core concept
          </button>
          <button
            type="button"
            onClick={() => setAiQuery("Give me a practical code example illustrating this topic.")}
            className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
          >
            💻 Code example
          </button>
          <button
            type="button"
            onClick={() => setAiQuery("What are the most common mistakes or pitfalls here?")}
            className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
          >
            ⚠️ Pitfalls & bugs
          </button>
        </div>

        <button
          type="button"
          onClick={handleAskAI}
          disabled={isAiLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isAiLoading ? "Consulting AI Instructor..." : "Ask AI Instructor"}</span>
        </button>
      </div>

      {aiResponse && (
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 space-y-2.5 leading-relaxed font-sans shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini Explainer Output
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyAiResponse}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-200/50 dark:hover:bg-slate-750 transition cursor-pointer"
                title="Copy explanation"
              >
                {copiedAi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setAiResponse("")}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-200/50 dark:hover:bg-slate-750 transition cursor-pointer"
                title="Clear output"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="whitespace-pre-line text-xs max-h-80 overflow-y-auto pr-1">
            {aiResponse}
          </div>
        </div>
      )}
    </div>
  );

  if (accessDenied) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center max-w-md mx-auto my-16 space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Course Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          You are not currently enrolled in this course. Course access is assigned by your LMS Administrator.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderSyllabus = (isMobile: boolean = false) => (
    <div className="space-y-4">
      {/* Header controls for syllabus */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Curriculum Outline</h3>
        </div>
        {/* Sequential Progression Toggle */}
        <button
          onClick={() => setEnforceSequential(!enforceSequential)}
          title={enforceSequential ? "Sequential progression active: prior lessons must be completed" : "Flexible mode: explore any lesson"}
          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition flex items-center gap-1 cursor-pointer ${
            enforceSequential 
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <Lock className="w-2.5 h-2.5" />
          <span>{enforceSequential ? "Linear Lock: ON" : "Linear Lock: OFF"}</span>
        </button>
      </div>

      {/* Modules List with Collapsible Accordions */}
      <div className="space-y-3">
        {modules.map((mod, modIdx) => {
          const moduleLessons = lessons.filter(les => les.moduleId === mod.id);
          const completedInModule = moduleLessons.filter(l => completedLessons.includes(l.id)).length;
          const isExpanded = expandedModules[mod.id] !== false;

          return (
            <div 
              key={mod.id} 
              className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !isExpanded }))}
                className="w-full p-3 flex items-center justify-between text-left bg-slate-50/70 dark:bg-slate-850 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400">
                      Module {modIdx + 1}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {completedInModule}/{moduleLessons.length} Done
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                    {mod.title}
                  </h4>
                </div>
                <ChevronRight 
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-90" : ""}`} 
                />
              </button>

              {isExpanded && (
                <div className="p-1.5 space-y-1 border-t border-slate-100 dark:border-slate-800">
                  {moduleLessons.map((les) => {
                    const isCompleted = completedLessons.includes(les.id);
                    const isActive = activeLesson?.id === les.id;
                    const isLocked = isLessonLocked(les);

                    return (
                      <button
                        key={les.id}
                        type="button"
                        onClick={() => handleSelectLesson(les)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center gap-2.5 transition cursor-pointer ${
                          isActive 
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-800" 
                            : isLocked
                              ? "opacity-50 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                          isCompleted 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : isLocked
                              ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                              : isActive 
                                ? "border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400" 
                                : "border-slate-200 dark:border-slate-700 text-slate-400"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                          ) : isLocked ? (
                            <Lock className="w-3 h-3 text-slate-400" />
                          ) : les.type === LessonType.VIDEO ? (
                            <Play className="w-3 h-3 fill-current" />
                          ) : les.type === LessonType.CODING ? (
                            <Code className="w-3 h-3" />
                          ) : les.type === LessonType.IMAGE ? (
                            <ImageIcon className="w-3 h-3" />
                          ) : les.type === LessonType.ASSESSMENT ? (
                            <Award className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                        </div>
                        <span className="truncate flex-1">{les.title}</span>
                        {isLocked ? (
                          <span className="text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 py-0.5 rounded shrink-0">
                            Locked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                            {les.durationMinutes}m
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Course Final Certification Assessment */}
      {finalAssessment && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              if (isMobile) setShowMobileSidebar(false);
              handleStartAssessment(finalAssessment.id);
            }}
            className="w-full p-3 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 rounded-xl text-left transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono font-bold uppercase text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">
                Course Final Exam
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                {finalAssessment.durationMinutes}m • {finalAssessment.passingScore}% Pass
              </span>
            </div>
            <p className="text-xs font-bold text-purple-900 dark:text-purple-200 truncate">
              {finalAssessment.title}
            </p>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-600 dark:text-slate-400 transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-tight">{course.title}</h2>
              {course.version && (
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                  v{course.version}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">Instructor: {course.instructorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Syllabus Toggle Button */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setActiveSupportTab("curriculum");
                setShowMobileSidebar(true);
              } else {
                if (isSupportPanelOpen && activeSupportTab === "curriculum") {
                  setIsSupportPanelOpen(false);
                } else {
                  setIsSupportPanelOpen(true);
                  setActiveSupportTab("curriculum");
                }
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isSupportPanelOpen && activeSupportTab === "curriculum"
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
            aria-label="Toggle Syllabus Outline"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Syllabus ({completedLessons.filter(id => lessons.some(l => l.id === id)).length}/{lessons.length})</span>
          </button>

          {/* Ask AI Instructor Toggle Button */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setActiveSupportTab("ai");
                setShowMobileSidebar(true);
              } else {
                if (isSupportPanelOpen && activeSupportTab === "ai") {
                  setIsSupportPanelOpen(false);
                } else {
                  setIsSupportPanelOpen(true);
                  setActiveSupportTab("ai");
                }
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isSupportPanelOpen && activeSupportTab === "ai"
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
            aria-label="Toggle AI Instructor"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {resumeData?.lastLessonId && resumeData.lastLessonId !== activeLesson?.id && (
            <button
              onClick={() => {
                const target = lessons.find(l => l.id === resumeData.lastLessonId);
                if (target) handleSelectLesson(target);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Last Lesson</span>
            </button>
          )}
          <span className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 px-3 py-1 rounded-full font-mono">
            {completedLessons.filter(id => lessons.some(l => l.id === id)).length} / {lessons.length} Completed
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative min-w-0">
        {/* Transparent drag overlay to prevent iframe / video pointer interception */}
        {isDragging && (
          <div 
            className="fixed inset-0 z-50 cursor-col-resize select-none"
            style={{ userSelect: "none" }}
          />
        )}

        {/* Left Lesson player & text content */}
        <div 
          onScroll={handleContentScroll}
          className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6"
        >
          {/* Locked Lesson Notice Banner */}
          {lockedNotice && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Lesson Locked: "{lockedNotice.lesson.title}"
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    {lockedNotice.prereq 
                      ? `Please complete "${lockedNotice.prereq.title}" to unlock this topic.`
                      : "Complete the prerequisite lesson first or switch Linear Lock to OFF in the outline."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lockedNotice.prereq && (
                  <button
                    onClick={() => {
                      setLockedNotice(null);
                      handleNavigateLesson(lockedNotice.prereq!);
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Go to Prerequisite
                  </button>
                )}
                <button
                  onClick={() => setLockedNotice(null)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {activeLesson ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Media Segment with Smart Embeds */}
              {activeLesson.type === LessonType.VIDEO && activeLesson.videoUrl && (() => {
                const embed = getEmbedVideo(activeLesson.videoUrl);
                if (embed?.type === "youtube" || embed?.type === "vimeo") {
                  return (
                    <div className="aspect-video bg-black relative">
                      <iframe 
                        src={embed.embedUrl} 
                        className="w-full h-full border-0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeLesson.title}
                      />
                    </div>
                  );
                }
                return (
                  <div className="aspect-video bg-black relative">
                    <video 
                      ref={videoRef}
                      src={activeLesson.videoUrl} 
                      className="w-full h-full object-contain" 
                      controls 
                      poster={course.thumbnail}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onEnded={handleVideoEnded}
                    />
                  </div>
                );
              })()}

              {/* Image Activity Viewer */}
              {activeLesson.type === LessonType.IMAGE && (activeLesson.fileUrl || activeLesson.materialUrl) && (
                <div className="bg-slate-900 rounded-t-2xl p-6 flex flex-col items-center justify-center border-b border-slate-800">
                  <img 
                    src={activeLesson.fileUrl || activeLesson.materialUrl} 
                    alt={activeLesson.title} 
                    className="max-h-[480px] w-auto object-contain rounded-lg shadow-lg"
                  />
                  <a
                    href={activeLesson.fileUrl || activeLesson.materialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Full Size Image</span>
                  </a>
                </div>
              )}

              {/* Coding Activity Card */}
              {activeLesson.type === LessonType.CODING && (
                <div className="p-6 bg-slate-900 text-slate-100 border-b border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-blue-400" />
                      <h4 className="font-bold text-sm text-white">Coding Activity</h4>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                      Interactive Exercise
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeLesson.content || activeLesson.codingPrompt?.description || "Solve the programming problem described in this lesson."}
                  </p>
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => window.open("/student/coding", "_blank")}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Coding Playground</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Assessment Activity Card */}
              {activeLesson.type === LessonType.ASSESSMENT && (
                <div className="p-8 bg-purple-50/70 border-b border-purple-200 text-center space-y-4">
                  <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                    <Award className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-900">{activeLesson.title}</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      {activeLesson.description || "This lesson contains an interactive assessment activity. Test your comprehension to complete this topic."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const assId = activeLesson.assessmentId || activeLesson.practiceTest?.id;
                      if (assId) handleStartAssessment(assId);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-purple-500/20 transition cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Launch Assessment Activity</span>
                  </button>
                </div>
              )}

              {/* Lesson Details */}
              <div className="p-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-5">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
                      {activeLesson.type} Lesson
                    </span>
                    <h3 className="font-bold text-2xl text-gray-900 mt-2">{activeLesson.title}</h3>
                  </div>
                  {completedLessons.includes(activeLesson.id) ? (
                    <div 
                      data-testid="lesson-status-badge"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs select-none"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Completed</span>
                    </div>
                  ) : (
                    <div 
                      data-testid="lesson-status-badge"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 select-none"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>In Progress</span>
                    </div>
                  )}
                </div>

                {/* Lesson text content (Markdown or Rich HTML) */}
                {activeLesson.content && (
                  <div className="prose max-w-none text-gray-700 space-y-3 mb-6 leading-relaxed font-sans">
                    {activeLesson.content.split("\n").map((line, idx) => {
                      if (line.startsWith("## ")) {
                        return <h2 key={idx} className="text-xl font-bold text-gray-900 pt-3">{line.replace("## ", "")}</h2>;
                      }
                      if (line.startsWith("### ")) {
                        return <h3 key={idx} className="text-lg font-bold text-gray-800 pt-2">{line.replace("### ", "")}</h3>;
                      }
                      if (line.startsWith("`")) {
                        return (
                          <pre key={idx} className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-sm overflow-x-auto my-3 border border-slate-800">
                            <code>{line.replace(/`/g, "")}</code>
                          </pre>
                        );
                      }
                      if (line.startsWith("- ") || line.startsWith("* ")) {
                        const content = line.substring(2);
                        const parts = content.split(/(\*\*.*?\*\*)/g);
                        return (
                          <div key={idx} className="flex items-start gap-2 text-gray-700 pl-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>
                              {parts.map((part, pIdx) => {
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  return <strong key={pIdx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                              })}
                            </span>
                          </div>
                        );
                      }
                      if (!line.trim()) return <div key={idx} className="h-1" />;
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                )}
                
                {/* Embedded Study Material PDF attachments if available */}
                {(activeLesson.materialUrl || activeLesson.fileUrl) && (
                  <div className="mt-6 p-4 sm:p-5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {activeLesson.materialTitle || "Lesson Study Material / Notes (PDF)"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Downloadable lecture slides and reference documents
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={activeLesson.materialUrl || activeLesson.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold transition shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </a>
                      <a 
                        href={activeLesson.materialUrl || activeLesson.fileUrl} 
                        download
                        className="flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Lesson Practice Test Section if available */}
                {activeLesson.practiceTest && (
                  <div className="mt-6 p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold rounded uppercase">
                            Practice Test
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{activeLesson.practiceTest.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                          <span>Duration: <strong>{activeLesson.practiceTest.durationMinutes}m</strong></span>
                          <span>Passing Score: <strong>{activeLesson.practiceTest.passingScore}%</strong></span>
                          <span>Questions: <strong>{activeLesson.practiceTest.questionsCount}</strong></span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartAssessment(activeLesson.practiceTest!.id)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Take Practice Assessment</span>
                    </button>
                  </div>
                )}

                {/* Next / Previous Lesson Navigation Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-slate-800 mt-8">
                  <button
                    onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                    disabled={!prevLesson}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous Lesson</span>
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    {nextLesson ? (
                      <button
                        onClick={() => handleSelectLesson(nextLesson)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-xs font-bold transition cursor-pointer"
                      >
                        <span>Next Lesson</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : finalAssessment ? (
                      <button
                        onClick={() => handleStartAssessment(finalAssessment.id)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-sm text-xs font-bold transition cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>Take Course Final Exam</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Course Completed!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-500">
              Please choose a lesson from the syllabus sidebar to begin learning.
            </div>
          )}

          {/* Discussion Forum / Reviews Navigation */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850">
              <button
                onClick={() => setActiveTab("content")}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                  activeTab === "content" 
                    ? "border-blue-600 text-blue-600 dark:text-blue-400" 
                    : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Course Requirements & Description
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                  activeTab === "reviews" 
                    ? "border-blue-600 text-blue-600 dark:text-blue-400" 
                    : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Student Reviews ({reviews.length})
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {activeTab === "content" ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">Course Objectives</h4>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">{course.description}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-md">Prerequisites</h4>
                    <ul className="mt-2 space-y-1.5">
                      {course.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-md">Key Skills Covered</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {course.skillsCovered.map((skill, i) => (
                        <span key={i} className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2.5 py-1 rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Reviews List */}
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map((rev) => (
                        <div key={rev.id} className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{rev.studentName}</p>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">Reviewed on {new Date(rev.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < rev.rating ? "fill-amber-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-3">{rev.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No reviews yet. Be the first to leave a feedback rating!</p>
                    )}
                  </div>

                  {/* Leave review form */}
                  <form onSubmit={handlePostReview} className="border-t border-gray-100 pt-6 space-y-4">
                    <h4 className="font-bold text-gray-900 text-md">Submit Course Feedback</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">Select Rating:</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            type="button"
                            key={starValue}
                            onClick={() => setRating(starValue)}
                            className="text-amber-400 hover:scale-110 transition"
                          >
                            <Star className={`w-6 h-6 ${starValue <= rating ? "fill-amber-400" : "text-gray-200"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write your review comments here..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-slate-50 focus:bg-white transition"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsed Vertical Handle for AI Instructor & Syllabus (Desktop lg+) */}
        {!isSupportPanelOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Open AI Instructor"
            title="Open AI Instructor (Click or drag left to open)"
            onPointerDown={handleCollapsedHandlePointerDown}
            onClick={handleCollapsedHandleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsSupportPanelOpen(true);
                setActiveSupportTab("ai");
                setPanelWidth(400);
              }
            }}
            className="hidden lg:flex flex-col items-center justify-center w-8 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-blue-50/60 dark:hover:bg-slate-850 cursor-col-resize select-none transition-colors group relative"
          >
            {/* Visual subtle handle indicator */}
            <div className="flex flex-col items-center gap-3 py-6 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              <div className="[writing-mode:vertical-rl] rotate-180 flex items-center gap-1.5 font-bold text-[11px] tracking-wider text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400 select-none py-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>AI INSTRUCTOR</span>
              </div>
              <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>

            {/* Hover Tooltip */}
            <div className="absolute right-full mr-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
              Open AI Instructor
              <div className="text-[10px] text-slate-400">Click or drag left to open</div>
            </div>
          </div>
        )}

        {/* Draggable Divider (Desktop lg+) */}
        {isSupportPanelOpen && (
          <div
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-valuenow={panelWidth}
            aria-valuemin={320}
            aria-valuemax={540}
            aria-label="Resize support panel"
            title="Drag to resize panel (Left/Right arrow keys to adjust, Esc to collapse)"
            onPointerDown={handleDividerPointerDown}
            onKeyDown={handleDividerKeyDown}
            className={`hidden lg:flex w-2 shrink-0 relative items-center justify-center cursor-col-resize select-none group border-l border-slate-200 dark:border-slate-800 transition-colors ${
              isDragging ? "bg-blue-500" : "bg-slate-100 dark:bg-slate-850 hover:bg-blue-400 dark:hover:bg-blue-600"
            }`}
          >
            {/* Grab handle dots */}
            <div className="w-1 h-8 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-white transition-colors flex items-center justify-center">
              <div className="w-0.5 h-4 bg-slate-400 dark:bg-slate-400 group-hover:bg-white rounded-full" />
            </div>
          </div>
        )}

        {/* Resizable Support Panel (Desktop lg+) */}
        {isSupportPanelOpen && (
          <div
            data-testid="resizable-support-panel"
            style={{ width: `${panelWidth}px` }}
            className="hidden lg:flex flex-col shrink-0 bg-white dark:bg-slate-900 overflow-hidden relative shadow-lg"
          >
            {/* Panel Header with Tabs and Actions */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2 shrink-0">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveSupportTab("ai")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeSupportTab === "ai"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Instructor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSupportTab("curriculum")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeSupportTab === "curriculum"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Curriculum ({completedLessons.filter(id => lessons.some(l => l.id === id)).length}/{lessons.length})</span>
                </button>
              </div>

              {/* Panel Actions: Collapse Button */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-400 hidden xl:inline">
                  {panelWidth}px
                </span>
                <button
                  type="button"
                  onClick={() => setIsSupportPanelOpen(false)}
                  title="Collapse panel (Esc)"
                  aria-label="Collapse panel"
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Tab Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeSupportTab === "ai" ? (
                renderAiInstructorContent()
              ) : (
                <div className="space-y-4">
                  {renderSyllabus(false)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile syllabus drawer for screens < lg */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowMobileSidebar(false)} 
          />
          <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveSupportTab("curriculum")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeSupportTab === "curriculum"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Curriculum</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSupportTab("ai")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    activeSupportTab === "ai"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Instructor</span>
                </button>
              </div>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSupportTab === "ai" ? renderAiInstructorContent() : renderSyllabus(true)}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Assessment Taking Modal */}
      {takingAssessmentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  activeTest?.assessment.type === "course_final" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {activeTest?.assessment.type === "course_final" ? "Course Final Exam" : "Lesson Practice Test"}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeTest?.assessment.title || "Loading..."}</h3>
              </div>
              <button
                onClick={() => {
                  setTakingAssessmentId(null);
                  setActiveTest(null);
                  setTestResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTest ? (
              <div className="py-16 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-semibold">Loading assessment questions...</p>
              </div>
            ) : testResult ? (
              /* Test Results View */
              <div className="py-8 text-center space-y-4">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  testResult.passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}>
                  {testResult.passed ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>

                <div>
                  <h4 className="text-xl font-bold text-slate-900">
                    {testResult.passed ? "Congratulations! You Passed!" : "Needs Improvement"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {testResult.passed
                      ? "Great job mastering the concepts covered in this material."
                      : "You did not meet the passing score. Review the lesson material and try again."}
                  </p>
                </div>

                <div className="inline-flex items-center gap-6 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl font-mono text-sm">
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase">Your Score</span>
                    <strong className="text-slate-900 text-base">{testResult.score} / {testResult.totalPoints}</strong>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase">Result</span>
                    <strong className={testResult.passed ? "text-emerald-600 text-base uppercase" : "text-amber-600 text-base uppercase"}>
                      {testResult.passed ? "PASSED" : "NOT PASSED"}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setTestResult(null);
                      setTestAnswers({});
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Retake Test
                  </button>
                  <button
                    onClick={() => {
                      setTakingAssessmentId(null);
                      setActiveTest(null);
                      setTestResult(null);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Test Taking Form */
              <div className="space-y-6">
                {activeTest?.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-slate-200 text-slate-700 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {qIdx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-relaxed">{q.questionText}</p>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{q.points} Points</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 pl-9">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = testAnswers[q.id]?.includes(opt);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              if (q.type === QuestionType.MCQ_MULTI) {
                                setTestAnswers(prev => {
                                  const curr = prev[q.id] || [];
                                  const next = curr.includes(opt) ? curr.filter(x => x !== opt) : [...curr, opt];
                                  return { ...prev, [q.id]: next };
                                });
                              } else {
                                setTestAnswers(prev => ({ ...prev, [q.id]: [opt] }));
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-3 transition cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-xs"
                                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTakingAssessmentId(null);
                      setActiveTest(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAssessment}
                    disabled={testSubmitting || !activeTest?.questions || activeTest.questions.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{testSubmitting ? "Submitting..." : "Submit Answers"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
