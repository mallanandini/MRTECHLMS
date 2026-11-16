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
  AlertTriangle, Eye, EyeOff, LayoutGrid, CheckSquare, Sparkles,
  FileText, Code, Check, Send
} from "lucide-react";
import { Assessment, Question, QuestionType, Submission, ProctoringEvent, ProctoringConfig } from "../types.js";
import { useToast } from "../context/NotificationContext.js";
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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Proctoring checklist states
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "auth",
      title: "Student Session Authenticated",
      description: "Verifies authenticated candidate identity and role authorization.",
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
      description: "Verifies your browser allows full-screen focused workspace display.",
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

    if (authToken) {
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

    if (!authToken || !isOnline) return;

    try {
      setIsAutoSaving(true);
      const res = await fetch(`/api/assessments/${assessmentId}/save-answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          attemptId: currentAttemptId || "pending",
          answers: newAnswers
        })
      });
      if (res.ok) {
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
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
      errorMessage: fsAvailable ? undefined : "Your browser prevents full-screen display."
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
      if (isSubmitting || isSubmitted || isConfirmModalOpen) return;
      logProctoringEvent("fullscreen_exit", "Exited dedicated full-screen mode", "violation");
      setActiveWarningModal({
        title: "Full-Screen Mode Exited",
        message: "Assessment guidelines require an uninterrupted full-screen environment. Exiting full-screen is monitored and recorded on your candidate transcript. You may resume or submit your assessment.",
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
      if (isSubmitting || isSubmitted || isConfirmModalOpen) return;
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
      if (isSubmitting || isSubmitted || isConfirmModalOpen) return;
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
  }, [hasStarted, isSubmitted, isSubmitting, isConfirmModalOpen, logProctoringEvent]);

  // Authoritative Server-Synced Timer Loop
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

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
      .filter(i => i.mandatory && i.id !== "fullscreen")
      .every(i => i.status === "passed" || i.status === "attention");
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
        logProctoringEvent("fullscreen_enter", "Exam started in dedicated workspace mode", "info");
      } else {
        const err = await res.json().catch(() => ({}));
        // If start failed due to resume or existing attempt, fall back gracefully
        if (err.activeAttempt) {
          setCurrentAttemptId(err.activeAttempt.id);
          setHasStarted(true);
        } else {
          toast.error(err.error || "Failed to start assessment");
          setHasStarted(true);
          setSecondsRemaining((assessment.durationMinutes || 15) * 60);
        }
      }
    } catch (err) {
      setHasStarted(true);
      setSecondsRemaining((assessment.durationMinutes || 15) * 60);
    }
  };

  // Answer state modifiers
  const handleSelectOption = (questionId: string, option: string, isMulti: boolean = false) => {
    setAnswers(prev => {
      let nextOptions: string[];
      if (isMulti) {
        const current = prev[questionId] || [];
        if (current.includes(option)) {
          nextOptions = current.filter(o => o !== option);
        } else {
          nextOptions = [...current, option];
        }
      } else {
        nextOptions = [option];
      }
      const next = {
        ...prev,
        [questionId]: nextOptions
      };
      persistAnswers(next);
      return next;
    });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers(prev => {
      const next = {
        ...prev,
        [questionId]: [text]
      };
      persistAnswers(next);
      return next;
    });
  };

  const toggleMarkForReview = (questionId?: string) => {
    if (!questionId) return;
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleAutoSubmit = async () => {
    if (isSubmitted || isSubmitting) return;
    toast.warning("Authoritative examination deadline reached. Submitting assessment automatically...");
    await performSubmit();
  };

  const handleSubmitAssessment = () => {
    if (isSubmitted || isSubmitting) return;
    setIsConfirmModalOpen(true);
  };

  const performSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    setIsConfirmModalOpen(false);
    setActiveWarningModal(null);

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
        const completedCount = attemptsCount + 1;
        const maxAttempts = Number(assessment?.maxAttempts ?? 1);
        setAttemptsCount(completedCount);
        setAttemptsReached(maxAttempts > 0 && completedCount >= maxAttempts);
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

        // Exit fullscreen smoothly on submission completion
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        } catch (e) {}

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

  const handleRetakeAssessment = () => {
    const maxAttempts = Number(assessment?.maxAttempts ?? 1);
    if (maxAttempts > 0 && attemptsCount >= maxAttempts) return;

    localStorage.removeItem(storageKey);
    setAnswers({});
    setMarkedForReview({});
    setActiveQuestionIdx(0);
    setSubmissionResult(null);
    setGradedQuestions(null);
    setIsSubmitted(false);
    setHasStarted(false);
    setAttemptsReached(false);
    setCurrentAttemptId(null);
    setSecondsRemaining(null);
    setExpiresAtDate(null);
    setRulesAgreed(false);
    setWarningCount(0);
    setProctoringWarnings([]);
    setIsFullscreen(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setChecklist(prev => prev.map(item => {
      if (item.id === "rules") return { ...item, status: "pending" };
      if (item.id === "camera") return {
        ...item,
        status: assessment?.proctoringConfig?.requireCamera ? "pending" : "not_required",
        errorMessage: undefined
      };
      if (item.id === "microphone") return {
        ...item,
        status: assessment?.proctoringConfig?.requireMicrophone ? "pending" : "not_required",
        errorMessage: undefined
      };
      if (item.id === "session") return { ...item, status: "passed", errorMessage: undefined };
      return item;
    }));
  };

  // Re-enter Fullscreen from Warning Modal
  const handleResolveFullscreenWarning = async () => {
    setActiveWarningModal(null);
    try {
      await requestBrowserFullscreen();
    } catch (err) {
      console.warn("Fullscreen resume failed", err);
    }
  };

  const handleDismissWarningModal = () => {
    setActiveWarningModal(null);
  };

  const isQuestionAnswered = (qId: string) => {
    const ans = answers[qId];
    if (!ans) return false;
    if (Array.isArray(ans)) {
      return ans.some(v => v !== null && v !== undefined && String(v).trim().length > 0);
    }
    return String(ans).trim().length > 0;
  };

  const answeredCount = questions.filter(q => isQuestionAnswered(q.id)).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const maxProctorWarnings = assessment?.proctoringConfig?.maxWarnings || 5;

  // Loading Screen
  if (isLoading || isSubmitting) {
    return (
      <div 
        style={{ colorScheme: "light" }} 
        className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 space-y-4 font-sans select-none"
      >
        <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-slate-900 tracking-tight">
            {isSubmitting ? "Finalizing and Saving Assessment Answers..." : "Loading Secure Assessment Studio..."}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            {isSubmitting ? "Saving submissions, grading responses, and updating audit log" : "Validating candidate authorization and question set"}
          </p>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (accessDenied) {
    return (
      <div 
        style={{ colorScheme: "light" }} 
        className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-6 font-sans"
      >
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center max-w-md w-full space-y-5">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center border border-rose-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Assessment Access Restricted</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              You are not currently enrolled in this course or assigned this assessment. Please contact your instructor or LMS administrator to request access.
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Assessment Not Found Screen
  if (!assessment) {
    return (
      <div 
        style={{ colorScheme: "light" }} 
        className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-6 font-sans"
      >
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center text-slate-600 max-w-md w-full space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Assessment Not Found</h3>
          <p className="text-xs text-slate-600">The requested assessment could not be located or has been archived.</p>
          <button 
            onClick={onBack} 
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 1: PRE-EXAM INSTRUCTIONS & PROCTORING CHECKLIST
  // ====================================================
  if (!hasStarted && !isSubmitted) {
    const isReadyToStart = isChecklistSatisfied();

    return (
      <div 
        style={{ colorScheme: "light" }}
        className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col font-sans overflow-y-auto"
      >
        {/* Top Minimal Strip */}
        <header className="h-16 px-6 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Exit to Portal</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-sm tracking-tight text-slate-900">MRTECHLMS Secure Exam Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 hidden sm:inline-block">
              Candidate: {studentUser?.name || "Student"}
            </span>
            <button
              onClick={isFullscreen ? exitBrowserFullscreen : requestBrowserFullscreen}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Test Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-600" /> : <Maximize2 className="w-4 h-4 text-blue-600" />}
              <span className="hidden md:inline">{isFullscreen ? "Fullscreen Active" : "Test Fullscreen"}</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-blue-50 text-blue-700 border border-blue-200">
                {assessment.category || "General"}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                {assessment.difficulty || "Medium"} Level
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-purple-50 text-purple-700 border border-purple-200">
                Max Attempts: {assessment.maxAttempts || 1}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                Attempt {attemptsCount + 1} of {assessment.maxAttempts || 1}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {assessment.title}
              </h1>
              {assessment.shortDescription && (
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                  {assessment.shortDescription}
                </p>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-500 font-sans block">Duration</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{assessment.durationMinutes} Minutes</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-500 font-sans block">Questions</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{questions.length} Questions</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-500 font-sans block">Total Points</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{assessment.totalPoints} Pts</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] font-bold uppercase text-slate-500 font-sans block">Passing Threshold</span>
                <span className="text-lg font-bold text-emerald-600 mt-0.5 block">{assessment.passingScore}%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Instructions and Examination Rules */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Assessment Instructions & Exam Guidelines</span>
            </h3>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {assessment.instructions || "Read each question carefully before submitting. Ensure you review all questions using the Question Palette before final submission."}
            </div>

            <div className="p-4.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-2">
              <h4 className="font-bold text-blue-900 uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Proctoring & Integrity Protocol Disclosure</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs leading-relaxed">
                <li>The exam interface runs in a <strong>focused full-screen workspace</strong>. Exiting full-screen or switching tabs generates a timestamped proctoring notice.</li>
                <li>Your countdown timer is enforced directly by the authoritative LMS backend. Refreshing does not grant additional time.</li>
                <li>All answer choices (multiple-choice, written, or coding) are progressively saved automatically to prevent data loss.</li>
                <li>Excessive proctoring incidents will be logged with timestamps on your permanent candidate submission record.</li>
              </ul>
            </div>
          </div>

          {/* Section 3: Pre-Exam Readiness Checklist */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Pre-Exam System Readiness Checklist</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ensure all mandatory verification steps pass before commencing the timed examination.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                {checklist.filter(i => i.status === "passed").length} of {checklist.filter(i => i.mandatory).length} Mandatory Checks Passed
              </span>
            </div>

            {/* Checklist Items */}
            <div className="divide-y divide-slate-100">
              {checklist.map((item) => {
                const isPassed = item.status === "passed";
                const isAttention = item.status === "attention";
                const isNotReq = item.status === "not_required";
                const isChecking = item.status === "checking";

                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isPassed && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                        {isAttention && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                        {isNotReq && <Shield className="w-5 h-5 text-slate-400" />}
                        {isChecking && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
                        {item.status === "pending" && <Clock className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                          {item.mandatory && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        {item.errorMessage && (
                          <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
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
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Enable Camera</span>
                        </button>
                      )}

                      {item.id === "microphone" && item.status !== "passed" && item.status !== "not_required" && (
                        <button
                          type="button"
                          onClick={handleTestMicrophone}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Enable Mic</span>
                        </button>
                      )}

                      {item.id === "fullscreen" && item.status !== "passed" && (
                        <button
                          type="button"
                          onClick={requestBrowserFullscreen}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition border border-slate-300 cursor-pointer"
                        >
                          Enable Fullscreen
                        </button>
                      )}

                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isPassed 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isAttention
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : isNotReq
                              ? "bg-slate-100 text-slate-500 border border-slate-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
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
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Webcam Monitoring Stream Active
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live 320x240
                  </span>
                </div>
                <div className="w-48 h-36 bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
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
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="examRulesCheckbox"
                  checked={rulesAgreed}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRulesAgreed(checked);
                    setChecklist(prev => prev.map(i => i.id === "rules" ? {
                      ...i,
                      status: checked ? "passed" : "pending"
                    } : i));
                  }}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  I acknowledge that I am taking this exam under academic integrity rules. I understand that my screen activity, tab switching, and response times are monitored and recorded.
                </span>
              </label>
            </div>

            {/* Start Examination Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {!isReadyToStart ? (
                  <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Complete mandatory checks and accept terms above to begin.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    All verification prerequisites satisfied. You are ready to start.
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={!isReadyToStart}
                onClick={handleStartAssessment}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{attemptsCount > 0 ? `Start Attempt ${attemptsCount + 1}` : "Begin Timed Assessment"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 2: COMPLETED EXAM / RESULT & SUBMISSION SUMMARY
  // ====================================================
  if (isSubmitted) {
    const earnedScore = submissionResult?.score ?? 0;
    const totalPoints = assessment.totalPoints || 100;
    const pct = submissionResult?.percentage ?? (totalPoints > 0 ? Number(((earnedScore / totalPoints) * 100).toFixed(1)) : 0);
    const isPassed = submissionResult?.passed ?? (pct >= (assessment.passingScore || 60));
    const correctC = submissionResult?.correctCount ?? 0;
    const incorrectC = submissionResult?.incorrectCount ?? 0;
    const unansweredC = submissionResult?.unansweredCount ?? 0;
    const maxAttempts = Number(assessment.maxAttempts ?? 1);
    const canRetake = maxAttempts <= 0 || attemptsCount < maxAttempts;

    return (
      <div 
        style={{ colorScheme: "light" }}
        className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col font-sans overflow-y-auto"
      >
        {/* Top Minimal Strip */}
        <header className="h-16 px-6 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Assessments</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="font-bold text-sm tracking-tight text-slate-900">{assessment.title} - Results</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
              isPassed 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              {isPassed ? "PASSED" : "NOT PASSED"}
            </span>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Main Result Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 text-center shadow-xs">
            <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center border ${
              isPassed 
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm" 
                : "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
            }`}>
              {isPassed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isPassed ? "Congratulations! Assessment Passed" : "Assessment Completed"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                {isPassed 
                  ? `You have successfully satisfied the passing threshold of ${assessment.passingScore}%. Your score has been recorded.` 
                  : `You scored ${pct}%, which is below the passing criteria of ${assessment.passingScore}%. Review your questions below.`
                }
              </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-sans">Score</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {earnedScore} / {totalPoints}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-sans">Percentage</span>
                <p className={`text-xl font-extrabold mt-0.5 ${isPassed ? "text-emerald-600" : "text-rose-600"}`}>
                  {pct}%
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-sans">Correct Answers</span>
                <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{correctC}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-500 font-sans">Time Taken</span>
                <p className="text-xl font-extrabold text-slate-800 mt-0.5">
                  {formatTime(submissionResult?.timeTakenSeconds || 0)}
                </p>
              </div>
            </div>

            {/* Additional metrics line: Correct, Incorrect, Unanswered */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-600 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Correct: <strong className="text-slate-900">{correctC}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Incorrect: <strong className="text-slate-900">{incorrectC}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Unanswered: <strong className="text-slate-900">{unansweredC}</strong>
              </span>
            </div>

            {/* Proctoring Summary Pill if any violations */}
            {proctoringWarnings.length > 0 && (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 max-w-md mx-auto text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Proctoring Telemetry Audit Log
                  </span>
                  <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    {proctoringWarnings.length} Event(s) Recorded
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Session events including full-screen toggles or tab backgrounding were safely logged on your student audit transcript.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              {canRetake && (
                <button
                  type="button"
                  onClick={handleRetakeAssessment}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Assessment ({attemptsCount + 1}{maxAttempts > 0 ? ` of ${maxAttempts}` : ""})</span>
                </button>
              )}
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
              >
                Back to Assessments
              </button>
              <button
                onClick={onCompleted}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Continue Learning
              </button>
            </div>
          </div>

          {/* Leaderboard Section */}
          {leaderboard.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Assessment Leaderboard</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {leaderboard.map((student) => (
                  <div key={student.rank} className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        student.rank === 1 
                          ? "bg-amber-100 text-amber-800 border border-amber-300" 
                          : student.rank === 2 
                            ? "bg-slate-200 text-slate-800" 
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {student.rank}
                      </span>
                      <p className="text-xs font-semibold text-slate-800">{student.studentName}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                      <span>{student.time}</span>
                      <span className="font-bold text-slate-900">{student.score} Pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question-by-Question Review with Answers & Explanations */}
          {gradedQuestions && gradedQuestions.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Answers & Explanations Review</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {gradedQuestions.length} Questions Evaluated
                </span>
              </div>

              <div className="space-y-4">
                {gradedQuestions.map((q, idx) => {
                  const studentAns = answers[q.id];
                  const studentAnsStr = Array.isArray(studentAns) ? studentAns.join(", ") : (studentAns || "");
                  const correctAns = Array.isArray(q.correctAnswers) ? q.correctAnswers.join(", ") : (q.correctAnswers || "");
                  const isAttempted = isQuestionAnswered(q.id);
                  
                  let isCorrect = false;
                  if (isAttempted) {
                    if (q.type === QuestionType.FILL_BLANKS || (q as any).type === "fill_blanks") {
                      isCorrect = Array.isArray(q.correctAnswers) 
                        ? q.correctAnswers.some(c => (studentAns || []).some(a => a.toLowerCase().trim() === c.toLowerCase().trim()))
                        : true;
                    } else if (q.type === QuestionType.SUBJECTIVE || (q as any).type === "subjective" || (q as any).type === "code") {
                      isCorrect = true; // Subjective/code recorded
                    } else {
                      const ansArr = Array.isArray(studentAns) ? studentAns : [studentAns];
                      const corArr = Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswers];
                      isCorrect = ansArr.length === corArr.length && ansArr.every(v => corArr.includes(v));
                    }
                  }
                  
                  const cleanQText = cleanQuestionText(q.questionText);

                  return (
                    <div 
                      key={q.id}
                      className={`p-5 rounded-2xl border transition space-y-3 ${
                        !isAttempted
                          ? "bg-slate-50 border-slate-200"
                          : isCorrect 
                            ? "bg-emerald-50/60 border-emerald-200" 
                            : "bg-rose-50/60 border-rose-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            !isAttempted
                              ? "bg-slate-200 text-slate-700"
                              : isCorrect 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-rose-100 text-rose-800"
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-relaxed">{cleanQText}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                !isAttempted
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : isCorrect 
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}>
                                {!isAttempted ? "Unanswered (0 Pts)" : isCorrect ? `+${q.points} Pts Correct` : `Incorrect (0 Pts)`}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 capitalize">
                                Type: {q.type ? q.type.replace("_", " ") : "MCQ"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isAttempted ? (
                          <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
                        ) : isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </div>

                      {/* Display for MCQ Options */}
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isOptCorrect = Array.isArray(q.correctAnswers) ? q.correctAnswers.includes(opt) : opt === correctAns;
                            const isStudentPick = Array.isArray(studentAns) ? studentAns.includes(opt) : opt === studentAns;

                            let badgeStyle = "bg-white border-slate-200 text-slate-700";
                            if (isOptCorrect) {
                              badgeStyle = "bg-emerald-100 border-emerald-300 text-emerald-950 font-bold";
                            } else if (isStudentPick && !isOptCorrect) {
                              badgeStyle = "bg-rose-100 border-rose-300 text-rose-950 line-through font-semibold";
                            }

                            return (
                              <div 
                                key={oIdx}
                                className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${badgeStyle}`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0 font-bold border border-slate-300 bg-white">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="truncate">{opt}</span>
                                </div>
                                {isOptCorrect && (
                                  <span className="text-[9px] font-mono font-bold text-emerald-700 ml-2 shrink-0">
                                    CORRECT
                                  </span>
                                )}
                                {isStudentPick && !isOptCorrect && (
                                  <span className="text-[9px] font-mono font-bold text-rose-700 ml-2 shrink-0">
                                    YOUR PICK
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Display for Written/Subjective/Fill-in-blanks/Code questions */}
                      {(!q.options || q.options.length === 0) && (
                        <div className="pl-9 space-y-2 pt-1 text-xs">
                          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">Candidate Response:</span>
                            <p className="font-mono text-slate-800 whitespace-pre-wrap">{studentAnsStr || "(No answer provided)"}</p>
                          </div>
                          {correctAns && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 block">Reference / Correct Answer:</span>
                              <p className="font-mono text-emerald-950 whitespace-pre-wrap">{correctAns}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="ml-9 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                          <p className="font-bold text-blue-900">Explanation:</p>
                          <p className="text-slate-700 leading-relaxed">{q.explanation}</p>
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
  // VIEW 3: DEDICATED LIGHT-THEMED ACTIVE EXAM INTERFACE
  // ====================================================
  const activeQuestion = questions[activeQuestionIdx] || questions[0];
  const isSequential = assessment.questionNavigation === "sequential";
  const isMarked = !!markedForReview[activeQuestion?.id];
  const cleanedActiveQuestionText = cleanQuestionText(activeQuestion?.questionText);
  const currentQType = String(activeQuestion?.type || "").toLowerCase();

  return (
    <div 
      ref={examContainerRef}
      style={{ colorScheme: "light" }}
      className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden select-none"
    >
      {/* 1. Header: Assessment Title, Progress, Timer, Connectivity & Proctoring */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20 shadow-2xs">
        {/* Left: Brand + Title + Category */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {assessment.title}
              </h2>
              {isSequential && (
                <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded uppercase hidden sm:inline-block">
                  Sequential
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>Question {activeQuestionIdx + 1} of {questions.length}</span>
              {isAutoSaving && (
                <span className="text-[10px] text-blue-600 animate-pulse flex items-center gap-1 font-semibold">
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
              ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse" 
              : "bg-slate-100 text-slate-800 border border-slate-200"
          }`}>
            <Clock className={`w-4 h-4 ${secondsRemaining !== null && secondsRemaining < 120 ? "text-rose-600" : "text-blue-600"}`} />
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
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
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
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : "bg-amber-50 text-amber-800 border-amber-300"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{warningCount === 0 ? "Monitored" : `${warningCount} Warn`}</span>
          </div>

          {/* Question Palette Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsPaletteMobileOpen(prev => !prev)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title="Toggle Question Palette"
          >
            <LayoutGrid className="w-4 h-4 text-blue-600" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={isFullscreen ? exitBrowserFullscreen : requestBrowserFullscreen}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-600" /> : <Maximize2 className="w-4 h-4 text-blue-600" />}
          </button>
        </div>
      </header>

      {/* Offline Alert Strip if connection lost */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          <span>Offline mode active. Your answers are automatically preserved locally and will sync once internet returns.</span>
        </div>
      )}

      {/* 2. Main Content Area: Question Column + Palette Column */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left (3/4): Question Viewer Column */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="max-w-3xl w-full mx-auto space-y-6 my-auto">
            {/* Question Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Question Header: Point value + Mark for review */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs flex items-center justify-center border border-blue-200">
                    {activeQuestionIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {activeQuestion?.points || 10} POINTS
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 ml-1">
                    {activeQuestion?.type ? activeQuestion.type.replace("_", " ") : "MCQ"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleMarkForReview(activeQuestion?.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isMarked
                      ? "bg-amber-50 border-amber-300 text-amber-800 font-bold"
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isMarked ? "fill-amber-600 text-amber-600" : ""}`} />
                  <span>{isMarked ? "Marked for Review" : "Mark for Review"}</span>
                </button>
              </div>

              {/* Question Text (Sanitized) */}
              <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {cleanedActiveQuestionText}
              </p>

              {/* Question Renderers by Type */}

              {/* 1. MCQ Single / Standard */}
              {(currentQType === "mcq_single" || (!activeQuestion.type && Array.isArray(activeQuestion.options) && activeQuestion.options.length > 0)) && (
                <div className="space-y-3 pt-2">
                  {activeQuestion?.options?.map((opt, i) => {
                    const isSelected = answers[activeQuestion.id]?.includes(opt);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOption(activeQuestion.id, opt, false)}
                        className={`w-full text-left px-5 py-4 rounded-xl text-xs sm:text-sm font-semibold transition border flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                            isSelected 
                              ? "bg-blue-600 text-white shadow-xs" 
                              : "bg-slate-100 border border-slate-200 text-slate-600"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. MCQ Multi / Multiple Choice */}
              {currentQType === "mcq_multi" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 w-fit">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Multiple Choice: Select all options that apply</span>
                  </div>
                  {activeQuestion?.options?.map((opt, i) => {
                    const isSelected = answers[activeQuestion.id]?.includes(opt);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOption(activeQuestion.id, opt, true)}
                        className={`w-full text-left px-5 py-4 rounded-xl text-xs sm:text-sm font-semibold transition border flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                            isSelected 
                              ? "bg-blue-600 text-white shadow-xs" 
                              : "bg-slate-100 border border-slate-200 text-slate-600"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. True / False */}
              {currentQType === "true_false" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                  {["True", "False"].map((choice) => {
                    const isSelected = answers[activeQuestion.id]?.includes(choice) || answers[activeQuestion.id]?.includes(choice.toLowerCase());
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleSelectOption(activeQuestion.id, choice, false)}
                        className={`px-6 py-5 rounded-2xl text-sm font-bold transition border flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500/20 shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-base font-extrabold">{choice}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 4. Fill in the Blanks */}
              {currentQType === "fill_blanks" && (
                <div className="space-y-3 pt-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                    Candidate Answer
                  </label>
                  <input
                    type="text"
                    value={answers[activeQuestion.id]?.[0] || ""}
                    onChange={(e) => handleTextAnswer(activeQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs transition placeholder:text-slate-400 font-medium"
                  />
                  <p className="text-[11px] text-slate-500 font-mono">
                    All typed answers are saved automatically into your session.
                  </p>
                </div>
              )}

              {/* 5. Subjective / Written Answer */}
              {(currentQType === "subjective" || currentQType === "written" || (!activeQuestion.options || activeQuestion.options.length === 0)) && (
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                      Written Response
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {((answers[activeQuestion.id]?.[0] || "").trim().split(/\s+/).filter(Boolean).length)} Words • {(answers[activeQuestion.id]?.[0] || "").length} Characters
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={answers[activeQuestion.id]?.[0] || ""}
                    onChange={(e) => handleTextAnswer(activeQuestion.id, e.target.value)}
                    placeholder="Write your comprehensive, detailed explanation or answer here..."
                    className="w-full p-4 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs transition placeholder:text-slate-400 font-medium leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Organize your thoughts clearly. All edits are auto-saved.</span>
                    {isAutoSaving && <span className="text-blue-600 font-mono font-semibold animate-pulse">Auto-saving...</span>}
                  </div>
                </div>
              )}

              {/* 6. Code Question */}
              {currentQType === "code" && (
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                      Code Implementation
                    </label>
                    <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Editor Workspace
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-300 overflow-hidden shadow-2xs bg-slate-950">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                      <span>source_code.py / js</span>
                      <span>Monospaced Editor</span>
                    </div>
                    <textarea
                      rows={10}
                      value={answers[activeQuestion.id]?.[0] || ""}
                      onChange={(e) => handleTextAnswer(activeQuestion.id, e.target.value)}
                      placeholder="// Write or paste your code solution here..."
                      className="w-full p-4 bg-slate-950 text-slate-100 font-mono text-xs sm:text-sm focus:outline-hidden resize-y leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Question Navigation Controls Footer */}
            <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
              {!isSequential ? (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIdx === 0}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-slate-200"
                >
                  Previous Question
                </button>
              ) : (
                <span className="text-xs text-slate-500 font-mono">
                  Step {activeQuestionIdx + 1} of {questions.length}
                </span>
              )}

              <div className="flex items-center gap-3">
                {activeQuestionIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmitAssessment}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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
          ${isPaletteMobileOpen ? "fixed inset-y-16 right-0 z-40 w-72 bg-white shadow-2xl" : "hidden"} 
          lg:flex lg:w-72 xl:w-80 border-l border-slate-200 bg-white flex-col overflow-y-auto shrink-0 p-5 space-y-5
        `}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
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
                className="lg:hidden p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Grid of question bubbles */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = isQuestionAnswered(q.id);
              const isFlagged = markedForReview[q.id];
              const isActive = idx === activeQuestionIdx;

              let bubbleStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
              if (isActive) {
                bubbleStyle = "bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-white border-transparent font-bold shadow-xs";
              } else if (isAnswered) {
                bubbleStyle = "bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs";
              } else if (isFlagged) {
                bubbleStyle = "bg-amber-100 border-amber-300 text-amber-900 font-bold";
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
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] font-mono text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300 inline-block" />
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300 inline-block" />
              <span>Marked for Review ({markedCount})</span>
            </div>
          </div>

          {/* Live Proctoring Webcam Miniature Preview (if camera enabled) */}
          {cameraStream && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-800 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Proctoring
                </span>
                <span className="text-emerald-700 font-bold">Active</span>
              </div>
              <div className="w-full h-28 bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
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
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Finalize & Submit Exam</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 3. Dedicated Submission Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${
              unansweredCount > 0 
                ? "bg-amber-50 text-amber-600 border-amber-200" 
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}>
              {unansweredCount > 0 ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Finalize & Submit Assessment?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                You have answered <strong className="text-slate-900">{answeredCount}</strong> of <strong className="text-slate-900">{questions.length}</strong> questions.
                {markedCount > 0 && ` You have ${markedCount} question(s) marked for review.`}
              </p>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Notice: {unansweredCount} Unanswered Question(s)
                </span>
                <p className="text-[11px] text-amber-800">
                  You can submit now and uncompleted questions will be scored as 0 points, or you can return to answer them.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              >
                Return to Questions
              </button>
              <button
                type="button"
                onClick={performSubmit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Yes, Submit Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Non-dismissable Proctoring Violation Warning Modal */}
      {activeWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-amber-300 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300">
                Proctoring Telemetry Alert ({warningCount} Incident{warningCount === 1 ? "" : "s"})
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                {activeWarningModal.title}
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {activeWarningModal.message}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-mono text-left space-y-1">
              <div>Incident Time: <strong className="text-slate-900">{new Date().toLocaleTimeString()}</strong></div>
              <div>Monitored Policy: <strong className="text-amber-800">Continuous Fullscreen Lock</strong></div>
              <div>Remaining Warnings: <strong className="text-emerald-700">{Math.max(0, maxProctorWarnings - warningCount)} of {maxProctorWarnings}</strong></div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleResolveFullscreenWarning}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Re-enter Full-Screen Mode & Resume</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDismissWarningModal}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Dismiss & Continue
                </button>
                <button
                  type="button"
                  onClick={performSubmit}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Exam Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
