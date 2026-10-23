/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, Play, FileText, Code, Settings, Trash2, Edit2, 
  Users, Award, BarChart2, CheckCircle2, XCircle, Clock 
} from "lucide-react";
import { Course, Module, Lesson, LessonType } from "../types.js";
import { useToast, useConfirm } from "../context/NotificationContext.js";

interface TrainerConsoleProps {
  authToken: string;
}

export function TrainerConsole({ authToken }: TrainerConsoleProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Curriculum management states
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Form toggles
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);

  // New Course Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Web Development");
  const [newSkills, setNewSkills] = useState("");
  const [newReqs, setNewReqs] = useState("");

  // New Module Form State
  const [moduleTitle, setModuleTitle] = useState("");

  // New Lesson Form State
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.VIDEO);
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");

  const [courseSubTab, setCourseSubTab] = useState<"curriculum" | "students">("curriculum");
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

  const loadDashboard = async () => {
    try {
      const statsRes = await fetch("/api/trainer/dashboard", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setDashboardStats(stats);
        setCourses(stats.recentCourses || []);
      }
    } catch (e) {
      console.error("Error loading trainer console data", e);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [authToken]);

  const loadCourseStudents = async (courseId: string) => {
    try {
      const res = await fetch(`/api/trainer/courses/${courseId}/students`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEnrolledStudents(data || []);
      }
    } catch (e) {
      console.error("Error loading enrolled students", e);
    }
  };

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setCourseSubTab("curriculum");
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
        setLessons(data.lessons || []);
      }
      loadCourseStudents(course.id);
    } catch (e) {
      console.error("Error loading course hierarchy", e);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    const ok = await confirm({
      title: "Delete Chapter?",
      message: "Are you sure you want to delete this chapter and all its lessons? This action cannot be undone.",
      confirmText: "Delete Chapter",
      variant: "danger"
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/trainer/modules/${moduleId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok && selectedCourse) {
        toast.success("Chapter deleted successfully");
        handleSelectCourse(selectedCourse);
      } else {
        toast.error("Failed to delete chapter");
      }
    } catch (e: any) {
      console.error("Error deleting module", e);
      toast.error(e.message || "Error deleting chapter");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const ok = await confirm({
      title: "Delete Lesson?",
      message: "Are you sure you want to delete this lesson? This action cannot be undone.",
      confirmText: "Delete Lesson",
      variant: "danger"
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/trainer/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok && selectedCourse) {
        toast.success("Lesson deleted successfully");
        handleSelectCourse(selectedCourse);
      } else {
        toast.error("Failed to delete lesson");
      }
    } catch (e: any) {
      console.error("Error deleting lesson", e);
      toast.error(e.message || "Error deleting lesson");
    }
  };

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    try {
      const response = await fetch("/api/trainer/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          category: newCategory,
          skillsCovered: newSkills.split(",").map(s => s.trim()).filter(Boolean),
          requirements: newReqs.split(",").map(r => r.trim()).filter(Boolean)
        })
      });

      if (response.ok) {
        setNewTitle("");
        setNewDesc("");
        setNewSkills("");
        setNewReqs("");
        setIsCreatingCourse(false);
        loadDashboard();
      }
    } catch (err) {
      console.error("Error creating course", err);
    }
  };

  const handleCreateModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim() || !selectedCourse) return;

    try {
      const res = await fetch(`/api/trainer/courses/${selectedCourse.id}/modules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: moduleTitle,
          order: modules.length + 1
        })
      });

      if (res.ok) {
        setModuleTitle("");
        setIsCreatingModule(false);
        handleSelectCourse(selectedCourse); // Refresh course curriculum hierarchy
      }
    } catch (err) {
      console.error("Error creating module", err);
    }
  };

  const handleCreateLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !selectedModuleId || !selectedCourse) return;

    try {
      const res = await fetch(`/api/trainer/modules/${selectedModuleId}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: lessonTitle,
          type: lessonType,
          content: lessonContent,
          videoUrl: lessonVideoUrl || undefined,
          order: lessons.filter(l => l.moduleId === selectedModuleId).length + 1,
          durationMinutes: 10
        })
      });

      if (res.ok) {
        setLessonTitle("");
        setLessonContent("");
        setLessonVideoUrl("");
        setIsCreatingLesson(false);
        handleSelectCourse(selectedCourse); // Refresh curriculum hierarchy
      }
    } catch (err) {
      console.error("Error creating lesson", err);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const ok = await confirm({
      title: "Delete Course Entirely?",
      message: "Are you sure you want to delete this course entirely? All chapters, lessons, and student progress will be permanently removed.",
      confirmText: "Delete Course",
      variant: "danger"
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/trainer/courses/${courseId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        toast.success("Course deleted successfully");
        setSelectedCourse(null);
        loadDashboard();
      } else {
        toast.error("Failed to delete course");
      }
    } catch (err: any) {
      console.error("Error deleting course", err);
      toast.error(err.message || "Error deleting course");
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Stats Panel */}
      {dashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">My Active Courses</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-950 font-mono">{dashboardStats.coursesCount}</p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Total Enrolled Students</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-950 font-mono">{dashboardStats.studentsCount}</p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Created Assessments</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-950 font-mono">{dashboardStats.assessmentsCount}</p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">My Blog Posts</p>
            <p className="mt-2 text-3xl font-extrabold text-gray-950 font-mono">{dashboardStats.blogsCount}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Directory Selection panel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-md">My Course Catalogue</h3>
            <button
              onClick={() => setIsCreatingCourse(true)}
              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
              title="Create New Course"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {courses.length > 0 ? (
              courses.map((c) => {
                const isSel = selectedCourse?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCourse(c)}
                    className={`w-full text-left p-4 rounded-xl border transition flex flex-col gap-1.5 ${
                      isSel 
                        ? "bg-slate-900 border-slate-900 text-slate-100 shadow-sm" 
                        : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase font-mono tracking-wider opacity-60">{c.category}</p>
                    <h4 className="font-bold text-sm tracking-tight line-clamp-1">{c.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono mt-1 w-max ${
                      c.status === "published" 
                        ? "bg-emerald-500 text-white" 
                        : "bg-amber-500 text-white"
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No courses created yet.</p>
            )}
          </div>
        </div>

        {/* Course Curriculum & syllabus designer Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
          {selectedCourse ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{selectedCourse.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{selectedCourse.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteCourse(selectedCourse.id)}
                  className="p-2 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex border-b border-gray-100 gap-4">
                <button
                  onClick={() => setCourseSubTab("curriculum")}
                  className={`pb-2.5 text-xs font-bold font-mono uppercase tracking-wider transition border-b-2 ${
                    courseSubTab === "curriculum"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Curriculum Builder
                </button>
                <button
                  onClick={() => setCourseSubTab("students")}
                  className={`pb-2.5 text-xs font-bold font-mono uppercase tracking-wider transition border-b-2 ${
                    courseSubTab === "students"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Enrolled Students ({enrolledStudents.length})
                </button>
              </div>

              {courseSubTab === "curriculum" ? (
                /* Design structure */
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-600 font-mono uppercase">Course Curriculum Builder</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsCreatingModule(true)}
                        className="bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 border border-slate-200 rounded-lg flex items-center gap-1 shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Chapter
                      </button>
                      <button
                        onClick={() => {
                          if (modules.length === 0) {
                            toast.warning("Please create at least one Module/Chapter first.");
                            return;
                          }
                          setSelectedModuleId(modules[0].id);
                          setIsCreatingLesson(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Lesson
                      </button>
                    </div>
                  </div>

                  {/* Modules/Lessons structure preview */}
                  <div className="space-y-4 max-h-[350px] overflow-y-auto">
                    {modules.map((mod) => {
                      const moduleLessons = lessons.filter(l => l.moduleId === mod.id);
                      return (
                        <div key={mod.id} className="p-4 border border-gray-100 rounded-xl space-y-2 bg-slate-50/50">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">{mod.title}</h4>
                            <button
                              onClick={() => handleDeleteModule(mod.id)}
                              className="text-gray-400 hover:text-rose-500 transition p-1"
                              title="Delete Chapter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1.5 pl-3 border-l-2 border-slate-100">
                            {moduleLessons.map((les) => (
                              <div key={les.id} className="flex justify-between items-center text-xs py-1 hover:bg-white rounded px-2 transition">
                                <div className="flex items-center gap-2 text-gray-600 font-semibold">
                                  {les.type === LessonType.VIDEO ? (
                                    <Play className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                                  ) : les.type === LessonType.CODING ? (
                                    <Code className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                  )}
                                  <span>{les.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-gray-400 font-mono">{les.durationMinutes} mins</span>
                                  <button
                                    onClick={() => handleDeleteLesson(les.id)}
                                    className="text-gray-300 hover:text-rose-500 transition"
                                    title="Delete Lesson"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {moduleLessons.length === 0 && (
                              <p className="text-[10px] text-gray-400 italic">No lessons in this chapter yet.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {modules.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-6">Your course syllabus is empty. Create chapters and add curriculum lessons to publish!</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Enrolled Students list */
                <div className="space-y-4">
                  {enrolledStudents.length > 0 ? (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-gray-100 text-slate-500 font-mono uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Student</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Enrolled On</th>
                            <th className="p-3">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {enrolledStudents.map((s) => (
                            <tr key={s.studentId} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-800">{s.studentName}</td>
                              <td className="p-3 text-slate-500 font-mono text-[11px]">{s.studentEmail}</td>
                              <td className="p-3 text-slate-400 font-mono text-[10px]">{new Date(s.enrolledAt).toLocaleDateString()}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-blue-600 h-full rounded-full" 
                                      style={{ width: `${s.percentage}%` }} 
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] font-bold text-slate-600">{s.percentage}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-10">No students are currently enrolled in this course.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12 flex flex-col items-center justify-center h-full">
              <BarChart2 className="w-12 h-12 stroke-[1.5] text-gray-300 mb-3" />
              <p className="text-sm font-medium">Please select a course on the left directory to preview, edit, or append curriculum paths.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Create Course Form */}
      {isCreatingCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleCreateCourseSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-gray-900 text-md">Create New Course Curriculum</h3>
              <button 
                type="button" 
                onClick={() => setIsCreatingCourse(false)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition"
              >
                X
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Course Title:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Mastery in React 19..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Description:</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summarize course takeaways..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 bg-slate-50"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Career Advice">Career Advice</option>
                    <option value="General Engineering">General Engineering</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Skills Covered (comma-separated):</label>
                <input
                  type="text"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  placeholder="HTML, CSS, React, Rest API..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreatingCourse(false)}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-600 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                Create Draft Course
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Create Module Form */}
      {isCreatingModule && selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleCreateModuleSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider font-mono">Add Curriculum Chapter</h3>
              <button type="button" onClick={() => setIsCreatingModule(false)} className="text-gray-400 hover:text-gray-600">X</button>
            </div>
            <div className="p-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Chapter Title:</label>
              <input
                type="text"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g. Chapter 1: Introduction to Redux..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                required
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingModule(false)}
                className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg"
              >
                Save Chapter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Create Lesson Form */}
      {isCreatingLesson && selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleCreateLessonSubmit}
            className="bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden w-full max-w-md flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-gray-900 text-md">Add Lesson Node</h3>
              <button type="button" onClick={() => setIsCreatingLesson(false)} className="text-gray-400 hover:text-gray-600">X</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Target Chapter:</label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 bg-slate-50 font-semibold"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Lesson Title:</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Understanding ES6 Arrow Functions..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Format:</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 bg-slate-50"
                  >
                    <option value={LessonType.VIDEO}>Video Lesson</option>
                    <option value={LessonType.TEXT}>Text Syllabus</option>
                  </select>
                </div>
                {lessonType === LessonType.VIDEO && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Video MP4 Link:</label>
                    <input
                      type="url"
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      placeholder="e.g. https://domain.com/video.mp4"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Content Body (HTML/Markdown):</label>
                <textarea
                  rows={4}
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  placeholder="Write Markdown guidelines..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 mt-1.5 font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreatingLesson(false)}
                className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
              >
                Save Lesson
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
