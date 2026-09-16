/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Send, RotateCcw, Save, Maximize2, Minimize2, CheckCircle2, 
  XCircle, Clock, AlertTriangle, HelpCircle, BookOpen, Terminal, 
  Code2, Timer, Sun, Moon, ArrowLeft, ChevronDown, 
  ChevronRight, Copy, Check, FileText, Settings, Layers, Lock 
} from "lucide-react";
import { CodingChallenge, RuntimeInfo, TestCase, TestCaseResult, ExecutionResult } from "../../types.js";
import { useTheme } from "../../context/ThemeContext.js";
import { MonacoCodeEditor } from "./MonacoCodeEditor.js";
import { WebPlayground } from "./WebPlayground.js";

interface CodingWorkspaceProps {
  challengeId: string;
  authToken: string;
  onBackToCatalog: () => void;
  studentName?: string;
  studentPhoto?: string;
}

export function CodingWorkspace({
  challengeId,
  authToken,
  onBackToCatalog,
  studentName = "Student",
  studentPhoto
}: CodingWorkspaceProps) {
  const { isDark, toggleTheme } = useTheme();

  // Challenge & Runtime State
  const [challenge, setChallenge] = useState<CodingChallenge | null>(null);
  const [runtimes, setRuntimes] = useState<RuntimeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor State
  const [selectedLanguage, setSelectedLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [cssCode, setCssCode] = useState<string>("");
  const [jsCode, setJsCode] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Layout & Tabs State
  const [leftTab, setLeftTab] = useState<"problem" | "examples" | "constraints" | "tests" | "hints" | "solution">("problem");
  const [outputTab, setOutputTab] = useState<"console" | "tests" | "custom">("console");
  const [mobileActiveView, setMobileActiveView] = useState<"problem" | "editor" | "output">("editor");
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(400); // px
  const isDraggingRef = useRef(false);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [customInput, setCustomInput] = useState<string>("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Stopwatch / Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // 1. Fetch Runtimes and Challenge Details
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [rtRes, chRes] = await Promise.all([
          fetch("/api/coding/runtimes"),
          fetch(`/api/coding/challenges/${challengeId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        ]);

        if (!chRes.ok) throw new Error("Failed to load coding challenge");
        const chData: CodingChallenge = await chRes.json();
        setChallenge(chData);

        if (rtRes.ok) {
          const rtData: RuntimeInfo[] = await rtRes.json();
          setRuntimes(rtData);
        }

        // Determine initial language
        const supp = chData.supportedLanguages || ["python"];
        const defaultLang = supp.includes("python") ? "python" : supp[0];
        setSelectedLanguage(defaultLang);

        // Check if saved code exists
        if (chData.savedCode) {
          const sc = chData.savedCode;
          if (chData.challengeType === "web") {
            setHtmlCode(sc.htmlCode || chData.htmlStarterCode || "");
            setCssCode(sc.cssCode || chData.cssStarterCode || "");
            setJsCode(sc.jsCode || chData.javascriptStarterCode || "");
          } else {
            if (sc.code) setCode(sc.code);
            else setCode(chData.starterCode?.[defaultLang] || "");
          }
          setLastSavedTime(sc.updatedAt ? new Date(sc.updatedAt).toLocaleTimeString() : null);
        } else {
          // Use starter codes
          if (chData.challengeType === "web") {
            setHtmlCode(chData.htmlStarterCode || "");
            setCssCode(chData.cssStarterCode || "");
            setJsCode(chData.javascriptStarterCode || "");
          } else {
            setCode(chData.starterCode?.[defaultLang] || "");
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize workspace");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [challengeId, authToken]);

  // When language changes in programming mode
  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    if (!challenge) return;

    // Load saved code for this language if present, else default starter
    fetch(`/api/coding/saved/${challenge.id}?language=${newLang}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(saved => {
        if (saved && saved.code) {
          setCode(saved.code);
          setLastSavedTime(new Date(saved.updatedAt).toLocaleTimeString());
        } else {
          setCode(challenge.starterCode?.[newLang] || "");
        }
      })
      .catch(() => {
        setCode(challenge.starterCode?.[newLang] || "");
      });
  };

  // 2. Save Code Handler (Ctrl+S or Save button)
  const handleSaveCode = async () => {
    if (!challenge) return;
    setIsSaving(true);
    try {
      const payload: any = {
        challengeId: challenge.id,
        language: challenge.challengeType === "web" ? "web" : selectedLanguage
      };
      if (challenge.challengeType === "web") {
        payload.htmlCode = htmlCode;
        payload.cssCode = cssCode;
        payload.jsCode = jsCode;
      } else {
        payload.code = code;
      }

      const res = await fetch("/api/coding/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setLastSavedTime(new Date(data.updatedAt).toLocaleTimeString());
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Reset Starter Code
  const handleResetCode = () => {
    if (!challenge) return;
    if (window.confirm("Reset your code to the original starter template? Unsaved edits will be lost.")) {
      if (challenge.challengeType === "web") {
        setHtmlCode(challenge.htmlStarterCode || "");
        setCssCode(challenge.cssStarterCode || "");
        setJsCode(challenge.javascriptStarterCode || "");
      } else {
        setCode(challenge.starterCode?.[selectedLanguage] || "");
      }
      setConsoleOutput("");
      setExecutionResult(null);
    }
  };

  // 4. Run Code (Public Test Cases or Custom Input)
  const handleRunCode = async (isCustom = false) => {
    if (!challenge) return;
    setIsRunning(true);
    setOutputTab(isCustom ? "custom" : "console");
    setMobileActiveView("output");

    try {
      const payload: any = {
        challengeId: challenge.id,
        language: selectedLanguage,
        code
      };
      if (isCustom) {
        payload.customInput = customInput;
      }

      const res = await fetch("/api/coding/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (isCustom) {
        setConsoleOutput(data.stdout || data.stderr || (data.timedOut ? "Time Limit Exceeded (3.0s)" : "Execution completed with no output."));
      } else {
        setExecutionResult(data);
        if (data.results && data.results.length > 0) {
          setOutputTab("tests");
        }
        setConsoleOutput(data.stdout || data.stderr || (data.status === "passed" ? "All public test cases passed!" : "Execution error."));
      }
    } catch (err: any) {
      setConsoleOutput("Runtime Error: Failed to communicate with sandbox execution engine.");
    } finally {
      setIsRunning(false);
    }
  };

  // 5. Submit Code (Evaluates Public + Hidden Private Test Cases)
  const handleSubmitCode = async () => {
    if (!challenge) return;
    setIsSubmitting(true);
    setOutputTab("tests");
    setMobileActiveView("output");

    try {
      const payload: any = {
        challengeId: challenge.id,
        language: challenge.challengeType === "web" ? "web" : selectedLanguage
      };
      if (challenge.challengeType === "web") {
        payload.htmlCode = htmlCode;
        payload.cssCode = cssCode;
        payload.jsCode = jsCode;
      } else {
        payload.code = code;
      }

      const res = await fetch("/api/coding/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setExecutionResult(data);
      setShowSubmissionModal(true);
      setConsoleOutput(data.output || (data.status === "passed" ? "All evaluation tests passed successfully!" : `Failed test cases: ${data.passedCount}/${data.totalCount}`));
      
      // Update challenge status and unlock solution explanation if returned
      setChallenge(prev => {
        if (!prev) return null;
        const isSolvedNow = data.status === "passed" || prev.isSolved;
        return {
          ...prev,
          hasAttempted: true,
          status: isSolvedNow ? "solved" : (prev.status === "solved" ? "solved" : "in_progress"),
          isSolved: isSolvedNow,
          solutionExplanation: data.solutionExplanation || prev.solutionExplanation
        };
      });

      // Auto-save code on submission
      handleSaveCode();
    } catch (err: any) {
      setConsoleOutput("Submission error: Sandbox evaluation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Resizable left panel drag handlers
  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(300, Math.min(e.clientX, window.innerWidth - 450));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] w-full text-slate-500 space-y-3 font-mono">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Initializing Professional Coding Workspace...</p>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Challenge Unavailable</h2>
        <p className="text-xs text-slate-500">{error || "Could not load challenge"}</p>
        <button
          onClick={onBackToCatalog}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const isWebChallenge = challenge.challengeType === "web";
  const diffBadgeColor = 
    challenge.difficulty === "easy" 
      ? "bg-emerald-950/80 text-emerald-400 border-emerald-800" 
      : challenge.difficulty === "medium" 
      ? "bg-amber-950/80 text-amber-400 border-amber-800" 
      : "bg-rose-950/80 text-rose-400 border-rose-800";

  return (
    <div className={`flex flex-col w-full bg-slate-950 text-slate-100 overflow-hidden font-sans ${
      isFullscreen ? "fixed inset-0 z-50 h-screen" : "h-[calc(100vh-80px)] min-h-[650px]"
    }`}>
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER: Branding, Title, Timer, Controls, Profile */}
      {/* ------------------------------------------------------------- */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Back button + Branding + Challenge Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToCatalog}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
            title="Back to Challenge Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 shrink-0 hidden sm:flex">
            <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-7 h-7 object-contain shrink-0 drop-shadow-xs" />
            <span className="font-extrabold text-sm tracking-tight text-white font-mono">
              MR-<span className="text-blue-500">TECH</span>
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[280px] lg:max-w-md">
              {challenge.title}
            </h1>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${diffBadgeColor}`}>
              {challenge.difficulty}
            </span>
            <span className="hidden md:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              {isWebChallenge ? "Web Dev" : "Algorithm"}
            </span>
          </div>
        </div>

        {/* Right: Timer, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Interview Stopwatch */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/80 rounded-lg text-slate-300 text-xs font-mono">
            <Timer className="w-3.5 h-3.5 text-blue-400" />
            <span>{formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="text-slate-400 hover:text-white text-[10px] ml-1"
              title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
            >
              {isTimerRunning ? "⏸" : "▶"}
            </button>
          </div>

          {/* Theme Quick Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Student Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            {studentPhoto ? (
              <img src={studentPhoto} alt={studentName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                {studentName.charAt(0)}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-200 hidden xl:inline-block max-w-[100px] truncate">
              {studentName}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Mode Switcher Bar */}
      <div className="flex md:hidden bg-slate-900 border-b border-slate-800 p-1">
        <button
          onClick={() => setMobileActiveView("problem")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
            mobileActiveView === "problem" ? "bg-slate-800 text-white" : "text-slate-400"
          }`}
        >
          Problem
        </button>
        <button
          onClick={() => setMobileActiveView("editor")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
            mobileActiveView === "editor" ? "bg-slate-800 text-white" : "text-slate-400"
          }`}
        >
          Code Editor
        </button>
        <button
          onClick={() => setMobileActiveView("output")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
            mobileActiveView === "output" ? "bg-slate-800 text-white" : "text-slate-400"
          }`}
        >
          Output & Tests
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MAIN WORKSPACE BODY: Resizable 3-Panel / Split Arrangement     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
        {/* ========================================================= */}
        {/* PANEL 1: Problem Description & Test Cases (Left Panel)    */}
        {/* ========================================================= */}
        <aside
          style={{ width: window.innerWidth >= 768 ? `${leftPanelWidth}px` : "100%" }}
          className={`flex flex-col bg-slate-900 border-r border-slate-800 min-h-0 shrink-0 ${
            mobileActiveView !== "problem" ? "hidden md:flex" : "flex h-full"
          }`}
        >
          {/* Problem Tabs Navigation */}
          <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800 overflow-x-auto shrink-0 text-xs font-medium">
            <button
              onClick={() => setLeftTab("problem")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                leftTab === "problem" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Problem
            </button>
            <button
              onClick={() => setLeftTab("examples")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                leftTab === "examples" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Examples
            </button>
            <button
              onClick={() => setLeftTab("constraints")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                leftTab === "constraints" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Constraints
            </button>
            <button
              onClick={() => setLeftTab("tests")}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                leftTab === "tests" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Test Cases ({challenge.publicTestCases?.length || 0})
            </button>
            {challenge.hints && challenge.hints.length > 0 && (
              <button
                onClick={() => setLeftTab("hints")}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  leftTab === "hints" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Hints ({challenge.hints.length})
              </button>
            )}
            {challenge.solutionExplanation ? (
              <button
                onClick={() => setLeftTab("solution")}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
                  leftTab === "solution" ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Solution</span>
              </button>
            ) : (
              <button
                disabled
                title="Submit an attempt to unlock the official solution discussion."
                className="px-3 py-1.5 rounded-lg whitespace-nowrap text-slate-500 cursor-not-allowed flex items-center gap-1.5 opacity-50 select-none"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Solution</span>
              </button>
            )}
          </div>

          {/* Problem Body Content */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed select-text">
            {leftTab === "problem" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">{challenge.title}</h3>
                  <div className="whitespace-pre-wrap font-sans text-slate-300 space-y-2">
                    {challenge.description}
                  </div>
                </div>

                {challenge.inputFormat && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Input Format
                    </span>
                    <p className="text-slate-300 font-mono text-[11px] whitespace-pre-line">{challenge.inputFormat}</p>
                  </div>
                )}

                {challenge.outputFormat && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                      Output Format
                    </span>
                    <p className="text-slate-300 font-mono text-[11px] whitespace-pre-line">{challenge.outputFormat}</p>
                  </div>
                )}
              </div>
            )}

            {leftTab === "examples" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Sample Examples
                </h4>
                {challenge.examples && challenge.examples.length > 0 ? (
                  challenge.examples.map((ex, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono">
                      <span className="text-[10px] font-bold text-blue-400 uppercase">Example {idx + 1}</span>
                      <div className="space-y-1">
                        <span className="text-slate-500 block text-[11px]">Input:</span>
                        <pre className="p-2 bg-slate-900 rounded-lg text-slate-200 overflow-x-auto text-[11px]">{ex.input}</pre>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block text-[11px]">Output:</span>
                        <pre className="p-2 bg-slate-900 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">{ex.output}</pre>
                      </div>
                      {ex.explanation && (
                        <p className="text-[11px] text-slate-400 font-sans pt-1 border-t border-slate-900">
                          <strong>Explanation:</strong> {ex.explanation}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic">No examples provided for this problem.</p>
                )}
              </div>
            )}

            {leftTab === "constraints" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Constraints & Time Limits
                </h4>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono">
                  {challenge.constraints ? (
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap">{challenge.constraints}</pre>
                  ) : (
                    <p className="text-slate-500">Standard algorithmic runtime constraints apply.</p>
                  )}
                  <div className="pt-3 border-t border-slate-900 text-[11px] text-slate-400 space-y-1">
                    <p>• Time Limit: {challenge.timeLimit || 3000} ms per test case</p>
                    <p>• Memory Limit: {challenge.memoryLimit || 256} MB</p>
                  </div>
                </div>
              </div>
            )}

            {leftTab === "tests" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                  <span>Public Test Cases</span>
                  <span className="text-[10px] text-slate-500 font-normal">Hidden tests run on Submit</span>
                </h4>
                {challenge.publicTestCases?.map((tc, idx) => (
                  <div key={tc.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Test Case {idx + 1}</span>
                      <button
                        onClick={() => handleCopy(tc.input, idx)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">Input:</span>
                      <pre className="p-2 bg-slate-900 rounded-lg text-slate-200 overflow-x-auto text-[11px]">{tc.input}</pre>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 block">Expected Output:</span>
                      <pre className="p-2 bg-slate-900 rounded-lg text-emerald-400 overflow-x-auto text-[11px]">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {leftTab === "hints" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Instructor Hints</span>
                </h4>
                {challenge.hints?.map((hint, idx) => (
                  <div key={idx} className="p-3 bg-blue-950/30 border border-blue-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-blue-400 font-mono uppercase">Hint {idx + 1}</span>
                    <p className="text-slate-300 font-sans text-xs">{hint}</p>
                  </div>
                ))}
              </div>
            )}

            {leftTab === "solution" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Solution Discussion</span>
                </h4>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    {challenge.solutionExplanation || "No official solution explanation available."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Resizer Divider Bar (Desktop) */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:flex w-1 bg-slate-800 hover:bg-blue-600 active:bg-blue-500 cursor-col-resize transition-colors items-center justify-center shrink-0 z-10"
        />

        {/* ========================================================= */}
        {/* PANEL 2 & 3: Editor (Center) & Output/Tests (Right/Bottom) */}
        {/* ========================================================= */}
        <main className={`flex-1 flex flex-col min-w-0 min-h-0 ${
          mobileActiveView === "problem" ? "hidden md:flex" : "flex"
        }`}>
          {/* Top Editor Toolbar */}
          <div className="h-11 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 select-none">
            {/* Language Selector or Web Tabs */}
            <div className="flex items-center gap-2">
              {!isWebChallenge ? (
                <div className="relative flex items-center">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-mono appearance-none"
                  >
                    {(challenge.supportedLanguages || ["python"]).map((lang) => {
                      const rt = runtimes.find(r => r.id === lang);
                      const isAvail = rt ? rt.available : true;
                      return (
                        <option key={lang} value={lang} disabled={!isAvail}>
                          {lang === "python" ? "Python 3" :
                           lang === "javascript" ? "JavaScript (Node.js)" :
                           lang === "java" ? "Java" :
                           lang === "sql" ? "SQL" :
                           lang.toUpperCase()} {!isAvail ? "(Unavailable)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Web Playground Mode</span>
                </div>
              )}

              {lastSavedTime && (
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
                  Saved at {lastSavedTime}
                </span>
              )}
            </div>

            {/* Editor Quick Tools */}
            <div className="flex items-center gap-1.5">
              {/* Font Size Toggle */}
              <button
                onClick={() => setFontSize(f => f >= 18 ? 12 : f + 2)}
                className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-[11px] font-mono text-slate-300 transition"
                title="Adjust Editor Font Size"
              >
                {fontSize}px
              </button>

              {/* Word Wrap */}
              <button
                onClick={() => setWordWrap(w => w === "on" ? "off" : "on")}
                className={`p-1.5 rounded-md border transition ${
                  wordWrap === "on"
                    ? "bg-slate-800 text-blue-400 border-slate-700"
                    : "bg-slate-950 text-slate-500 border-slate-800"
                }`}
                title={`Word Wrap: ${wordWrap}`}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>

              {/* Reset Starter */}
              <button
                onClick={handleResetCode}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition"
                title="Reset Code to Starter Template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Save Draft */}
              <button
                onClick={handleSaveCode}
                disabled={isSaving}
                className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
                title="Save Code (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Editor Body or Web Playground */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {isWebChallenge ? (
              <WebPlayground
                html={htmlCode}
                css={cssCode}
                js={jsCode}
                onHtmlChange={setHtmlCode}
                onCssChange={setCssCode}
                onJsChange={setJsCode}
                theme={isDark ? "vs-dark" : "vs"}
                fontSize={fontSize}
                wordWrap={wordWrap}
                onSave={handleSaveCode}
                onSubmit={handleSubmitCode}
                isSubmitting={isSubmitting}
              />
            ) : (
              <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* Monaco Editor Canvas */}
                <div className={`flex-1 relative min-h-[300px] ${
                  mobileActiveView === "output" ? "hidden md:flex" : "flex"
                }`}>
                  <MonacoCodeEditor
                    code={code}
                    onChange={setCode}
                    language={selectedLanguage}
                    theme={isDark ? "vs-dark" : "vs"}
                    fontSize={fontSize}
                    wordWrap={wordWrap}
                    onRun={() => handleRunCode(false)}
                    onSave={handleSaveCode}
                  />
                </div>

                {/* Right / Output Panel (Programming Mode) */}
                <div className={`w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 min-h-0 shrink-0 ${
                  mobileActiveView === "editor" ? "hidden md:flex" : "flex"
                }`}>
                  {/* Output Tabs Header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => setOutputTab("console")}
                        className={`px-3 py-1.5 rounded-lg transition font-semibold ${
                          outputTab === "console" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Console Output
                      </button>
                      <button
                        onClick={() => setOutputTab("tests")}
                        className={`px-3 py-1.5 rounded-lg transition font-semibold flex items-center gap-1 ${
                          outputTab === "tests" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>Test Results</span>
                        {executionResult && (
                          <span className={`w-2 h-2 rounded-full ${
                            executionResult.status === "passed" ? "bg-emerald-400" : "bg-rose-400"
                          }`} />
                        )}
                      </button>
                      <button
                        onClick={() => setOutputTab("custom")}
                        className={`px-3 py-1.5 rounded-lg transition font-semibold ${
                          outputTab === "custom" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Custom Input
                      </button>
                    </div>
                  </div>

                  {/* Output Panel Body */}
                  <div className="flex-1 p-3 sm:p-4 overflow-y-auto font-mono text-xs space-y-3 select-text bg-slate-950">
                    {outputTab === "console" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-900 pb-2">
                          <span className="flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Standard Output & Errors</span>
                          </span>
                          {executionResult?.executionTimeMs !== undefined && (
                            <span>{executionResult.executionTimeMs} ms</span>
                          )}
                        </div>
                        <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed text-xs">
                          {consoleOutput || "Compiler idle. Click Run Code (Ctrl+Enter) or Submit Solution to test your program."}
                        </pre>
                      </div>
                    )}

                    {outputTab === "tests" && (
                      <div className="space-y-3">
                        {executionResult ? (
                          <>
                            {/* Summary Badge Banner */}
                            <div className={`p-3 rounded-xl border flex items-center justify-between ${
                              executionResult.status === "passed"
                                ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                                : "bg-rose-950/60 border-rose-800/80 text-rose-300"
                            }`}>
                              <div className="flex items-center gap-2">
                                {executionResult.status === "passed" ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-rose-400" />
                                )}
                                <div>
                                  <span className="font-bold uppercase tracking-wider text-xs block">
                                    {executionResult.status === "passed" ? "Accepted" : executionResult.status.replace("_", " ")}
                                  </span>
                                  <span className="text-[11px] opacity-80">
                                    {executionResult.passedCount} / {executionResult.totalCount} Test Cases Passed
                                  </span>
                                </div>
                              </div>
                              {executionResult.executionTimeMs !== undefined && (
                                <span className="text-xs font-mono opacity-80">
                                  {executionResult.executionTimeMs} ms
                                </span>
                              )}
                            </div>

                            {/* Test Cases Results List */}
                            <div className="space-y-2">
                              {executionResult.results?.map((tc, idx) => (
                                <div
                                  key={tc.id || idx}
                                  className={`p-3 rounded-xl border space-y-1.5 ${
                                    tc.passed
                                      ? "bg-slate-900/60 border-slate-800"
                                      : "bg-rose-950/20 border-rose-900/40"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-300">
                                      Test Case {idx + 1}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                      tc.passed ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                                    }`}>
                                      {tc.passed ? "Passed" : "Failed"}
                                    </span>
                                  </div>

                                  <div className="text-[11px] space-y-1 pt-1">
                                    <p className="text-slate-400">
                                      <strong className="text-slate-500 font-sans">Input:</strong> {tc.input}
                                    </p>
                                    <p className="text-slate-400">
                                      <strong className="text-slate-500 font-sans">Expected:</strong> {tc.expectedOutput}
                                    </p>
                                    {!tc.passed && tc.actualOutput && (
                                      <p className="text-rose-400">
                                        <strong className="text-rose-500 font-sans">Actual:</strong> {tc.actualOutput}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-slate-500">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">No submission results yet.</p>
                            <p className="text-[11px] text-slate-600 mt-1">Run tests or submit your code to evaluate against test cases.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {outputTab === "custom" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                            Custom Standard Input
                          </label>
                          <textarea
                            rows={4}
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Enter custom input arguments to pass to stdin..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => handleRunCode(true)}
                          disabled={isRunning}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{isRunning ? "Running..." : "Run with Custom Input"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Execution Action Bar */}
          <div className="h-14 bg-slate-900 border-t border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
                Press <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-400">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-400">Enter</kbd> to Run
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleRunCode(false)}
                disabled={isRunning || isSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span>{isRunning ? "Running..." : "Run Code"}</span>
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Submit Solution"}</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUBMISSION CELEBRATION & OUTCOME MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {showSubmissionModal && executionResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center relative animate-in zoom-in-95">
            <button
              onClick={() => setShowSubmissionModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
              title="Close modal"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {executionResult.status === "passed" ? (
              <div className="space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">Accepted!</h3>
                <p className="text-xs text-slate-300">
                  {isWebChallenge
                    ? "Web Application Submitted Successfully! Verified in client sandbox."
                    : `All ${executionResult.passedCount} / ${executionResult.totalCount} test cases passed.`}
                </p>
                <div className="flex items-center justify-center gap-4 py-3 font-mono text-xs text-slate-400 border-y border-slate-800 my-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">RUNTIME</span>
                    <span className="text-white font-bold">{executionResult.executionTimeMs || 45} ms</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">MEMORY</span>
                    <span className="text-white font-bold">{challenge.memoryLimit || 256} MB</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">STATUS</span>
                    <span className="text-emerald-400 font-bold">100% Passed</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">Wrong Answer</h3>
                <p className="text-xs text-slate-400">
                  {executionResult.passedCount} of {executionResult.totalCount} test cases passed. Check test output for details.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={onBackToCatalog}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
              >
                More Challenges
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
