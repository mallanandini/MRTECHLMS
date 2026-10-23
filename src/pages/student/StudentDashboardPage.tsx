/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudentDashboard } from "../../components/StudentDashboard.js";
import { useAuth } from "../../context/AuthContext.js";
import { useToast } from "../../context/NotificationContext.js";
import { Course } from "../../types.js";
import { ThemeQuickControls } from "../../components/ThemeQuickControls.js";
import { NotificationBell } from "../../components/NotificationBell.js";

export function StudentDashboardPage() {
  const { currentUser, authToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const [myDashboardStats, setMyDashboardStats] = useState<any>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      // Load Catalog
      const catRes = await fetch("/api/courses");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalogCourses(catData);
      }

      // Load Stats
      const statsRes = await fetch("/api/student/dashboard", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setMyDashboardStats(stats);
        const enrolledIds = stats.assignedCourses?.map((c: any) => c.courseId) || stats.courseProgress?.map((c: any) => c.courseId) || [];
        setEnrolledCourseIds(enrolledIds);
      }
    } catch (e) {
      console.error("Failed loading student dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authToken]);

  if (!currentUser || !authToken) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-6 w-full max-w-[1600px] mx-auto min-w-0 font-sans pb-16">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/60 pb-5 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
            Welcome back, {currentUser.name}!
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1 truncate font-mono">
            Student Portal — Learning Schedule & Progress
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <ThemeQuickControls onOpenPreferences={() => navigate("/student/profile")} />
        </div>
      </div>

      <StudentDashboard
        currentUser={currentUser}
        authToken={authToken}
        myDashboardStats={myDashboardStats}
        catalogCourses={catalogCourses}
        enrolledCourseIds={enrolledCourseIds}
        onResumeCourse={(courseId) => navigate(`/student/course/${courseId}`)}
        onResumeLearningPath={(pathId) => navigate(`/student/learning-path/${pathId}`)}
        onStartAssessment={(assessmentId) => navigate(`/student/assessment/${assessmentId}`)}
        onEnrollCourse={() => toast.info("Self-enrollment is disabled. Course access is assigned by your LMS Administrator.")}
        onNavigate={(tab) => {
          if (tab === "courses") navigate("/student/courses");
          else if (tab === "learning-paths") navigate("/student/learning-paths");
          else if (tab === "practice") navigate("/student/coding-practice");
          else if (tab === "assessments") navigate("/student/assessments");
          else if (tab === "blogs") navigate("/student/blogs");
          else if (tab === "profile") navigate("/student/profile");
        }}
      />
    </div>
  );
}
