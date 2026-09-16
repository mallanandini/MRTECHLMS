/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, BarChart3, CheckCircle2, XCircle, Users, Award, 
  Clock, ArrowUpDown, Search, AlertCircle, TrendingUp
} from "lucide-react";
import { Assessment } from "../../types.js";

interface SubmissionRow {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number;
  totalPoints: number;
  scorePercentage: number;
  passed: boolean;
  timeTakenSeconds: number;
  submittedAt: string;
}

interface ResultsData {
  assessmentTitle: string;
  totalAssigned: number;
  totalSubmissions: number;
  uniqueStudentsAttempted: number;
  completedCount: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  averageScore: number;
  submissions: SubmissionRow[];
}

interface AssessmentResultsModalProps {
  assessment: Assessment;
  authToken: string;
  onClose: () => void;
}

export function AssessmentResultsModal({
  assessment,
  authToken,
  onClose
}: AssessmentResultsModalProps) {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed">("all");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/assessments/${assessment.id}/results`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch assessment results", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [assessment.id]);

  const submissions = data?.submissions || [];
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(search.toLowerCase()) ||
                          s.studentEmail.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === "passed") return s.passed;
    if (statusFilter === "failed") return !s.passed;
    return true;
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Assessment Results & Analytics</h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {assessment.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs">Loading analytics and submissions...</p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs mt-2">Failed to load results</p>
            </div>
          ) : (
            <>
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Assigned</span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">{data.totalAssigned}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{data.uniqueStudentsAttempted} attempted</p>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase font-mono">Passed</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-800 font-mono mt-1">{data.passedCount}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Pass Rate: {data.passRate}%</p>
                </div>

                <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-600 uppercase font-mono">Failed</span>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-black text-rose-800 font-mono mt-1">{data.failedCount}</p>
                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5">{data.totalSubmissions} submissions</p>
                </div>

                <div className="p-4 bg-violet-50/60 border border-violet-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-600 uppercase font-mono">Avg Score</span>
                    <Award className="w-4 h-4 text-violet-600" />
                  </div>
                  <p className="text-2xl font-black text-violet-800 font-mono mt-1">
                    {data.averageScore} <span className="text-xs font-normal text-violet-500">/ {assessment.totalPoints}</span>
                  </p>
                  <p className="text-[10px] text-violet-600 font-semibold mt-0.5">
                    Passing: {assessment.passingScore}%
                  </p>
                </div>
              </div>

              {/* Submissions Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                    Attempt Submissions ({filteredSubmissions.length})
                  </h4>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-60">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search student..."
                        className="w-full pl-8 pr-3 py-1 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as any)}
                      className="border border-slate-200 rounded-lg text-xs px-2.5 py-1 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="all">All Results</option>
                      <option value="passed">Passed Only</option>
                      <option value="failed">Failed Only</option>
                    </select>
                  </div>
                </div>

                {filteredSubmissions.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                    <p className="text-xs font-semibold">No student submissions recorded yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Assigned students will appear here as soon as they complete attempts.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3">Student</th>
                          <th className="p-3 text-center">Score</th>
                          <th className="p-3 text-center">Percentage</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Time Taken</th>
                          <th className="p-3 text-right">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSubmissions.map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3">
                              <p className="font-bold text-slate-900 text-xs">{sub.studentName}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{sub.studentEmail}</p>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-xs text-slate-800">
                              {sub.score} / {sub.totalPoints}
                            </td>
                            <td className="p-3 text-center font-mono text-xs">
                              <span className={`font-bold ${sub.passed ? "text-emerald-700" : "text-rose-700"}`}>
                                {sub.scorePercentage}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {sub.passed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Passed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3" /> Failed
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500 text-[11px]">
                              {formatDuration(sub.timeTakenSeconds)}
                            </td>
                            <td className="p-3 text-right text-slate-400 font-mono text-[10px]">
                              {new Date(sub.submittedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
