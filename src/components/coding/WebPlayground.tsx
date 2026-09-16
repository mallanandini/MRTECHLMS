/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Play, RefreshCw, Maximize2, Minimize2, Monitor, Tablet, Smartphone, 
  Code2, Palette, FileCode2, ExternalLink, CheckCircle2 
} from "lucide-react";
import { MonacoCodeEditor } from "./MonacoCodeEditor.js";

interface WebPlaygroundProps {
  html: string;
  css: string;
  js: string;
  onHtmlChange: (val: string) => void;
  onCssChange: (val: string) => void;
  onJsChange: (val: string) => void;
  theme?: "vs-dark" | "vs";
  fontSize?: number;
  wordWrap?: "on" | "off";
  onSave?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function WebPlayground({
  html,
  css,
  js,
  onHtmlChange,
  onCssChange,
  onJsChange,
  theme = "vs-dark",
  fontSize = 14,
  wordWrap = "on",
  onSave,
  onSubmit,
  isSubmitting = false
}: WebPlaygroundProps) {
  const [activeTab, setActiveTab] = useState<"html" | "css" | "js">("html");
  const [previewKey, setPreviewKey] = useState(0);
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [autoRun, setAutoRun] = useState(true);

  // Combine HTML, CSS, and JS into a sandboxed document
  const srcDoc = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      ${css || ""}
    </style>
  </head>
  <body>
    ${html || ""}
    <script>
      try {
        ${js || ""}
      } catch (err) {
        console.error("User script error:", err);
      }
    <\/script>
  </body>
</html>
    `;
  }, [html, css, js, previewKey]);

  const handleRefresh = () => {
    setPreviewKey(k => k + 1);
  };

  const getViewportWidth = () => {
    switch (viewportMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "w-full";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-0 bg-slate-950 overflow-hidden">
      {/* LEFT: Code Editors with Tabs */}
      <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-slate-800">
        {/* Editor Tabs Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("html")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "html"
                  ? "bg-orange-950 text-orange-400 border border-orange-800/60 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>HTML</span>
            </button>

            <button
              onClick={() => setActiveTab("css")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "css"
                  ? "bg-blue-950 text-blue-400 border border-blue-800/60 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>CSS</span>
            </button>

            <button
              onClick={() => setActiveTab("js")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "js"
                  ? "bg-amber-950 text-amber-400 border border-amber-800/60 shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>JavaScript</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Refresh Live Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Monaco Editor */}
        <div className="flex-1 relative min-h-[300px]">
          {activeTab === "html" && (
            <MonacoCodeEditor
              code={html}
              onChange={onHtmlChange}
              language="html"
              theme={theme}
              fontSize={fontSize}
              wordWrap={wordWrap}
              onSave={onSave}
            />
          )}
          {activeTab === "css" && (
            <MonacoCodeEditor
              code={css}
              onChange={onCssChange}
              language="css"
              theme={theme}
              fontSize={fontSize}
              wordWrap={wordWrap}
              onSave={onSave}
            />
          )}
          {activeTab === "js" && (
            <MonacoCodeEditor
              code={js}
              onChange={onJsChange}
              language="javascript"
              theme={theme}
              fontSize={fontSize}
              wordWrap={wordWrap}
              onSave={onSave}
            />
          )}
        </div>
      </div>

      {/* RIGHT: Live Preview Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
        {/* Preview Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Preview</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Viewport Width Controls */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setViewportMode("desktop")}
                className={`p-1.5 rounded-md transition ${
                  viewportMode === "desktop" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Desktop View (100%)"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode("tablet")}
                className={`p-1.5 rounded-md transition ${
                  viewportMode === "tablet" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewportMode("mobile")}
                className={`p-1.5 rounded-md transition ${
                  viewportMode === "mobile" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setIsFullscreenPreview(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition ml-1"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Preview Frame Container */}
        <div className="flex-1 p-2 sm:p-4 bg-slate-950 flex items-center justify-center overflow-auto min-h-[300px]">
          <div className={`${getViewportWidth()} w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-800 transition-all duration-200 flex flex-col`}>
            <iframe
              key={previewKey}
              srcDoc={srcDoc}
              title="Web Playground Preview"
              sandbox="allow-scripts"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </div>

      {/* FULLSCREEN PREVIEW MODAL */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 sm:p-8 flex flex-col animate-in fade-in">
          <div className="flex items-center justify-between pb-3 text-white border-b border-slate-800">
            <span className="text-sm font-bold flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Fullscreen Web Preview</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreenPreview(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-xl overflow-hidden mt-3 shadow-2xl">
            <iframe
              key={`full-${previewKey}`}
              srcDoc={srcDoc}
              title="Fullscreen Web Preview"
              sandbox="allow-scripts"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
