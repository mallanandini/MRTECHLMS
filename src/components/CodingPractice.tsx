/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Code, Terminal, AlertTriangle, CheckCircle, Play, 
  Send, Sparkles, HelpCircle, BookOpen, ExternalLink, RefreshCw 
} from "lucide-react";
import { CodingProblem } from "../types.js";

interface CodingPracticeProps {
  authToken: string;
}

export function CodingPractice({ authToken }: CodingPracticeProps) {
  // We'll load the prime checking problem seeded in our db
  const [problem, setProblem] = useState<CodingProblem | null>({
    id: "prob-1",
    title: "Check If Prime Number",
    description: "Write a function `is_prime(n)` (in Python) or `isPrime(n)` (in JavaScript) that takes an integer `n` and returns `True`/`true` if `n` is prime, and `False`/`false` otherwise.",
    difficulty: "easy",
    allowedLanguages: ["python", "javascript"],
    starterCode: {
      python: "def is_prime(n):\n    # Write your logic here\n    if n <= 1: return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0: return False\n    return True\n",
      javascript: "function isPrime(n) {\n    // Write your logic here\n    if (n <= 1) return false;\n    for (let i = 2; i <= Math.sqrt(n); i++) {\n        if (n % i === 0) return false;\n    }\n    return true;\n}\n"
    },
    testCases: [
      { id: "tc-1", input: "5", expectedOutput: "True/true", isPublic: true },
      { id: "tc-2", input: "4", expectedOutput: "False/false", isPublic: true },
      { id: "tc-3", input: "1", expectedOutput: "False/false", isPublic: false },
      { id: "tc-4", input: "2", expectedOutput: "True/true", isPublic: false }
    ],
    hints: [
      "Prime numbers are strictly greater than 1.",
      "An integer is prime if it has no divisors other than 1 and itself.",
      "Check divisors starting from 2 up to the square root of n."
    ]
  });

  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  const [customInput, setCustomInput] = useState<string>("5");
  
  // Compiler Output States
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"problem" | "hint" | "solution">("problem");
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);

  useEffect(() => {
    if (problem) {
      setCode(problem.starterCode[language] || "");
    }
  }, [language, problem]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setConsoleOutput("");
    try {
      const response = await fetch("/api/coding/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          code,
          language,
          problemId: problem?.id,
          customInput
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConsoleOutput(data.stdout || data.error || "Execution completed with no output.");
      }
    } catch (err) {
      console.error("Error executing code", err);
      setConsoleOutput("Execution error: Sandbox failed to compile.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setSubmissionFeedback(null);
    try {
      const response = await fetch("/api/coding/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          code,
          language,
          problemId: problem?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionFeedback(data);
        setConsoleOutput(`Submission Status: ${data.status.toUpperCase()}\nTests Passed: ${data.passedCount}/${data.totalCount}`);
      }
    } catch (err) {
      console.error("Error submitting code", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetStarter = () => {
    if (problem) {
      setCode(problem.starterCode[language] || "");
      setSubmissionFeedback(null);
    }
  };

  if (!problem) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)] overflow-hidden">
      {/* Left panel: Prompt, description, hints */}
      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-y-auto p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
              {problem.difficulty}
            </span>
            <h2 className="font-bold text-lg text-gray-900">{problem.title}</h2>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("problem")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "problem" ? "bg-slate-900 text-white" : "text-gray-500 hover:bg-slate-100"
              }`}
            >
              Problem Description
            </button>
            <button
              onClick={() => setActiveTab("hint")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "hint" ? "bg-slate-900 text-white" : "text-gray-500 hover:bg-slate-100"
              }`}
            >
              Hints
            </button>
            <button
              onClick={() => setActiveTab("solution")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === "solution" ? "bg-slate-900 text-white" : "text-gray-500 hover:bg-slate-100"
              }`}
            >
              Solution Preview
            </button>
          </div>
        </div>

        {activeTab === "problem" && (
          <div className="space-y-5 flex-1">
            <div className="prose max-w-none text-gray-600 leading-relaxed space-y-3">
              <p>{problem.description}</p>
            </div>

            {/* Public Test Cases */}
            <div className="space-y-2 pt-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-slate-500" />
                Public Test Cases
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {problem.testCases.filter(tc => tc.isPublic).map((tc) => (
                  <div key={tc.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs">
                    <p className="text-gray-400 font-sans font-semibold">Test Case ID: {tc.id}</p>
                    <p className="mt-1 text-slate-800">
                      <strong className="text-gray-500 font-sans">Input:</strong> {tc.input}
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      <strong className="text-gray-500 font-sans">Expected Output:</strong> {tc.expectedOutput}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "hint" && (
          <div className="space-y-3 flex-1">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-500" />
              Instructor Hints
            </h4>
            <div className="space-y-2">
              {problem.hints?.map((hint, idx) => (
                <div key={idx} className="p-4 bg-blue-50/50 border border-blue-100 text-blue-900 text-sm rounded-xl flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="font-medium leading-relaxed">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "solution" && (
          <div className="space-y-4 flex-1">
            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Recommended Prime Checking Logic
            </h4>
            <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-mono text-xs overflow-x-auto">
              <code>
                {language === "python" 
                  ? "def is_prime(n):\n    if n <= 1:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True"
                  : "function isPrime(n) {\n    if (n <= 1) return false;\n    for (let i = 2; i <= Math.sqrt(n); i++) {\n        if (n % i === 0) return false;\n    }\n    return true;\n}"
                }
              </code>
            </pre>
          </div>
        )}
      </div>

      {/* Right panel: Editor environment and compiler console */}
      <div className="flex flex-col gap-4 overflow-hidden h-full">
        {/* Editor controls */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-gray-200 rounded-lg text-xs font-semibold px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript (ES6)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResetStarter}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
              title="Reset Starter Code"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Input Canvas */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col relative shadow-md">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full bg-slate-950 text-slate-100 font-mono text-sm p-5 focus:outline-none resize-none leading-relaxed select-text"
            spellCheck={false}
          />
        </div>

        {/* Console outputs and compilers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm shrink-0 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-500" />
              Execution Console
            </span>
            {submissionFeedback && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono uppercase ${
                submissionFeedback.status === "passed" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
              }`}>
                {submissionFeedback.status}
              </span>
            )}
          </div>

          <pre className="bg-slate-950 border border-slate-950 rounded-xl p-3 text-xs font-mono text-slate-300 min-h-20 overflow-y-auto select-text">
            <code>{consoleOutput || "Compiler idle. Click Compile & Run or Submit Code to evaluate your program."}</code>
          </pre>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunning ? "Running..." : "Compile & Run"}
            </button>
            <button
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Submitting..." : "Submit Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
