import React, { useRef, useEffect, useState } from "react";
import Editor, { OnMount, loader } from "@monaco-editor/react";

// Point Monaco loader to locally hosted files for high-speed, zero-cost, offline-capable code editing
loader.config({
  paths: {
    vs: "/monaco/vs"
  }
});

interface MonacoCodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  theme?: "vs-dark" | "vs";
  fontSize?: number;
  wordWrap?: "on" | "off";
  readOnly?: boolean;
  onRun?: () => void;
  onSave?: () => void;
  height?: string;
}

// Maps project language identifiers to Monaco Editor languages
function getMonacoLanguage(lang: string): string {
  switch (lang.toLowerCase()) {
    case "python":
      return "python";
    case "javascript":
    case "node":
    case "js":
      return "javascript";
    case "java":
      return "java";
    case "c":
      return "c";
    case "cpp":
    case "c++":
      return "cpp";
    case "sql":
      return "sql";
    case "html":
      return "html";
    case "css":
      return "css";
    default:
      return "plaintext";
  }
}

export function MonacoCodeEditor({
  code,
  onChange,
  language,
  theme = "vs-dark",
  fontSize = 14,
  wordWrap = "on",
  readOnly = false,
  onRun,
  onSave,
  height = "100%"
}: MonacoCodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  useEffect(() => {
    // Watchdog timer: If Monaco fails to load or initialize within 7 seconds, switch to fallback editor
    const timer = setTimeout(() => {
      if (!hasMounted && !(window as any).monaco) {
        console.warn("[MonacoCodeEditor] Monaco editor load timeout exceeded, activating fallback editor");
        setInitFailed(true);
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [hasMounted]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setHasMounted(true);
    setInitFailed(false);

    // Ctrl+Enter / Cmd+Enter: Run Code shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) onRun();
    });

    // Ctrl+S / Cmd+S: Save Code shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  const handleFallbackKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (onRun) onRun();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (onSave) onSave();
    }
  };

  const monacoLang = getMonacoLanguage(language);

  // If Monaco fails to initialize, provide an accessible code textarea so the student is never blocked
  if (initFailed) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 p-3 font-mono text-sm relative">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-amber-400">
          <span>Standard Code Editor (Monaco fallback mode active)</span>
          <button
            onClick={() => {
              setInitFailed(false);
              loader.init().then(() => setHasMounted(true)).catch(() => setInitFailed(true));
            }}
            className="text-xs text-blue-400 underline hover:text-blue-300"
          >
            Retry Monaco
          </button>
        </div>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleFallbackKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className="flex-1 w-full bg-slate-900 text-slate-100 p-3 rounded font-mono text-sm border border-slate-800 resize-none focus:outline-none focus:border-blue-500"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <Editor
        height={height}
        language={monacoLang}
        theme={theme}
        value={code}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          wordWrap,
          readOnly,
          tabSize: 4,
          insertSpaces: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: "on",
          renderLineHighlight: "all",
          bracketPairColorization: { enabled: true },
          cursorBlinking: "smooth",
          smoothScrolling: true,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, monospace",
          fontLigatures: true,
          padding: { top: 12, bottom: 12 }
        }}
        loading={
          <div className="flex items-center justify-center h-full w-full bg-slate-950 text-slate-400 text-xs font-mono">
            <span>Loading Professional Code Editor...</span>
          </div>
        }
      />
    </div>
  );
}
