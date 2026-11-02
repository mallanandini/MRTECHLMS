/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, Download, Upload, CheckCircle2, 
  AlertCircle, X, Check, HelpCircle, AlertTriangle 
} from "lucide-react";
import * as XLSX from "xlsx";

export interface AssessmentExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: string;
  assessmentTitle?: string;
  authToken: string;
  onSuccess: () => Promise<void> | void;
}

export function AssessmentExcelImportModal({
  isOpen,
  onClose,
  assessmentId,
  assessmentTitle,
  authToken,
  onSuccess
}: AssessmentExcelImportModalProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [excelPreviewResult, setExcelPreviewResult] = useState<any>(null);
  const [excelValidationResult, setExcelValidationResult] = useState<any>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !excelImportLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, excelImportLoading, onClose]);

  const handleReset = () => {
    setExcelFile(null);
    setExcelRows([]);
    setExcelError(null);
    setExcelImportLoading(false);
    setExcelPreviewResult(null);
    setExcelValidationResult(null);
  };

  // Download official Excel template
  const handleDownloadTemplate = () => {
    try {
      setExcelError(null);
      const headers = [
        "Question",
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4",
        "Option 5",
        "Correct Option",
        "Points",
        "Difficulty",
        "Explanation"
      ];

      // Sheet 1: Questions (clean headers ready for data entry)
      const questionsWs = XLSX.utils.aoa_to_sheet([headers]);
      questionsWs["!cols"] = [
        { wch: 45 }, // Question
        { wch: 25 }, // Option 1
        { wch: 25 }, // Option 2
        { wch: 25 }, // Option 3
        { wch: 25 }, // Option 4
        { wch: 20 }, // Option 5
        { wch: 18 }, // Correct Option
        { wch: 10 }, // Points
        { wch: 14 }, // Difficulty
        { wch: 45 }  // Explanation
      ];

      // Sheet 2: Instructions & Guidelines with documentation and examples
      const instructions = [
        ["Assessment Question Import Template - Instructions & Guidelines"],
        [""],
        ["Column Name", "Required", "Allowed Format / Values", "Default Value", "Description"],
        ["Question", "Yes", "Non-empty text string", "-", "The full prompt / text of the MCQ question."],
        ["Option 1", "Yes", "Non-empty text string", "-", "First multiple choice option."],
        ["Option 2", "Yes", "Non-empty text string", "-", "Second multiple choice option."],
        ["Option 3", "No", "Text string", "(empty)", "Third multiple choice option (optional)."],
        ["Option 4", "No", "Text string", "(empty)", "Fourth multiple choice option (optional)."],
        ["Option 5", "No", "Text string", "(empty)", "Fifth multiple choice option (optional)."],
        ["Correct Option", "Yes", "'Option 1' - 'Option 5', or '1' - '5', or exact option text", "-", "Specifies which option is correct."],
        ["Points", "No", "Positive integer (e.g. 10)", "10", "Score awarded for answering this question correctly."],
        ["Difficulty", "No", "'easy', 'medium', or 'hard'", "medium", "Question difficulty tier."],
        ["Explanation", "No", "Text string", "(empty)", "Rationale or feedback shown to students during review."],
        [""],
        ["Format Notes:"],
        ["1. At least 2 options (Option 1 and Option 2) are required for every question."],
        ["2. The 'Correct Option' can be specified as 'Option 1', 'Option 2', '1', '2', or the exact matching text of the option."],
        ["3. Example rows starting with '[EXAMPLE]' are ignored by the importer and will not be added as real questions."],
        [""],
        ["Example Question Rows (Reference):"],
        ["Question", "Option 1", "Option 2", "Option 3", "Option 4", "Option 5", "Correct Option", "Points", "Difficulty", "Explanation"],
        ["What does CPU stand for in computer systems?", "Central Processing Unit", "Central Performance Unit", "Computer Personal Unit", "Control Processing User", "", "Option 1", 10, "easy", "CPU stands for Central Processing Unit and executes instructions."],
        ["Which data structure operates on a Last In First Out (LIFO) basis?", "Queue", "Stack", "Array", "Linked List", "", "Option 2", 10, "medium", "A Stack works on the LIFO principle where the newest element is removed first."]
      ];

      const instructionsWs = XLSX.utils.aoa_to_sheet(instructions);
      instructionsWs["!cols"] = [
        { wch: 18 },
        { wch: 12 },
        { wch: 45 },
        { wch: 15 },
        { wch: 55 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, questionsWs, "Questions");
      XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assessment_questions_template.xlsx";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 2000);
    } catch (err: any) {
      console.error("Error generating assessment template:", err);
      // Fallback to backend template endpoint
      window.open("/api/admin/assessments/template", "_blank");
    }
  };

  // Fetch validation preview from backend
  const fetchPreview = async (rows: any[]) => {
    try {
      setExcelImportLoading(true);
      setExcelPreviewResult(null);
      setExcelValidationResult(null);
      const res = await fetch(`/api/admin/assessments/${assessmentId}/import-questions?preview=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ rows, preview: true })
      });

      if (res.ok) {
        const previewData = await res.json();
        setExcelPreviewResult(previewData);
      } else {
        const errData = await res.json().catch(() => ({}));
        setExcelError(errData.error || `Failed to validate file: status ${res.status}`);
        setExcelPreviewResult(null);
      }
    } catch (err: any) {
      console.error("Error generating import preview:", err);
      setExcelError("Failed to validate file: " + (err.message || "Network error"));
    } finally {
      setExcelImportLoading(false);
    }
  };

  // Handle file selection & client-side parsing
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setExcelPreviewResult(null);
    setExcelValidationResult(null);
    setExcelError(null);

    // Validate file extension
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      setExcelError("Invalid file type. Please upload a valid Excel (.xlsx or .xls) file.");
      setExcelRows([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          setExcelError("The uploaded workbook contains no sheets.");
          setExcelRows([]);
          return;
        }
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          setExcelError("The uploaded worksheet contains no question rows. Please enter questions under the headers.");
          setExcelRows([]);
          return;
        }

        // Validate required column headers
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        const hasQuestion = keys.some(k => /question/i.test(k));
        const hasOption1 = keys.some(k => /option\s*1/i.test(k) || /option1/i.test(k) || /option_1/i.test(k));
        const hasOption2 = keys.some(k => /option\s*2/i.test(k) || /option2/i.test(k) || /option_2/i.test(k));
        const hasCorrect = keys.some(k => /correct/i.test(k) || /answer/i.test(k));

        if (!hasQuestion || !hasOption1 || !hasOption2 || !hasCorrect) {
          setExcelError("Invalid template format: Missing required columns (Question, Option 1, Option 2, Correct Option). Please use the official template.");
          setExcelRows([]);
          return;
        }

        setExcelRows(rows);
        fetchPreview(rows);
      } catch (err: any) {
        console.error("Error reading excel file", err);
        setExcelError("Failed to parse Excel file: " + (err.message || "Invalid or corrupt file."));
        setExcelRows([]);
      }
    };
    reader.onerror = () => {
      setExcelError("Failed to read the selected file from disk.");
      setExcelRows([]);
    };
    reader.readAsBinaryString(file);
  };

  // Submit actual import to database
  const handleImportExcel = async () => {
    if (!excelRows || excelRows.length === 0) return;
    try {
      setExcelImportLoading(true);
      const res = await fetch(`/api/admin/assessments/${assessmentId}/import-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ rows: excelRows })
      });

      if (res.ok) {
        const result = await res.json();
        setExcelValidationResult(result);
        if (result.validCount > 0) {
          await onSuccess();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setExcelError(errData.error || `Import failed with status ${res.status}`);
      }
    } catch (err: any) {
      console.error("Excel import error", err);
      setExcelError("Failed to import questions: " + (err.message || "Network error"));
    } finally {
      setExcelImportLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-import-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="bulk-import-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Bulk Import Questions from Excel (.xlsx)
              </h3>
              {assessmentTitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md">
                  Target Assessment: <strong className="text-slate-700 dark:text-slate-200">{assessmentTitle}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
          {/* Error Banner */}
          {excelError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-medium">{excelError}</span>
              </div>
              <button
                type="button"
                onClick={() => setExcelError(null)}
                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg text-rose-700 dark:text-rose-300 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Template Download Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Download Official Question Template
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                Pre-configured workbook with 10 columns: Question, Option 1-5, Correct Option, Points, Difficulty, Explanation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Download Excel question template"
            >
              <Download className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Download .xlsx Template</span>
            </button>
          </div>

          {/* Upload Dropzone / File Display */}
          {!excelFile ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase font-mono">
                Select Completed Spreadsheet
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleExcelFileChange}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/40"
              />
              <p className="text-[11px] text-slate-400">
                Supported formats: <strong>.xlsx</strong> and <strong>.xls</strong>. Ensure headers match the template.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="truncate">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{excelFile.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {(excelFile.size / 1024).toFixed(1)} KB · {excelRows.length} question rows detected
                  </p>
                </div>
              </div>
              {!excelValidationResult && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline font-medium cursor-pointer shrink-0 ml-3"
                >
                  Choose Different File
                </button>
              )}
            </div>
          )}

          {/* Validation in Progress Indicator */}
          {excelImportLoading && !excelPreviewResult && !excelValidationResult && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Validating spreadsheet rows, required fields, and checking duplicate questions...</span>
            </div>
          )}

          {/* Pre-Import Preview & Validation Breakdown */}
          {excelPreviewResult && !excelValidationResult && (
            <div className="space-y-4 pt-1">
              {/* Summary Metric Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Rows</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{excelPreviewResult.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Valid to Add</p>
                  <p className="text-lg font-black text-emerald-800 dark:text-emerald-200 mt-0.5">{excelPreviewResult.validCount}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Skipped Examples</p>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">{excelPreviewResult.exampleCount || 0}</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl">
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Invalid Rows</p>
                  <p className="text-lg font-black text-rose-800 dark:text-rose-200 mt-0.5">{excelPreviewResult.invalidCount}</p>
                </div>
              </div>

              {/* Row-Level Errors List */}
              {excelPreviewResult.errors?.length > 0 && (
                <div className="border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Issues Detected in File ({excelPreviewResult.errors.length}):</span>
                  </h5>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-mono pr-1">
                    {excelPreviewResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="font-bold shrink-0">Row {err.row}:</span>
                        <span>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable Questions Preview */}
              {excelPreviewResult.previewQuestions?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono tracking-wider">
                      Questions Preview ({excelPreviewResult.previewQuestions.length})
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                      Ready to import into this assessment
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {excelPreviewResult.previewQuestions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900 dark:text-white leading-snug">
                            {qIdx + 1}. {q.questionText}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] rounded-md uppercase font-mono">
                              {q.points} pts
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-md uppercase font-mono">
                              {q.difficulty}
                            </span>
                          </div>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                          {q.options.map((opt: string, optIdx: number) => {
                            const isCorrect = q.correctAnswers && q.correctAnswers.includes(opt);
                            return (
                              <div
                                key={optIdx}
                                className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                                  isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span className="truncate">{opt}</span>
                                {isCorrect && (
                                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono shrink-0">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5">
                            Explanation: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post-Import Confirmation Statistics */}
          {excelValidationResult && (
            <div className="space-y-4 pt-1">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Successfully imported {excelValidationResult.validCount} question{excelValidationResult.validCount === 1 ? "" : "s"} into this assessment!
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Rows</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{excelValidationResult.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Imported Valid</p>
                  <p className="text-lg font-black text-emerald-800 dark:text-emerald-200 mt-0.5">{excelValidationResult.validCount}</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl">
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Rejected Invalid</p>
                  <p className="text-lg font-black text-rose-800 dark:text-rose-200 mt-0.5">{excelValidationResult.invalidCount}</p>
                </div>
              </div>

              {excelValidationResult.errors?.length > 0 && (
                <div className="border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Rejected Rows</span>
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-mono">
                    {excelValidationResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="font-bold">Row {err.row}:</span>
                        <span>{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            {excelValidationResult ? "Close" : "Cancel"}
          </button>

          {!excelValidationResult && excelPreviewResult && excelPreviewResult.validCount > 0 && (
            <button
              type="button"
              onClick={handleImportExcel}
              disabled={excelImportLoading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {excelImportLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>
                {excelImportLoading
                  ? "Importing Questions..."
                  : `Confirm & Import ${excelPreviewResult.validCount} Question${excelPreviewResult.validCount === 1 ? "" : "s"}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
