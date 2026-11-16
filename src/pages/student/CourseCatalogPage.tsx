/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, CheckCircle2, Search, Clock, User, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Course } from "../../types.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { CourseOverviewModal } from "../../components/student/CourseOverviewModal.js";

export function CourseCatalogPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [overviewCourseId, setOverviewCourseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authToken) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch("/api/student/courses", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(Array.isArray(data) ? data : []);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error("Error loading assigned student courses:", err);
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authToken]);

  // Unique categories derived strictly from student's assigned courses
  const categories = ["all", ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))];

  // Filtered assigned courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>My Courses</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Your Assigned Curricula, Enrolled Tracks & Progress
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeQuickControls onOpenPreferences={() => navigate("/student/profile")} />
        </div>
      </div>

      {/* Filter and Search Bar (only show if student has assigned courses) */}
      {courses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search your assigned courses by title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat === "all" ? "All Tracks" : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Courses Grid or Empty State */}
      <div className="space-y-4">
        {courses.length > 0 && (
          <div className="flex justify-between items-center text-xs font-mono text-slate-500">
            <span>SHOWING {filteredCourses.length} OF {courses.length} ASSIGNED COURSES</span>
            <span className="text-emerald-600 font-bold">{courses.length} ACTIVE</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          /* Mandatory Clean Empty State when Student has NO assigned courses */
          <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Courses Assigned Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              You don't have any courses assigned to your account yet. Please contact your administrator for course access.
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          /* Empty state for search filter when student has assigned courses */
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 text-slate-400 space-y-2">
            <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No courses match your query</p>
            <p className="text-xs text-slate-400">Try adjusting your keyword filter or select All Tracks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 min-w-0">
            {filteredCourses.map((course: any) => {
              const pct = course.progressPercentage !== undefined ? course.progressPercentage : course.percentage || 0;
              const isFinished = pct >= 100 || course.status === "completed";

              return (
                <div 
                  key={course.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition duration-150 flex flex-col justify-between group"
                >
                  <div>
                    {/* Thumbnail banner */}
                    <div className="h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-white/95 dark:bg-slate-950/90 px-2.5 py-1 rounded-md absolute left-3 top-3 uppercase tracking-wider font-mono border border-slate-200/60 dark:border-slate-800">
                        {course.category}
                      </span>
                      
                      {/* Status Badges */}
                      {isFinished ? (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/95 dark:bg-emerald-950/90 px-2.5 py-1 rounded-md absolute right-3 top-3 uppercase tracking-wider font-mono border border-emerald-200/40">
                          Completed
                        </span>
                      ) : course.isOverdue ? (
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50/95 dark:bg-rose-950/90 px-2.5 py-1 rounded-md absolute right-3 top-3 uppercase tracking-wider font-mono border border-rose-200/40">
                          Overdue
                        </span>
                      ) : course.isDueSoon ? (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50/95 dark:bg-amber-950/90 px-2.5 py-1 rounded-md absolute right-3 top-3 uppercase tracking-wider font-mono border border-amber-200/40">
                          Due Soon
                        </span>
                      ) : pct > 0 ? (
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/95 dark:bg-blue-950/90 px-2.5 py-1 rounded-md absolute right-3 top-3 uppercase tracking-wider font-mono border border-blue-200/40">
                          In Progress
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/95 dark:bg-indigo-950/90 px-2.5 py-1 rounded-md absolute right-3 top-3 uppercase tracking-wider font-mono border border-indigo-200/40">
                          Assigned
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-3">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 text-base tracking-tight">
                          {course.title}
                        </h4>
                        
                        {/* Batch membership badges if assigned via batch */}
                        {course.batchNames && course.batchNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {course.batchNames.map((bn: string, idx: number) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0"
                              >
                                <GraduationCap className="w-2.5 h-2.5" />
                                <span>Batch: {bn}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1.5">
                          {course.description}
                        </p>
                      </div>

                      {/* Course Metadata */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-mono text-slate-400">
                            {course.estimatedDuration || "4 hours"}
                          </span>
                        </div>
                        {course.difficulty && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {course.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Progress Meter */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                          <span>
                            {course.totalCount !== undefined 
                              ? `${course.completedCount || 0} / ${course.totalCount} LESSONS` 
                              : "PROGRESS"}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFinished ? "bg-emerald-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-2">
                    <button
                      onClick={() => setOverviewCourseId(course.id)}
                      className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      View Syllabus & Overview
                    </button>

                    <button
                      onClick={() => navigate(`/student/course/${course.id}`)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      {isFinished ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Review Course Track</span>
                        </>
                      ) : pct > 0 ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Continue Learning</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Study Course Track</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Course Overview Modal */}
      {overviewCourseId && (
        <CourseOverviewModal
          courseId={overviewCourseId}
          authToken={authToken || ""}
          isOpen={!!overviewCourseId}
          onClose={() => setOverviewCourseId(null)}
          onStartCourse={(cId) => navigate(`/student/course/${cId}`)}
        />
      )}
    </div>
  );
}
