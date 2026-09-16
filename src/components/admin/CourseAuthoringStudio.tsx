/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, Layers, Video, FileText, Award, Users, CheckCircle2, 
  AlertCircle, Trash2, Plus, Edit3, Save, Upload, Eye, ArrowLeft, 
  ExternalLink, Clock, HelpCircle, X, ChevronDown, ChevronRight, 
  MoveUp, MoveDown, File, Play, Sparkles, Check, CheckSquare, 
  Square, CircleDot, Circle, RefreshCw, Download, FileSpreadsheet
} from "lucide-react";
import { Course, Module, Lesson, LessonType, Assessment, Question, QuestionType, User, UserRole } from "../../types.js";

interface CourseAuthoringStudioProps {
  courseId: string | null; // null or "new" for brand new course
  authToken: string;
  onBack: () => void;
  onCourseSaved?: (course: Course) => void;
}

export function CourseAuthoringStudio({ 
  courseId: initialCourseId, 
  authToken, 
  onBack, 
  onCourseSaved 
}: CourseAuthoringStudioProps) {
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    initialCourseId && initialCourseId !== "new" ? initialCourseId : null
  );

  const [activeTab, setActiveTab] = useState<"info" | "curriculum" | "assessments" | "publish" | "access">("info");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Course Information Form
  const [courseTitle, setCourseTitle] = useState("");
  const [courseShortDesc, setCourseShortDesc] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseCategory, setCourseCategory] = useState("Web Development");
  const [courseDifficulty, setCourseDifficulty] = useState("Beginner");
  const [courseThumbnail, setCourseThumbnail] = useState("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80");
  const [courseBanner, setCourseBanner] = useState("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80");
  const [courseStatus, setCourseStatus] = useState<"draft" | "published" | "archived">("draft");
  const [courseRequirements, setCourseRequirements] = useState<string[]>(["Basic Computer Literacy"]);
  const [reqInput, setReqInput] = useState("");
  const [courseSkills, setCourseSkills] = useState<string[]>(["Web Development"]);
  const [skillInput, setSkillInput] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Curriculum Data
  const [modules, setModules] = useState<Module[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [finalAssessment, setFinalAssessment] = useState<Assessment | null>(null);
  const [enrolledStudentsCount, setEnrolledStudentsCount] = useState<number>(0);

  // Module Modal State
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [targetModuleIdForLesson, setTargetModuleIdForLesson] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.VIDEO);
  const [lessonDuration, setLessonDuration] = useState<number>(15);
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonMaterialTitle, setLessonMaterialTitle] = useState("");
  const [lessonMaterialUrl, setLessonMaterialUrl] = useState("");
  const [lessonActiveTab, setLessonActiveTab] = useState<"video" | "text" | "pdf">("video");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Assessment & Questions Builder State
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MCQ_SINGLE);
  const [questionOptions, setQuestionOptions] = useState<string[]>(["Option A", "Option B", "Option C", "Option D"]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(["Option A"]);
  const [questionPoints, setQuestionPoints] = useState<number>(10);
  const [questionNegativePoints, setQuestionNegativePoints] = useState<number>(0);
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionDifficulty, setQuestionDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Student Access State
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Course Details if editing
  const loadCourse = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to load course details");
      const data = await res.json();

      const c: Course = data.course;
      setCourseTitle(c.title || "");
      setCourseShortDesc(c.shortDescription || "");
      setCourseDescription(c.description || "");
      setCourseCategory(c.category || "General");
      setCourseDifficulty(c.difficulty || "Beginner");
      setCourseThumbnail(c.thumbnail || "");
      setCourseBanner(c.banner || "");
      setCourseStatus((c.status as any) || "draft");
      setCourseRequirements(c.requirements || []);
      setCourseSkills(c.skillsCovered || []);
      setIsFeatured(!!c.isFeatured);

      setModules(data.modules || []);
      setAssessments(data.assessments || []);
      setFinalAssessment(data.finalAssessment || null);
      setEnrolledStudentsCount(data.enrolledStudentsCount || 0);

      if (data.assessments && data.assessments.length > 0 && !selectedAssessmentId) {
        setSelectedAssessmentId(data.assessments[0].id);
      }
    } catch (err: any) {
      showToast(err.message || "Error loading course", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load students for access tab
  const loadStudents = async () => {
    if (!currentCourseId) return;
    setAccessLoading(true);
    try {
      const usersRes = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!usersRes.ok) throw new Error("Failed to load users");
      const allUsers: User[] = await usersRes.json();
      const studentUsers = allUsers.filter(u => u.role === UserRole.STUDENT);

      // Now query student enrollment status
      const studentList = await Promise.all(
        studentUsers.map(async (st) => {
          try {
            const accRes = await fetch(`/api/admin/users/${st.id}/enrollments`, {
              headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (accRes.ok) {
              const enrs: any[] = await accRes.json();
              const isAssigned = enrs.some(e => e.courseId === currentCourseId);
              const enr = enrs.find(e => e.courseId === currentCourseId);
              return {
                ...st,
                isAssigned,
                assignedDate: enr?.enrolledAt || null
              };
            }
          } catch {
            // fallback
          }
          return { ...st, isAssigned: false, assignedDate: null };
        })
      );

      setStudents(studentList);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAccessLoading(false);
    }
  };

  useEffect(() => {
    if (currentCourseId) {
      loadCourse(currentCourseId);
    }
  }, [currentCourseId]);

  useEffect(() => {
    if (activeTab === "access" && currentCourseId) {
      loadStudents();
    }
  }, [activeTab, currentCourseId]);

  // Handle Save Course Info (creates if new, updates if exists)
  const handleSaveCourseInfo = async () => {
    if (!courseTitle.trim()) {
      showToast("Please enter a course title", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: courseTitle.trim(),
        shortDescription: courseShortDesc.trim(),
        description: courseDescription.trim(),
        category: courseCategory.trim(),
        difficulty: courseDifficulty,
        thumbnail: courseThumbnail.trim(),
        banner: courseBanner.trim(),
        status: courseStatus,
        requirements: courseRequirements,
        skillsCovered: courseSkills,
        isFeatured
      };

      if (!currentCourseId) {
        // Create new course
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create course");
        }
        const created: Course = await res.json();
        setCurrentCourseId(created.id);
        showToast("Course created successfully as Draft! Now build your curriculum.", "success");
        if (onCourseSaved) onCourseSaved(created);
        setActiveTab("curriculum");
      } else {
        // Update existing
        const res = await fetch(`/api/admin/courses/${currentCourseId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update course");
        }
        const updated: Course = await res.json();
        showToast("Course settings updated successfully", "success");
        if (onCourseSaved) onCourseSaved(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Error saving course", "error");
    } finally {
      setSaving(false);
    }
  };

  // Upload Physical Asset
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, target: "thumbnail" | "video" | "material") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingFile(true);
    try {
      const res = await fetch(`/api/upload?folder=${target}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "File upload failed");
      }

      const data = await res.json();
      if (target === "thumbnail") {
        setCourseThumbnail(data.url);
        showToast(`Thumbnail uploaded: ${data.filename}`);
      } else if (target === "video") {
        setLessonVideoUrl(data.url);
        showToast(`Video uploaded: ${data.filename}`);
      } else if (target === "material") {
        setLessonMaterialUrl(data.url);
        if (!lessonMaterialTitle) {
          setLessonMaterialTitle(file.name);
        }
        showToast(`Study material uploaded: ${data.filename}`);
      }
    } catch (err: any) {
      showToast(err.message || "Upload error", "error");
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  // MODULE OPERATIONS
  const handleOpenAddModule = () => {
    setEditingModuleId(null);
    setModuleTitle("");
    setModuleDescription("");
    setShowModuleModal(true);
  };

  const handleOpenEditModule = (mod: Module) => {
    setEditingModuleId(mod.id);
    setModuleTitle(mod.title);
    setModuleDescription(mod.description || "");
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    if (!moduleTitle.trim()) {
      showToast("Module title is required", "error");
      return;
    }
    if (!currentCourseId) return;

    try {
      if (editingModuleId) {
        const res = await fetch(`/api/admin/modules/${editingModuleId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: moduleTitle.trim(),
            description: moduleDescription.trim()
          })
        });
        if (!res.ok) throw new Error("Failed to update module");
        showToast("Module updated successfully");
      } else {
        const res = await fetch(`/api/admin/courses/${currentCourseId}/modules`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: moduleTitle.trim(),
            description: moduleDescription.trim()
          })
        });
        if (!res.ok) throw new Error("Failed to create module");
        showToast("Module added to curriculum");
      }
      setShowModuleModal(false);
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error saving module", "error");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this module and all its lessons? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to delete module");
      showToast("Module deleted successfully");
      if (currentCourseId) loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error deleting module", "error");
    }
  };

  // LESSON OPERATIONS
  const handleOpenAddLesson = (moduleId: string) => {
    setTargetModuleIdForLesson(moduleId);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonDescription("");
    setLessonType(LessonType.VIDEO);
    setLessonDuration(15);
    setLessonVideoUrl("");
    setLessonContent("");
    setLessonMaterialTitle("");
    setLessonMaterialUrl("");
    setLessonActiveTab("video");
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    setTargetModuleIdForLesson(lesson.moduleId);
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || "");
    setLessonType(lesson.type);
    setLessonDuration(lesson.durationMinutes || 15);
    setLessonVideoUrl(lesson.videoUrl || "");
    setLessonContent(lesson.content || "");
    setLessonMaterialTitle(lesson.materialTitle || "");
    setLessonMaterialUrl(lesson.materialUrl || lesson.fileUrl || "");
    setLessonActiveTab(lesson.videoUrl ? "video" : lesson.content ? "text" : "pdf");
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) {
      showToast("Lesson title is required", "error");
      return;
    }
    if (!targetModuleIdForLesson || !currentCourseId) return;

    try {
      const payload = {
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        type: lessonType,
        durationMinutes: Number(lessonDuration) || 15,
        videoUrl: lessonVideoUrl.trim(),
        content: lessonContent,
        materialTitle: lessonMaterialTitle.trim(),
        materialUrl: lessonMaterialUrl.trim()
      };

      if (editingLessonId) {
        const res = await fetch(`/api/admin/lessons/${editingLessonId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update lesson");
        showToast("Lesson updated successfully");
      } else {
        const res = await fetch(`/api/admin/modules/${targetModuleIdForLesson}/lessons`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create lesson");
        showToast("Lesson created and added to module");
      }
      setShowLessonModal(false);
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error saving lesson", "error");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm("Are you sure you want to delete this lesson and its practice test?")) return;
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to delete lesson");
      showToast("Lesson deleted successfully");
      if (currentCourseId) loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error deleting lesson", "error");
    }
  };

  // PRACTICE TEST OPERATIONS
  const handleOpenPracticeTestForLesson = async (lesson: Lesson) => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}/practice-test`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      let testAss: Assessment | null = null;
      if (res.ok) {
        const data = await res.json();
        testAss = data.assessment;
      }

      if (!testAss) {
        // Create practice test automatically
        const createRes = await fetch(`/api/admin/lessons/${lesson.id}/practice-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: `${lesson.title} - Practice Test`,
            description: `Test your understanding of the concepts learned in ${lesson.title}`,
            durationMinutes: 15,
            passingScore: 70
          })
        });
        if (createRes.ok) {
          testAss = await createRes.json();
        }
      }

      await loadCourse(currentCourseId);
      if (testAss) {
        setSelectedAssessmentId(testAss.id);
        setShowLessonModal(false);
        setActiveTab("assessments");
      }
    } catch (err: any) {
      showToast(err.message || "Error configuring practice test", "error");
    }
  };

  // COURSE FINAL ASSESSMENT
  const handleCreateOrOpenFinalAssessment = async () => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/admin/courses/${currentCourseId}/final-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: `${courseTitle} - Final Certification Exam`,
          description: `Comprehensive final certification assessment evaluating your knowledge across all modules.`,
          durationMinutes: 45,
          passingScore: 70
        })
      });
      if (!res.ok) throw new Error("Failed to create final assessment");
      const ass = await res.json();
      await loadCourse(currentCourseId);
      setSelectedAssessmentId(ass.id);
      setActiveTab("assessments");
      showToast("Course Final Assessment created/opened");
    } catch (err: any) {
      showToast(err.message || "Error creating final assessment", "error");
    }
  };

  // QUESTIONS OPERATIONS
  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId);

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType(QuestionType.MCQ_SINGLE);
    setQuestionOptions(["Option A", "Option B", "Option C", "Option D"]);
    setCorrectAnswers(["Option A"]);
    setQuestionPoints(10);
    setQuestionNegativePoints(0);
    setQuestionExplanation("");
    setQuestionDifficulty("medium");
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.questionText);
    setQuestionType(q.type || QuestionType.MCQ_SINGLE);
    setQuestionOptions(q.options && q.options.length > 0 ? q.options : ["Option A", "Option B"]);
    setCorrectAnswers(q.correctAnswers || []);
    setQuestionPoints(q.points || 10);
    setQuestionNegativePoints(q.negativePoints || 0);
    setQuestionExplanation(q.explanation || "");
    setQuestionDifficulty(q.difficulty || "medium");
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      showToast("Question text is required", "error");
      return;
    }
    const cleanOptions = questionOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      showToast("Provide at least 2 valid answer options", "error");
      return;
    }
    if (correctAnswers.length === 0) {
      showToast("Select at least 1 correct answer option", "error");
      return;
    }
    if (!selectedAssessmentId || !currentCourseId) return;

    try {
      const payload = {
        questionText: questionText.trim(),
        type: questionType,
        options: cleanOptions,
        correctAnswers,
        points: Number(questionPoints) || 10,
        negativePoints: Number(questionNegativePoints) || 0,
        explanation: questionExplanation.trim(),
        difficulty: questionDifficulty
      };

      if (editingQuestionId) {
        const res = await fetch(`/api/admin/questions/${editingQuestionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update question");
        showToast("Question updated");
      } else {
        const res = await fetch(`/api/admin/assessments/${selectedAssessmentId}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to add question");
        showToast("Question added to assessment");
      }

      setShowQuestionModal(false);
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error saving question", "error");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to delete question");
      showToast("Question deleted");
      if (currentCourseId) loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error deleting question", "error");
    }
  };

  // STUDENT ACCESS ASSIGNMENT
  const handleToggleStudentAccess = async (studentId: string, currentAssigned: boolean) => {
    if (!currentCourseId) return;
    try {
      if (currentAssigned) {
        const res = await fetch(`/api/admin/users/${studentId}/enrollments/${currentCourseId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error("Failed to revoke access");
        showToast("Student access revoked");
      } else {
        const res = await fetch(`/api/admin/users/${studentId}/enrollments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify({ courseId: currentCourseId })
        });
        if (!res.ok) throw new Error("Failed to grant access");
        showToast("Course access granted to student");
      }
      loadStudents();
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Access error", "error");
    }
  };

  // PUBLISH / DRAFT TOGGLE
  const handleUpdateCourseStatus = async (newStatus: "draft" | "published" | "archived") => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/admin/courses/${currentCourseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      setCourseStatus(newStatus);
      showToast(`Course is now ${newStatus.toUpperCase()}`);
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Status error", "error");
    }
  };

  // Compute Total Stats
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const totalQuestions = assessments.reduce((acc, a) => acc + (a.questions?.length || 0), 0);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top duration-200 ${
          toastMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Authoring Header */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 py-4 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Return to courses list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  {courseTitle ? courseTitle : "New Course Authoring Studio"}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                  courseStatus === "published"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : courseStatus === "draft"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}>
                  {courseStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Admin Course Authoring & Learning Path Builder
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {currentCourseId && (
              <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  {modules.length} Modules
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  {totalLessons} Lessons
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  {assessments.length} Tests ({totalQuestions} Qs)
                </span>
              </div>
            )}

            {currentCourseId && (
              <button
                onClick={() => handleUpdateCourseStatus(courseStatus === "published" ? "draft" : "published")}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                  courseStatus === "published"
                    ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                    : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{courseStatus === "published" ? "Unpublish to Draft" : "Publish Course"}</span>
              </button>
            )}

            <button
              onClick={handleSaveCourseInfo}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : currentCourseId ? "Save Changes" : "Create Course"}</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="max-w-[1440px] mx-auto mt-4 flex items-center gap-1 border-t border-slate-100 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              activeTab === "info"
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "bg-transparent border-transparent text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>1. Course Information</span>
          </button>

          <button
            onClick={() => {
              if (!currentCourseId) {
                showToast("Please save course information first", "error");
                return;
              }
              setActiveTab("curriculum");
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              activeTab === "curriculum"
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "bg-transparent border-transparent text-slate-600 hover:bg-slate-100"
            } ${!currentCourseId ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Curriculum & Content Builder</span>
            {modules.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-500/20 text-blue-600 rounded-md text-[10px]">
                {modules.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!currentCourseId) {
                showToast("Please save course information first", "error");
                return;
              }
              setActiveTab("assessments");
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              activeTab === "assessments"
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "bg-transparent border-transparent text-slate-600 hover:bg-slate-100"
            } ${!currentCourseId ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>3. Practice Tests & Exam Studio</span>
            {assessments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 rounded-md text-[10px]">
                {assessments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!currentCourseId) {
                showToast("Please save course information first", "error");
                return;
              }
              setActiveTab("publish");
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              activeTab === "publish"
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "bg-transparent border-transparent text-slate-600 hover:bg-slate-100"
            } ${!currentCourseId ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>4. Review & Publish</span>
          </button>

          <button
            onClick={() => {
              if (!currentCourseId) {
                showToast("Please save course information first", "error");
                return;
              }
              setActiveTab("access");
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-2 cursor-pointer ${
              activeTab === "access"
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "bg-transparent border-transparent text-slate-600 hover:bg-slate-100"
            } ${!currentCourseId ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>5. Student Access Allocation</span>
            {enrolledStudentsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-purple-500/20 text-purple-600 rounded-md text-[10px]">
                {enrolledStudentsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="max-w-[1440px] mx-auto px-6 pt-6">

        {/* ======================================================== */}
        {/* TAB 1: COURSE INFORMATION                                 */}
        {/* ======================================================== */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="lg:col-span-2 space-y-6">
              {/* Core Details Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>General Course Details</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Master Full-Stack Web Development with React & Node.js"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Short Summary (Shown in Course Catalog Cards)
                  </label>
                  <input
                    type="text"
                    value={courseShortDesc}
                    onChange={(e) => setCourseShortDesc(e.target.value)}
                    placeholder="Brief 1-line elevator pitch for this course..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Description (Markdown or Rich Text)
                  </label>
                  <textarea
                    rows={6}
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Detailed explanation of what students will master in this course, methodologies, projects..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
                    <input
                      type="text"
                      value={courseCategory}
                      onChange={(e) => setCourseCategory(e.target.value)}
                      placeholder="e.g. Web Development, Cloud, AI"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Difficulty Level</label>
                    <select
                      value={courseDifficulty}
                      onChange={(e) => setCourseDifficulty(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition cursor-pointer"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="All Levels">All Levels</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Requirements & Skills Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Requirements & Learning Outcomes</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Course Prerequisites</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={reqInput}
                      onChange={(e) => setReqInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && reqInput.trim()) {
                          e.preventDefault();
                          setCourseRequirements([...courseRequirements, reqInput.trim()]);
                          setReqInput("");
                        }
                      }}
                      placeholder="Add prerequisite and press Enter or click Add"
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (reqInput.trim()) {
                          setCourseRequirements([...courseRequirements, reqInput.trim()]);
                          setReqInput("");
                        }
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courseRequirements.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
                        <span>• {r}</span>
                        <button
                          type="button"
                          onClick={() => setCourseRequirements(courseRequirements.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-500 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Skills Covered (Tags)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && skillInput.trim()) {
                          e.preventDefault();
                          setCourseSkills([...courseSkills, skillInput.trim()]);
                          setSkillInput("");
                        }
                      }}
                      placeholder="e.g. React, TypeScript, GraphQL..."
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (skillInput.trim()) {
                          setCourseSkills([...courseSkills, skillInput.trim()]);
                          setSkillInput("");
                        }
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courseSkills.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                        <span>#{s}</span>
                        <button
                          type="button"
                          onClick={() => setCourseSkills(courseSkills.filter((_, idx) => idx !== i))}
                          className="text-blue-400 hover:text-rose-500 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar: Thumbnail & Publishing Settings */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Course Thumbnail</span>
                </h3>

                <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative">
                  {courseThumbnail ? (
                    <img src={courseThumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <File className="w-8 h-8 mb-1" />
                      <span className="text-xs">No thumbnail specified</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Upload New Image File (Saved to physical storage)
                  </label>
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span>{uploadingFile ? "Uploading..." : "Choose Image File (JPG/PNG)"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadFile(e, "thumbnail")}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Or Enter Image URL
                  </label>
                  <input
                    type="text"
                    value={courseThumbnail}
                    onChange={(e) => setCourseThumbnail(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Status & Visibility Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Course Status & Controls</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lifecycle Status</label>
                  <select
                    value={courseStatus}
                    onChange={(e) => setCourseStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="draft">DRAFT (Hidden from Students)</option>
                    <option value="published">PUBLISHED (Active & Accessible)</option>
                    <option value="archived">ARCHIVED (Inactive)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Students will only see this course when set to <strong>Published</strong> and assigned.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Feature on Student Home Page</span>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveCourseInfo}
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving Changes..." : "Save Course Information"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CURRICULUM & CONTENT BUILDER                      */}
        {/* ======================================================== */}
        {activeTab === "curriculum" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Curriculum Structure</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Organize your course into Modules, Lessons, Video lectures, Study Materials, and Practice Tests.
                </p>
              </div>

              <button
                onClick={handleOpenAddModule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Module</span>
              </button>
            </div>

            {modules.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">No Modules Added Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Start by creating your first module, such as "Module 1: Getting Started" or "Module 1: Fundamentals".
                  </p>
                </div>
                <button
                  onClick={handleOpenAddModule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Module</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((mod, modIdx) => (
                  <div key={mod.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Module Header */}
                    <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0">
                          {modIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{mod.title}</h4>
                          {mod.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenAddLesson(mod.id)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Lesson</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModule(mod)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                          title="Edit Module"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Module"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Lessons inside Module */}
                    <div className="p-4 space-y-2">
                      {(!mod.lessons || mod.lessons.length === 0) ? (
                        <p className="text-xs text-slate-400 italic py-3 text-center">
                          No lessons in this module. Click "+ Add Lesson" above to add video sessions, reading material, or PDFs.
                        </p>
                      ) : (
                        mod.lessons.map((les, lesIdx) => (
                          <div
                            key={les.id}
                            className="p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono font-bold text-slate-400 w-5 shrink-0">
                                {modIdx + 1}.{lesIdx + 1}
                              </span>
                              <div className={`p-2 rounded-lg shrink-0 ${
                                les.type === LessonType.VIDEO ? "bg-purple-50 text-purple-600" :
                                les.type === LessonType.TEXT ? "bg-blue-50 text-blue-600" :
                                les.type === LessonType.PDF ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                              }`}>
                                {les.type === LessonType.VIDEO ? <Video className="w-4 h-4" /> :
                                 les.type === LessonType.PDF ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{les.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {les.durationMinutes} mins
                                  </span>
                                  {les.videoUrl && (
                                    <span className="text-purple-600 font-semibold flex items-center gap-0.5">
                                      • Video Attached
                                    </span>
                                  )}
                                  {(les.materialUrl || les.fileUrl) && (
                                    <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                      • Study Material PDF
                                    </span>
                                  )}
                                  {les.practiceTest && (
                                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                      Practice Test ({les.practiceTest.questionsCount || 0} Qs)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <button
                                onClick={() => handleOpenPracticeTestForLesson(les)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                                  les.practiceTest
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                                title="Configure Practice Test for this lesson"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>{les.practiceTest ? "Edit Practice Test" : "+ Practice Test"}</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditLesson(les)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                title="Edit Lesson Content"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(les.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRACTICE TESTS & EXAM STUDIO                      */}
        {/* ======================================================== */}
        {activeTab === "assessments" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-200">
            {/* Left Assessment Selector Column */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Assessments List
                  </h4>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                    {assessments.length}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
                  {assessments.map((ass) => (
                    <button
                      key={ass.id}
                      onClick={() => setSelectedAssessmentId(ass.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${
                        selectedAssessmentId === ass.id
                          ? "bg-blue-50 border-blue-200 text-blue-900 font-bold shadow-xs"
                          : "bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                          ass.type === "course_final" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {ass.type === "course_final" ? "Final Exam" : "Practice Test"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ass.questions?.length || 0} Qs
                        </span>
                      </div>
                      <p className="truncate font-semibold">{ass.title}</p>
                    </button>
                  ))}

                  {assessments.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      No assessments created yet.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCreateOrOpenFinalAssessment}
                  className="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>+ Course Final Assessment</span>
                </button>
              </div>
            </div>

            {/* Right Question Studio Column */}
            <div className="lg:col-span-3 space-y-6">
              {activeAssessment ? (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                  {/* Active Assessment Info Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          activeAssessment.type === "course_final" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {activeAssessment.type === "course_final" ? "Course Final Exam" : "Lesson Practice Test"}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{activeAssessment.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{activeAssessment.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
                        <span>Duration: <strong>{activeAssessment.durationMinutes}m</strong></span>
                        <span>Passing: <strong>{activeAssessment.passingScore}%</strong></span>
                        <span>Total Points: <strong>{activeAssessment.totalPoints} pts</strong></span>
                        <span>Questions: <strong>{activeAssessment.questions?.length || 0}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={handleOpenAddQuestion}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add MCQ Question</span>
                    </button>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {(!activeAssessment.questions || activeAssessment.questions.length === 0) ? (
                      <div className="py-12 text-center text-slate-400 space-y-3">
                        <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No questions in this assessment yet.</p>
                        <button
                          onClick={handleOpenAddQuestion}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          + Add First Question
                        </button>
                      </div>
                    ) : (
                      activeAssessment.questions.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-slate-200 text-slate-700 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0">
                                {qIdx + 1}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 leading-relaxed">
                                  {q.questionText}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                                    {q.points} Points
                                  </span>
                                  {q.negativePoints ? (
                                    <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
                                      -{q.negativePoints} Negative
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                                    {q.difficulty || "medium"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleOpenEditQuestion(q)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                title="Edit Question"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Options Display */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {q.options?.map((opt, optIdx) => {
                              const isCorrect = q.correctAnswers?.includes(opt);
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                                    isCorrect 
                                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold" 
                                      : "bg-white border-slate-200/60 text-slate-700"
                                  }`}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                  )}
                                  <span className="truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100">
                              <span className="font-semibold text-slate-700">Explanation: </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center text-slate-400">
                  Select an assessment from the left panel to manage questions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: REVIEW & PUBLISH                                  */}
        {/* ======================================================== */}
        {activeTab === "publish" && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Review & Publish Course</h3>
              <p className="text-xs text-slate-500 mt-1">
                Confirm your course curriculum is complete before making it available to enrolled students.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Course Title:</span>
                <strong className="text-slate-900">{courseTitle}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Modules Created:</span>
                <strong className="text-slate-900">{modules.length} Modules</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Lessons Created:</span>
                <strong className="text-slate-900">{totalLessons} Lessons</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Practice Tests & Final Exam:</span>
                <strong className="text-slate-900">{assessments.length} Tests ({totalQuestions} Questions)</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Current Status:</span>
                <span className={`font-mono font-bold uppercase ${
                  courseStatus === "published" ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {courseStatus}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleUpdateCourseStatus("published")}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Course (Active Catalog)</span>
              </button>

              <button
                onClick={() => handleUpdateCourseStatus("draft")}
                className="w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Keep as Draft (Hidden from students)</span>
              </button>

              <button
                onClick={() => setActiveTab("access")}
                className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Proceed to Student Access Allocation →</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: STUDENT ACCESS ALLOCATION                         */}
        {/* ======================================================== */}
        {activeTab === "access" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Student Access Allocation</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Grant or revoke student access directly to <strong>{courseTitle}</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students by name or email..."
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:outline-none focus:bg-white transition"
                />
                <button
                  onClick={loadStudents}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {accessLoading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-xs font-medium">Loading students...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono bg-slate-50/50">
                      <th className="py-3 px-6">Student Information</th>
                      <th className="py-3 px-4">Account Status</th>
                      <th className="py-3 px-4">Course Access</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {students
                      .filter(s => 
                        !studentSearch || 
                        s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
                        s.email?.toLowerCase().includes(studentSearch.toLowerCase())
                      )
                      .map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-slate-900">{st.name}</p>
                              <p className="text-slate-400 font-mono text-[11px] mt-0.5">{st.email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              st.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                              {st.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              st.isAssigned
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {st.isAssigned ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Assigned ({new Date(st.assignedDate || Date.now()).toLocaleDateString()})</span>
                                </>
                              ) : (
                                <span>Not Assigned</span>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleToggleStudentAccess(st.id, st.isAssigned)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                                st.isAssigned
                                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              }`}
                            >
                              {st.isAssigned ? "Revoke Access" : "Grant Access"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT MODULE                                  */}
      {/* ======================================================== */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingModuleId ? "Edit Module" : "Add New Module"}
              </h3>
              <button
                onClick={() => setShowModuleModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Module Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                placeholder="e.g. Module 1: Introduction to Fundamentals"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Brief summary of what this module covers..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModuleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
              >
                {editingModuleId ? "Update Module" : "Create Module"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT LESSON                                  */}
      {/* ======================================================== */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingLessonId ? "Edit Lesson Content" : "Create New Lesson"}
              </h3>
              <button
                onClick={() => setShowLessonModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lesson Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. 1.1 Understanding Component Architecture"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lesson Overview / Summary
              </label>
              <textarea
                rows={2}
                value={lessonDescription}
                onChange={(e) => setLessonDescription(e.target.value)}
                placeholder="Short summary of this specific lesson..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>

            {/* Content Tabs (Video Session / Text Material / PDF Study Material) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLessonActiveTab("video")}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
                    lessonActiveTab === "video"
                      ? "bg-white text-purple-700 border-b-2 border-purple-600 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>1. Video Session</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLessonActiveTab("text")}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
                    lessonActiveTab === "text"
                      ? "bg-white text-blue-700 border-b-2 border-blue-600 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Reading Material</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLessonActiveTab("pdf")}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
                    lessonActiveTab === "pdf"
                      ? "bg-white text-amber-700 border-b-2 border-amber-600 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>3. Study Material / PDF</span>
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* VIDEO TAB */}
                {lessonActiveTab === "video" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Video URL (Supports YouTube embed, Vimeo, or MP4)
                      </label>
                      <input
                        type="text"
                        value={lessonVideoUrl}
                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=... or https://storage/..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">Or upload physical MP4 file:</span>
                      <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-purple-700 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingFile ? "Uploading video..." : "Upload MP4"}</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleUploadFile(e, "video")}
                          className="hidden"
                          disabled={uploadingFile}
                        />
                      </label>
                    </div>

                    {lessonVideoUrl && (
                      <div className="text-[11px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-mono">
                        ✓ Video attached: {lessonVideoUrl}
                      </div>
                    )}
                  </div>
                )}

                {/* TEXT / MARKDOWN TAB */}
                {lessonActiveTab === "text" && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Reading Content (Markdown formatted)
                    </label>
                    <textarea
                      rows={6}
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      placeholder="Write rich lesson notes here using markdown (## Headings, code blocks, bullet points)..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white"
                    />
                  </div>
                )}

                {/* STUDY MATERIAL / PDF TAB */}
                {lessonActiveTab === "pdf" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Study Material Document Title
                      </label>
                      <input
                        type="text"
                        value={lessonMaterialTitle}
                        onChange={(e) => setLessonMaterialTitle(e.target.value)}
                        placeholder="e.g. Lecture Cheatsheet & Presentation Slides.pdf"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        PDF / Material URL
                      </label>
                      <input
                        type="text"
                        value={lessonMaterialUrl}
                        onChange={(e) => setLessonMaterialUrl(e.target.value)}
                        placeholder="e.g. https://... or /storage/materials/..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">Upload PDF file:</span>
                      <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-amber-700 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingFile ? "Uploading PDF..." : "Upload Document (PDF/DOC)"}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.zip"
                          onChange={(e) => handleUploadFile(e, "material")}
                          className="hidden"
                          disabled={uploadingFile}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLesson}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
              >
                {editingLessonId ? "Update Lesson" : "Save Lesson"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT MCQ QUESTION                           */}
      {/* ======================================================== */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingQuestionId ? "Edit Question" : "Add MCQ Question"}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Question Text <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What is the primary function of...?"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marks / Points
                </label>
                <input
                  type="number"
                  min="1"
                  value={questionPoints}
                  onChange={(e) => setQuestionPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Difficulty
                </label>
                <select
                  value={questionDifficulty}
                  onChange={(e) => setQuestionDifficulty(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Options (Select radio/checkbox to mark correct answer)
                </label>
                <button
                  type="button"
                  onClick={() => setQuestionOptions([...questionOptions, `Option ${String.fromCharCode(65 + questionOptions.length)}`])}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  + Add Option
                </button>
              </div>

              <div className="space-y-2">
                {questionOptions.map((opt, i) => {
                  const isCorrect = correctAnswers.includes(opt);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (questionType === QuestionType.MCQ_SINGLE) {
                            setCorrectAnswers([opt]);
                          } else {
                            if (isCorrect) {
                              setCorrectAnswers(correctAnswers.filter(a => a !== opt));
                            } else {
                              setCorrectAnswers([...correctAnswers, opt]);
                            }
                          }
                        }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition cursor-pointer shrink-0 ${
                          isCorrect 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 hover:border-slate-400 bg-white"
                        }`}
                        title={isCorrect ? "Correct answer" : "Click to mark as correct answer"}
                      >
                        {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...questionOptions];
                          const oldVal = updated[i];
                          updated[i] = e.target.value;
                          setQuestionOptions(updated);
                          if (correctAnswers.includes(oldVal)) {
                            setCorrectAnswers(correctAnswers.map(c => c === oldVal ? e.target.value : c));
                          }
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                      />

                      {questionOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = questionOptions.filter((_, idx) => idx !== i);
                            setQuestionOptions(updated);
                            setCorrectAnswers(correctAnswers.filter(a => a !== opt));
                          }}
                          className="text-slate-400 hover:text-rose-500 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Answer Explanation (Optional, revealed to student)
              </label>
              <textarea
                rows={2}
                value={questionExplanation}
                onChange={(e) => setQuestionExplanation(e.target.value)}
                placeholder="Explain why this answer is correct..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
              >
                {editingQuestionId ? "Update Question" : "Save Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
