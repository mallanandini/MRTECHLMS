/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, RotateCcw, Save, BookmarkPlus, FolderCode, 
  Terminal, Code2, Sun, Moon, ArrowLeft, Clock, Check, 
  AlertTriangle, Copy, Trash2, ChevronDown, ChevronUp, 
  Sliders, Maximize2, Minimize2, Sparkles, Layers, Globe
} from "lucide-react";
import { RuntimeInfo, StudentPlaygroundProgram } from "../../types.js";
import { useTheme } from "../../context/ThemeContext.js";
import { MonacoCodeEditor } from "./MonacoCodeEditor.js";
import { WebPlayground } from "./WebPlayground.js";
import { PlaygroundProgramsModal } from "./PlaygroundProgramsModal.js";

interface CodePlaygroundProps {
  authToken: string;
  onBackToCatalog: () => void;
  studentName?: string;
  initialProgramId?: string;
}

const DEFAULT_STARTER_CODE: Record<string, string> = {
  python: `# Online Python 3 Sandbox
import sys

def main():
    # Read all inputs from standard input if provided
    raw_input = sys.stdin.read().strip()
    if raw_input:
        print(f"Input received:\\n{raw_input}\\n")
    
    print("Hello from MRTECHLMS Python Playground!")
    print("Tip: Use the Custom Stdin panel below to feed test inputs.")

if __name__ == "__main__":
    main()
`,
  javascript: `// Online Node.js JavaScript Sandbox
const fs = require('fs');

function main() {
    // Read input from standard input stream
    try {
        const input = fs.readFileSync(0, 'utf-8').trim();
        if (input) {
            console.log("Input received:\\n" + input + "\\n");
        }
    } catch (e) {
        // No input on stdin
    }

    console.log("Hello from MRTECHLMS JavaScript Playground!");
    console.log("Tip: Press Ctrl+Enter / Cmd+Enter to execute immediately.");
}

main();
`,
  java: `// Online Java Sandbox
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("Hello from MRTECHLMS Java Playground!");
        
        if (sc.hasNextLine()) {
            System.out.println("Input received:");
            while (sc.hasNextLine()) {
                System.out.println(" > " + sc.nextLine());
            }
        } else {
            System.out.println("No input provided in Stdin panel.");
        }
    }
}
`,
  sql: `-- Online SQL Practice Sandbox
-- In this sandbox, SQLite environment is initialized with standard tables.
SELECT 'Hello from MRTECHLMS SQL Playground!' AS message, datetime('now') AS executed_at;
`
};

