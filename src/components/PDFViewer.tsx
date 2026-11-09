/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  Download, RotateCw, AlertTriangle, FileText, Check, LayoutGrid, 
  Columns, RefreshCw, Eye
} from "lucide-react";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface PDFViewerProps {
  /** The authenticated API endpoint or document URL */
  url: string;
  /** JWT auth token for secure authenticated PDF fetching */
  authToken?: string;
  /** Document title for headers and download */
  title?: string;
  /** Optional class name for outer container */
  className?: string;
  /** Optional onPageChange callback */
  onPageChange?: (pageNumber: number, totalPages: number) => void;
  /** Whether downloading is permitted. Defaults to false for student protection */
  allowDownload?: boolean;
}

export function PDFViewer({
  url,
  authToken,
  title = "Course Document",
  className = "",
  onPageChange,
  allowDownload = false
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [page: number]: HTMLDivElement | null }>({});
  const activeRenderTasksRef = useRef<{ [page: number]: any }>({});

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [scale, setScale] = useState<number>(1.1);
  const [fitMode, setFitMode] = useState<"custom" | "width" | "page">("width");
  const [continuousScroll, setContinuousScroll] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfjsReady, setPdfjsReady] = useState<boolean>(false);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Dynamically initialize PDF.js from reliable CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfjsReady(true);
      return;
    }

    const scriptId = "pdfjs-cdn-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          if (isMountedRef.current) setPdfjsReady(true);
        }
      };
      script.onerror = () => {
        console.warn("[PDFViewer] PDF.js script failed to load from CDN. Native browser embed will be used as fallback.");
        if (isMountedRef.current) setPdfjsReady(false);
      };
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.pdfjsLib) {
          clearInterval(checkInterval);
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          if (isMountedRef.current) setPdfjsReady(true);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  // 2. Fetch authenticated PDF binary with JWT and create secure local Object URL
  const loadPdfData = useCallback(async () => {
    if (!url) {
      setError("No document URL provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadProgress(10);

      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, { headers });
      setLoadProgress(50);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("You do not have permission to view this document or your session has expired.");
        }
        if (response.status === 404) {
          throw new Error("The requested PDF document could not be found on the server.");
        }
        throw new Error(`Failed to load document (${response.status}: ${response.statusText})`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Server returned an error for this document.");
      }

      const arrayBuffer = await response.arrayBuffer();
      setLoadProgress(80);

      if (!isMountedRef.current) return;

      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const createdBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(createdBlobUrl);

      // If PDF.js is ready, parse with PDF.js
      if (window.pdfjsLib) {
        try {
          const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
          loadingTask.onProgress = (prog: { loaded: number; total: number }) => {
            if (prog.total > 0) {
              setLoadProgress(80 + Math.round((prog.loaded / prog.total) * 15));
            }
          };
          const loadedPdf = await loadingTask.promise;
          if (isMountedRef.current) {
            setPdfDoc(loadedPdf);
            setNumPages(loadedPdf.numPages);
            setCurrentPage(1);
            setPageInput("1");
            setLoading(false);
            setLoadProgress(100);
            if (onPageChange) onPageChange(1, loadedPdf.numPages);
          }
        } catch (pdfJsErr: any) {
          console.warn("[PDFViewer] PDF.js parsing error, falling back to browser viewer:", pdfJsErr);
          // Still have the blobUrl for native embed
          setLoading(false);
          setLoadProgress(100);
        }
      } else {
        // PDF.js not ready yet, native blobUrl will display
        setLoading(false);
        setLoadProgress(100);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error("[PDFViewer] Loading error:", err);
        setError(err.message || "An unexpected error occurred while loading the PDF document.");
        setLoading(false);
      }
    }
  }, [url, authToken, onPageChange]);

  // Initial load and reload on URL change
  useEffect(() => {
    loadPdfData();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, authToken]);

  // When PDF.js becomes ready after blob was already loaded, parse doc
  useEffect(() => {
    if (pdfjsReady && blobUrl && !pdfDoc) {
      loadPdfData();
    }
  }, [pdfjsReady]);

  // Handle Fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Intercept and prevent download keyboard shortcuts (Ctrl+S / Cmd+S)
  useEffect(() => {
    if (allowDownload) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        const isTargetInside = containerRef.current && (
          containerRef.current.contains(document.activeElement) ||
          containerRef.current.contains(e.target as Node)
        );
        if (isTargetInside) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [allowDownload]);

  // Update scale on Fit to Width / Fit to Page
  const calculateAutoFit = useCallback(async (mode: "width" | "page") => {
    if (!pdfDoc || !scrollContainerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = scrollContainerRef.current.clientWidth - 48; // padding
      const containerHeight = scrollContainerRef.current.clientHeight - 48;

      let newScale = 1;
      if (mode === "width" && containerWidth > 0) {
        newScale = Math.min(2.5, Math.max(0.4, containerWidth / viewport.width));
      } else if (mode === "page" && containerHeight > 0) {
        newScale = Math.min(2.5, Math.max(0.4, containerHeight / viewport.height));
      }
      setScale(Number(newScale.toFixed(2)));
      setFitMode(mode);
    } catch (e) {
      console.error("[PDFViewer] Error computing auto-fit scale:", e);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (fitMode !== "custom" && pdfDoc) {
      calculateAutoFit(fitMode);
    }
  }, [fitMode, pdfDoc]);

  // Render a specific page onto its designated canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    const canvas = document.getElementById(`pdf-canvas-${pageNum}`) as HTMLCanvasElement | null;
    if (!canvas) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale });

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport
      };

      if (activeRenderTasksRef.current[pageNum]) {
        try {
          activeRenderTasksRef.current[pageNum].cancel();
        } catch (cErr) {}
      }

      const renderTask = page.render(renderContext);
      activeRenderTasksRef.current[pageNum] = renderTask;

      await renderTask.promise;
      delete activeRenderTasksRef.current[pageNum];
      setRenderedPages(prev => new Set(prev).add(pageNum));
    } catch (renderErr: any) {
      delete activeRenderTasksRef.current[pageNum];
      // Ignore rendering cancellation errors when zooming or re-rendering quickly
      if (renderErr?.name !== "RenderingCancelledException") {
        console.warn(`[PDFViewer] Notice for page ${pageNum}:`, renderErr?.message || renderErr);
      }
    }
  }, [pdfDoc, scale]);

  // Re-render visible pages when scale or current page changes
  useEffect(() => {
    if (!pdfDoc) return;

    if (continuousScroll) {
      // In continuous scroll mode, render current and surrounding pages
      const pagesToRender = [currentPage - 1, currentPage, currentPage + 1].filter(
        p => p >= 1 && p <= numPages
      );
      pagesToRender.forEach(p => renderPage(p));
    } else {
      renderPage(currentPage);
    }
  }, [pdfDoc, scale, currentPage, continuousScroll, numPages, renderPage]);

  // Detect which page is visible on scroll in continuous mode
  const handleScroll = () => {
    if (!continuousScroll || !scrollContainerRef.current || numPages <= 1) return;

    const containerTop = scrollContainerRef.current.scrollTop;
    const containerMid = containerTop + scrollContainerRef.current.clientHeight / 3;

    for (let p = 1; p <= numPages; p++) {
      const el = pageRefs.current[p];
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (containerMid >= top && containerMid <= bottom) {
          if (currentPage !== p) {
            setCurrentPage(p);
            setPageInput(String(p));
            if (onPageChange) onPageChange(p, numPages);
          }
          break;
        }
      }
    }
  };

  const scrollToPage = (pageNum: number) => {
    const validPage = Math.max(1, Math.min(numPages, pageNum));
    setCurrentPage(validPage);
    setPageInput(String(validPage));
    if (onPageChange) onPageChange(validPage, numPages);

    if (continuousScroll) {
      const targetEl = pageRefs.current[validPage];
      if (targetEl && scrollContainerRef.current) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      scrollToPage(currentPage + 1);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      scrollToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setFitMode("custom");
    setScale(prev => Math.min(3.0, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setFitMode("custom");
    setScale(prev => Math.max(0.4, Number((prev - 0.15).toFixed(2))));
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn("[PDFViewer] Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn("[PDFViewer] Exit fullscreen failed:", err);
      });
    }
  };

  const handleDownload = () => {
    if (!allowDownload || !blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    const cleanFilename = (title || "learning-material").replace(/[^a-zA-Z0-9_\-.]/g, "_");
    a.download = cleanFilename.endsWith(".pdf") ? cleanFilename : `${cleanFilename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      ref={containerRef}
      onContextMenu={allowDownload ? undefined : (e) => e.preventDefault()}
      className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden select-none transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : "h-[750px] max-h-[85vh] w-full"
      } ${className}`}
    >
      {/* Top Professional LMS Navigation Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-200 text-xs gap-2 shrink-0 z-20">
        
        {/* Left: Document Info & Mode Toggle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="truncate min-w-0 max-w-[200px] sm:max-w-[320px]">
            <h4 className="font-semibold text-white truncate text-xs" title={title}>
              {title}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              {pdfDoc ? `${numPages} Pages · ${allowDownload ? "Interactive Viewer" : "View Only"}` : "Protected Study Material"}
            </span>
          </div>

          {pdfDoc && (
            <div className="hidden md:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 ml-2">
              <button
                type="button"
                onClick={() => setContinuousScroll(true)}
                title="Continuous Multi-page Scrolling"
                className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  continuousScroll ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Continuous</span>
              </button>
              <button
                type="button"
                onClick={() => setContinuousScroll(false)}
                title="Single Page Presentation"
                className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                  !continuousScroll ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Single</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Page Controls (Previous, Jump, Next) */}
        {pdfDoc && numPages > 0 && (
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              title="Previous Page"
              className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={pageInput}
                onChange={handlePageInputChange}
                onBlur={handlePageInputSubmit}
                className="w-9 sm:w-11 text-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400 text-xs font-mono">/ {numPages}</span>
            </form>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              title="Next Page"
              className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right: Zoom & Layout Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {pdfDoc && (
            <div className="flex items-center bg-slate-800/80 rounded-xl border border-slate-700/80 p-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.4}
                title="Zoom Out"
                className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-slate-300 min-w-[42px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
                title="Zoom In"
                className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {pdfDoc && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => calculateAutoFit("width")}
                title="Fit to Width"
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                  fitMode === "width"
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Fit Width
              </button>
              <button
                type="button"
                onClick={() => calculateAutoFit("page")}
                title="Fit to Page"
                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                  fitMode === "page"
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Fit Page
              </button>
            </div>
          )}

          {/* Download Action - rendered only when downloading is explicitly permitted */}
          {allowDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={!blobUrl}
              title="Download PDF"
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas & Content Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full bg-slate-950 overflow-auto relative flex flex-col items-center justify-start p-4 scroll-smooth"
      >
        {/* Loading State Spinner */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 text-white">
            <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-200">Loading document securely...</p>
            <div className="w-48 bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(15, loadProgress)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">Authenticating & rendering pages</p>
          </div>
        )}

        {/* Error Fallback State */}
        {error && !loading && (
          <div className="m-auto max-w-md p-6 bg-slate-900 border border-red-500/30 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Unable to Load PDF</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{error}</p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={loadPdfData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Loading</span>
              </button>
            </div>
          </div>
        )}

        {/* PDF.js Interactive Multi-page Canvas Rendering */}
        {!loading && !error && pdfDoc && (
          <div className="flex flex-col items-center gap-6 py-4">
            {continuousScroll ? (
              // Continuous Multi-Page Scroll View
              Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <div 
                  key={pageNum}
                  ref={(el) => (pageRefs.current[pageNum] = el)}
                  className="flex flex-col items-center shadow-2xl rounded-sm transition-transform duration-100"
                >
                  <canvas 
                    id={`pdf-canvas-${pageNum}`} 
                    className="bg-white rounded shadow-md border border-slate-800 max-w-full"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    Page {pageNum} of {numPages}
                  </span>
                </div>
              ))
            ) : (
              // Single Page View
              <div 
                ref={(el) => (pageRefs.current[currentPage] = el)}
                className="flex flex-col items-center shadow-2xl rounded-sm transition-transform duration-100"
              >
                <canvas 
                  id={`pdf-canvas-${currentPage}`} 
                  className="bg-white rounded shadow-md border border-slate-800 max-w-full"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-1">
                  Page {currentPage} of {numPages}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Native Browser PDF Embed Fallback (if PDF.js is unavailable or parsing fails) */}
        {!loading && !error && !pdfDoc && blobUrl && (
          <div className="w-full h-full flex flex-col">
            <iframe
              src={`${blobUrl}#toolbar=${allowDownload ? "1" : "0"}&navpanes=0&page=${currentPage}&zoom=${Math.round(scale * 100)}`}
              title={title}
              className="w-full h-full border-0 rounded-b-xl"
            />
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-1.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>{allowDownload ? "LMS Secure Stream" : "LMS Secure Stream · Protected Document (View Only)"}</span>
        </div>
        <div>
          {pdfDoc ? `Viewing page ${currentPage} of ${numPages}` : (allowDownload ? "Standard PDF Viewer" : "Protected PDF Viewer")}
        </div>
      </div>
    </div>
  );
}
