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
  
  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      try {
        const response = await fetch(`/api/assessments/${assessmentId}`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setAssessment(data.assessment);
          setQuestions(data.questions);
          setSecondsRemaining((data.assessment.durationMinutes || 15) * 60);
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
    if (secondsRemaining === null || isSubmitted) return;
    if (secondsRemaining <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining, isSubmitted]);

  const handleSelectOption = (questionId: string, option: string) => {
    // For our current single correct or TF MCQ types:
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
        
        // Let's create a mockup leaderboard with other submissions
        setLeaderboard([
          { studentName: "Sarah Connor", score: 10, time: "4m 12s", rank: 1 },
          { studentName: data.submission.studentName, score: data.submission.score, time: formatTime(timeTaken), rank: data.submission.score >= 10 ? 2 : 3 },
          { studentName: "Michael Scott", score: 5, time: "11m 45s", rank: 4 }
        ].sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 })));
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

  if (!assessment || questions.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
        Assessment data could not be loaded. Please try again.
      </div>
    );
  }

  const activeQuestion = questions[activeQuestionIdx];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Active Exam Interface */}
      {!isSubmitted ? (
        <div className="space-y-6">
          {/* Header Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
                Active Assessment
              </span>
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
                    className={`w-full text-left px-5 py-4 rounded-xl text-sm font-semibold transition border flex items-center justify-between ${
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
            <button
              onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={activeQuestionIdx === 0}
              className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl transition disabled:opacity-50"
            >
              Previous
            </button>

            {activeQuestionIdx < questions.length - 1 ? (
              <button
                onClick={() => setActiveQuestionIdx(prev => prev + 1)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitAssessment}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5"
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
              {leaderboard.map((student) => (
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
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
