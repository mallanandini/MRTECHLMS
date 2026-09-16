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
          const list = await res.json();
          setCompletedLessonIds(list.filter((p: any) => p.completed).map((p: any) => p.lessonId));
        }
      } catch (err) {
        console.error("Failed loading course progress:", err);
      }
    };

    loadProgress();
  }, [courseId, authToken]);

  const handleLessonCompleteChange = async (lessonId: string, completed: boolean) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/student/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ completed })
      });
      if (res.ok) {
        if (completed) {
          setCompletedLessonIds(prev => [...prev, lessonId]);
        } else {
          setCompletedLessonIds(prev => prev.filter(id => id !== lessonId));
        }
      }
    } catch (e) {
      console.error("Progress save failed:", e);
    }
  };

  if (!courseId || !authToken) return null;

  return (
    <div className="flex-1 min-w-0">
      <CoursePlayer
        courseId={courseId}
        authToken={authToken}
        onBack={() => navigate("/student/courses")}
        onLessonCompleteChange={(lessonId) => {
          const isDone = completedLessonIds.includes(lessonId);
          handleLessonCompleteChange(lessonId, !isDone);
        }}
        completedLessons={completedLessonIds}
      />
    </div>
  );
}
