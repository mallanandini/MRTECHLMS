/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Lock, Star, Search, Filter, Clock, User, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { Course } from "../../types.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { CourseOverviewModal } from "../../components/student/CourseOverviewModal.js";

export function CourseCatalogPage() {
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [overviewCourseId, setOverviewCourseId] = useState<string | null>(null);

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
            const enrolled = stats.assignedCourses?.map((c: any) => c.courseId) 
              || stats.courseProgress?.map((c: any) => c.courseId) || [];
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

  // Unique categories
  const categories = ["all", ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))];

  // Filtered courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
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
            <span>Academy Course Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Browse Curriculum, Inspect Detailed Syllabi & Study Assigned Tracks
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <ThemeQuickControls onOpenPreferences={() => navigate("/student/profile")} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses by title, keyword, or topic..."
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

      {/* Courses Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs font-mono text-slate-500">
          <span>SHOWING {filteredCourses.length} OF {courses.length} CURRICULA</span>
          <span className="text-emerald-600 font-bold">{enrolledCourseIds.length} ASSIGNED</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No courses match your query</p>
            <p className="text-xs text-slate-400">Try adjusting your keyword filter or select All Tracks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 min-w-0">
            {filteredCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.includes(course.id);
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
                      {isEnrolled && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/95 dark:bg-emerald-950/90 px-2.5 py-1 rounded-md absolute right-3 top-3 uppercase tracking-wider font-mono border border-emerald-200/40">
                          Assigned
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-2.5">
                      <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 text-base tracking-tight">
                        {course.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{(course as any).rating || 5.0}</span>
                          <span className="text-[10px] text-slate-400">({(course as any).reviewsCount || 0})</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {(course as any).estimatedDuration || "6 hours"}
                        </span>
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

                    {isEnrolled ? (
                      <button
                        onClick={() => navigate(`/student/course/${course.id}`)}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Study Course Track</span>
                      </button>
                    ) : (
                      <div 
                        className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed select-none" 
                        title="Course access is allocated exclusively by your LMS Administrator"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Access Required</span>
                      </div>
                    )}
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
