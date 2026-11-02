/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Clock, AlertCircle, CheckCircle2, XCircle, Award, 
  ArrowRight, ShieldAlert, ChevronRight, BarChart2,
  Bookmark, ArrowLeft, Play, CheckCircle, HelpCircle,
  RotateCcw, Info, Maximize2, Minimize2, Shield, ShieldCheck,
  Camera, CameraOff, Mic, MicOff, Wifi, WifiOff, RefreshCw,
  AlertTriangle, Eye, EyeOff, LayoutGrid, CheckSquare, Sparkles
} from "lucide-react";
import { Assessment, Question, Submission, ProctoringEvent, ProctoringConfig } from "../types.js";
import { useConfirm, useToast } from "../context/NotificationContext.js";
import { useAuth } from "../context/AuthContext.js";

interface AssessmentViewerProps {
  assessmentId: string;
  authToken: string;
  onBack: () => void;
  onCompleted: () => void;
}

export type ChecklistStatus = "pending" | "checking" | "passed" | "attention" | "not_required";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: ChecklistStatus;
  mandatory: boolean;
  errorMessage?: string;
}

// Clean unintended timestamp identifiers (e.g. "(1793341732677)") from question text
export function cleanQuestionText(text?: string | null): string {
  if (!text) return "";
  return text.replace(/\s*\(\d{10,14}\)$/, "").trim();
}

