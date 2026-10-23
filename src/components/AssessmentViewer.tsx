/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { 
  Clock, AlertCircle, CheckCircle2, XCircle, Award, 
  ArrowRight, ShieldAlert, ChevronRight, BarChart2,
  Bookmark, Flag, ArrowLeft, Play, CheckCircle, HelpCircle,
  RotateCcw, Info
} from "lucide-react";
import { Assessment, Question, Submission } from "../types.js";
import { useConfirm, useToast } from "../context/NotificationContext.js";

interface AssessmentViewerProps {
  assessmentId: string;
  authToken: string;
  onBack: () => void;
  onCompleted: () => void;
}

export function AssessmentViewer({ 
  assessmentId, authToken, onBack, onCompleted 
}: AssessmentViewerProps) {
  const confirm = useConfirm();
  const toast = useToast();
  
  // Data states
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [qId: string]: string[] }>({});
  const [markedForReview, setMarkedForReview] = useState<{ [qId: string]: boolean }>({});
  
  // Exam lifecycle states
  const [hasStarted, setHasStarted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [attemptsReached, setAttemptsReached] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [gradedQuestions, setGradedQuestions] = useState<Question[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Format time utility
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  // Fetch assessment and check prior submissions
  const fetchAssessmentData = useCallback(async () => {
    try {
      setIsLoading(true);
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
        const priorCount = data.userAttemptsCount || 0;
        setAttemptsCount(priorCount);

        // Resume active attempt if in progress
        if (data.activeAttempt) {
          setCurrentAttemptId(data.activeAttempt.id);
          setSecondsRemaining(data.activeAttempt.secondsRemaining);
          setHasStarted(true);
        }

        // If max attempts reached and no active attempt, automatically load prior submission result
        if (data.assessment.maxAttempts && priorCount >= data.assessment.maxAttempts && !data.activeAttempt) {
          setAttemptsReached(true);
          try {
            const resResult = await fetch(`/api/student/assessments/${assessmentId}/result`, {
              headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (resResult.ok) {
              const resData = await resResult.json();
              setSubmissionResult(resData.submission);
              if (resData.questions) {
                setGradedQuestions(resData.questions);
              }
              if (resData.submission?.answers) {
                setAnswers(resData.submission.answers);
              }
              setIsSubmitted(true);
            }
          } catch (err) {
            console.error("Could not fetch completed submission result", err);
          }
        }
      }
    } catch (err) {
      console.error("Error loading assessment", err);
      toast.error("Failed to load assessment");
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId, authToken]);

  useEffect(() => {
    fetchAssessmentData();
  }, [fetchAssessmentData]);

  // Timer loop (runs only after exam has started)
  useEffect(() => {
    if (!hasStarted || secondsRemaining === null || isSubmitted) return;
    if (secondsRemaining <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasStarted, secondsRemaining, isSubmitted]);

  const handleStartAssessment = async () => {
    if (!assessment) return;
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/start`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentAttemptId(data.attempt?.id || null);
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
        setHasStarted(true);
        setSecondsRemaining(data.secondsRemaining ?? (assessment.durationMinutes || 15) * 60);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to start assessment");
      }
    } catch (err) {
      setHasStarted(true);
      setSecondsRemaining((assessment.durationMinutes || 15) * 60);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [option]
    }));
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleAutoSubmit = async () => {
    if (isSubmitted) return;
    toast.warning("Time limit expired. Submitting assessment automatically...");
    await performSubmit();
  };

  const handleSubmitAssessment = async () => {
    if (isSubmitted) return;

    const answeredCount = Object.keys(answers).filter(qId => answers[qId]?.length > 0).length;
    const unansweredCount = questions.length - answeredCount;

    let confirmationMsg = `You have answered ${answeredCount} of ${questions.length} questions.`;
    if (unansweredCount > 0) {
      confirmationMsg += ` There are ${unansweredCount} unanswered question(s).`;
    }
    confirmationMsg += " Are you sure you want to submit? You will not be able to change your answers after submission.";

    const ok = await confirm({
      title: "Submit Assessment?",
      message: confirmationMsg,
      confirmText: "Submit Assessment",
      cancelText: "Cancel",
      variant: unansweredCount > 0 ? "warning" : "info"
    });
    if (!ok) return;

    await performSubmit();
  };

  const performSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);

    const timeTaken = assessment 
      ? Math.max(1, (assessment.durationMinutes * 60) - (secondsRemaining || 0)) 
      : 0;

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          attemptId: currentAttemptId,
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
        setIsSubmitted(true);
        toast.success("Assessment submitted and evaluated successfully!");
        
        // Fetch real database leaderboard
        try {
          const leaderRes = await fetch(`/api/assessments/${assessmentId}/leaderboard`, {
            headers: { "Authorization": `Bearer ${authToken}` }
          });
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
          console.error("Could not fetch leaderboard", e);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to submit assessment");
      }
    } catch (err: any) {
      console.error("Error submitting assessment", err);
      toast.error("Submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        {isSubmitting && (
          <p className="text-xs font-semibold text-slate-500 font-mono animate-pulse">
            Grading and evaluating assessment...
          </p>
        )}
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
          Return to Assessments
        </button>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500 max-w-md mx-auto my-16 space-y-4">
        <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Assessment Not Found</h3>
        <button onClick={onBack} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
          Back to Assessments
        </button>
      </div>
    );
  }

  // Calculate question palette status counts
  const answeredCount = Object.keys(answers).filter(qId => answers[qId]?.length > 0).length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  // ====================================================
  // VIEW 1: PRE-EXAM INSTRUCTIONS SCREEN
  // ====================================================
  if (!hasStarted && !isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 font-sans space-y-6">
        {/* Top bar back button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assessments</span>
        </button>

        {/* Main Instructions Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-indigo-100 text-black border-b border-indigo-200">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/20 uppercase tracking-wider font-mono">
                {assessment.category || "General"}
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/20 capitalize font-mono">
                {assessment.difficulty || "Medium"} Difficulty
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/20 font-mono">
                Max Attempts: {assessment.maxAttempts || 1}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {assessment.title}
            </h1>
            {assessment.shortDescription && (
              <p className="mt-2 text-sm text-blue-100 leading-relaxed max-w-2xl">
                {assessment.shortDescription}
              </p>
            )}
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-b border-slate-100 bg-slate-50/50">
            <div className="p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Duration</span>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{assessment.durationMinutes} Mins</p>
            </div>
            <div className="p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Questions</span>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{questions.length}</p>
            </div>
            <div className="p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Points</span>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{assessment.totalPoints} Pts</p>
            </div>
            <div className="p-4 text-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Passing Score</span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{assessment.passingScore}%</p>
            </div>
          </div>

          {/* Instructions Body */}
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                Assessment Instructions
              </h3>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                {assessment.instructions ? (
                  <p className="p-4 bg-slate-50 rounded-xl border border-slate-100 whitespace-pre-line">
                    {assessment.instructions}
                  </p>
                ) : (
                  <p className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    Read each question carefully before submitting. Ensure you review all questions using the Question Palette before final submission.
                  </p>
                )}
              </div>
            </div>

            {/* Examination Rules Box */}
            <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 font-mono flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Important Examination Guidelines</span>
              </h4>
              <ul className="text-xs text-blue-800/90 space-y-1.5 list-disc pl-5 leading-relaxed">
                <li>The countdown timer begins immediately when you click <strong>"Start Assessment"</strong>.</li>
                <li>You can navigate questions using the <strong>Question Palette</strong> on the sidebar.</li>
                <li>You can <strong>Mark for Review</strong> questions that you wish to revisit before submitting.</li>
                <li>Unanswered questions receive 0 points without negative marking.</li>
                <li>If the timer runs out, your assessment will be submitted automatically.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Back to Assessments
              </button>
              <button
                onClick={handleStartAssessment}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Assessment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 2: POST-SUBMIT SCORECARD & PERSISTENT RESULT
  // ====================================================
  if (isSubmitted) {
    const earnedScore = submissionResult?.score ?? 0;
    const totalPoints = submissionResult?.totalPoints || assessment.totalPoints || 1;
    const pct = submissionResult?.percentage !== undefined && submissionResult?.percentage !== null
      ? Number(submissionResult.percentage)
      : Math.round((earnedScore / totalPoints) * 100);
    const isPassed = submissionResult?.passed ?? (pct >= assessment.passingScore);
    const correctC = submissionResult?.correctCount ?? 0;
    const incorrectC = submissionResult?.incorrectCount ?? 0;
    const unansweredC = submissionResult?.unansweredCount ?? Math.max(0, questions.length - correctC - incorrectC);

    return (
      <div className="max-w-4xl mx-auto py-8 px-4 font-sans space-y-6">
        {/* Completed status banner if revisit */}
        {attemptsReached && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Assessment completed. You have completed {attemptsCount} of {assessment.maxAttempts || 1} allowed attempt(s).
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-amber-200/60 px-2 py-0.5 rounded">
              Attempt Finalized
            </span>
          </div>
        )}

        {/* Scorecard Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center space-y-6">
          <div className={`inline-flex p-4 rounded-full ${isPassed ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {isPassed ? <Award className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
          </div>

          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider font-mono ${
              isPassed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}>
              {isPassed ? "PASSED" : "FAILED"}
            </span>
            <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 mt-2">
              {isPassed ? "Congratulations! Assessment Passed" : "Assessment Completed"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Passing threshold was {assessment.passingScore}%. You achieved {pct}% overall.
            </p>
          </div>

          {/* Metric Stats Grid */}
          <div className="max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Score</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {earnedScore} / {totalPoints}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Percentage</span>
              <p className={`text-xl font-extrabold mt-0.5 ${isPassed ? "text-emerald-600" : "text-rose-600"}`}>
                {pct}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Correct</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{correctC}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-sans">Time Taken</span>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">
                {formatTime(submissionResult?.timeTakenSeconds || 0)}
              </p>
            </div>
          </div>

          {/* Additional metrics line: Correct, Incorrect, Unanswered */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Correct: <strong>{correctC}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Incorrect: <strong>{incorrectC}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Unanswered: <strong>{unansweredC}</strong>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Back to Assessments
            </button>
            <button
              onClick={onCompleted}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              Continue Learning
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        {leaderboard.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Assessment Leaderboard</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {leaderboard.map((student) => (
                <div key={student.rank} className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      student.rank === 1 
                        ? "bg-amber-400 text-amber-950" 
                        : student.rank === 2 
                          ? "bg-slate-300 text-slate-800" 
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {student.rank}
                    </span>
                    <p className="text-xs font-semibold text-slate-800">{student.studentName}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                    <span>{student.time}</span>
                    <span className="font-bold text-slate-900">{student.score} Pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question-by-Question Review with Answers & Explanations */}
        {gradedQuestions && gradedQuestions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Answers & Explanations Review</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {gradedQuestions.length} Questions Evaluated
              </span>
            </div>

            <div className="space-y-5">
              {gradedQuestions.map((q, idx) => {
                const studentAns = answers[q.id]?.[0];
                const correctAns = q.correctAnswers?.[0];
                const isAttempted = !!studentAns;
                const isCorrect = isAttempted && studentAns === correctAns;

                return (
                  <div 
                    key={q.id}
                    className={`p-5 rounded-xl border transition space-y-3 ${
                      !isAttempted
                        ? "bg-slate-50/60 border-slate-200"
                        : isCorrect 
                          ? "bg-emerald-50/40 border-emerald-200/80" 
                          : "bg-rose-50/40 border-rose-200/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          !isAttempted
                            ? "bg-slate-200 text-slate-700"
                            : isCorrect 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-rose-100 text-rose-700"
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{q.questionText}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                              !isAttempted
                                ? "bg-slate-200 text-slate-700"
                                : isCorrect 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : "bg-rose-100 text-rose-800"
                            }`}>
                              {!isAttempted ? "Unanswered (0 Pts)" : isCorrect ? `+${q.points} Pts Correct` : `Incorrect (0 Pts)`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Difficulty: {q.difficulty || "medium"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isAttempted ? (
                        <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
                      ) : isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </div>

                    {/* Options list */}
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
    );
  }

  // ====================================================
  // VIEW 3: ACTIVE ASSESSMENT EXAM INTERFACE
  // ====================================================
  const activeQuestion = questions[activeQuestionIdx] || questions[0];
  const isSequential = assessment.questionNavigation === "sequential";
  const isMarked = !!markedForReview[activeQuestion?.id];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 font-sans space-y-6">
      {/* Top Exam Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
              {assessment.category || "Assessment"}
            </span>
            {isSequential && (
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                Sequential Mode
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono">
              Question {activeQuestionIdx + 1} of {questions.length}
            </span>
          </div>
          <h2 className="font-bold text-lg sm:text-xl text-slate-900 mt-1">{assessment.title}</h2>
        </div>

        {/* Live Timer Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold font-mono ${
          secondsRemaining && secondsRemaining < 120 
            ? "bg-rose-50 text-rose-600 border border-rose-200 animate-pulse" 
            : "bg-slate-50 text-slate-700 border border-slate-200"
        }`}>
          <Clock className="w-4 h-4" />
          <span>Time Remaining: {secondsRemaining !== null ? formatTime(secondsRemaining) : "00:00"}</span>
        </div>
      </div>

      {/* Main Examination Layout: Question + Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3/4): Question Viewer Card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Question Card Header: Points + Mark For Review */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-slate-400 font-mono">
                POINT VALUE: {activeQuestion?.points || 10} PTS
              </span>
              <button
                type="button"
                onClick={() => toggleMarkForReview(activeQuestion?.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  isMarked
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isMarked ? "fill-amber-500 text-amber-600" : ""}`} />
                <span>{isMarked ? "Marked for Review" : "Mark for Review"}</span>
              </button>
            </div>

            {/* Question Text */}
            <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
              {activeQuestion?.questionText}
            </p>

            {/* Multiple Choice Options */}
            <div className="space-y-3">
              {activeQuestion?.options?.map((opt, i) => {
                const isSelected = answers[activeQuestion.id]?.includes(opt);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectOption(activeQuestion.id, opt)}
                    className={`w-full text-left px-5 py-3.5 rounded-xl text-xs sm:text-sm font-semibold transition border flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/60 text-blue-800 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                        isSelected ? "bg-blue-600 text-white" : "bg-white border border-slate-300 text-slate-600"
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls Footer */}
          <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            {!isSequential ? (
              <button
                type="button"
                onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                disabled={activeQuestionIdx === 0}
                className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition disabled:opacity-40 cursor-pointer border border-slate-200"
              >
                Previous
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-mono">Step {activeQuestionIdx + 1} / {questions.length}</span>
            )}

            <div className="flex items-center gap-3">
              {activeQuestionIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleSubmitAssessment}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1/4): Question Palette Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                Question Palette
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Grid of question bubbles */}
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id]?.length > 0;
                const isFlagged = markedForReview[q.id];
                const isActive = idx === activeQuestionIdx;

                let bubbleStyle = "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
                if (isActive) {
                  bubbleStyle = "bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 border-transparent font-bold";
                } else if (isAnswered) {
                  bubbleStyle = "bg-emerald-600 text-white border-emerald-600 font-bold";
                } else if (isFlagged) {
                  bubbleStyle = "bg-amber-100 border-amber-400 text-amber-900 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isSequential}
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`relative w-9 h-9 rounded-xl text-xs font-mono flex items-center justify-center border transition cursor-pointer disabled:cursor-not-allowed ${bubbleStyle}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Palette Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] font-mono text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 text-white inline-block" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-white border border-slate-300 inline-block" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-400 inline-block" />
                <span>Marked for Review ({markedCount})</span>
              </div>
            </div>

            {/* Ready to submit shortcut */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitAssessment}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Finish & Submit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
