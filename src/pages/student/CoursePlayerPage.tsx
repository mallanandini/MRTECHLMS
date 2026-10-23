/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CoursePlayer } from "../../components/CoursePlayer.js";
import { useAuth } from "../../context/AuthContext.js";

export function CoursePlayerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  useEffect(() => {
    if (!courseId || !authToken) return;

    const loadProgress = async () => {
      try {
        const res = await fetch(`/api/student/courses/${courseId}/progress`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (Array.isArray(data.progress) ? data.progress : []);
          setCompletedLessonIds(items.filter((p: any) => p.completed).map((p: any) => p.lessonId));
        }
      } catch (err) {
        console.error("Failed loading course progress:", err);
      }
    };

    loadProgress();
  }, [courseId, authToken]);

  const handleLessonComplete = (lessonId: string, completed: boolean) => {
    if (completed) {
      setCompletedLessonIds(prev => prev.includes(lessonId) ? prev : [...prev, lessonId]);
    }
  };

  if (!courseId || !authToken) return null;

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col">
      <CoursePlayer
        courseId={courseId}
        authToken={authToken}
        onBack={() => navigate("/student/courses")}
        onLessonCompleteChange={handleLessonComplete}
        completedLessons={completedLessonIds}
      />
    </div>
  );
}
