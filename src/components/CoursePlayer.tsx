/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Play, FileText, Code, CheckCircle2, ChevronRight, Sparkles, 
  ThumbsUp, Star, MessageSquare, ArrowLeft, Download, Send, ShieldAlert,
  Award, ExternalLink, X, Check, Clock, AlertCircle
} from "lucide-react";
import { Course, Module, Lesson, LessonType, Review, Assessment, Question, QuestionType } from "../types.js";

function getEmbedVideo(url?: string) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: "native", videoUrl: url };
}

interface CoursePlayerProps {
  courseId: string;
  authToken: string;
  onBack: () => void;
  onLessonCompleteChange: (lessonId: string, completed: boolean) => void;
  completedLessons: string[];
}

export function CoursePlayer({ 
  courseId, authToken, onBack, onLessonCompleteChange, completedLessons 
}: CoursePlayerProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [finalAssessment, setFinalAssessment] = useState<Assessment | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Interactive Assessment Runner State
  const [takingAssessmentId, setTakingAssessmentId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<{ assessment: Assessment; questions: Question[] } | null>(null);
  const [testAnswers, setTestAnswers] = useState<{ [qId: string]: string[] }>({});
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ score: number; totalPoints: number; passed: boolean } | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const [activeTab, setActiveTab] = useState<"content" | "reviews">("content");
  
  // Review form state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // AI Explainer State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setModules(data.modules);
        setLessons(data.lessons);
        setReviews(data.reviews || []);
        setFinalAssessment(data.finalAssessment || null);
        if (data.lessons.length > 0 && !activeLesson) {
          setActiveLesson(data.lessons[0]);
        }
      }
    } catch (e) {
      console.error("Error loading course details", e);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const handleStartAssessment = async (assessmentId: string) => {
    setTakingAssessmentId(assessmentId);
    setTestResult(null);
    setTestAnswers({});
    setLoadingTest(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTest(data);
      }
    } catch (err) {
      console.error("Error loading assessment", err);
    } finally {
      setLoadingTest(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!takingAssessmentId) return;
    setTestSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${takingAssessmentId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ answers: testAnswers, timeTakenSeconds: 60 })
      });
      if (res.ok) {
        const result = await res.json();
        setTestResult({
          score: result.score,
          totalPoints: result.totalPoints || result.submission?.totalPoints || activeTest?.assessment?.totalPoints || 0,
          passed: result.passed
        });
      }
    } catch (err) {
      console.error("Error submitting assessment", err);
    } finally {
      setTestSubmitting(false);
    }
  };

  const handleToggleComplete = (lessonId: string) => {
    const wasCompleted = completedLessons.includes(lessonId);
    onLessonCompleteChange(lessonId, !wasCompleted);
  };

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        setComment("");
        setRating(5);
        fetchCourseDetails(); // Reload course with new reviews and average ratings
      }
    } catch (err) {
      console.error("Error submitting review", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAskAI = async () => {
    const textToQuery = aiQuery.trim() || (activeLesson ? activeLesson.title : course?.title) || "";
    if (!textToQuery) return;

    setIsAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          content: textToQuery, 
          context: `Course: ${course?.title || ""}. Active Lesson: ${activeLesson?.title || ""}` 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.explanation);
      } else {
        setAiResponse("AI assistant is currently busy. Please check your credentials and try again.");
      }
    } catch (err) {
      console.error("AI Error", err);
      setAiResponse("Could not reach AI services. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-sm text-center max-w-md mx-auto my-16 space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Course Access Restricted</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          You are not currently enrolled in this course. Course access is assigned by your LMS Administrator.
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

  if (!course) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header Panel */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-lg text-gray-900 leading-tight">{course.title}</h2>
            <p className="text-xs text-gray-500 font-medium">Instructor: {course.instructorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-mono">
            {completedLessons.filter(id => lessons.some(l => l.id === id)).length} / {lessons.length} Completed
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Lesson player & text content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeLesson ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Media Segment with Smart Embeds */}
              {activeLesson.type === LessonType.VIDEO && activeLesson.videoUrl && (() => {
                const embed = getEmbedVideo(activeLesson.videoUrl);
                if (embed?.type === "youtube" || embed?.type === "vimeo") {
                  return (
                    <div className="aspect-video bg-black relative">
                      <iframe 
                        src={embed.embedUrl} 
                        className="w-full h-full border-0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeLesson.title}
                      />
                    </div>
                  );
                }
                return (
                  <div className="aspect-video bg-black relative">
                    <video 
                      src={activeLesson.videoUrl} 
                      className="w-full h-full object-contain" 
                      controls 
                      poster={course.thumbnail}
                    />
                  </div>
                );
              })()}

              {/* Lesson Details */}
              <div className="p-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-5">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider font-mono">
                      {activeLesson.type} Lesson
                    </span>
                    <h3 className="font-bold text-2xl text-gray-900 mt-2">{activeLesson.title}</h3>
                  </div>
                  <button
                    onClick={() => handleToggleComplete(activeLesson.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      completedLessons.includes(activeLesson.id)
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{completedLessons.includes(activeLesson.id) ? "Lesson Completed" : "Mark as Completed"}</span>
                  </button>
                </div>

                {/* Lesson text content (Markdown or Rich HTML) */}
                {activeLesson.content && (
                  <div className="prose max-w-none text-gray-700 space-y-3 mb-6 leading-relaxed font-sans">
                    {activeLesson.content.split("\n").map((line, idx) => {
                      if (line.startsWith("## ")) {
                        return <h2 key={idx} className="text-xl font-bold text-gray-900 pt-3">{line.replace("## ", "")}</h2>;
                      }
                      if (line.startsWith("### ")) {
                        return <h3 key={idx} className="text-lg font-bold text-gray-800 pt-2">{line.replace("### ", "")}</h3>;
                      }
                      if (line.startsWith("`")) {
                        return (
                          <pre key={idx} className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-sm overflow-x-auto my-3 border border-slate-800">
                            <code>{line.replace(/`/g, "")}</code>
                          </pre>
                        );
                      }
                      if (line.startsWith("- ") || line.startsWith("* ")) {
                        const content = line.substring(2);
                        const parts = content.split(/(\*\*.*?\*\*)/g);
                        return (
                          <div key={idx} className="flex items-start gap-2 text-gray-700 pl-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>
                              {parts.map((part, pIdx) => {
                                if (part.startsWith("**") && part.endsWith("**")) {
                                  return <strong key={pIdx} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                              })}
                            </span>
                          </div>
                        );
                      }
                      if (!line.trim()) return <div key={idx} className="h-1" />;
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                )}
                
                {/* Embedded Study Material PDF attachments if available */}
                {(activeLesson.materialUrl || activeLesson.fileUrl) && (
                  <div className="mt-6 p-4 sm:p-5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {activeLesson.materialTitle || "Lesson Study Material / Notes (PDF)"}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Downloadable lecture slides and reference documents
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a 
                        href={activeLesson.materialUrl || activeLesson.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold transition shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </a>
                      <a 
                        href={activeLesson.materialUrl || activeLesson.fileUrl} 
                        download
                        className="flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Lesson Practice Test Section if available */}
                {activeLesson.practiceTest && (
                  <div className="mt-6 p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold rounded uppercase">
                            Practice Test
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{activeLesson.practiceTest.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
                          <span>Duration: <strong>{activeLesson.practiceTest.durationMinutes}m</strong></span>
                          <span>Passing Score: <strong>{activeLesson.practiceTest.passingScore}%</strong></span>
                          <span>Questions: <strong>{activeLesson.practiceTest.questionsCount}</strong></span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartAssessment(activeLesson.practiceTest!.id)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Take Practice Test</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center text-gray-500">
              Please choose a lesson from the syllabus sidebar to begin learning.
            </div>
          )}

          {/* Discussion Forum / Reviews Navigation */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setActiveTab("content")}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                  activeTab === "content" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Course Requirements & Description
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition ${
                  activeTab === "reviews" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Student Reviews ({reviews.length})
              </button>
            </div>

            <div className="p-8">
              {activeTab === "content" ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">Course Objectives</h4>
                    <p className="text-sm text-gray-600 mt-2">{course.description}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-md">Prerequisites</h4>
                    <ul className="mt-2 space-y-1.5">
                      {course.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-md">Key Skills Covered</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {course.skillsCovered.map((skill, i) => (
                        <span key={i} className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Reviews List */}
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map((rev) => (
                        <div key={rev.id} className="p-5 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{rev.studentName}</p>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">Reviewed on {new Date(rev.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < rev.rating ? "fill-amber-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-3">{rev.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No reviews yet. Be the first to leave a feedback rating!</p>
                    )}
                  </div>

                  {/* Leave review form */}
                  <form onSubmit={handlePostReview} className="border-t border-gray-100 pt-6 space-y-4">
                    <h4 className="font-bold text-gray-900 text-md">Submit Course Feedback</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">Select Rating:</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            type="button"
                            key={starValue}
                            onClick={() => setRating(starValue)}
                            className="text-amber-400 hover:scale-110 transition"
                          >
                            <Star className={`w-6 h-6 ${starValue <= rating ? "fill-amber-400" : "text-gray-200"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write your review comments here..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-slate-50 focus:bg-white transition"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Syllabus and AI Sidebar panels */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Ask AI Course Instructor</h3>
          </div>
          
          <div className="p-4 border-b border-gray-100 space-y-3">
            <textarea
              rows={2}
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Highlight or ask any question about standard libraries, Javascript, React, Python..."
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 bg-slate-50 focus:bg-white transition"
            />
            <button
              onClick={handleAskAI}
              disabled={isAiLoading}
              className="w-full bg-slate-900 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              {isAiLoading ? "Consulting AI..." : "Ask AI Instructor"}
            </button>

            {aiResponse && (
              <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-900 space-y-2 overflow-y-auto max-h-60 leading-relaxed font-sans">
                <p className="font-bold border-b border-blue-100 pb-1 flex items-center gap-1 text-blue-800">
                  <Sparkles className="w-3 h-3 text-blue-600 fill-blue-600" />
                  Gemini Explainer Output:
                </p>
                <p className="whitespace-pre-line">{aiResponse}</p>
              </div>
            )}
          </div>

          {/* Standard Course Syllabus list */}
          <div className="flex-1 p-4 space-y-4">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">Course Syllabus</h3>
            {modules.map((mod) => {
              const moduleLessons = lessons.filter(les => les.moduleId === mod.id);
              return (
                <div key={mod.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{mod.title}</h4>
                  <div className="space-y-1">
                    {moduleLessons.map((les) => {
                      const isCompleted = completedLessons.includes(les.id);
                      const isActive = activeLesson?.id === les.id;
                      return (
                        <button
                          key={les.id}
                          onClick={() => setActiveLesson(les)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center gap-2.5 transition ${
                            isActive 
                              ? "bg-blue-50 text-blue-700 font-semibold" 
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            isCompleted 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : isActive 
                                ? "border-blue-300 text-blue-600" 
                                : "border-gray-200 text-gray-400"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                            ) : les.type === LessonType.VIDEO ? (
                              <Play className="w-3 h-3 fill-current" />
                            ) : les.type === LessonType.CODING ? (
                              <Code className="w-3 h-3" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                          </div>
                          <span className="truncate flex-1">{les.title}</span>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">{les.durationMinutes}m</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Course Final Certification Assessment */}
            {finalAssessment && (
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleStartAssessment(finalAssessment.id)}
                  className="w-full p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-bold uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                      Final Exam
                    </span>
                    <span className="text-[10px] text-purple-600 font-mono">
                      {finalAssessment.durationMinutes}m • {finalAssessment.passingScore}% Pass
                    </span>
                  </div>
                  <p className="text-xs font-bold text-purple-900 truncate">{finalAssessment.title}</p>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Assessment Taking Modal */}
      {takingAssessmentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  activeTest?.assessment.type === "course_final" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {activeTest?.assessment.type === "course_final" ? "Course Final Exam" : "Lesson Practice Test"}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{activeTest?.assessment.title || "Loading..."}</h3>
              </div>
              <button
                onClick={() => {
                  setTakingAssessmentId(null);
                  setActiveTest(null);
                  setTestResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTest ? (
              <div className="py-16 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-semibold">Loading assessment questions...</p>
              </div>
            ) : testResult ? (
              /* Test Results View */
              <div className="py-8 text-center space-y-4">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  testResult.passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}>
                  {testResult.passed ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>

                <div>
                  <h4 className="text-xl font-bold text-slate-900">
                    {testResult.passed ? "Congratulations! You Passed!" : "Needs Improvement"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {testResult.passed
                      ? "Great job mastering the concepts covered in this material."
                      : "You did not meet the passing score. Review the lesson material and try again."}
                  </p>
                </div>

                <div className="inline-flex items-center gap-6 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl font-mono text-sm">
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase">Your Score</span>
                    <strong className="text-slate-900 text-base">{testResult.score} / {testResult.totalPoints}</strong>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div>
                    <span className="text-[11px] text-slate-400 block uppercase">Result</span>
                    <strong className={testResult.passed ? "text-emerald-600 text-base uppercase" : "text-amber-600 text-base uppercase"}>
                      {testResult.passed ? "PASSED" : "NOT PASSED"}
                    </strong>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setTestResult(null);
                      setTestAnswers({});
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Retake Test
                  </button>
                  <button
                    onClick={() => {
                      setTakingAssessmentId(null);
                      setActiveTest(null);
                      setTestResult(null);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Test Taking Form */
              <div className="space-y-6">
                {activeTest?.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-slate-200 text-slate-700 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {qIdx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-relaxed">{q.questionText}</p>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{q.points} Points</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 pl-9">
                      {q.options?.map((opt, optIdx) => {
                        const isSelected = testAnswers[q.id]?.includes(opt);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              if (q.type === QuestionType.MCQ_MULTI) {
                                setTestAnswers(prev => {
                                  const curr = prev[q.id] || [];
                                  const next = curr.includes(opt) ? curr.filter(x => x !== opt) : [...curr, opt];
                                  return { ...prev, [q.id]: next };
                                });
                              } else {
                                setTestAnswers(prev => ({ ...prev, [q.id]: [opt] }));
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-3 transition cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold shadow-xs"
                                : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTakingAssessmentId(null);
                      setActiveTest(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAssessment}
                    disabled={testSubmitting || !activeTest?.questions || activeTest.questions.length === 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{testSubmitting ? "Submitting..." : "Submit Answers"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