export function CodePlayground({
  authToken,
  onBackToCatalog,
  studentName = "Student",
  initialProgramId
}: CodePlaygroundProps) {
  const { isDark, toggleTheme } = useTheme();

  // Runtimes
  const [runtimes, setRuntimes] = useState<RuntimeInfo[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("python");
  const [loadingRuntimes, setLoadingRuntimes] = useState(true);

  // Editor & Input State
  const [code, setCode] = useState<string>("");
  const [stdin, setStdin] = useState<string>("");
  const [showStdin, setShowStdin] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");

  // Web Dev Sandbox State
  const [htmlCode, setHtmlCode] = useState<string>(
    `<div class="card">\n  <h1>Interactive Web Sandbox</h1>\n  <p>Practice modern HTML, CSS, and dynamic JS.</p>\n  <button id="btn">Click Me</button>\n  <span id="counter">0 clicks</span>\n</div>`
  );
  const [cssCode, setCssCode] = useState<string>(
    `body {\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n.card {\n  background: #1e293b;\n  padding: 2rem;\n  border-radius: 12px;\n  text-align: center;\n}\nbutton {\n  background: #2563eb;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 6px;\n  cursor: pointer;\n  margin-right: 12px;\n}`
  );
  const [jsCode, setJsCode] = useState<string>(
    `let count = 0;\nconst btn = document.getElementById('btn');\nconst counter = document.getElementById('counter');\n\nbtn.addEventListener('click', () => {\n  count++;\n  counter.textContent = count + ' clicks';\n});`
  );

  // Current Program Metadata
  const [activeProgram, setActiveProgram] = useState<StudentPlaygroundProgram | null>(null);
  const [programTitle, setProgramTitle] = useState<string>("Untitled Program");
  const [isSaved, setIsSaved] = useState<boolean>(true);

  // Programs Drawer / Modal
  const [myPrograms, setMyPrograms] = useState<StudentPlaygroundProgram[]>([]);
  const [isProgramsModalOpen, setIsProgramsModalOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [saveAsTitle, setSaveAsTitle] = useState("");

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [output, setOutput] = useState<string>("");
  const [errorOutput, setErrorOutput] = useState<string>("");
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitStatus, setExitStatus] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"stdout" | "stdin">("stdout");

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch available runtimes
  useEffect(() => {
    async function loadRuntimes() {
      try {
        const res = await fetch("/api/playground/runtimes");
        if (res.ok) {
          const list: RuntimeInfo[] = await res.json();
          setRuntimes(list);
          if (list.length > 0 && !list.some(r => r.id === selectedLanguage)) {
            setSelectedLanguage(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load playground runtimes:", err);
      } finally {
        setLoadingRuntimes(false);
      }
    }
    loadRuntimes();
  }, []);

  // 2. Fetch student's saved programs
  const fetchMyPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/playground/programs", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const progs: StudentPlaygroundProgram[] = await res.json();
        setMyPrograms(progs);
      }
    } catch (err) {
      console.error("Failed to fetch saved programs:", err);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchMyPrograms();
    }
  }, [authToken, fetchMyPrograms]);

  // 3. Load initial code from Draft or Template
  useEffect(() => {
    if (activeProgram) return; // Managed by loaded program

    const draftKey = `mrtechlms_playground_draft_${selectedLanguage}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setCode(savedDraft);
    } else {
      setCode(DEFAULT_STARTER_CODE[selectedLanguage] || `# Playground for ${selectedLanguage}\n`);
    }
  }, [selectedLanguage, activeProgram]);

  // 4. Autosave draft to localStorage
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setIsSaved(false);
    if (selectedLanguage) {
      localStorage.setItem(`mrtechlms_playground_draft_${selectedLanguage}`, newCode);
    }
  };

  // 5. Execute Code
  const handleRun = async () => {
    if (selectedLanguage === "web") {
      showToast("Web sandbox refreshes live in the preview pane.");
      return;
    }

    setIsRunning(true);
    setErrorOutput("");
    setOutput("");
    setExecutionTime(null);
    setExitStatus(null);
    setActiveConsoleTab("stdout");

    try {
      const startTime = performance.now();
      const res = await fetch("/api/playground/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          stdin
        })
      });

      const clientDuration = Math.round(performance.now() - startTime);
      const data = await res.json();

      if (!res.ok) {
        setErrorOutput(data.error || "Execution failed");
        setExitStatus("error");
      } else {
        setOutput(data.stdout || "");
        if (data.stderr || data.error) {
          setErrorOutput(data.error || data.stderr);
        }
        setExecutionTime(data.executionTimeMs || clientDuration);
        setExitStatus(data.status || (data.exitCode === 0 ? "success" : "error"));
      }
    } catch (err: any) {
      setErrorOutput("Failed to connect to execution server: " + err.message);
      setExitStatus("error");
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [code, stdin, selectedLanguage]);

  // 6. Save Program
  const handleSave = async () => {
    if (!authToken) {
      showToast("Please log in to save programs.");
      return;
    }

    if (!activeProgram) {
      // Prompt for Save As
      setSaveAsTitle(programTitle === "Untitled Program" ? `Practice ${selectedLanguage.toUpperCase()} Script` : programTitle);
      setIsSaveAsOpen(true);
      return;
    }

    try {
      const res = await fetch(`/api/playground/programs/${activeProgram.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: programTitle,
          language: selectedLanguage,
          code,
          input: stdin
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveProgram(updated);
        setIsSaved(true);
        showToast("Program saved successfully!");
        fetchMyPrograms();
      } else {
        const err = await res.json();
        showToast("Error saving: " + err.error);
      }
    } catch (err: any) {
      showToast("Error: " + err.message);
    }
  };

  // Save As
  const handleConfirmSaveAs = async () => {
    if (!saveAsTitle.trim()) return;

    try {
      const res = await fetch("/api/playground/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: saveAsTitle.trim(),
          language: selectedLanguage,
          code,
          input: stdin
        })
      });

      if (res.ok) {
        const created = await res.json();
        setActiveProgram(created);
        setProgramTitle(created.title);
        setIsSaved(true);
        setIsSaveAsOpen(false);
        showToast(`Saved as "${created.title}"!`);
        fetchMyPrograms();
      } else {
        const err = await res.json();
        showToast("Error creating program: " + err.error);
      }
    } catch (err: any) {
      showToast("Error: " + err.message);
    }
  };

  // Open Program
  const handleOpenProgram = (prog: StudentPlaygroundProgram) => {
    setActiveProgram(prog);
    setProgramTitle(prog.title);
    setSelectedLanguage(prog.language);
    setCode(prog.code || "");
    setStdin(prog.input || "");
    setIsSaved(true);
    showToast(`Loaded "${prog.title}"`);
  };

  // Delete Program
  const handleDeleteProgram = async (id: string) => {
    try {
      const res = await fetch(`/api/playground/programs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        if (activeProgram?.id === id) {
          setActiveProgram(null);
          setProgramTitle("Untitled Program");
        }
        await fetchMyPrograms();
        showToast("Program deleted.");
      }
    } catch (err: any) {
      showToast("Failed to delete program: " + err.message);
    }
  };

  // Rename Program
  const handleRenameProgram = async (id: string, newTitle: string) => {
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
        if (activeProgram?.id === id) {
          setProgramTitle(newTitle);
        }
        await fetchMyPrograms();
        showToast("Renamed successfully.");
      }
    } catch (err: any) {
      showToast("Failed to rename: " + err.message);
    }
  };

  // Reset to default template
  const handleReset = () => {
    if (confirm("Reset current editor to the default template? Any unsaved changes will be cleared.")) {
      const template = DEFAULT_STARTER_CODE[selectedLanguage] || "";
      setCode(template);
      setActiveProgram(null);
      setProgramTitle("Untitled Program");
      setIsSaved(false);
      localStorage.removeItem(`mrtechlms_playground_draft_${selectedLanguage}`);
      showToast("Reset to default template.");
    }
  };

  return (
    <div className={`h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-800"}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white shadow-xl text-xs font-semibold animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCatalog}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isDark ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Return to Coding Practice Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Challenges</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <img src="/mr-logo-icon.png" alt="MR Technologies" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{programTitle}</span>
                {!isSaved && (
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                MR TECHNOLOGIES Free Code Playground
              </p>
            </div>
          </div>
        </div>

        {/* Center: Language Selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setActiveProgram(null);
                setProgramTitle("Untitled Program");
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border appearance-none pr-8 cursor-pointer focus:outline-none transition-colors ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-750" 
                  : "bg-slate-50 border-slate-300 text-slate-800 hover:bg-white"
              }`}
            >
              {runtimes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.version ? `(${r.version})` : ""}
                </option>
              ))}
              {/* Fallback option if runtimes are loading */}
              {runtimes.length === 0 && (
                <>
                  <option value="python">Python 3</option>
                  <option value="javascript">JavaScript (Node.js)</option>
                  <option value="java">Java</option>
                  <option value="sql">SQL</option>
                  <option value="web">Web Sandbox</option>
                </>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={handleReset}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors ${
              isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"
            }`}
            title="Reset to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions & Theme */}
        <div className="flex items-center gap-2">
          {/* My Programs */}
          <button
            onClick={() => setIsProgramsModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isDark 
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white" 
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <FolderCode className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">My Programs</span>
            {myPrograms.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-blue-500/20 text-blue-400 rounded-full font-bold">
                {myPrograms.length}
              </span>
            )}
          </button>

          {/* Save & Save As */}
          <div className="flex items-center">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 border-r-0 transition-colors"
              title="Save program"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Save</span>
            </button>
            <button
              onClick={() => {
                setSaveAsTitle(programTitle === "Untitled Program" ? "" : programTitle + " (Copy)");
                setIsSaveAsOpen(true);
              }}
              className="p-1.5 rounded-r-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors"
              title="Save As..."
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Run Code Button */}
          {selectedLanguage !== "web" && (
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all ml-1"
              title="Run Code (Ctrl+Enter)"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run</span>
                  <span className="hidden lg:inline text-[10px] opacity-75 font-mono">⌘↵</span>
                </>
              )}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors ml-1 ${
              isDark ? "border-slate-800 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"
            }`}
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
          {selectedLanguage === "web" ? (
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
              onSave={handleSave}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <MonacoCodeEditor
                code={code}
                language={selectedLanguage}
                onChange={handleCodeChange}
                theme={isDark ? "vs-dark" : "vs"}
                fontSize={fontSize}
                wordWrap={wordWrap}
                onRun={handleRun}
                onSave={handleSave}
              />
            </div>
          )}
        </div>

        {/* Output & Stdin Console (Right/Bottom) */}
        {selectedLanguage !== "web" && (
          <div className={`w-full md:w-[420px] lg:w-[480px] flex flex-col shrink-0 border-t md:border-t-0 ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            {/* Console Tabs */}
            <div className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${
              isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveConsoleTab("stdout")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                    activeConsoleTab === "stdout"
                      ? isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span>Output</span>
                </button>
                <button
                  onClick={() => setActiveConsoleTab("stdin")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                    activeConsoleTab === "stdin"
                      ? isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Custom Stdin</span>
                  {stdin && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </button>
              </div>

              {/* Execution Info & Clear */}
              <div className="flex items-center gap-2 text-xs">
                {executionTime !== null && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {executionTime} ms
                  </span>
                )}
                {output && activeConsoleTab === "stdout" && (
                  <button
                    onClick={() => {
                      setOutput("");
                      setErrorOutput("");
                      setExitStatus(null);
                    }}
                    className="p-1 text-slate-500 hover:text-slate-300 rounded"
                    title="Clear console output"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Console Content */}
            <div className="flex-1 min-h-0 overflow-auto p-4 font-mono text-xs">
              {activeConsoleTab === "stdout" ? (
                <div className="space-y-3">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>Executing in sandbox environment...</span>
                    </div>
                  ) : !output && !errorOutput ? (
                    <div className="text-center py-12 text-slate-500 font-sans text-xs">
                      <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <p>Run your code to view standard output here.</p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Use the "Custom Stdin" tab to provide standard input lines.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Success / Error Header */}
                      {exitStatus && (
                        <div className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between ${
                          exitStatus === "success" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          <span className="font-semibold uppercase tracking-wider text-[10px]">
                            {exitStatus === "success" ? "✓ Program Executed Successfully" : "✕ Execution Error"}
                          </span>
                          {executionTime !== null && <span>{executionTime}ms</span>}
                        </div>
                      )}

                      {/* Stdout */}
                      {output && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Standard Output (stdout)
                          </div>
                          <pre className={`p-3 rounded-xl border whitespace-pre-wrap overflow-x-auto ${
                            isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}>
                            {output}
                          </pre>
                        </div>
                      )}

                      {/* Stderr / Error */}
                      {errorOutput && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                            Standard Error (stderr)
                          </div>
                          <pre className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 whitespace-pre-wrap overflow-x-auto">
                            {errorOutput}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Stdin Tab */
                <div className="h-full flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-sans text-xs">
                    <label htmlFor="stdinInput" className="font-semibold">Standard Input (stdin)</label>
                    <span className="text-[10px] text-slate-500">Passed line-by-line to program</span>
                  </div>
                  <textarea
                    id="stdinInput"
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="Enter custom input here. e.g.:&#10;Line 1&#10;Line 2&#10;Line 3"
                    className={`flex-1 w-full p-3 rounded-xl border font-mono text-xs resize-none focus:outline-none focus:border-blue-500 transition-colors ${
                      isDark ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans">
                    <span>{stdin ? `${stdin.split("\n").length} input lines` : "No input"}</span>
                    {stdin && (
                      <button
                        onClick={() => setStdin("")}
                        className="text-red-400 hover:underline"
                      >
                        Clear input
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save As Modal */}
      {isSaveAsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100">
            <h3 className="text-base font-bold text-white mb-1">Save Program</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter a name for this practice program to store it in your personal workspace.
            </p>
            <input
              id="saveProgramTitleInput"
              type="text"
              value={saveAsTitle}
              onChange={(e) => setSaveAsTitle(e.target.value)}
              placeholder="e.g., Binary Search Practice, QuickSort Template"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmSaveAs();
                if (e.key === "Escape") setIsSaveAsOpen(false);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setIsSaveAsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveAs}
                disabled={!saveAsTitle.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
              >
                Save Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Programs Drawer / Modal */}
      <PlaygroundProgramsModal
        isOpen={isProgramsModalOpen}
        onClose={() => setIsProgramsModalOpen(false)}
        programs={myPrograms}
        onOpenProgram={handleOpenProgram}
        onDeleteProgram={handleDeleteProgram}
        onRenameProgram={handleRenameProgram}
      />
    </div>
  );
}
