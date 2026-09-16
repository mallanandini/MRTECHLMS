/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  GraduationCap, BookOpen, Code, Award, Sparkles, Play, 
  ArrowRight, Clock, Star, BookMarked, Calendar, Send, 
  Terminal, CheckCircle2, XCircle, ChevronRight, TrendingUp, Info, Lock
} from "lucide-react";
import { User, Course } from "../types.js";

interface StudentDashboardProps {
  currentUser: User;
  authToken: string;
  myDashboardStats: any;
  catalogCourses: Course[];
  enrolledCourseIds: string[];
  onResumeCourse: (courseId: string) => void;
  onStartAssessment: (assessmentId: string) => void;
  onEnrollCourse: (courseId: string) => void;
  onNavigate: (tab: string) => void;
}

export function StudentDashboard({
  currentUser,
  authToken,
  myDashboardStats,
  catalogCourses,
  enrolledCourseIds,
  onResumeCourse,
  onStartAssessment,
  onEnrollCourse,
  onNavigate
}: StudentDashboardProps) {
  // AI Tutor state
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Format dynamic dates
  const formattedDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiAnswer("");
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          content: aiQuery,
          context: "Student Dashboard Quick Help Widget"
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnswer(data.explanation || "No explanation could be generated.");
      } else {
        setAiAnswer("Failed to connect to the AI Tutor. Please try again later.");
      }
    } catch (err) {
      console.error("AI Explainer failed on dashboard", err);
      setAiAnswer("Network error. Could not contact the AI Tutor.");
    } finally {
      setAiLoading(false);
    }
  };

  // Simple parser to render basic markdown in the AI answer (bold, code blocks, bullet points, headers)
  const renderFormattedAnswer = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Header check
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-bold text-slate-100 mt-3 mb-1">{line.replace("### ", "")}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-md font-extrabold text-blue-400 mt-4 mb-2">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-lg font-black text-white mt-4 mb-2">{line.replace("# ", "")}</h2>;
      }
      // Bullet list check
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.substring(2);
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-slate-300 text-xs leading-relaxed">
            <li>{parseInlineMarkdown(content)}</li>
          </ul>
        );
      }
      // Empty line check
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-slate-300 text-xs leading-relaxed my-1">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper to parse bold, italics, and inline code tags
  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\`.*?\`|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={index} className="italic text-slate-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="bg-slate-900 text-cyan-400 font-mono px-1 py-0.5 rounded text-[11px] border border-slate-800">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // Available courses not yet assigned to this student
  const availableCourses = catalogCourses
    .filter(c => !enrolledCourseIds.includes(c.id));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200 min-w-0">
      
      {/* Dynamic Welcome Greeting Banner */}
      <div className="relative overflow-hidden hero-gradient text-white rounded-3xl p-5 sm:p-6 md:p-8 shadow-md min-w-0">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src="/mr-logo-icon.png" 
            alt="" 
            className="w-40 h-40 sm:w-64 sm:h-64 object-contain transform translate-x-10 sm:translate-x-16 translate-y-4 filter brightness-200" 
          />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold tracking-wider uppercase font-mono backdrop-blur-xs">
              <Calendar className="w-3 h-3 shrink-0" />
              <span className="truncate">{formattedDate}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold tracking-wider uppercase font-mono backdrop-blur-xs">
              <img src="/mr-logo-icon.png" alt="MR Logo" className="w-3.5 h-3.5 object-contain" />
              <span>MR TECHNOLOGIES</span>
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex flex-wrap items-center gap-2 break-words">
              <span>Welcome Back, {currentUser.name}!</span> <span className="animate-bounce">👋</span>
            </h2>
            <p className="text-white/90 text-xs md:text-sm leading-relaxed break-words">
              Your academy progress is looking great! Let's keep the momentum going today. Review your active tracks, practice your coding algorithms, or consult your personal AI Mentor.
            </p>
          </div>
          {myDashboardStats && myDashboardStats.enrolledCount > 0 && (
            <div className="flex flex-wrap gap-2.5 sm:gap-4 pt-2">
              <div className="bg-white/10 rounded-xl px-3 sm:px-4 py-2 border border-white/5 backdrop-blur-xs">
                <span className="text-[10px] font-semibold text-white/80 block uppercase tracking-wider font-mono">Average Progress</span>
                <span className="text-base sm:text-lg font-bold font-mono">{myDashboardStats.averageProgress}%</span>
              </div>
              <div className="bg-white/10 rounded-xl px-3 sm:px-4 py-2 border border-white/5 backdrop-blur-xs">
                <span className="text-[10px] font-semibold text-white/80 block uppercase tracking-wider font-mono">Courses In-Flight</span>
                <span className="text-base sm:text-lg font-bold font-mono">{myDashboardStats.enrolledCount - myDashboardStats.completedCourses}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Stats Counter Cards Grid */}
      {myDashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-3.5 xl:gap-4 min-w-0">
          <div className="p-3.5 sm:p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs hover:shadow-md transition duration-150 flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-theme-primary-light text-theme-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono truncate">Enrolled</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono mt-0.5 truncate">{myDashboardStats.enrolledCount}</p>
            </div>
          </div>
          
          <div className="p-3.5 sm:p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs hover:shadow-md transition duration-150 flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono truncate">Completed</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono mt-0.5 truncate">{myDashboardStats.completedCourses}</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs hover:shadow-md transition duration-150 flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono truncate">Avg Progress</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono mt-0.5 truncate">{myDashboardStats.averageProgress}%</p>
            </div>
          </div>

          <div 
            onClick={() => onNavigate("practice")}
            className="p-3.5 sm:p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs hover:shadow-md transition duration-150 flex items-center gap-3 min-w-0 cursor-pointer hover:border-amber-400 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 flex items-center justify-center shrink-0 transition">
              <Code className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono truncate">Coding Solved</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono mt-0.5 truncate">{myDashboardStats.codingChallengesSolved || 0}</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-white border border-slate-200/60 rounded-2xl shadow-xs hover:shadow-md transition duration-150 flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono truncate">Quizzes Passed</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono mt-0.5 truncate">{myDashboardStats.passedAssessments || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Main Dashboard Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6 min-w-0">
        
        {/* Left 2 Columns: Enrolled Courses & Recommended Courses */}
        <div className="xl:col-span-2 space-y-6 min-w-0">
          
          {/* Active Ongoing Courses */}
          {/* Active Assigned Courses */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-blue-600" />
                My Assigned Courses
              </h3>
              <button 
                onClick={() => onNavigate("courses")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition cursor-pointer"
              >
                Catalog View <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
              {myDashboardStats?.courseProgress?.length > 0 ? (
                myDashboardStats.courseProgress.map((course: any) => (
                  <div 
                    key={course.courseId} 
                    className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-slate-300/80 transition duration-150 flex flex-col justify-between h-full min-w-0"
                  >
                    <div className="space-y-3 min-w-0">
                      <div className="aspect-video max-h-40 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-100 shrink-0">
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">{course.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 font-mono mt-1">
                          {course.completedCount} / {course.totalCount} LESSONS COMPLETED
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100 mt-4 shrink-0">
                      {/* Interactive progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                          <span>COMPLETION</span>
                          <span>{course.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full transition-all rounded-full" 
                            style={{ width: `${course.percentage}%` }} 
                          />
                        </div>
                      </div>

                      {/* Launch standard evaluation test if the course is fully completed */}
                      {course.percentage >= 80 ? (
                        <button
                          onClick={() => {
                            if (course.assessmentId) {
                              onStartAssessment(course.assessmentId);
                            } else {
                              onNavigate("assessments");
                            }
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Take Final Assessment
                        </button>
                      ) : (
                        <button
                          onClick={() => onResumeCourse(course.courseId)}
                          className="w-full btn-theme-primary font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Resume Studying
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-10 px-5 text-center bg-white border border-slate-200/60 rounded-2xl text-slate-400 space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">No courses assigned yet</p>
                    <p className="text-xs text-slate-400">Your administrator will provide access to your learning programs.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Available Courses (Access Required) Section */}
          {availableCourses.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  Available Courses (Access Required)
                </h3>
                <span className="text-xs text-slate-400 font-mono font-semibold">
                  {availableCourses.length} {availableCourses.length === 1 ? "course" : "courses"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
                {availableCourses.map((course) => (
                  <div 
                    key={course.id} 
                    className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition duration-150 flex flex-col justify-between h-full min-h-[300px] min-w-0"
                  >
                    <div>
                      <div className="h-32 bg-slate-100 relative shrink-0">
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="text-[9px] font-bold text-slate-600 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md absolute left-3 top-3 uppercase tracking-wider font-mono border border-slate-200/80">
                          {course.category}
                        </span>
                      </div>
                      <div className="p-4 space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs line-clamp-2 leading-snug">{course.title}</h4>
                        <div className="flex items-center gap-0.5 text-amber-400 pt-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold text-slate-700">{course.rating || 5.0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 pt-0 border-t border-slate-50 mt-2 shrink-0">
                      <div 
                        className="w-full bg-slate-50 border border-slate-200/80 text-slate-500 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                        title="Course access is assigned by your LMS Administrator"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Access Required</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: AI Tutor Quick Assistant & Recent Activity Feed */}
        <div className="space-y-6 min-w-0">
          
          {/* Premium Gemini AI Tutor widget */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-5 shadow-md flex flex-col space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-blue-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Gemini AI Tutor ⚡
              </span>
              <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase font-bold">
                Online
              </span>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Ask programming syntax, algorithm tips, or debugging guidelines. Your tutor is prepped.
            </p>

            <form onSubmit={handleAskAi} className="space-y-3">
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask e.g. How does map() work in JS?"
                className="w-full bg-slate-950 text-slate-100 text-xs p-3 rounded-xl border border-slate-800 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-18 leading-relaxed"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-500/10"
              >
                <Send className="w-3 h-3" />
                {aiLoading ? "Consulting Tutor..." : "Consult AI"}
              </button>
            </form>

            {/* Answer Display */}
            {(aiAnswer || aiLoading) && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 max-h-56 overflow-y-auto font-sans break-words">
                {aiLoading ? (
                  <div className="space-y-2 py-1">
                    <div className="h-3.5 bg-slate-800 rounded-md w-1/3 animate-pulse" />
                    <div className="h-3 bg-slate-800 rounded-md w-full animate-pulse" />
                    <div className="h-3 bg-slate-800 rounded-md w-5/6 animate-pulse" />
                    <div className="h-3 bg-slate-800 rounded-md w-4/5 animate-pulse" />
                  </div>
                ) : (
                  <div>{renderFormattedAnswer(aiAnswer)}</div>
                )}
              </div>
            )}
          </div>

          {/* Recent Activity Timeline Feed */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-4 min-w-0">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Activities
            </h3>

            <div className="space-y-4 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 min-w-0">
              {myDashboardStats?.recentActivity?.length > 0 ? (
                myDashboardStats.recentActivity.map((activity: any, idx: number) => {
                  let badgeBg = "bg-slate-50 text-slate-500";
                  let icon = <Info className="w-3.5 h-3.5" />;
                  
                  if (activity.type === "enrollment") {
                    badgeBg = "bg-blue-50 text-blue-600 border border-blue-100";
                    icon = <BookOpen className="w-3.5 h-3.5" />;
                  } else if (activity.type === "assessment") {
                    const isPass = activity.title.toLowerCase().includes("passed");
                    badgeBg = isPass 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                      : "bg-rose-50 text-rose-600 border border-rose-100";
                    icon = isPass 
                      ? <CheckCircle2 className="w-3.5 h-3.5" /> 
                      : <XCircle className="w-3.5 h-3.5" />;
                  } else if (activity.type === "coding") {
                    const isPass = activity.title.toLowerCase().includes("passed");
                    badgeBg = isPass 
                      ? "bg-violet-50 text-violet-600 border border-violet-100" 
                      : "bg-amber-50 text-amber-600 border border-amber-100";
                    icon = <Code className="w-3.5 h-3.5" />;
                  }

                  const relativeTime = new Date(activity.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div key={idx} className="flex gap-3.5 items-start relative min-w-0">
                      <div className={`w-10 h-10 rounded-xl ${badgeBg} flex items-center justify-center shrink-0 relative z-10 shadow-inner`}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-xs font-bold text-slate-800 truncate leading-snug">{activity.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5 truncate">{activity.detail}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1 font-semibold">{relativeTime}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs font-medium">
                  No recent activities recorded.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