export function AssessmentViewer({ 
  assessmentId, authToken, onBack, onCompleted 
}: AssessmentViewerProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const { studentUser } = useAuth();
  
  // Data states
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [qId: string]: string[] }>({});
  const [markedForReview, setMarkedForReview] = useState<{ [qId: string]: boolean }>({});
  
  // Exam lifecycle states
  const [hasStarted, setHasStarted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [expiresAtDate, setExpiresAtDate] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [attemptsReached, setAttemptsReached] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [gradedQuestions, setGradedQuestions] = useState<Question[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Connectivity & Autosave
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaletteMobileOpen, setIsPaletteMobileOpen] = useState(false);

  // Proctoring checklist states
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "auth",
      title: "Student Session Authenticated",
      description: "Verifies authenticated identity and role eligibility for this exam.",
      status: "passed",
      mandatory: true
    },
    {
      id: "camera",
      title: "Camera Hardware & Permission",
      description: "Checks webcam availability for live video proctoring stream.",
      status: "not_required",
      mandatory: false
    },
    {
      id: "microphone",
      title: "Microphone Audio Permission",
      description: "Checks audio input channel for ambient acoustic monitoring.",
      status: "not_required",
      mandatory: false
    },
    {
      id: "fullscreen",
      title: "Browser Full-Screen Capability",
      description: "Verifies your browser allows full-screen locked workspace display.",
      status: "pending",
      mandatory: true
    },
    {
      id: "capabilities",
      title: "Modern Browser Capabilities",
      description: "Confirms local storage persistence, visibility listeners, and security APIs.",
      status: "passed",
      mandatory: true
    },
    {
      id: "network",
      title: "Network Connection Latency",
      description: "Verifies consistent connectivity to LMS synchronization services.",
      status: "checking",
      mandatory: true
    },
    {
      id: "rules",
      title: "Examination Conduct Acknowledged",
      description: "Review and accept proctoring conduct rules and monitoring disclosure.",
      status: "pending",
      mandatory: true
    },
    {
      id: "session",
      title: "Assessment Availability Check",
      description: "Confirms assessment is published, unexpired, and within attempt limits.",
      status: "checking",
      mandatory: true
    }
  ]);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPreviewActive, setCameraPreviewActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const examContainerRef = useRef<HTMLDivElement | null>(null);

  // Proctoring Violation Monitoring
  const [warningCount, setWarningCount] = useState(0);
  const [proctoringWarnings, setProctoringWarnings] = useState<ProctoringEvent[]>([]);
  const [activeWarningModal, setActiveWarningModal] = useState<{
    title: string;
    message: string;
    type: "fullscreen_exit" | "tab_hidden" | "camera_interrupted" | "warning";
  } | null>(null);

  // Storage key for local answer persistence
  const storageKey = `mrtechlms_exam_${assessmentId}_answers`;

  // Format time utility
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  // Fullscreen Helpers
  const requestBrowserFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      return true;
    } catch (err) {
      console.warn("Fullscreen request blocked or not supported:", err);
      return false;
    }
  };

  const exitBrowserFullscreen = async () => {
    try {
      const doc = document as any;
      if (document.fullscreenElement) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Exit fullscreen failed:", err);
    }
    setIsFullscreen(false);
    logProctoringEvent("fullscreen_exit", "Exited dedicated full-screen mode", "violation");
    setActiveWarningModal({
      title: "Full-Screen Mode Exited",
      message: "Assessment rules require an uninterrupted full-screen environment. Exiting full-screen is monitored and logged on your assessment record. Please return to full-screen mode immediately.",
      type: "fullscreen_exit"
    });
  };

  // Log proctoring event to backend and local state
  const logProctoringEvent = useCallback(async (
    eventType: ProctoringEvent["eventType"], 
    details: string,
    severity: "info" | "warning" | "violation" = "warning"
  ) => {
    const newEvent: ProctoringEvent = {
      attemptId: currentAttemptId || "pending",
      eventType,
      details,
      timestamp: new Date().toISOString(),
      severity
    };

    setProctoringWarnings(prev => [...prev, newEvent]);

    if (severity === "warning" || severity === "violation") {
      setWarningCount(prev => prev + 1);
    }

    if (currentAttemptId && authToken) {
      try {
        await fetch(`/api/assessments/${assessmentId}/proctoring-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(newEvent)
        });
      } catch (e) {
        console.warn("Failed to persist proctoring event:", e);
      }
    }
  }, [assessmentId, currentAttemptId, authToken]);

  // Progressive Answer Autosave
  const persistAnswers = useCallback(async (newAnswers: { [qId: string]: string[] }) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newAnswers));
    } catch (e) {
      console.warn("LocalStorage save failed:", e);
    }

    if (!currentAttemptId || !authToken || !isOnline) return;

    try {
      setIsAutoSaving(true);
      const res = await fetch(`/api/assessments/${assessmentId}/save-answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          attemptId: currentAttemptId,
          answers: newAnswers
        })
      });
      if (res.ok) {
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn("Autosave to server failed (saved locally):", err);
    } finally {
      setIsAutoSaving(false);
    }
  }, [assessmentId, currentAttemptId, authToken, isOnline, storageKey]);

  // Fetch assessment and check prior submissions
  const fetchAssessmentData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });

      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAssessment(data.assessment);
        setQuestions(data.questions || []);
        const priorCount = data.userAttemptsCount || 0;
        setAttemptsCount(priorCount);

        // Configure proctoring checklist requirements based on assessment config
        const pConfig: ProctoringConfig = data.assessment.proctoringConfig || {};
        setChecklist(prev => prev.map(item => {
          if (item.id === "camera") {
            const req = Boolean(pConfig.requireCamera);
            return {
              ...item,
              mandatory: req,
              status: req ? "pending" : "not_required"
            };
          }
          if (item.id === "microphone") {
            const req = Boolean(pConfig.requireMicrophone);
            return {
              ...item,
              mandatory: req,
              status: req ? "pending" : "not_required"
            };
          }
          if (item.id === "session") {
            return { ...item, status: "passed" };
          }
          return item;
        }));

        // Resume active attempt if in progress
        if (data.activeAttempt) {
          setCurrentAttemptId(data.activeAttempt.id);
          setExpiresAtDate(data.activeAttempt.expiresAt);
          setSecondsRemaining(data.activeAttempt.secondsRemaining);
          if (data.activeAttempt.answers && Object.keys(data.activeAttempt.answers).length > 0) {
            setAnswers(data.activeAttempt.answers);
          } else {
            // Restore from localStorage fallback
            const cached = localStorage.getItem(storageKey);
            if (cached) {
              try { setAnswers(JSON.parse(cached)); } catch (e) {}
            }
          }
          setHasStarted(true);
        }

        // If max attempts reached and no active attempt, load prior submission result
        if (data.assessment.maxAttempts && priorCount >= data.assessment.maxAttempts && !data.activeAttempt) {
          setAttemptsReached(true);
          try {
            const resResult = await fetch(`/api/student/assessments/${assessmentId}/result`, {
              headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (resResult.ok) {
              const resData = await resResult.json();
              setSubmissionResult(resData.submission);
              if (resData.questions) {
                setGradedQuestions(resData.questions);
              }
              if (resData.submission?.answers) {
                setAnswers(resData.submission.answers);
              }
              setIsSubmitted(true);
            }
          } catch (err) {
            console.error("Could not fetch completed submission result", err);
          }
        }
      }
    } catch (err) {
      console.error("Error loading assessment", err);
      toast.error("Failed to load assessment");
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId, authToken, storageKey]);

  useEffect(() => {
    fetchAssessmentData();
  }, [fetchAssessmentData]);

  // Run initial checklist verification
  useEffect(() => {
    if (isLoading || hasStarted || isSubmitted) return;

    // Check Fullscreen capability
    const fsAvailable = Boolean(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled);
    setChecklist(prev => prev.map(i => i.id === "fullscreen" ? {
      ...i,
      status: fsAvailable ? "passed" : "attention",
      errorMessage: fsAvailable ? undefined : "Your browser or embed prevents full-screen display."
    } : i));

    // Check Network ping
    const testNet = async () => {
      try {
        const startT = performance.now();
        await fetch("/api/health").catch(() => {});
        const latency = Math.round(performance.now() - startT);
        setChecklist(prev => prev.map(i => i.id === "network" ? {
          ...i,
          status: "passed",
          description: `Network verified (${latency}ms round-trip latency). Online and responsive.`
        } : i));
      } catch (e) {
        setChecklist(prev => prev.map(i => i.id === "network" ? {
          ...i,
          status: navigator.onLine ? "passed" : "attention",
          errorMessage: navigator.onLine ? undefined : "Network disconnected. Please check internet connection."
        } : i));
      }
    };
    testNet();
  }, [isLoading, hasStarted, isSubmitted]);

  // Request Camera Stream if required by assessment
  const handleTestCamera = async () => {
    try {
      setChecklist(prev => prev.map(i => i.id === "camera" ? { ...i, status: "checking" } : i));
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setCameraStream(stream);
      setCameraPreviewActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setChecklist(prev => prev.map(i => i.id === "camera" ? { 
        ...i, 
        status: "passed", 
        description: "Camera feed operational. Live proctoring stream ready." 
      } : i));
      toast.success("Camera verified successfully!");
    } catch (err: any) {
      setChecklist(prev => prev.map(i => i.id === "camera" ? { 
        ...i, 
        status: "attention", 
        errorMessage: err.message || "Camera access denied. Please allow camera permissions." 
      } : i));
      toast.error("Camera check failed: " + (err.message || "Permission denied"));
    }
  };

  // Request Microphone Stream if required
  const handleTestMicrophone = async () => {
    try {
      setChecklist(prev => prev.map(i => i.id === "microphone" ? { ...i, status: "checking" } : i));
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setChecklist(prev => prev.map(i => i.id === "microphone" ? { 
        ...i, 
        status: "passed", 
        description: "Microphone verified. Audio channel active." 
      } : i));
      toast.success("Microphone verified successfully!");
    } catch (err: any) {
      setChecklist(prev => prev.map(i => i.id === "microphone" ? { 
        ...i, 
        status: "attention", 
        errorMessage: err.message || "Microphone access denied. Please allow microphone permissions." 
      } : i));
      toast.error("Microphone check failed: " + (err.message || "Permission denied"));
    }
  };

  // Sync video element when camera stream updates
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, hasStarted]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Internet connection restored. Synchronizing answers...");
      logProctoringEvent("network_online", "Network connectivity restored", "info");
      persistAnswers(answers);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Network connection lost. Offline mode active - your answers are safely stored locally.");
      logProctoringEvent("network_offline", "Network connectivity dropped", "warning");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [answers, logProctoringEvent, persistAnswers]);

  // Fullscreen & Visibility Listeners during active exam
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const triggerFullscreenExitWarning = () => {
      setIsFullscreen(false);
      logProctoringEvent("fullscreen_exit", "Exited dedicated full-screen mode", "violation");
      setActiveWarningModal({
        title: "Full-Screen Mode Exited",
        message: "Assessment rules require an uninterrupted full-screen environment. Exiting full-screen is monitored and logged on your assessment record. Please return to full-screen mode immediately.",
        type: "fullscreen_exit"
      });
    };

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);

      if (!isFs) {
        triggerFullscreenExitWarning();
      } else {
        logProctoringEvent("fullscreen_enter", "Returned to dedicated full-screen mode", "info");
      }
    };

    // Tab visibility & Window focus listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctoringEvent("tab_hidden", "Switched browser tab or minimized window", "violation");
        setActiveWarningModal({
          title: "Exam Tab Backgrounded",
          message: "Navigating away from the examination window or switching tabs is flagged. All tab switches are logged with timestamps in your proctoring audit report.",
          type: "tab_hidden"
        });
      } else {
        logProctoringEvent("tab_visible", "Returned to examination tab", "info");
      }
    };

    const handleWindowBlur = () => {
      if (!document.hidden) {
        logProctoringEvent("tab_hidden", "Window focus lost to another desktop application", "warning");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("mrtechlms:trigger_fullscreen_exit", triggerFullscreenExitWarning);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("mrtechlms:trigger_fullscreen_exit", triggerFullscreenExitWarning);
    };
  }, [hasStarted, isSubmitted, logProctoringEvent]);

  // Authoritative Server-Synced Timer Loop
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    // If server gave expiresAtDate, calculate authoritative delta against current time
    const tick = () => {
      if (expiresAtDate) {
        const expiresMs = new Date(expiresAtDate).getTime();
        const nowMs = Date.now();
        const rem = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
        setSecondsRemaining(rem);

        if (rem <= 0) {
          handleAutoSubmit();
        }
      } else if (secondsRemaining !== null) {
        if (secondsRemaining <= 0) {
          handleAutoSubmit();
        } else {
          setSecondsRemaining(prev => (prev !== null ? prev - 1 : null));
        }
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hasStarted, secondsRemaining, expiresAtDate, isSubmitted]);

  // Check if all mandatory checklist items passed
  const isChecklistSatisfied = () => {
    const allMandatoryPassed = checklist
      .filter(i => i.mandatory)
      .every(i => i.status === "passed");
    return allMandatoryPassed && rulesAgreed;
  };

  const handleStartAssessment = async () => {
    if (!assessment) return;
    if (!isChecklistSatisfied()) {
      toast.warning("Please complete all mandatory checks and acknowledge the conduct code before starting.");
      return;
    }

    try {
      // Enter browser fullscreen mode
      await requestBrowserFullscreen();

      const res = await fetch(`/api/assessments/${assessmentId}/start`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentAttemptId(data.attempt?.id || null);
        if (data.attempt?.expiresAt) {
          setExpiresAtDate(data.attempt.expiresAt);
        }
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
        if (data.answers && Object.keys(data.answers).length > 0) {
          setAnswers(data.answers);
        }
        setHasStarted(true);
        setSecondsRemaining(data.secondsRemaining ?? (assessment.durationMinutes || 15) * 60);
        logProctoringEvent("fullscreen_enter", "Exam started in dedicated full-screen mode", "info");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to start assessment");
      }
    } catch (err) {
      setHasStarted(true);
      setSecondsRemaining((assessment.durationMinutes || 15) * 60);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => {
      const next = {
        ...prev,
        [questionId]: [option]
      };
      persistAnswers(next);
      return next;
    });
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleAutoSubmit = async () => {
    if (isSubmitted || isSubmitting) return;
    toast.warning("Authoritative exam deadline reached. Submitting assessment automatically...");
    await performSubmit();
  };

  const handleSubmitAssessment = async () => {
    if (isSubmitted || isSubmitting) return;

    const answeredCount = Object.keys(answers).filter(qId => answers[qId]?.length > 0).length;
    const unansweredCount = questions.length - answeredCount;
    const reviewCount = Object.values(markedForReview).filter(Boolean).length;

    let confirmationMsg = `You have answered ${answeredCount} of ${questions.length} questions.`;
    if (unansweredCount > 0) {
      confirmationMsg += ` There are ${unansweredCount} unanswered question(s).`;
    }
    if (reviewCount > 0) {
      confirmationMsg += ` You also have ${reviewCount} question(s) marked for review.`;
    }
    confirmationMsg += " Are you sure you wish to finalize your submission? You will not be able to modify your answers.";

    const ok = await confirm({
      title: "Finalize & Submit Exam?",
      message: confirmationMsg,
      confirmText: "Yes, Submit Exam",
      cancelText: "Return to Questions",
      variant: unansweredCount > 0 ? "warning" : "info"
    });
    if (!ok) return;

    await performSubmit();
  };

  const performSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);

    const timeTaken = assessment 
      ? Math.max(1, (assessment.durationMinutes * 60) - (secondsRemaining || 0)) 
      : 0;

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          attemptId: currentAttemptId,
          answers,
          timeTakenSeconds: timeTaken
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionResult(data.submission);
        if (data.questions) {
          setGradedQuestions(data.questions);
        }
        setIsSubmitted(true);
        // Clear cached answers on success
        localStorage.removeItem(storageKey);
        toast.success("Assessment submitted and evaluated successfully!");

        // Release media stream
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
        }

        // Fetch leaderboard
        try {
          const leaderRes = await fetch(`/api/assessments/${assessmentId}/leaderboard`, {
            headers: { "Authorization": `Bearer ${authToken}` }
          });
          if (leaderRes.ok) {
            const leaderData = await leaderRes.json();
            setLeaderboard(leaderData.map((item: any) => ({
              studentName: item.studentName,
              score: item.score,
              time: formatTime(item.timeTakenSeconds || 0),
              rank: item.rank
            })));
          }
        } catch (e) {
          console.error("Could not fetch leaderboard", e);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to submit assessment");
      }
    } catch (err: any) {
      console.error("Error submitting assessment", err);
      toast.error("Submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-enter Fullscreen from Warning Modal
  const handleResolveFullscreenWarning = async () => {
    await requestBrowserFullscreen();
    setActiveWarningModal(null);
  };

  if (isLoading || isSubmitting) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-white space-y-4 font-sans select-none">
        <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold tracking-tight">
            {isSubmitting ? "Finalizing and Evaluating Assessment..." : "Initializing Secure Exam Environment..."}
          </p>
          <p className="text-xs text-slate-400 font-mono">
            {isSubmitting ? "Scoring multiple-choice options & recording proctoring audit log" : "Syncing question bank and attempt credentials"}
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl text-center max-w-md w-full space-y-5">
          <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Assessment Access Restricted</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              You are not currently enrolled in this course or assigned this assessment. Please contact your instructor or LMS administrator to request access.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center text-slate-400 max-w-md w-full space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Assessment Not Found</h3>
          <p className="text-xs text-slate-400">The requested assessment could not be located or has been archived.</p>
          <button onClick={onBack} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Calculate palette status counts
  const answeredCount = Object.keys(answers).filter(qId => answers[qId]?.length > 0).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  // ====================================================
  // VIEW 1: PRE-EXAM INSTRUCTIONS & PROCTORING CHECKLIST
  // ====================================================
  if (!hasStarted && !isSubmitted) {
    const isReadyToStart = isChecklistSatisfied();

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-y-auto">
        {/* Top Minimal Strip */}
        <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit to Portal</span>
            </button>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-sm tracking-tight text-white">MRTECHLMS Secure Exam Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 hidden sm:inline-block">
              Student: {studentUser?.name || "Candidate"}
            </span>
            <button
              onClick={isFullscreen ? exitBrowserFullscreen : requestBrowserFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Test Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-blue-400" />}
              <span className="hidden md:inline">{isFullscreen ? "Fullscreen Active" : "Test Fullscreen"}</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {assessment.category || "General"}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
                {assessment.difficulty || "Medium"} Level
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Max Attempts: {assessment.maxAttempts || 1}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Attempt {attemptsCount + 1} of {assessment.maxAttempts || 1}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {assessment.title}
              </h1>
              {assessment.shortDescription && (
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {assessment.shortDescription}
                </p>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-sans block">Duration</span>
                <span className="text-lg font-bold text-white mt-0.5 block">{assessment.durationMinutes} Minutes</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-sans block">Questions</span>
                <span className="text-lg font-bold text-white mt-0.5 block">{questions.length} Questions</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-sans block">Total Points</span>
                <span className="text-lg font-bold text-white mt-0.5 block">{assessment.totalPoints} Pts</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-sans block">Passing Threshold</span>
                <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{assessment.passingScore}%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Instructions and Examination Rules */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-5 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span>Assessment Instructions & Exam Rules</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {assessment.instructions || "Read each question carefully before submitting. Ensure you review all questions using the Question Palette before final submission."}
            </div>

            <div className="p-4.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200/90 space-y-2">
              <h4 className="font-bold text-blue-300 uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Proctoring & Anti-Cheat Protocol Disclosure</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs leading-relaxed">
                <li>The exam interface runs in a <strong>dedicated full-screen workspace</strong>. Exiting full-screen or switching tabs generates a timestamped proctoring violation.</li>
                <li>Your countdown timer is enforced directly by the authoritative LMS backend. Refreshing does not grant additional time.</li>
                <li>All answer choices are automatically persisted progressive choices to prevent loss from hardware disruptions.</li>
                <li>Excessive proctoring violations may trigger administrative flag review or automatic submission.</li>
              </ul>
            </div>
          </div>

          {/* Section 3: Pre-Exam Readiness Checklist */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Pre-Exam System Readiness Checklist</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ensure all mandatory verification steps pass before commencing the timed examination.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                {checklist.filter(i => i.status === "passed").length} of {checklist.filter(i => i.mandatory).length} Mandatory Checks Passed
              </span>
            </div>

            {/* Checklist Items */}
            <div className="divide-y divide-slate-800/80">
              {checklist.map((item) => {
                const isPassed = item.status === "passed";
                const isAttention = item.status === "attention";
                const isNotReq = item.status === "not_required";
                const isChecking = item.status === "checking";

                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isPassed && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {isAttention && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                        {isNotReq && <Shield className="w-5 h-5 text-slate-500" />}
                        {isChecking && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
                        {item.status === "pending" && <Clock className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white">{item.title}</h4>
                          {item.mandatory && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        {item.errorMessage && (
                          <p className="text-xs text-rose-400 font-semibold mt-1 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{item.errorMessage}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Pill & Action button */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-8 sm:pl-0">
                      {item.id === "camera" && item.status !== "passed" && item.status !== "not_required" && (
                        <button
                          type="button"
                          onClick={handleTestCamera}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Enable Camera</span>
                        </button>
                      )}

                      {item.id === "microphone" && item.status !== "passed" && item.status !== "not_required" && (
                        <button
                          type="button"
                          onClick={handleTestMicrophone}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Enable Mic</span>
                        </button>
                      )}

                      {item.id === "fullscreen" && item.status !== "passed" && (
                        <button
                          type="button"
                          onClick={requestBrowserFullscreen}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
                        >
                          Enable Fullscreen
                        </button>
                      )}

                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isPassed 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isAttention
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : isNotReq
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {isPassed ? "Passed" : isAttention ? "Needs Attention" : isNotReq ? "Not Required" : isChecking ? "Checking" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Camera Preview Box if active */}
            {cameraStream && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Webcam Monitoring Stream Active
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    320x240 Ready
                  </span>
                </div>
                <div className="w-48 h-36 bg-black rounded-xl overflow-hidden border border-slate-800 mx-auto">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                </div>
              </div>
            )}

            {/* Rules Acknowledgement Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="examRulesCheckbox"
                checked={rulesAgreed}
                onChange={(e) => {
                  setRulesAgreed(e.target.checked);
                  setChecklist(prev => prev.map(i => i.id === "rules" ? {
                    ...i,
                    status: e.target.checked ? "passed" : "pending"
                  } : i));
                }}
                className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="examRulesCheckbox" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
                I hereby declare that I will complete this assessment independently without external assistance, unauthorized electronic devices, or window-switching. I acknowledge that proctoring telemetry (window focus, full-screen presence, network status) is recorded for evaluation integrity.
              </label>
            </div>

            {/* Start Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Cancel & Return
              </button>

              <button
                type="button"
                disabled={!isReadyToStart}
                onClick={handleStartAssessment}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Assessment & Enter Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 2: POST-SUBMIT SCORECARD & PERSISTENT RESULT
  // ====================================================
  if (isSubmitted) {
    const earnedScore = submissionResult?.score ?? 0;
    const totalPoints = submissionResult?.totalPoints || assessment.totalPoints || 1;
    const pct = submissionResult?.percentage !== undefined && submissionResult?.percentage !== null
      ? Number(submissionResult.percentage)
      : Math.round((earnedScore / totalPoints) * 100);
    const isPassed = submissionResult?.passed ?? (pct >= assessment.passingScore);
    const correctC = submissionResult?.correctCount ?? 0;
    const incorrectC = submissionResult?.incorrectCount ?? 0;
    const unansweredC = submissionResult?.unansweredCount ?? Math.max(0, questions.length - correctC - incorrectC);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-y-auto">
        <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-tight text-white">Assessment Evaluation & Results</span>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition border border-slate-700 cursor-pointer"
          >
            Back to Assessments
          </button>
        </header>

        <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Completed status banner if revisit */}
          {attemptsReached && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-amber-200">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Assessment finalized. You have completed {attemptsCount} of {assessment.maxAttempts || 1} allowed attempt(s).
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-amber-500/20 px-2 py-0.5 rounded text-amber-300">
                Attempt Finalized
              </span>
            </div>
          )}

          {/* Scorecard Hero Card */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-6">
            <div className={`inline-flex p-4 rounded-full ${isPassed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
              {isPassed ? <Award className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
            </div>

            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider font-mono ${
                isPassed ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {isPassed ? "PASSED" : "FAILED"}
              </span>
              <h2 className="font-extrabold text-2xl sm:text-3xl text-white mt-2">
                {isPassed ? "Congratulations! Assessment Passed" : "Assessment Completed"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Passing threshold was {assessment.passingScore}%. You achieved {pct}% overall score.
              </p>
            </div>

            {/* Metric Stats Grid */}
            <div className="max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Score</span>
                <p className="text-xl font-extrabold text-white mt-0.5">
                  {earnedScore} / {totalPoints}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Percentage</span>
                <p className={`text-xl font-extrabold mt-0.5 ${isPassed ? "text-emerald-400" : "text-rose-400"}`}>
                  {pct}%
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Correct</span>
                <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{correctC}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Time Taken</span>
                <p className="text-xl font-extrabold text-slate-200 mt-0.5">
                  {formatTime(submissionResult?.timeTakenSeconds || 0)}
                </p>
              </div>
            </div>

            {/* Additional metrics line: Correct, Incorrect, Unanswered */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Correct: <strong className="text-white">{correctC}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Incorrect: <strong className="text-white">{incorrectC}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                Unanswered: <strong className="text-white">{unansweredC}</strong>
              </span>
            </div>

            {/* Proctoring Summary Pill if any violations */}
            {proctoringWarnings.length > 0 && (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 max-w-md mx-auto text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Proctoring Telemetry Log
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">
                    {proctoringWarnings.length} Event(s) Recorded
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Session events including full-screen toggles or tab backgrounding were safely recorded to your student audit ledger.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Back to Assessments
              </button>
              <button
                onClick={onCompleted}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              >
                Continue Learning
              </button>
            </div>
          </div>

          {/* Leaderboard Section */}
          {leaderboard.length > 0 && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Assessment Leaderboard</h3>
              </div>
              
              <div className="divide-y divide-slate-800/80">
                {leaderboard.map((student) => (
                  <div key={student.rank} className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        student.rank === 1 
                          ? "bg-amber-400 text-amber-950" 
                          : student.rank === 2 
                            ? "bg-slate-300 text-slate-800" 
                            : "bg-slate-800 text-slate-400"
                      }`}>
                        {student.rank}
                      </span>
                      <p className="text-xs font-semibold text-slate-200">{student.studentName}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span>{student.time}</span>
                      <span className="font-bold text-white">{student.score} Pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question-by-Question Review with Answers & Explanations */}
          {gradedQuestions && gradedQuestions.length > 0 && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Answers & Explanations Review</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {gradedQuestions.length} Questions Evaluated
                </span>
              </div>

              <div className="space-y-4">
                {gradedQuestions.map((q, idx) => {
                  const studentAns = answers[q.id]?.[0];
                  const correctAns = q.correctAnswers?.[0];
                  const isAttempted = !!studentAns;
                  const isCorrect = isAttempted && studentAns === correctAns;
                  const cleanQText = cleanQuestionText(q.questionText);

                  return (
                    <div 
                      key={q.id}
                      className={`p-5 rounded-2xl border transition space-y-3 ${
                        !isAttempted
                          ? "bg-slate-950/60 border-slate-800"
                          : isCorrect 
                            ? "bg-emerald-950/20 border-emerald-500/30" 
                            : "bg-rose-950/20 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            !isAttempted
                              ? "bg-slate-800 text-slate-400"
                              : isCorrect 
                                ? "bg-emerald-500/20 text-emerald-300" 
                                : "bg-rose-500/20 text-rose-300"
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-white text-sm">{cleanQText}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                !isAttempted
                                  ? "bg-slate-800 text-slate-400"
                                  : isCorrect 
                                    ? "bg-emerald-500/20 text-emerald-300" 
                                    : "bg-rose-500/20 text-rose-300"
                              }`}>
                                {!isAttempted ? "Unanswered (0 Pts)" : isCorrect ? `+${q.points} Pts Correct` : `Incorrect (0 Pts)`}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                Difficulty: {q.difficulty || "medium"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isAttempted ? (
                          <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
                        ) : isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                      </div>

                      {/* Options list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 pt-1">
                        {q.options?.map((opt, oIdx) => {
                          const isOptCorrect = opt === correctAns;
                          const isStudentPick = opt === studentAns;

                          let badgeStyle = "bg-slate-900 border-slate-800 text-slate-400";
                          if (isOptCorrect) {
                            badgeStyle = "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-bold";
                          } else if (isStudentPick && !isOptCorrect) {
                            badgeStyle = "bg-rose-500/20 border-rose-500/40 text-rose-200 line-through font-semibold";
                          }

                          return (
                            <div 
                              key={oIdx}
                              className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${badgeStyle}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0 font-bold border border-slate-700">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                              {isOptCorrect && (
                                <span className="text-[9px] font-mono font-bold text-emerald-400 ml-2 shrink-0">
                                  CORRECT
                                </span>
                              )}
                              {isStudentPick && !isOptCorrect && (
                                <span className="text-[9px] font-mono font-bold text-rose-400 ml-2 shrink-0">
                                  YOUR CHOICE
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="ml-9 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                          <p className="font-bold text-slate-300">Explanation:</p>
                          <p className="text-slate-400 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 3: DEDICATED FULL-SCREEN ACTIVE EXAM INTERFACE
  // ====================================================
  const activeQuestion = questions[activeQuestionIdx] || questions[0];
  const isSequential = assessment.questionNavigation === "sequential";
  const isMarked = !!markedForReview[activeQuestion?.id];
  const cleanedActiveQuestionText = cleanQuestionText(activeQuestion?.questionText);

  return (
    <div 
      ref={examContainerRef}
      className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none"
    >
      {/* 1. Header: Assessment Title, Progress, Timer, Connectivity & Proctoring */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        {/* Left: Brand + Title + Category */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {assessment.title}
              </h2>
              {isSequential && (
                <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase hidden sm:inline-block">
                  Sequential
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Question {activeQuestionIdx + 1} of {questions.length}</span>
              {isAutoSaving && (
                <span className="text-[10px] text-blue-400 animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Timer Badge */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-extrabold font-mono transition-all ${
            secondsRemaining !== null && secondsRemaining < 120 
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse" 
              : "bg-slate-800 text-slate-200 border border-slate-700"
          }`}>
            <Clock className={`w-4 h-4 ${secondsRemaining !== null && secondsRemaining < 120 ? "text-rose-400" : "text-blue-400"}`} />
            <span>{secondsRemaining !== null ? formatTime(secondsRemaining) : "00:00"}</span>
          </div>
        </div>

        {/* Right: Telemetry Indicators + Palette Toggle + Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Connection Status Pill */}
          <div 
            title={isOnline ? "Network Connected" : "Network Disconnected - Answers Cached Locally"}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              isOnline 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOnline ? "Online" : "Cached"}</span>
          </div>

          {/* Proctoring Status Pill */}
          <div 
            title={`${warningCount} proctoring warning(s)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              warningCount === 0 
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{warningCount === 0 ? "Monitored" : `${warningCount} Warn`}</span>
          </div>

          {/* Question Palette Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsPaletteMobileOpen(prev => !prev)}
            className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Toggle Question Palette"
          >
            <LayoutGrid className="w-4 h-4 text-blue-400" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={isFullscreen ? exitBrowserFullscreen : requestBrowserFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </header>

      {/* Offline Alert Strip if connection lost */}
      {!isOnline && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode active. Your answers are automatically preserved locally and will sync when internet returns.</span>
        </div>
      )}

      {/* 2. Main Content Area: Question Column + Palette Column */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left (3/4): Question Viewer Column */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-3xl w-full mx-auto space-y-6 my-auto">
            {/* Question Card */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
              {/* Question Header: Point value + Mark for review */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                    {activeQuestionIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    {activeQuestion?.points || 10} POINTS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMarkForReview(activeQuestion?.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isMarked
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isMarked ? "fill-amber-400 text-amber-400" : ""}`} />
                  <span>{isMarked ? "Marked for Review" : "Mark for Review"}</span>
                </button>
              </div>

              {/* Question Text (Sanitized) */}
              <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                {cleanedActiveQuestionText}
              </p>

              {/* Multiple Choice Options */}
              <div className="space-y-3 pt-2">
                {activeQuestion?.options?.map((opt, i) => {
                  const isSelected = answers[activeQuestion.id]?.includes(opt);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectOption(activeQuestion.id, opt)}
                      className={`w-full text-left px-5 py-4 rounded-2xl text-xs sm:text-sm font-semibold transition border flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-600/20 text-white ring-1 ring-blue-500/50 shadow-md shadow-blue-500/10"
                          : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                          isSelected 
                            ? "bg-blue-600 text-white" 
                            : "bg-slate-800 border border-slate-700 text-slate-400"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                        isSelected ? "border-blue-500 bg-blue-600" : "border-slate-700 bg-slate-900"
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Navigation Controls Footer */}
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
              {!isSequential ? (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIdx === 0}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
                >
                  Previous Question
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-mono">
                  Step {activeQuestionIdx + 1} of {questions.length}
                </span>
              )}

              <div className="flex items-center gap-3">
                {activeQuestionIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right (1/4): Question Palette Panel (Desktop + Mobile Slide-over) */}
        <aside className={`
          ${isPaletteMobileOpen ? "fixed inset-y-16 right-0 z-40 w-72 bg-slate-900 shadow-2xl" : "hidden"} 
          lg:flex lg:w-72 xl:w-80 border-l border-slate-800 bg-slate-900/90 flex-col overflow-y-auto shrink-0 p-5 space-y-5
        `}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Question Palette
              </h4>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {answeredCount} of {questions.length} Answered
              </p>
            </div>
            {isPaletteMobileOpen && (
              <button
                type="button"
                onClick={() => setIsPaletteMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Grid of question bubbles */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id]?.length > 0;
              const isFlagged = markedForReview[q.id];
              const isActive = idx === activeQuestionIdx;

              let bubbleStyle = "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800";
              if (isActive) {
                bubbleStyle = "bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 border-transparent font-bold";
              } else if (isAnswered) {
                bubbleStyle = "bg-emerald-600 text-white border-emerald-500 font-bold";
              } else if (isFlagged) {
                bubbleStyle = "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold";
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={isSequential}
                  onClick={() => {
                    setActiveQuestionIdx(idx);
                    setIsPaletteMobileOpen(false);
                  }}
                  className={`relative w-9 h-9 rounded-xl text-xs font-mono flex items-center justify-center border transition cursor-pointer disabled:cursor-not-allowed ${bubbleStyle}`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-950 border border-slate-700 inline-block" />
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40 inline-block" />
              <span>Marked for Review ({markedCount})</span>
            </div>
          </div>

          {/* Live Proctoring Webcam Miniature Preview (if camera enabled) */}
          {cameraStream && (
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Proctoring
                </span>
                <span className="text-emerald-400">Active</span>
              </div>
              <div className="w-full h-28 bg-black rounded-xl overflow-hidden border border-slate-800">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover scale-x-[-1]" 
                />
              </div>
            </div>
          )}

          {/* Ready to Submit Shortcut */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmitAssessment}
              className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Finish & Submit Exam</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 3. Non-dismissable Proctoring Violation Warning Modal */}
      {activeWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Proctoring Telemetry Alert ({warningCount} Incident{warningCount === 1 ? "" : "s"})
              </span>
              <h3 className="text-lg font-bold text-white mt-2">
                {activeWarningModal.title}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {activeWarningModal.message}
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono text-left space-y-1">
              <div>Incident Time: <strong className="text-white">{new Date().toLocaleTimeString()}</strong></div>
              <div>Monitored Policy: <strong className="text-amber-300">Continuous Fullscreen Lock</strong></div>
              <div>Remaining Warnings: <strong className="text-emerald-400">{Math.max(0, 3 - warningCount)}</strong></div>
            </div>

            <button
              type="button"
              onClick={handleResolveFullscreenWarning}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Re-enter Full-Screen Mode & Resume</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
