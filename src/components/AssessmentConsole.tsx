/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Award, Clock, FileText, CheckCircle2, XCircle, 
  Lock, Play, BookOpen, AlertCircle, RefreshCw, Search, GraduationCap
} from "lucide-react";

interface AssessmentConsoleProps {
  authToken: string;
  onStartAssessment: (assessmentId: string) => void;
  onNavigate: (tab: string) => void;
}

export function AssessmentConsole({
  authToken,
  onStartAssessment,
  onNavigate
}: AssessmentConsoleProps) {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const loadAssessments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/student/assessments", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssessments(data || []);
      }
    } catch (e) {
      console.error("Failed to load assessments", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [authToken]);

  // Compute overall stats
  const totalAttempted = assessments.filter(a => a.attemptsCount > 0).length;
  const totalPassed = assessments.filter(a => a.status === "passed").length;
  const passRate = totalAttempted > 0 ? Math.round((totalPassed / totalAttempted) * 100) : 0;

  // Filter and search logic
  const filteredAssessments = assessments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "passed") return matchesSearch && a.status === "passed";
    if (filterStatus === "failed") return matchesSearch && a.status === "failed";
    if (filterStatus === "unattempted") return matchesSearch && a.status === "unattempted";
    if (filterStatus === "locked") return matchesSearch && !a.isEnrolled;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-50 via-indigo-50 to-indigo-100 text-black border border-indigo-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center">
          <Award className="w-56 h-56 transform translate-x-12 translate-y-12 rotate-12 text-indigo-400" />
        </div>
        <div className="relative z-10 space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 text-black text-[10px] font-bold tracking-wider uppercase font-mono border border-indigo-200 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            Academy Standards & Exams
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-black">
            Assessment Console
          </h2>
          <p className="text-black text-xs leading-relaxed font-medium">
            Test your programming comprehension, complete course syllabus exams, and track your scoring metrics. Course access is assigned by your LMS Administrator.
          </p>
        </div>
      </div>

      {/* Stats counter strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Quizzes</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{assessments.length}</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Exams Passed</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{totalPassed}</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Passing Rate</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{passRate}%</p>
          </div>
        </div>
      </div>

      {/* Filter and search controls */}
      <div className="bg-white rounded-2xl border border-slate-200/60 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quiz or course..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 text-slate-700"
          >
            <option value="all">All Quizzes</option>
            <option value="unattempted">Not Attempted</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="locked">Locked</option>
          </select>
          
          <button
            onClick={loadAssessments}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl transition cursor-pointer"
            title="Reload Assessments"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Assessments Grid */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => {
            let statusBadge = null;
            if (!assessment.isEnrolled) {
              statusBadge = (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 flex items-center gap-1 font-mono uppercase border border-slate-200">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              );
            } else if (assessment.status === "passed") {
              statusBadge = (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1 font-mono uppercase border border-emerald-100">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Passed
                </span>
              );
            } else if (assessment.status === "failed") {
              statusBadge = (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 flex items-center gap-1 font-mono uppercase border border-rose-100">
                  <XCircle className="w-2.5 h-2.5" /> Failed
                </span>
              );
            } else {
              statusBadge = (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1 font-mono uppercase border border-slate-200">
                  Not Attempted
                </span>
              );
            }

            return (
              <div 
                key={assessment.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between h-[340px] transition duration-150 ${
                  assessment.isEnrolled 
                    ? "border-slate-200/60 hover:border-slate-300/80 hover:shadow-md" 
                    : "border-slate-100 opacity-80"
                }`}
              >
                <div className="space-y-4">
                  {/* Category and status badge */}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold font-mono text-blue-600 bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded uppercase">
                      {assessment.courseTitle.split(" ").slice(0, 2).join(" ")}
                    </span>
                    {statusBadge}
                  </div>

                  {/* Title and description */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{assessment.title}</h4>
                    <p className="text-xs text-slate-400 font-semibold line-clamp-1">{assessment.courseTitle}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">{assessment.description}</p>
                  </div>

                  {/* Parameters specs */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/60 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 font-semibold font-mono">
                    <div className="text-center space-y-1 border-r border-slate-100">
                      <FileText className="w-3.5 h-3.5 mx-auto text-slate-400" />
                      <p>{assessment.questionsCount} Qs</p>
                    </div>
                    <div className="text-center space-y-1 border-r border-slate-100">
                      <Clock className="w-3.5 h-3.5 mx-auto text-slate-400" />
                      <p>{assessment.durationMinutes} Min</p>
                    </div>
                    <div className="text-center space-y-1">
                      <Award className="w-3.5 h-3.5 mx-auto text-slate-400" />
                      <p>{assessment.passingScore}% Pass</p>
                    </div>
                  </div>
                </div>

                {/* Score & Launch Button */}
                <div className="space-y-3 pt-3 border-t border-slate-100 mt-4">
                  
                  {/* Attempts details if attempted */}
                  {assessment.attemptsCount > 0 && (
                    <div className="flex justify-between items-center text-[10px] font-bold font-mono text-slate-500">
                      <span>ATTEMPTS: {assessment.attemptsCount}</span>
                      <span>BEST SCORE: {assessment.bestScore} / {assessment.totalPoints} pts</span>
                    </div>
                  )}

                  {!assessment.isEnrolled ? (
                    <button
                      onClick={() => onNavigate("courses")}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Course Assignment Required
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartAssessment(assessment.id)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {assessment.attemptsCount > 0 ? "Retake Assessment" : "Start Assessment"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-white border border-slate-200/60 rounded-3xl text-slate-400 space-y-3 shadow-xs">
          <AlertCircle className="w-12 h-12 stroke-[1.5] mx-auto text-slate-300" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">No assessments found</p>
            <p className="text-xs text-slate-400">Try matching a different search term or filter options.</p>
          </div>
        </div>
      )}

    </div>
  );
}
