/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, BookOpen, Clock, Award, Star, CheckCircle2, 
  Play, Lock, User, FileText, Code, Video, ChevronDown, ChevronRight,
  ShieldCheck, AlertCircle, Sparkles, Check
} from "lucide-react";
import { LessonType } from "../../types.js";

interface CourseOverviewModalProps {
  courseId: string;
  authToken: string;
  isOpen: boolean;
  onClose: () => void;
  onStartCourse: (courseId: string) => void;
}

export function CourseOverviewModal({
  courseId,
  authToken,
  isOpen,
  onClose,
  onStartCourse
}: CourseOverviewModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<{ [moduleId: string]: boolean }>({});

  useEffect(() => {
    if (!isOpen || !courseId) return;

    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/student/courses/${courseId}/overview`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load course overview");
        }
        const overviewData = await res.json();
        setData(overviewData);
        // Expand first module by default
        if (overviewData.modules && overviewData.modules.length > 0) {
          setExpandedModules({ [overviewData.modules[0].id]: true });
        }
      } catch (err: any) {
        console.error("Course overview error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [courseId, isOpen, authToken]);

  if (!isOpen) return null;

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const course = data?.course;
  const isEnrolled = !!data?.enrollment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-overview-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Course Experience & Syllabus
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-6 animate-pulse py-8">
              <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
            </div>
          ) : course ? (
            <>
              {/* Hero Banner / Course Summary */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm">
                <div className="aspect-21/9 max-h-56 w-full relative">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  <div className="absolute bottom-4 left-4 right-4 text-white space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-600/90 text-white font-mono text-[10px]">
                        {course.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-white/20 text-white backdrop-blur-xs text-[10px]">
                        {course.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold text-xs ml-auto">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {course.rating.toFixed(1)} ({course.reviewsCount} reviews)
                      </span>
                    </div>

                    <h2 id="course-overview-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                      {course.title}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Meta Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Instructor</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{course.instructorName}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Duration</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{course.estimatedDuration}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Curriculum</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {data.modules?.length || 0} Modules • {data.totalLessons || 0} Lessons
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Certificate</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {course.certificateEnabled ? "Accredited Certificate" : "Included"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enrollment Progress Card (if enrolled) */}
              {isEnrolled && (
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        You are enrolled in this track
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Completed {data.completedLessonsCount} of {data.totalLessons} lessons ({data.enrollment.progressPercentage}%)
                    </p>
                  </div>

                  <div className="w-full sm:w-48 space-y-1.5">
                    <div className="w-full bg-blue-200 dark:bg-blue-900 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${data.enrollment.progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-blue-800 dark:text-blue-300 font-bold block text-right">
                      {data.enrollment.progressPercentage}% Completed
                    </span>
                  </div>
                </div>
              )}

              {/* Course Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Overview & Scope
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Learning Outcomes / Skills Covered */}
              {course.skillsCovered && course.skillsCovered.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Key Learning Outcomes & Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {course.skillsCovered.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites & Requirements */}
              {course.prerequisites && course.prerequisites.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Prerequisites
                  </h3>
                  <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {course.prerequisites.map((req: string, idx: number) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assessment & Certification Information */}
              {data.finalAssessment && (
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider font-mono">
                      Accreditation Assessment
                    </h3>
                  </div>
                  <p className="text-xs text-purple-800 dark:text-purple-300">
                    This course concludes with a final examination: <strong className="font-semibold">{data.finalAssessment.title}</strong> ({data.finalAssessment.durationMinutes} mins, {data.finalAssessment.passingScore}% passing score, {data.finalAssessment.totalPoints} points).
                  </p>
                </div>
              )}

              {/* Curriculum & Modules Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Curriculum Outline ({data.modules?.length || 0} Modules)
                </h3>

                <div className="space-y-2.5">
                  {data.modules?.map((m: any, mIdx: number) => {
                    const isExpanded = !!expandedModules[m.id];
                    return (
                      <div 
                        key={m.id} 
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
                      >
                        <button
                          onClick={() => toggleModule(m.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {mIdx + 1}
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {m.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {m.lessons?.length || 0} lessons {m.completedCount ? `• ${m.completedCount} completed` : ""}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {isExpanded && m.lessons && m.lessons.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/40 dark:bg-slate-950/40">
                            {m.lessons.map((lesson: any, lIdx: number) => (
                              <div
                                key={lesson.id}
                                className="px-5 py-2.5 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  {lesson.type === LessonType.VIDEO ? (
                                    <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  ) : lesson.type === LessonType.CODING ? (
                                    <Code className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="text-slate-700 dark:text-slate-300 truncate">
                                    {lIdx + 1}. {lesson.title}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {lesson.durationMinutes || 15}m
                                </span>
                              </div>
                            ))}
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

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Close Overview
          </button>

          {isEnrolled ? (
            <button
              onClick={() => {
                onClose();
                onStartCourse(courseId);
              }}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{data?.enrollment?.progressPercentage > 0 ? "Resume Learning" : "Start Course"}</span>
            </button>
          ) : (
            <div 
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs flex items-center gap-2 select-none"
              title="Course access is assigned by your LMS Administrator"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Access Required (Managed by Administrator)</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
