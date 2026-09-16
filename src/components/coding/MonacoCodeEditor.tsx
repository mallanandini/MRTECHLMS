/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Ctrl+Enter / Cmd+Enter: Run Code shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) onRun();
    });

    // Ctrl+S / Cmd+S: Save Code shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) onSave();
    });
  };

  const monacoLang = getMonacoLanguage(language);

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
