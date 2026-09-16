/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Clock, AlertCircle, CheckCircle2, XCircle, Award, 
  ArrowRight, ShieldAlert, ChevronRight, BarChart2 
} from "lucide-react";
import { Assessment, Question, Submission } from "../types.js";

interface AssessmentViewerProps {
  assessmentId: string;
  authToken: string;
  onBack: () => void;
  onCompleted: () => void;
}

export function AssessmentViewer({ 
  assessmentId, authToken, onBack, onCompleted 
}: AssessmentViewerProps) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [qId: string]: string[] }>({});
  
  // Timer & Attempts State
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [attemptsReached, setAttemptsReached] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [gradedQuestions, setGradedQuestions] = useState<Question[] | null>(null);
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      try {
        const response = await fetch(`/api/assessments/${assessmentId}`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setAssessment(data.assessment);
          setQuestions(data.questions || []);
          setAttemptsCount(data.userAttemptsCount || 0);

          if (data.assessment.maxAttempts && (data.userAttemptsCount || 0) >= data.assessment.maxAttempts) {
            setAttemptsReached(true);
          } else {
            setSecondsRemaining((data.assessment.durationMinutes || 15) * 60);
          }
        }
      } catch (err) {
        console.error("Error loading assessment", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessmentData();
  }, [assessmentId]);

  // Timer loop
  useEffect(() => {
    if (secondsRemaining === null || isSubmitted || attemptsReached) return;
    if (secondsRemaining <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining, isSubmitted, attemptsReached]);

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [option]
    }));
  };

  const handleAutoSubmit = () => {
    handleSubmitAssessment();
  };

  const handleSubmitAssessment = async () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    const timeTaken = assessment ? (assessment.durationMinutes * 60) - (secondsRemaining || 0) : 0;

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          answers,
          timeTakenSeconds: timeTaken
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionResult(data.submission);
        if (data.questions) {
          setGradedQuestions(data.questions);
        }
        
        // Fetch real database leaderboard from MySQL submissions table
        try {
          const leaderRes = await fetch(`/api/assessments/${assessmentId}/leaderboard`);
          if (leaderRes.ok) {
            const leaderData = await leaderRes.json();
            setLeaderboard(leaderData.map((item: any) => ({
              studentName: item.studentName,
              score: item.score,
              time: formatTime(item.timeTakenSeconds || 0),
              rank: item.rank
            })));
          }
        } catch (e) {
          console.error("Could not fetch real leaderboard", e);
        }
      }
    } catch (err) {
      console.error("Error submitting assessment", err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center max-w-md mx-auto my-16 space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Assessment Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          You are not currently enrolled or assigned to this assessment. Access is granted by your LMS Administrator.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (attemptsReached) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center max-w-md mx-auto my-16 space-y-4">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
          <Clock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Maximum Attempts Completed</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          You have completed all {assessment?.maxAttempts} allowed attempt(s) for this assessment ({attemptsCount} attempt{attemptsCount > 1 ? "s" : ""} recorded).
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          Return to Assessments
        </button>
      </div>
    );
  }

  if (!assessment || questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
        Assessment data could not be loaded. Please try again.
      </div>
    );
  }

  const activeQuestion = questions[activeQuestionIdx];
  const isSequential = assessment.questionNavigation === "sequential";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans">
      {/* Active Exam Interface */}
      {!isSubmitted ? (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
                  Active Assessment
                </span>
                {isSequential && (
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                    Sequential Mode
                  </span>
                )}
              </div>
              <h2 className="font-bold text-xl text-gray-900 mt-2">{assessment.title}</h2>
              <p className="text-xs text-gray-500 mt-1">Question {activeQuestionIdx + 1} of {questions.length}</p>
            </div>

            {/* Timer Clock */}
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold font-mono ${
              secondsRemaining && secondsRemaining < 120 
                ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse" 
                : "bg-slate-50 text-slate-700 border border-slate-100"
            }`}>
              <Clock className="w-4 h-4" />
              <span>Time Remaining: {secondsRemaining !== null ? formatTime(secondsRemaining) : "00:00"}</span>
            </div>
          </div>

          {/* Question Viewer Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-start justify-between border-b border-gray-100 pb-5 mb-5">
              <span className="text-xs font-bold text-slate-400 font-mono">POINT VALUE: {activeQuestion.points} PTS</span>
            </div>

            <p className="text-lg font-medium text-gray-900 mb-6">{activeQuestion.questionText}</p>

            {/* Options selection */}
            <div className="space-y-3">
              {activeQuestion.options?.map((opt, i) => {
                const isSelected = answers[activeQuestion.id]?.includes(opt);
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(activeQuestion.id, opt)}
                    className={`w-full text-left px-5 py-4 rounded-xl text-sm font-semibold transition border flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 text-blue-700"
                        : "border-gray-100 bg-slate-50 hover:bg-slate-100 text-gray-700"
                    }`}
                  >
                    <span>{opt}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300"
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
            {!isSequential ? (
              <button
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={activeQuestionIdx === 0}
                className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-mono">Step {activeQuestionIdx + 1} / {questions.length}</span>
            )}

            {activeQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitAssessment}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Submission / Results Sheet Interface */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center space-y-6">
            <div className="inline-flex p-4 rounded-full bg-blue-50 text-blue-600">
              <Award className="w-12 h-12" />
            </div>

            <div>
              <h2 className="font-bold text-2xl text-gray-900">Assessment Graded successfully!</h2>
              <p className="text-sm text-gray-500 mt-1">Here is your detailed scoring scorecard sheet</p>
            </div>

            {submissionResult && (
              <div className="max-w-sm mx-auto grid grid-cols-2 gap-4 border border-gray-100 rounded-xl p-5 bg-slate-50 font-mono">
                <div className="text-center border-r border-gray-200">
                  <p className="text-xs text-gray-400 font-sans uppercase font-semibold">Total Score</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {submissionResult.score} / {submissionResult.totalPoints}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 font-sans uppercase font-semibold">Exam Status</p>
                  <p className={`text-xl font-bold mt-1.5 ${
                    submissionResult.passed ? "text-emerald-600" : "text-rose-600"
                  }`}>
                    {submissionResult.passed ? "PASSED" : "FAILED"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl border border-gray-200 shadow-sm transition"
              >
                Back to Syllabus
              </button>
              <button
                onClick={onCompleted}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                Continue Learning
              </button>
            </div>
          </div>

          {/* Scoreboard Leaderboard Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-md">Assessment Leaderboard</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Your submission is the first on the leaderboard!</p>
              ) : (
                leaderboard.map((student) => (
                  <div key={student.rank} className="flex justify-between items-center py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        student.rank === 1 
                          ? "bg-yellow-500 text-white" 
                          : student.rank === 2 
                            ? "bg-slate-300 text-slate-800" 
                            : "bg-slate-100 text-slate-600"
                      }`}>
                        {student.rank}
                      </span>
                      <p className="text-sm font-semibold text-gray-800">{student.studentName}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                      <span>{student.time}</span>
                      <span className="font-bold text-gray-900 text-sm">{student.score} Pts</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Question-by-Question Review with Answers & Explanations */}
          {gradedQuestions && gradedQuestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-gray-900 text-base">Answers & Explanations Review</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {gradedQuestions.length} Questions Graded
                </span>
              </div>

              <div className="space-y-5">
                {gradedQuestions.map((q, idx) => {
                  const studentAns = answers[q.id]?.[0];
                  const correctAns = q.correctAnswers?.[0];
                  const isCorrect = studentAns === correctAns;

                  return (
                    <div 
                      key={q.id}
                      className={`p-5 rounded-xl border transition space-y-3 ${
                        isCorrect 
                          ? "bg-emerald-50/40 border-emerald-200/80" 
                          : "bg-rose-50/40 border-rose-200/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            isCorrect 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{q.questionText}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                isCorrect 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {isCorrect ? `+${q.points} Pts Correct` : "Incorrect"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Difficulty: {q.difficulty || "medium"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </div>

                      {/* Options breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 pt-1">
                        {q.options?.map((opt, oIdx) => {
                          const isOptCorrect = opt === correctAns;
                          const isStudentPick = opt === studentAns;

                          let badgeStyle = "bg-white border-slate-200 text-slate-600";
                          if (isOptCorrect) {
                            badgeStyle = "bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold";
                          } else if (isStudentPick && !isOptCorrect) {
                            badgeStyle = "bg-rose-100/70 border-rose-300 text-rose-900 line-through font-semibold";
                          }

                          return (
                            <div 
                              key={oIdx}
                              className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${badgeStyle}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0 font-bold border border-slate-300">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                              {isOptCorrect && (
                                <span className="text-[9px] font-mono font-bold text-emerald-700 ml-2 shrink-0">
                                  CORRECT
                                </span>
                              )}
                              {isStudentPick && !isOptCorrect && (
                                <span className="text-[9px] font-mono font-bold text-rose-700 ml-2 shrink-0">
                                  YOUR CHOICE
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="ml-9 p-3 rounded-xl bg-white border border-slate-200/70 text-xs space-y-1">
                          <p className="font-bold text-slate-700">Explanation:</p>
                          <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
