/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Save, CheckCircle2, AlertCircle, Plus, Trash2, 
  Copy, ArrowUp, ArrowDown, Upload, Download, Database, 
  HelpCircle, Settings, Eye, Clock, Award, Shuffle, ListOrdered, 
  FileSpreadsheet, ShieldAlert, Check, ChevronRight, X
} from "lucide-react";
import * as XLSX from "xlsx";
import { Assessment, Question, QuestionType } from "../../types.js";

interface AssessmentBuilderProps {
  assessmentId: string;
  authToken: string;
  onBack: () => void;
  onSaved?: (assessment: Assessment) => void;
}

export function AssessmentBuilder({
  assessmentId,
  authToken,
  onBack,
  onSaved
}: AssessmentBuilderProps) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "questions" | "settings" | "preview">("details");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [questionModalError, setQuestionModalError] = useState<string | null>(null);

  // Modals state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPublishChecklist, setShowPublishChecklist] = useState(false);
  const [checklistErrors, setChecklistErrors] = useState<string[]>([]);

  // Question modal form state
  const [qFormText, setQFormText] = useState("");
  const [qFormOptions, setQFormOptions] = useState<string[]>(["", "", "", ""]);
  const [qFormCorrect, setQFormCorrect] = useState<number>(0);
  const [qFormPoints, setQFormPoints] = useState<number>(10);
  const [qFormNegPoints, setQFormNegPoints] = useState<number>(0);
  const [qFormDifficulty, setQFormDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [qFormExplanation, setQFormExplanation] = useState("");

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [excelValidationResult, setExcelValidationResult] = useState<any | null>(null);

  // Question bank state
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankLoading, setBankLoading] = useState(false);

  // Preview tab state
  const [previewActiveIdx, setPreviewActiveIdx] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<{ [qId: string]: string[] }>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [previewScore, setPreviewScore] = useState(0);

  // Load Assessment & Questions
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssessment(prev => {
          if (!prev) return data.assessment;
          return {
            ...data.assessment,
            title: prev.title,
            category: prev.category,
            type: prev.type || data.assessment.type,
            assessmentType: prev.assessmentType || data.assessment.assessmentType,
            difficulty: prev.difficulty || data.assessment.difficulty,
            shortDescription: prev.shortDescription,
            instructions: prev.instructions,
            durationMinutes: prev.durationMinutes,
            passingScore: prev.passingScore,
            maxAttempts: prev.maxAttempts,
            questionNavigation: prev.questionNavigation,
            randomizeQuestions: prev.randomizeQuestions,
            randomizeOptions: prev.randomizeOptions,
            revealAnswers: prev.revealAnswers
          };
        });
        setQuestions(data.questions || []);
      } else {
        setErrorMessage("Failed to load assessment details");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error loading assessment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assessmentId]);

  const handleSaveAssessment = async (overrideData?: Partial<Assessment>) => {
    if (!assessment) return;
    const target = {
      ...assessment,
      ...overrideData
    };
    if (!target.title || !target.title.trim()) {
      setErrorMessage("Assessment title is required");
      return;
    }
    if (!target.durationMinutes || Number(target.durationMinutes) <= 0) {
      setErrorMessage("Duration must be greater than 0 minutes");
      return;
    }
    if (!target.passingScore || Number(target.passingScore) <= 0 || Number(target.passingScore) > 100) {
      setErrorMessage("Passing score percentage must be between 1% and 100%");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const payload = {
        ...target,
        title: target.title.trim(),
        durationMinutes: Number(target.durationMinutes),
        passingScore: Number(target.passingScore)
      };

      const res = await fetch(`/api/admin/assessments/${assessment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setAssessment(prev => ({ ...(prev || {}), ...updated }));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onSaved?.(updated);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to update assessment");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error updating assessment");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Question
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionModalError(null);
    setQFormText("");
    setQFormOptions(["", "", "", ""]);
    setQFormCorrect(0);
    setQFormPoints(10);
    setQFormNegPoints(0);
    setQFormDifficulty("medium");
    setQFormExplanation("");
    setShowQuestionModal(true);
  };

  // Open Edit Question
  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionModalError(null);
    setQFormText(q.questionText);
    const opts = q.options && q.options.length > 0 ? [...q.options] : ["", "", "", ""];
    while (opts.length < 4) opts.push("");
    setQFormOptions(opts);
    const correctIdx = opts.findIndex(o => q.correctAnswers?.includes(o));
    setQFormCorrect(correctIdx >= 0 ? correctIdx : 0);
    setQFormPoints(q.points || 10);
    setQFormNegPoints(q.negativePoints || 0);
    setQFormDifficulty((q.difficulty as any) || "medium");
    setQFormExplanation(q.explanation || "");
    setShowQuestionModal(true);
  };

  // Save Question (Create or Edit)
  const handleSaveQuestion = async () => {
    setQuestionModalError(null);
    if (!qFormText.trim()) {
      setQuestionModalError("Question text is required");
      return;
    }

    const cleanOptions = qFormOptions.map(o => o.trim()).filter(o => o.length > 0);
    if (cleanOptions.length < 2) {
      setQuestionModalError("At least 2 non-empty options are required");
      return;
    }

    const correctText = qFormOptions[qFormCorrect]?.trim();
    if (!correctText) {
      setQuestionModalError("The chosen correct option cannot be empty");
      return;
    }

    if (!qFormPoints || Number(qFormPoints) <= 0) {
      setQuestionModalError("Points must be greater than 0");
      return;
    }

    try {
      setIsSaving(true);

      // Auto-persist assessment details so draft state is not lost
      if (assessment) {
        await fetch(`/api/admin/assessments/${assessmentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(assessment)
        });
      }

      if (editingQuestion) {
        // Update
        const res = await fetch(`/api/admin/assessment-questions/${editingQuestion.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            questionText: qFormText.trim(),
            options: cleanOptions,
            correctAnswers: [correctText],
            points: Number(qFormPoints) > 0 ? Number(qFormPoints) : 10,
            negativePoints: Number(qFormNegPoints) || 0,
            difficulty: qFormDifficulty,
            explanation: qFormExplanation.trim()
          })
        });
        if (res.ok) {
          setShowQuestionModal(false);
          await loadData();
        } else {
          const err = await res.json();
          setQuestionModalError(err.error || "Failed to update question");
        }
      } else {
        // Create
        const res = await fetch(`/api/admin/assessments/${assessmentId}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            questionText: qFormText.trim(),
            options: cleanOptions,
            correctAnswers: [correctText],
            points: Number(qFormPoints) > 0 ? Number(qFormPoints) : 10,
            negativePoints: Number(qFormNegPoints) || 0,
            difficulty: qFormDifficulty,
            explanation: qFormExplanation.trim(),
            order: questions.length + 1
          })
        });
        if (res.ok) {
          setShowQuestionModal(false);
          await loadData();
        } else {
          const err = await res.json();
          setQuestionModalError(err.error || "Failed to add question");
        }
      }
    } catch (err: any) {
      console.error("Save question error", err);
      setQuestionModalError(err.message || "Failed to save question");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/assessment-questions/${questionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Delete question error", err);
    }
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/admin/assessment-questions/${questionId}/duplicate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Duplicate question error", err);
    }
  };

  // Reorder Questions (Move Up / Down)
  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    const reorderedIds = newQuestions.map(q => q.id);
    setQuestions(newQuestions);

    try {
      await fetch(`/api/admin/assessments/${assessmentId}/reorder-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ questionIds: reorderedIds })
      });
    } catch (err) {
      console.error("Reorder questions error", err);
    }
  };

  // Excel file selection & client-side preview
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setExcelValidationResult(null);

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        setExcelRows(rows);
      } catch (err) {
        console.error("Error reading excel file", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Excel Import
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
          await loadData();
        }
      }
    } catch (err) {
      console.error("Excel import error", err);
    } finally {
      setExcelImportLoading(false);
    }
  };

  // Question Bank search
  const handleSearchQuestionBank = async () => {
    try {
      setBankLoading(true);
      const url = bankSearch.trim()
        ? `/api/admin/question-bank?search=${encodeURIComponent(bankSearch.trim())}&excludeAssessmentId=${assessmentId}`
        : `/api/admin/question-bank?excludeAssessmentId=${assessmentId}`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBankQuestions(data || []);
      }
    } catch (err) {
      console.error("Question bank fetch error", err);
    } finally {
      setBankLoading(false);
    }
  };

  const handleAddFromBank = async (questionId: string) => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/add-from-bank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ questionId })
      });
      if (res.ok) {
        await loadData();
        setBankQuestions(prev => prev.filter(q => q.id !== questionId));
      }
    } catch (err) {
      console.error("Add from bank error", err);
    }
  };

  // Publish checklist inspection
  const handlePublishClick = async () => {
    try {
      // First save current assessment state to database so pending form edits are applied
      if (assessment) {
        const updateRes = await fetch(`/api/admin/assessments/${assessmentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(assessment)
        });
        if (!updateRes.ok) {
          const err = await updateRes.json();
          setErrorMessage(err.error || "Failed to update assessment before publishing");
          return;
        }
      }

      const res = await fetch(`/api/admin/assessments/${assessmentId}/publish`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await res.json();

      if (res.ok) {
        setAssessment(data.assessment);
        setShowPublishChecklist(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onSaved?.(data.assessment);
      } else {
        setChecklistErrors(data.checklistErrors || [data.error || "Publish requirements not met"]);
        setShowPublishChecklist(true);
      }
    } catch (err: any) {
      console.error("Publish validation error", err);
      setErrorMessage(err.message || "Failed to publish assessment");
    }
  };

  // Preview simulated submission
  const handlePreviewSubmit = () => {
    let earned = 0;
    questions.forEach(q => {
      const studentAns = previewAnswers[q.id] || [];
      const isCorrect = studentAns.length === q.correctAnswers?.length &&
        studentAns.every(val => q.correctAnswers?.includes(val));
      if (isCorrect) earned += q.points;
    });
    setPreviewScore(earned);
    setPreviewSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3 text-slate-500 font-sans">
        <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold">Loading Assessment Builder...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans space-y-3">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
        <h3 className="text-lg font-bold text-slate-800">Assessment Not Found</h3>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
        >
          Back to Assessments
        </button>
      </div>
    );
  }

  const isPublished = assessment.status === "published";

  return (
    <div className="space-y-6 max-w-[1440px] w-full min-w-0 font-sans pb-16">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Back to Assessments Catalog"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {assessment.title || "Untitled Assessment"}
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                isPublished 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {assessment.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {questions.length} Questions · {assessment.totalPoints || 0} Total Points · {assessment.durationMinutes} Minutes
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}

          <button
            onClick={() => handleSaveAssessment()}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            onClick={handlePublishClick}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              isPublished
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isPublished ? "Republish" : "Publish Assessment"}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200/80 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("details")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "details"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>1. Basic Details</span>
        </button>

        <button
          onClick={() => setActiveTab("questions")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "questions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>2. Questions ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>3. Settings & Timers</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("preview");
            setPreviewSubmitted(false);
            setPreviewAnswers({});
            setPreviewActiveIdx(0);
          }}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "preview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>4. Admin Preview</span>
        </button>
      </div>

      {/* TAB 1: BASIC DETAILS */}
      {activeTab === "details" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Assessment Title *
              </label>
              <input
                type="text"
                value={assessment.title}
                onChange={e => setAssessment({ ...assessment, title: e.target.value })}
                placeholder="e.g., Senior Full Stack Engineer Assessment"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Architectural Type *
              </label>
              <select
                value={assessment.type || "standalone"}
                onChange={e => setAssessment({ ...assessment, type: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
              >
                <option value="standalone">Standalone Assessment</option>
                <option value="course_final">Course Assessment (Final Exam)</option>
                <option value="lesson_practice">Lesson Practice Test</option>
                <option value="path_practice">Learning Path Practice</option>
                <option value="path_final">Learning Path Certification Exam</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Assessment Subtype
              </label>
              <select
                value={assessment.assessmentType || "practice_test"}
                onChange={e => setAssessment({ ...assessment, assessmentType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
              >
                <option value="practice_test">Practice Test</option>
                <option value="mock_test">Mock Test</option>
                <option value="technical">Technical Assessment</option>
                <option value="final">Final Certification Exam</option>
                <option value="aptitude">Aptitude Test</option>
                <option value="reasoning">Reasoning Assessment</option>
                <option value="coding">Coding Assessment</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min={1}
                value={assessment.durationMinutes}
                onChange={e => setAssessment({ ...assessment, durationMinutes: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Passing Score Percentage (%) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={assessment.passingScore}
                onChange={e => setAssessment({ ...assessment, passingScore: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Category
              </label>
              <input
                type="text"
                value={assessment.category || ""}
                onChange={e => setAssessment({ ...assessment, category: e.target.value })}
                placeholder="e.g. Computer Science, Programming, Aptitude"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Difficulty Level
              </label>
              <select
                value={assessment.difficulty || "medium"}
                onChange={e => setAssessment({ ...assessment, difficulty: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
              >
                <option value="easy">Easy / Beginner</option>
                <option value="medium">Medium / Intermediate</option>
                <option value="hard">Hard / Advanced</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Author Name
              </label>
              <input
                type="text"
                disabled
                value={assessment.authorName || "Administrator"}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Short Description (Catalog Overview)
              </label>
              <input
                type="text"
                value={assessment.shortDescription || ""}
                onChange={e => setAssessment({ ...assessment, shortDescription: e.target.value })}
                placeholder="Brief one-line summary displayed on the card..."
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Instructions & Guidelines for Students
              </label>
              <textarea
                rows={4}
                value={assessment.instructions || ""}
                onChange={e => setAssessment({ ...assessment, instructions: e.target.value })}
                placeholder="Specify rules, allowed tools, warnings about tab switching, or timing details..."
                className="w-full p-4 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => handleSaveAssessment()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Details"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTIONS BUILDER */}
      {activeTab === "questions" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Question Action Header */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                Assessment Questions ({questions.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                · {assessment.totalPoints || 0} Points Total
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowExcelModal(true)}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Bulk Import (.xlsx)</span>
              </button>

              <button
                onClick={() => {
                  setShowBankModal(true);
                  handleSearchQuestionBank();
                }}
                className="px-3.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>Question Bank</span>
              </button>

              <button
                onClick={handleOpenAddQuestion}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          {questions.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">No Questions Added Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add questions manually using the button above, import in bulk from an Excel file, or clone from the question bank.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleOpenAddQuestion}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  + Add First Question
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const correctOption = q.correctAnswers?.[0];
                return (
                  <div 
                    key={q.id}
                    className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {q.questionText}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {q.points} Points
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                              {q.difficulty || "medium"}
                            </span>
                            {q.negativePoints ? (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                                -{q.negativePoints} Neg
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Reorder and action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveQuestion(idx, "up")}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, "down")}
                          disabled={idx === questions.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Duplicate Question"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                      {q.options?.map((opt, oIdx) => {
                        const isCorrect = opt === correctOption;
                        return (
                          <div
                            key={oIdx}
                            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition ${
                              isCorrect
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold"
                                : "bg-slate-50/70 border-slate-200/70 text-slate-600"
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0 font-bold border">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate flex-1">{opt}</span>
                            {isCorrect && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="pl-10 text-[11px] text-slate-500 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS & TIMERS */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                value={assessment.durationMinutes}
                onChange={e => setAssessment({ ...assessment, durationMinutes: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
              />
              <p className="text-[11px] text-slate-400">Total time allocated for completing the assessment.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Passing Score Percentage (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={assessment.passingScore}
                onChange={e => setAssessment({ ...assessment, passingScore: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
              />
              <p className="text-[11px] text-slate-400">Required percentage of points to achieve a passing status.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Max Attempts Allowed
              </label>
              <select
                value={assessment.maxAttempts || 1}
                onChange={e => setAssessment({ ...assessment, maxAttempts: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
              >
                <option value={1}>1 Attempt Only</option>
                <option value={2}>2 Attempts</option>
                <option value={3}>3 Attempts</option>
                <option value={5}>5 Attempts</option>
                <option value={999}>Unlimited Attempts</option>
              </select>
              <p className="text-[11px] text-slate-400">Submissions will be blocked once max attempts are reached.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Question Navigation Mode
              </label>
              <select
                value={assessment.questionNavigation || "free"}
                onChange={e => setAssessment({ ...assessment, questionNavigation: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700"
              >
                <option value="free">Free Navigation (Students can jump back and forth)</option>
                <option value="sequential">Sequential Only (Must answer in strict question order)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Exam Randomization & Post-Submission Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={Boolean(assessment.randomizeQuestions)}
                  onChange={e => setAssessment({ ...assessment, randomizeQuestions: e.target.checked })}
                  className="rounded text-blue-600 mt-0.5 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Randomize Questions</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Shuffle question order for each student attempt.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={Boolean(assessment.randomizeOptions)}
                  onChange={e => setAssessment({ ...assessment, randomizeOptions: e.target.checked })}
                  className="rounded text-blue-600 mt-0.5 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Randomize Options</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Shuffle MCQ option order to prevent answer copying.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={assessment.revealAnswers !== false}
                  onChange={e => setAssessment({ ...assessment, revealAnswers: e.target.checked })}
                  className="rounded text-blue-600 mt-0.5 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Reveal Answers Post-Exam</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Display correct answers and explanations after submission.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => handleSaveAssessment()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: ADMIN PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Watermark Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800 font-bold">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>ADMIN PREVIEW MODE — You are previewing the student examination interface. No submissions will be saved.</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-200/60 uppercase">
              Simulation
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center text-slate-400">
              <p className="text-xs">Add questions in Tab 2 to enable test preview.</p>
            </div>
          ) : previewSubmitted ? (
            /* Result screen simulation */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-xs max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Preview Test Completed</h3>
                <p className="text-xs text-slate-500 mt-1">Here is how your students will see their final score card.</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 font-mono space-y-2">
                <p className="text-3xl font-extrabold text-slate-900">
                  {previewScore} <span className="text-base font-normal text-slate-500">/ {assessment.totalPoints} pts</span>
                </p>
                <p className={`text-xs font-bold uppercase ${
                  (previewScore / (assessment.totalPoints || 1)) * 100 >= assessment.passingScore
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}>
                  {(previewScore / (assessment.totalPoints || 1)) * 100 >= assessment.passingScore
                    ? "PASSED (Satisfies Passing Threshold)"
                    : "FAILED (Below Passing Threshold)"}
                </p>
              </div>

              <button
                onClick={() => {
                  setPreviewSubmitted(false);
                  setPreviewAnswers({});
                  setPreviewActiveIdx(0);
                }}
                className="px-6 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition cursor-pointer"
              >
                Reset Simulation
              </button>
            </div>
          ) : (
            /* Question taking simulation */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Question Viewport */}
              <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs flex flex-col justify-between min-h-[420px]">
                <div className="space-y-5">
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-400 border-b border-slate-100 pb-3">
                    <span>QUESTION {previewActiveIdx + 1} OF {questions.length}</span>
                    <span className="text-blue-600">{questions[previewActiveIdx].points} Points</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {questions[previewActiveIdx].questionText}
                  </h3>

                  <div className="space-y-3 pt-2">
                    {questions[previewActiveIdx].options?.map((opt, idx) => {
                      const isSelected = (previewAnswers[questions[previewActiveIdx].id] || []).includes(opt);
                      return (
                        <label
                          key={idx}
                          onClick={() => {
                            setPreviewAnswers(prev => ({
                              ...prev,
                              [questions[previewActiveIdx].id]: [opt]
                            }));
                          }}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs"
                              : "bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/70"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setPreviewActiveIdx(prev => Math.max(0, prev - 1))}
                    disabled={previewActiveIdx === 0}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-30 transition cursor-pointer"
                  >
                    Previous
                  </button>

                  {previewActiveIdx < questions.length - 1 ? (
                    <button
                      onClick={() => setPreviewActiveIdx(prev => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={handlePreviewSubmit}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      Submit Simulation
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation Sidebar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-700 uppercase font-mono">Timer</span>
                  <span className="text-xs font-mono font-black text-slate-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {assessment.durationMinutes}:00
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Question Grid</p>
                  <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                    {questions.map((q, idx) => {
                      const isAnswered = (previewAnswers[q.id] || []).length > 0;
                      const isCurrent = previewActiveIdx === idx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setPreviewActiveIdx(idx)}
                          className={`w-full aspect-square rounded-lg font-bold flex items-center justify-center transition cursor-pointer ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-xs"
                              : isAnswered
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT QUESTION */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingQuestion ? "Edit Question" : "Add MCQ Question"}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {questionModalError && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{questionModalError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  value={qFormText}
                  onChange={e => setQFormText(e.target.value)}
                  placeholder="Enter the complete question prompt..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase font-mono">
                    Answer Options (Select correct answer radio) *
                  </label>
                  {qFormOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setQFormOptions([...qFormOptions, ""])}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {qFormOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={qFormCorrect === idx}
                        onChange={() => setQFormCorrect(idx)}
                        className="text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                        title="Mark as correct answer"
                      />
                      <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const updated = [...qFormOptions];
                          updated[idx] = e.target.value;
                          setQFormOptions(updated);
                        }}
                        placeholder={`Option ${idx + 1}...`}
                        className={`flex-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          qFormCorrect === idx ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                      {qFormOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = qFormOptions.filter((_, i) => i !== idx);
                            setQFormOptions(updated);
                            if (qFormCorrect >= updated.length) setQFormCorrect(0);
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Points & Difficulty */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-mono">Points *</label>
                  <input
                    type="number"
                    min={1}
                    value={qFormPoints}
                    onChange={e => setQFormPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold font-mono bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-mono">Negative Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={qFormNegPoints}
                    onChange={e => setQFormNegPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold font-mono bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 font-mono">Difficulty</label>
                  <select
                    value={qFormDifficulty}
                    onChange={e => setQFormDifficulty(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-700"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">
                  Explanation (Shown post-assessment)
                </label>
                <textarea
                  rows={2}
                  value={qFormExplanation}
                  onChange={e => setQFormExplanation(e.target.value)}
                  placeholder="Explain why the correct answer is right..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                {isSaving ? "Saving..." : editingQuestion ? "Update Question" : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCEL BULK IMPORT */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Bulk Import Questions from Excel (.xlsx)</h3>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelFile(null);
                  setExcelRows([]);
                  setExcelValidationResult(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Download Excel Question Template</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pre-configured spreadsheet with columns: Question, Option 1-5, Correct Option, Points, Difficulty, Explanation.
                  </p>
                </div>
                <a
                  href="/api/admin/assessments/template"
                  download="assessment_questions_template.xlsx"
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download .xlsx</span>
                </a>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">
                  Select Completed Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleExcelFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50"
                />
              </div>

              {excelRows.length > 0 && !excelValidationResult && (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>Detected {excelRows.length} question rows ready for verification.</span>
                  <button
                    onClick={handleImportExcel}
                    disabled={excelImportLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {excelImportLoading ? "Validating..." : "Validate & Import"}
                  </button>
                </div>
              )}

              {/* Validation Result Breakdown */}
              {excelValidationResult && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-3 font-mono text-center">
                    <div className="p-3 bg-slate-50 border rounded-xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Total Rows</p>
                      <p className="text-lg font-black text-slate-800 mt-0.5">{excelValidationResult.totalRows}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">Imported Valid</p>
                      <p className="text-lg font-black text-emerald-800 mt-0.5">{excelValidationResult.validCount}</p>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                      <p className="text-[10px] text-rose-600 font-bold uppercase">Rejected Invalid</p>
                      <p className="text-lg font-black text-rose-800 mt-0.5">{excelValidationResult.invalidCount}</p>
                    </div>
                  </div>

                  {excelValidationResult.errors?.length > 0 && (
                    <div className="border border-rose-200 bg-rose-50/60 rounded-xl p-4 space-y-2">
                      <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Row-Level Errors (Please fix in Excel and re-import)</span>
                      </h5>
                      <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] text-rose-700 font-mono">
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

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setExcelFile(null);
                  setExcelRows([]);
                  setExcelValidationResult(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUESTION BANK */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900">Add Questions from Question Bank</h3>
              </div>
              <button
                onClick={() => setShowBankModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearchQuestionBank()}
                  placeholder="Search across questions by keyword or topic..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={handleSearchQuestionBank}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {bankLoading ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="w-7 h-7 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No questions found in bank matching your query.
                </div>
              ) : (
                bankQuestions.map(bq => (
                  <div
                    key={bq.id}
                    className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition flex items-start justify-between gap-4 bg-slate-50/40"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900">{bq.questionText}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="text-violet-600 font-bold">{bq.sourceAssessmentTitle}</span>
                        <span>· {bq.points} pts</span>
                        <span className="uppercase">· {bq.difficulty || "medium"}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddFromBank(bq.id)}
                      className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                    >
                      + Add to Exam
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowBankModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH CHECKLIST */}
      {showPublishChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Publish Validation Requirements</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please resolve the following checklist items before publishing this assessment:
              </p>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-2 text-xs text-rose-800 font-medium">
              {checklistErrors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPublishChecklist(false)}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Back to Editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
