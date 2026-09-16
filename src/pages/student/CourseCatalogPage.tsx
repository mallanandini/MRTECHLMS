/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Lock, Star, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Course } from "../../types.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";

export function CourseCatalogPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const catRes = await fetch("/api/courses");
        if (catRes.ok) {
          const catData = await catRes.json();
          setCourses(catData);
        }

        if (authToken) {
          const statsRes = await fetch("/api/student/dashboard", {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (statsRes.ok) {
            const stats = await statsRes.json();
            const enrolled = stats.courseProgress?.map((c: any) => c.courseId) || [];
            setEnrolledCourseIds(enrolled);
          }
        }
      } catch (err) {
        console.error("Error loading course catalog:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authToken]);

  return (
    <div className="p-4 sm:p-6 lg:p-7 xl:p-8 space-y-6 lg:space-y-8 max-w-[1440px] w-full min-w-0 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Course Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Browse Academy Curriculum & Assigned Learning Tracks
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeQuickControls onOpenPreferences={() => navigate("/student/profile")} />
        </div>
      </div>

      {/* Courses Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
            All Learning Tracks ({courses.length})
          </span>
          <span className="text-xs font-semibold text-emerald-600 font-mono">
            {enrolledCourseIds.length} Assigned
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 min-w-0">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.includes(course.id);
            return (
              <div 
                key={course.id} 
                className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition duration-150 flex flex-col h-[400px]"
              >
                <div className="h-44 bg-slate-100 dark:bg-slate-700 relative">
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-md absolute left-4 top-4 uppercase tracking-wider font-mono border border-blue-200/40">
                    {course.category}
                  </span>
                  {isEnrolled && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md absolute right-4 top-4 uppercase tracking-wider font-mono border border-emerald-200/40">
                      Assigned
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1 text-md tracking-tight">
                      {course.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {course.description}
                    </p>
                    
                    <div className="flex items-center gap-1 text-amber-400 pt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{course.rating || 5.0}</span>
                      <span className="text-[10px] text-slate-400">({course.reviewsCount || 0} reviews)</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                    {isEnrolled ? (
                      <button
                        onClick={() => navigate(`/student/course/${course.id}`)}
                        className="w-full btn-theme-primary font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Study Course Tracks</span>
                      </button>
                    ) : (
                      <div 
                        className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed select-none" 
                        title="Course access is managed exclusively by your LMS Administrator"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Access Required</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
