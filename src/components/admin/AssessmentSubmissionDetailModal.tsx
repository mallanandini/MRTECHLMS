/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, CheckCircle2, XCircle, HelpCircle, Clock, Award, 
  FileText, User, Mail, Calendar, AlertCircle
} from "lucide-react";
import { QuestionPerformanceDetail } from "../../types.js";

interface SubmissionDetailData {
  submission: {
    id: string;
    assessmentId: string;
    studentId: string;
    studentName: string;
    score: number;
    totalPoints: number;
    passed: boolean;
    submittedAt: string;
    timeTakenSeconds: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    percentage: number;
  };
  assessment: {
    id: string;
    title: string;
    category: string;
    passingScore: number;
  };
  student: {
    id: string;
    name: string;
    email: string;
  };
  questions: QuestionPerformanceDetail[];
}

interface AssessmentSubmissionDetailModalProps {
  submissionId: string;
  authToken: string;
  onClose: () => void;
}

export function AssessmentSubmissionDetailModal({
  submissionId,
  authToken,
  onClose
}: AssessmentSubmissionDetailModalProps) {
  const [data, setData] = useState<SubmissionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/results/submission/${submissionId}`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          const errJson = await res.json().catch(() => ({}));
          setError(errJson.error || "Failed to load submission details");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load submission details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [submissionId, authToken]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return "N/A";
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso;
    }
  };

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Candidate Submission Evaluation
                </h3>
                {data && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    data.submission.passed 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {data.submission.passed ? "PASSED" : "FAILED"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data?.assessment.title || "Assessment Breakdown"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2 text-rose-700">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Candidate Metadata Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans text-xs">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Candidate</span>
                    <p className="font-bold text-slate-800 truncate">{data.student.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Email</span>
                    <p className="font-semibold text-slate-700 truncate">{data.student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Submitted At</span>
                    <p className="font-semibold text-slate-700 truncate">{formatDate(data.submission.submittedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block">Duration</span>
                    <p className="font-bold text-slate-800">{formatDuration(data.submission.timeTakenSeconds)}</p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Final Score</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {data.submission.score} / {data.submission.totalPoints}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Percentage</span>
                  <p className={`text-xl font-extrabold mt-0.5 ${
                    data.submission.passed ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {data.submission.percentage}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 font-sans">Correct Answers</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {data.submission.correctCount}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-700 font-sans">Incorrect Answers</span>
                  <p className="text-xl font-extrabold text-rose-700 mt-0.5">
                    {data.submission.incorrectCount}
                  </p>
                </div>
              </div>

              {/* Question-by-Question List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                    Question Performance Breakdown ({data.questions.length})
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Passing threshold: {data.assessment.passingScore}%
                  </span>
                </div>

                <div className="space-y-4">
                  {data.questions.map((q, idx) => {
                    const studentChoice = q.studentAnswers[0];
                    const correctChoice = q.correctAnswers[0];

                    return (
                      <div 
                        key={q.id}
                        className={`p-5 rounded-xl border transition space-y-3 ${
                          !q.isAttempted 
                            ? "bg-slate-50/60 border-slate-200" 
                            : q.isCorrect 
                              ? "bg-emerald-50/40 border-emerald-200/80" 
                              : "bg-rose-50/40 border-rose-200/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                              !q.isAttempted 
                                ? "bg-slate-200 text-slate-700" 
                                : q.isCorrect 
                                  ? "bg-emerald-100 text-emerald-700" 
                                  : "bg-rose-100 text-rose-700"
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">{q.questionText}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                  !q.isAttempted 
                                    ? "bg-slate-200 text-slate-700" 
                                    : q.isCorrect 
                                      ? "bg-emerald-100 text-emerald-800" 
                                      : "bg-rose-100 text-rose-800"
                                }`}>
                                  {!q.isAttempted ? "Unanswered (0 Pts)" : q.isCorrect ? `+${q.points} Pts Correct` : `Incorrect (0 Pts)`}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Difficulty: {q.difficulty}
                                </span>
                              </div>
                            </div>
                          </div>

                          {!q.isAttempted ? (
                            <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
                          ) : q.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </div>

                        {/* Options list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrectOpt = opt === correctChoice;
                            const isStudentOpt = opt === studentChoice;

                            let optStyle = "bg-white border-slate-200 text-slate-600";
                            if (isCorrectOpt) {
                              optStyle = "bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold";
                            } else if (isStudentOpt && !isCorrectOpt) {
                              optStyle = "bg-rose-100/70 border-rose-300 text-rose-900 line-through font-semibold";
                            }

                            return (
                              <div 
                                key={oIdx}
                                className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${optStyle}`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0 font-bold border border-slate-300">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="truncate">{opt}</span>
                                </div>
                                {isCorrectOpt && (
                                  <span className="text-[9px] font-mono font-bold text-emerald-700 ml-2 shrink-0">
                                    CORRECT
                                  </span>
                                )}
                                {isStudentOpt && !isCorrectOpt && (
                                  <span className="text-[9px] font-mono font-bold text-rose-700 ml-2 shrink-0">
                                    STUDENT PICK
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="ml-9 p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                            <span className="font-bold text-slate-700">Explanation:</span>
                            <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
