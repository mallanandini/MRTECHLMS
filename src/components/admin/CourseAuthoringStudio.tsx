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
  Square, CircleDot, Circle, RefreshCw, Download, FileSpreadsheet,
  ShieldCheck, AlertTriangle, Code, Calendar, UserCheck, UserX, Search, Filter, Loader2
} from "lucide-react";
import { Course, Module, Lesson, LessonType, Assessment, Question, QuestionType, User, UserRole } from "../../types.js";
import { useToast, useConfirm } from "../../context/NotificationContext.js";
import { AssessmentExcelImportModal } from "./AssessmentExcelImportModal.js";
import { useSearchParams } from "react-router-dom";

export type StudioStep = "info" | "curriculum" | "assessments" | "publish" | "access";

interface CourseAuthoringStudioProps {
  courseId: string | null; // null or "new" for brand new course
  authToken: string;
  onBack: () => void;
  onCourseSaved?: (course: Course) => void;
  backButtonLabel?: string;
}

export function CourseAuthoringStudio({ 
  courseId: initialCourseId, 
  authToken, 
  onBack, 
  onCourseSaved,
  backButtonLabel
}: CourseAuthoringStudioProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentCourseId, setCurrentCourseId] = useState<string | null>(
    initialCourseId && initialCourseId !== "new" ? initialCourseId : null
  );

  const getValidStep = (stepParam: string | null): StudioStep => {
    if (stepParam === "curriculum" || stepParam === "assessments" || stepParam === "publish" || stepParam === "access") {
      return stepParam;
    }
    return "info";
  };

  const initialStepFromUrl = getValidStep(searchParams.get("step"));
  const [activeTab, setActiveTabState] = useState<StudioStep>(initialStepFromUrl);

  const setActiveTab = (tab: StudioStep) => {
    setActiveTabState(tab);
    const action = searchParams.get("action");
    const newParams: Record<string, string> = { step: tab };
    if (action) {
      newParams.action = action;
    }
    if (currentCourseId) {
      newParams.courseId = currentCourseId;
    }
    setSearchParams(newParams, { replace: true });
  };

  // Sync initialCourseId prop changes
  useEffect(() => {
    if (initialCourseId && initialCourseId !== "new" && initialCourseId !== currentCourseId) {
      setCurrentCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  // Sync searchParams step changes (e.g. browser back/forward)
  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam && (stepParam === "info" || stepParam === "curriculum" || stepParam === "assessments" || stepParam === "publish" || stepParam === "access")) {
      if (stepParam !== activeTab) {
        setActiveTabState(stepParam);
      }
    }
  }, [searchParams]);

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
  const [courseStatus, setCourseStatus] = useState<"draft" | "review" | "published" | "archived">("draft");
  const [courseEstimatedDuration, setCourseEstimatedDuration] = useState("");
  const [courseTags, setCourseTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coursePrerequisites, setCoursePrerequisites] = useState<string[]>([]);
  const [prereqInput, setPrereqInput] = useState("");
  const [courseVersion, setCourseVersion] = useState<number>(1);
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

  // Validation Results State
  const [validationResults, setValidationResults] = useState<{
    valid: boolean;
    issues: string[];
    moduleCount: number;
    lessonCount: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [bumpVersionOnPublish, setBumpVersionOnPublish] = useState<boolean>(false);

  // Module Modal State
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleStatus, setModuleStatus] = useState<"draft" | "published">("published");

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
  const [lessonAssessmentId, setLessonAssessmentId] = useState("");
  const [lessonStatus, setLessonStatus] = useState<"draft" | "published">("published");
  const [lessonActiveTab, setLessonActiveTab] = useState<"video" | "text" | "pdf">("video");
  const [uploadingFile, setUploadingFile] = useState(false);

  // Assessment & Questions Builder State
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MCQ_SINGLE);
  const [questionOptions, setQuestionOptions] = useState<string[]>(["", "", "", ""]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>([0]);
  const [questionPoints, setQuestionPoints] = useState<number>(10);
  const [questionNegativePoints, setQuestionNegativePoints] = useState<number>(0);
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionDifficulty, setQuestionDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Student Access & Enrollment State
  const [accessMatrix, setAccessMatrix] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<"all" | "assigned" | "in_progress" | "completed" | "overdue" | "revoked" | "mandatory">("all");
  const [accessLoading, setAccessLoading] = useState(false);

  // Modals for Access Control
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showEditEnrollmentModal, setShowEditEnrollmentModal] = useState(false);

  // Form states for modals
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignDueDate, setAssignDueDate] = useState<string>("");
  const [assignIsMandatory, setAssignIsMandatory] = useState<boolean>(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [revokingEnrollment, setRevokingEnrollment] = useState<any | null>(null);
  const [revocationReason, setRevocationReason] = useState<string>("");
  const [editingEnrollment, setEditingEnrollment] = useState<any | null>(null);
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editIsMandatory, setEditIsMandatory] = useState<boolean>(false);
  const [assignSearch, setAssignSearch] = useState<string>("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    if (type === "success") {
      toast.success(text);
    } else {
      toast.error(text);
    }
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
      setCourseEstimatedDuration(c.estimatedDuration || "");
      setCourseTags(c.tags || []);
      setCoursePrerequisites(c.prerequisites || []);
      setCourseVersion(c.version || 1);
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

  // Load Access Control Matrix, Users and Groups
  const loadAccessData = async () => {
    if (!currentCourseId) return;
    setAccessLoading(true);
    try {
      // 1. Fetch access matrix for current course
      const matrixRes = await fetch(`/api/admin/courses/${currentCourseId}/access`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        setAccessMatrix(matrixData || []);
      }

      // 2. Fetch all student users (for assignment modals)
      const usersRes = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (usersRes.ok) {
        const allUsers: User[] = await usersRes.json();
        const studentUsers = allUsers.filter(u => u.role === UserRole.STUDENT && u.status !== "suspended");
        setAllStudents(studentUsers);
      }

      // 3. Fetch groups (for cohort assignments)
      const groupsRes = await fetch("/api/admin/groups", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setAvailableGroups(groupsData || []);
      }
    } catch (err: any) {
      console.error("Failed to load access data", err);
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
      loadAccessData();
    }
  }, [activeTab, currentCourseId]);

  // Handle Save Course Info (creates if new, updates if exists)
  const handleSaveCourseInfo = async (nextTab?: StudioStep | null): Promise<string | null> => {
    if (!courseTitle.trim()) {
      showToast("Please enter a course title to save the course.", "error");
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        title: courseTitle.trim(),
        shortDescription: courseShortDesc.trim(),
        description: courseDescription.trim(),
        category: courseCategory.trim(),
        difficulty: courseDifficulty,
        estimatedDuration: courseEstimatedDuration.trim(),
        tags: courseTags,
        prerequisites: coursePrerequisites,
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
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create course");
        }
        const created: Course = await res.json();
        setCurrentCourseId(created.id);
        showToast("Course created successfully as Draft! Now build your curriculum.", "success");
        if (onCourseSaved) onCourseSaved(created);

        const targetStep = nextTab !== undefined ? nextTab : "curriculum";
        const action = searchParams.get("action") || (initialCourseId === "new" ? "new" : null);
        const newParams: Record<string, string> = { courseId: created.id, step: targetStep || "info" };
        if (action) {
          newParams.action = action;
        }
        if (targetStep) {
          setActiveTabState(targetStep);
          setSearchParams(newParams, { replace: true });
        } else {
          setSearchParams(newParams, { replace: true });
        }
        return created.id;
      } else {
        // Update existing course
        const res = await fetch(`/api/admin/courses/${currentCourseId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update course");
        }
        const updated: Course = await res.json();
        showToast("Course settings updated successfully", "success");
        if (onCourseSaved) onCourseSaved(updated);

        if (nextTab) {
          setActiveTab(nextTab);
        }
        return currentCourseId;
      }
    } catch (err: any) {
      showToast(err.message || "Error saving course", "error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getStepTitle = (step: StudioStep): string => {
    switch (step) {
      case "info": return "Course Information";
      case "curriculum": return "Curriculum & Content Builder";
      case "assessments": return "Practice Tests & Exam Studio";
      case "publish": return "Review & Publish";
      case "access": return "Student Access Allocation";
    }
  };

  const isStepComplete = (step: StudioStep): boolean => {
    switch (step) {
      case "info":
        return Boolean(currentCourseId && courseTitle.trim().length > 0);
      case "curriculum":
        return Boolean(modules.length > 0 && totalLessons > 0);
      case "assessments":
        return Boolean(assessments.length > 0);
      case "publish":
        return Boolean(courseStatus === "published");
      case "access":
        return Boolean(enrolledStudentsCount > 0 || accessMatrix.length > 0);
    }
  };

  const handleStepClick = async (targetStep: StudioStep) => {
    if (targetStep === activeTab) return;

    // If course is not yet created in the backend
    if (!currentCourseId) {
      if (!courseTitle.trim()) {
        showToast(`Please enter a Course Title in Step 1 to create the course before proceeding to ${getStepTitle(targetStep)}.`, "error");
        return;
      }

      // Automatically save Step 1 to create the course before advancing
      const createdId = await handleSaveCourseInfo(targetStep);
      if (!createdId) return; // Save failed, remain on Step 1 with error displayed
      return;
    }

    // Existing course: navigate directly
    setActiveTab(targetStep);
  };

  const STEPS: { id: StudioStep; number: number; title: string; shortTitle: string; icon: any }[] = [
    { id: "info", number: 1, title: "1. Course Information", shortTitle: "Info", icon: BookOpen },
    { id: "curriculum", number: 2, title: "2. Curriculum & Content Builder", shortTitle: "Curriculum", icon: Layers },
    { id: "assessments", number: 3, title: "3. Practice Tests & Exam Studio", shortTitle: "Practice Tests", icon: Award },
    { id: "publish", number: 4, title: "4. Review & Publish", shortTitle: "Review & Publish", icon: CheckCircle2 },
    { id: "access", number: 5, title: "5. Student Access Allocation", shortTitle: "Access", icon: Users }
  ];

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
    const confirmed = await confirm({
      title: "Delete Module?",
      message: "Are you sure you want to delete this module and all its lessons? This action cannot be undone.",
      confirmText: "Delete Module",
      variant: "danger"
    });
    if (!confirmed) return;
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
    setLessonAssessmentId("");
    setLessonStatus("published");
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
    setLessonAssessmentId(lesson.assessmentId || "");
    setLessonStatus((lesson.status as any) || "published");
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
      const resolvedType = lessonActiveTab === "text"
        ? LessonType.TEXT
        : lessonActiveTab === "pdf"
          ? LessonType.PDF
          : LessonType.VIDEO;

      const payload = {
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        type: resolvedType,
        durationMinutes: Number(lessonDuration) || 15,
        videoUrl: lessonVideoUrl.trim(),
        content: lessonContent,
        materialTitle: lessonMaterialTitle.trim(),
        materialUrl: lessonMaterialUrl.trim(),
        assessmentId: lessonAssessmentId || null,
        status: lessonStatus
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
    const confirmed = await confirm({
      title: "Delete Lesson?",
      message: "Are you sure you want to delete this lesson and its practice test? This action cannot be undone.",
      confirmText: "Delete Lesson",
      variant: "danger"
    });
    if (!confirmed) return;
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

  // Reorder Modules
  const handleReorderModules = async (direction: "up" | "down", index: number) => {
    if (!currentCourseId) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = [...modules];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setModules(reordered);
    try {
      const res = await fetch(`/api/admin/courses/${currentCourseId}/modules/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ moduleIds: reordered.map(m => m.id) })
      });
      if (!res.ok) throw new Error("Failed to reorder modules");
      showToast("Module order updated", "success");
    } catch (e: any) {
      showToast(e.message || "Reorder failed", "error");
      loadCourse(currentCourseId);
    }
  };

  // Reorder Lessons within Module
  const handleReorderLessons = async (moduleId: string, direction: "up" | "down", index: number) => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod || !mod.lessons) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mod.lessons.length) return;

    const reordered = [...mod.lessons];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, lessons: reordered } : m));
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/lessons/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ lessonIds: reordered.map(l => l.id) })
      });
      if (!res.ok) throw new Error("Failed to reorder lessons");
      showToast("Lesson order updated", "success");
    } catch (e: any) {
      showToast(e.message || "Reorder failed", "error");
      if (currentCourseId) loadCourse(currentCourseId);
    }
  };

  // Duplicate Lesson
  const handleDuplicateLesson = async (lessonId: string) => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}/duplicate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to duplicate lesson");
      showToast("Lesson duplicated successfully", "success");
      loadCourse(currentCourseId);
    } catch (e: any) {
      showToast(e.message || "Duplication failed", "error");
    }
  };

  // Toggle Module Publish Status
  const handleToggleModuleStatus = async (mod: Module) => {
    if (!currentCourseId) return;
    const newStatus = (mod.status || "published") === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/admin/modules/${mod.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update module status");
      showToast(`Module marked as ${newStatus}`);
      loadCourse(currentCourseId);
    } catch (e: any) {
      showToast(e.message || "Status update failed", "error");
    }
  };

  // Run Pre-Publish Content Validation
  const handleValidateCourse = async () => {
    if (!currentCourseId) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/admin/courses/${currentCourseId}/validate`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Validation check failed");
      const data = await res.json();
      setValidationResults(data);
      if (data.valid) {
        showToast("Course passed all publishing validation checks!", "success");
      } else {
        showToast(`Course has ${data.issues.length} issue(s) to fix before publishing`, "error");
      }
    } catch (e: any) {
      showToast(e.message || "Validation failed", "error");
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (activeTab === "publish" && currentCourseId && !validationResults && !validating) {
      handleValidateCourse();
    }
  }, [activeTab, currentCourseId]);

  // Publish Course with Verification Guard
  const handlePublishCourse = async (incrementVersion = false) => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/admin/courses/${currentCourseId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ incrementVersion })
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationResults({ 
          valid: false, 
          issues: data.issues || [data.error], 
          moduleCount: modules.length, 
          lessonCount: totalLessons 
        });
        throw new Error(data.error || "Publishing validation failed");
      }
      showToast("Course successfully published to active student catalog!", "success");
      setCourseStatus("published");
      if (data.course) {
        setCourseVersion(data.course.version || 1);
      }
      loadCourse(currentCourseId);
    } catch (e: any) {
      showToast(e.message || "Publishing failed", "error");
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
    setQuestionOptions(["", "", "", ""]);
    setCorrectAnswers([]);
    setCorrectOptionIndices([0]);
    setQuestionPoints(10);
    setQuestionNegativePoints(0);
    setQuestionExplanation("");
    setQuestionDifficulty("medium");
    setShowQuestionModal(true);
  };

  const handleCloseQuestionModal = () => {
    setShowQuestionModal(false);
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType(QuestionType.MCQ_SINGLE);
    setQuestionOptions(["", "", "", ""]);
    setCorrectAnswers([]);
    setCorrectOptionIndices([0]);
    setQuestionPoints(10);
    setQuestionNegativePoints(0);
    setQuestionExplanation("");
    setQuestionDifficulty("medium");
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.questionText);
    setQuestionType(q.type || QuestionType.MCQ_SINGLE);
    const opts = q.options && q.options.length > 0 ? [...q.options] : ["", ""];
    setQuestionOptions(opts);
    const answers = q.correctAnswers || [];
    setCorrectAnswers(answers);
    const matchedIndices = answers
      .map(ans => opts.indexOf(ans))
      .filter(idx => idx !== -1);
    setCorrectOptionIndices(matchedIndices.length > 0 ? matchedIndices : [0]);
    setQuestionPoints(q.points || 10);
    setQuestionNegativePoints(q.negativePoints || 0);
    setQuestionExplanation(q.explanation || "");
    setQuestionDifficulty(q.difficulty || "medium");
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (isSavingQuestion) return;

    if (!questionText.trim()) {
      showToast("Question text is required", "error");
      return;
    }
    const cleanOptions = questionOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      showToast("Provide at least 2 valid answer options", "error");
      return;
    }

    // Check duplicate options in UI
    const lowerOpts = cleanOptions.map(o => o.toLowerCase());
    if (new Set(lowerOpts).size !== cleanOptions.length) {
      showToast("Each option must have distinct text", "error");
      return;
    }

    // Determine correct answers from correctOptionIndices
    const selectedCorrectTexts = Array.from(new Set(
      correctOptionIndices
        .map(idx => questionOptions[idx]?.trim())
        .filter(Boolean)
    ));
    // Also include any non-empty correctAnswers matching cleanOptions
    const validCorrect = Array.from(new Set([
      ...selectedCorrectTexts,
      ...correctAnswers.map(c => c.trim()).filter(c => cleanOptions.includes(c))
    ]));

    if (validCorrect.length === 0) {
      showToast("Select at least 1 valid correct answer option", "error");
      return;
    }
    if (!selectedAssessmentId || !currentCourseId) return;

    setIsSavingQuestion(true);
    try {
      const payload = {
        questionText: questionText.trim(),
        type: questionType,
        options: cleanOptions,
        correctAnswers: validCorrect,
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
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Failed to update question");
        }
        showToast("Question updated", "success");
      } else {
        const res = await fetch(`/api/admin/assessments/${selectedAssessmentId}/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Failed to add question");
        }
        showToast("Question added to assessment", "success");
      }

      handleCloseQuestionModal();
      await loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error saving question", "error");
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const confirmed = await confirm({
      title: "Delete Question?",
      message: "Are you sure you want to delete this question? This action cannot be undone.",
      confirmText: "Delete Question",
      variant: "danger"
    });
    if (!confirmed) return;
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

  // STUDENT ACCESS & ENROLLMENT HANDLERS
  const handleAssignStudents = async () => {
    if (!currentCourseId || selectedStudentIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          courseId: currentCourseId,
          studentIds: selectedStudentIds,
          dueDate: assignDueDate || null,
          isMandatory: assignIsMandatory
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to assign students");
      }
      const data = await res.json();
      showToast(data.message || `Successfully assigned ${selectedStudentIds.length} student(s)`);
      setShowAssignModal(false);
      setSelectedStudentIds([]);
      setAssignDueDate("");
      setAssignIsMandatory(false);
      loadAccessData();
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Failed to assign students", "error");
    }
  };

  const handleAssignGroup = async () => {
    if (!currentCourseId || !selectedGroupId) return;
    try {
      const res = await fetch("/api/admin/enrollments/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          courseId: currentCourseId,
          groupId: selectedGroupId,
          dueDate: assignDueDate || null,
          isMandatory: assignIsMandatory
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to assign group");
      }
      const data = await res.json();
      showToast(data.message || "Course assigned to group");
      setShowGroupModal(false);
      setSelectedGroupId("");
      setAssignDueDate("");
      setAssignIsMandatory(false);
      loadAccessData();
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Failed to assign group", "error");
    }
  };

  const handleRevokeAccess = async () => {
    if (!currentCourseId || !revokingEnrollment) return;
    try {
      const res = await fetch("/api/admin/enrollments/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          courseId: currentCourseId,
          studentId: revokingEnrollment.studentId,
          reason: revocationReason || "Revoked by Administrator"
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to revoke access");
      }
      showToast(`Access revoked for ${revokingEnrollment.studentName}`);
      setShowRevokeModal(false);
      setRevokingEnrollment(null);
      setRevocationReason("");
      loadAccessData();
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Revocation error", "error");
    }
  };

  const handleRestoreAccess = async (studentId: string, studentName: string) => {
    if (!currentCourseId) return;
    try {
      const res = await fetch(`/api/admin/users/${studentId}/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ courseId: currentCourseId })
      });
      if (!res.ok) throw new Error("Failed to restore access");
      showToast(`Course access restored for ${studentName}`);
      loadAccessData();
      loadCourse(currentCourseId);
    } catch (err: any) {
      showToast(err.message || "Error restoring access", "error");
    }
  };

  const handleUpdateEnrollment = async () => {
    if (!editingEnrollment) return;
    try {
      const res = await fetch(`/api/admin/enrollments/${editingEnrollment.enrollmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          dueDate: editDueDate || null,
          isMandatory: editIsMandatory
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update enrollment settings");
      }
      showToast("Enrollment parameters updated");
      setShowEditEnrollmentModal(false);
      setEditingEnrollment(null);
      loadAccessData();
    } catch (err: any) {
      showToast(err.message || "Error updating enrollment", "error");
    }
  };

  // PUBLISH / DRAFT TOGGLE
  const handleUpdateCourseStatus = async (newStatus: "draft" | "review" | "published" | "archived") => {
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

  const filteredMatrix = accessMatrix.filter(row => {
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      const matchName = row.studentName?.toLowerCase().includes(q);
      const matchEmail = row.studentEmail?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (accessFilter === "all") return true;
    if (accessFilter === "mandatory") return !!row.isMandatory;
    if (accessFilter === "overdue") return !!row.isOverdue || row.status === "expired";
    if (accessFilter === "assigned") return row.status === "assigned" || row.status === "not_started";
    return row.status === accessFilter;
  });

  const enrolledCount = accessMatrix.filter(r => r.rawStatus !== "revoked").length;
  const inProgressCount = accessMatrix.filter(r => r.status === "in_progress").length;
  const completedCount = accessMatrix.filter(r => r.status === "completed").length;
  const overdueCount = accessMatrix.filter(r => r.isOverdue || r.status === "expired").length;
  const revokedCount = accessMatrix.filter(r => r.rawStatus === "revoked").length;
  const mandatoryCount = accessMatrix.filter(r => !!r.isMandatory).length;

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
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 sm:py-4 shadow-xs">
        <div className="max-w-[1600px] w-full mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-semibold"
              title={backButtonLabel || (searchParams.get("action") === "content" ? "Return to course selection" : "Return to courses list")}
              aria-label={backButtonLabel || (searchParams.get("action") === "content" ? "Return to course selection" : "Return to courses list")}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{backButtonLabel || (searchParams.get("action") === "content" ? "Back to Course Selection" : "Back to Courses")}</span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-xl xl:max-w-2xl"
                  title={courseTitle ? courseTitle : "New Course Authoring Studio"}
                >
                  {courseTitle ? courseTitle : "New Course Authoring Studio"}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 ${
                  courseStatus === "published"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : courseStatus === "draft"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}>
                  {courseStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
                Admin Course Authoring & Learning Path Builder
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 w-full md:w-auto justify-start md:justify-end">
            {currentCourseId && (
              <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 whitespace-nowrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {modules.length} Modules
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  {totalLessons} Lessons
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                  <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {assessments.length} Tests ({totalQuestions} Qs)
                </span>
              </div>
            )}

            {currentCourseId && (
              <button
                onClick={() => handleUpdateCourseStatus(courseStatus === "published" ? "draft" : "published")}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  courseStatus === "published"
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                    : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{courseStatus === "published" ? "Unpublish to Draft" : "Publish Course"}</span>
              </button>
            )}

            <button
              onClick={() => handleSaveCourseInfo(null)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>{saving ? "Saving..." : currentCourseId ? "Save Changes" : "Create Course"}</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Stepper (5-Step Workflow) */}
        <div className="max-w-[1600px] w-full mx-auto mt-3 sm:mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 min-w-0">
            {STEPS.map((s, idx) => {
              const isActive = activeTab === s.id;
              const isCompleted = isStepComplete(s.id);
              const isPrereqPending = !currentCourseId && s.id !== "info" && !courseTitle.trim();
              const StepIcon = s.icon;

              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleStepClick(s.id)}
                    aria-current={isActive ? "step" : undefined}
                    className={`group px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 select-none ${
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-500/30"
                        : isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50"
                        : isPrereqPending
                        ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                    }`}
                    title={
                      isPrereqPending
                        ? "Enter course title in Step 1 to unlock"
                        : `Navigate to ${s.title}`
                    }
                  >
                    {/* Step Number / Completed Check Badge */}
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                        isActive
                          ? "bg-white text-blue-600"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : isPrereqPending
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                      }`}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        s.number
                      )}
                    </span>

                    {/* Step Icon */}
                    <StepIcon className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-white" : isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                    }`} />

                    {/* Step Title */}
                    <span className="whitespace-nowrap font-semibold">
                      {s.title}
                    </span>

                    {/* Step Metric Pill / Badge */}
                    {s.id === "curriculum" && modules.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      }`}>
                        {modules.length}m
                      </span>
                    )}

                    {s.id === "assessments" && assessments.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                      }`}>
                        {assessments.length}t
                      </span>
                    )}

                    {s.id === "publish" && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[9.5px] uppercase font-mono shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : courseStatus === "published"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}>
                        {courseStatus}
                      </span>
                    )}

                    {s.id === "access" && enrolledStudentsCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                      }`}>
                        {enrolledStudentsCount}
                      </span>
                    )}
                  </button>

                  {/* Step Connector Chevron */}
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0 hidden xl:block" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-6">

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
                  <label htmlFor="courseTitleInput" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="courseTitleInput"
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Master Full-Stack Web Development with React & Node.js"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label htmlFor="courseShortDescInput" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Short Summary (Shown in Course Catalog Cards)
                  </label>
                  <input
                    id="courseShortDescInput"
                    type="text"
                    value={courseShortDesc}
                    onChange={(e) => setCourseShortDesc(e.target.value)}
                    placeholder="Brief 1-line elevator pitch for this course..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label htmlFor="courseDescriptionInput" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Description (Markdown or Rich Text)
                  </label>
                  <textarea
                    id="courseDescriptionInput"
                    rows={6}
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Detailed explanation of what students will master in this course, methodologies, projects..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Estimated Duration</label>
                    <input
                      type="text"
                      value={courseEstimatedDuration}
                      onChange={(e) => setCourseEstimatedDuration(e.target.value)}
                      placeholder="e.g. 12 Hours, 4 Weeks"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition"
                    />
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
                    <option value="review">REVIEW (Under Quality Review)</option>
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
                    type="button"
                    onClick={() => handleSaveCourseInfo(null)}
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving Changes..." : "Save Course Information"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 1 Bottom Navigation Bar */}
            <div className="lg:col-span-3 mt-4 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{backButtonLabel || (searchParams.get("action") === "content" ? "Back to Course Selection" : "Back to Course Catalog")}</span>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveCourseInfo(null)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{saving ? "Saving..." : currentCourseId ? "Save Changes" : "Save as Draft"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCourseInfo("curriculum")}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  <span>{currentCourseId ? "Continue to Curriculum" : "Save & Continue to Curriculum"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
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
                <span>Add Module</span>
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
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            onClick={() => handleReorderModules("up", modIdx)}
                            disabled={modIdx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Module Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReorderModules("down", modIdx)}
                            disabled={modIdx === modules.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Module Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleModuleStatus(mod)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase font-mono border cursor-pointer transition ${
                            (mod.status || "published") === "published"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          }`}
                          title="Click to toggle module publish state"
                        >
                          {mod.status || "published"}
                        </button>

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
                                les.type === LessonType.CODING ? "bg-cyan-50 text-cyan-600" :
                                les.type === LessonType.ASSESSMENT ? "bg-emerald-50 text-emerald-600" :
                                les.type === LessonType.IMAGE ? "bg-pink-50 text-pink-600" :
                                les.type === LessonType.PDF ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                              }`}>
                                {les.type === LessonType.VIDEO ? <Video className="w-4 h-4" /> :
                                 les.type === LessonType.CODING ? <Code className="w-4 h-4" /> :
                                 les.type === LessonType.ASSESSMENT ? <Award className="w-4 h-4" /> :
                                 les.type === LessonType.PDF ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{les.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {les.durationMinutes} mins
                                  </span>
                                  <span className="text-blue-600 font-semibold uppercase font-mono text-[10px]">
                                    • {les.type}
                                  </span>
                                  {les.videoUrl && (
                                    <span className="text-purple-600 font-semibold flex items-center gap-0.5">
                                      • Video Attached
                                    </span>
                                  )}
                                  {(les.materialUrl || les.fileUrl) && (
                                    <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                      • Study Material
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
                              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                                <button
                                  onClick={() => handleReorderLessons(mod.id, "up", lesIdx)}
                                  disabled={lesIdx === 0}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Move Lesson Up"
                                >
                                  <MoveUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleReorderLessons(mod.id, "down", lesIdx)}
                                  disabled={lesIdx === (mod.lessons?.length || 0) - 1}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                  title="Move Lesson Down"
                                >
                                  <MoveDown className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => handleDuplicateLesson(les.id)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Duplicate Lesson"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>

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

            {/* Step 2 Bottom Navigation Bar */}
            <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Step 1: Course Information</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{modules.length} Modules</span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{totalLessons} Lessons published</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("assessments")}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <span>Continue to Step 3: Practice Tests & Exams</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
                  <span>Course Final Assessment</span>
                </button>
              </div>
            </div>

            {/* Right Question Studio Column */}
            <div className="lg:col-span-3 space-y-6">
              {activeAssessment ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 min-w-0">
                  {/* Active Assessment Info Banner */}
                  <div className="space-y-4 pb-5 border-b border-slate-100 dark:border-slate-800 min-w-0">
                    {/* Header Row: Title, Badge, Description & Actions */}
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 min-w-0">
                      {/* Left: Title, Badge & Description */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-bold border tracking-wider shrink-0 ${
                            activeAssessment.type === "course_final" 
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" 
                              : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          }`}>
                            {activeAssessment.type === "course_final" ? "Course Final Exam" : "Lesson Practice Test"}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">
                            {activeAssessment.title}
                          </h3>
                        </div>
                        {activeAssessment.description ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                            {activeAssessment.description}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No description provided for this assessment.</p>
                        )}
                      </div>

                      {/* Right: Actions Container */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 min-w-0 w-full xl:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowExcelImportModal(true)}
                          className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer whitespace-nowrap min-w-0"
                          title="Bulk import questions from Excel (.xlsx, .xls)"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Import Questions from Excel</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenAddQuestion}
                          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer whitespace-nowrap shrink-0 min-w-0"
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>Add MCQ Question</span>
                        </button>
                      </div>
                    </div>

                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono block">
                          Duration
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block whitespace-nowrap">
                          {activeAssessment.durationMinutes} min
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono block">
                          Passing Score
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block whitespace-nowrap">
                          {activeAssessment.passingScore}%
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono block">
                          Total Points
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block whitespace-nowrap">
                          {activeAssessment.totalPoints} pts
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono block">
                          Questions
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono mt-0.5 block whitespace-nowrap">
                          {activeAssessment.questions?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-4">
                    {(!activeAssessment.questions || activeAssessment.questions.length === 0) ? (
                      <div className="py-12 text-center text-slate-400 space-y-3">
                        <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No questions in this assessment yet.</p>
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={handleOpenAddQuestion}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            Add First Question
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowExcelImportModal(true)}
                            className="px-4 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Import Questions from Excel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      activeAssessment.questions.map((q, qIdx) => (
                        <div
                          key={q.id}
                          className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span className="w-6 h-6 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md flex items-center justify-center text-xs font-bold font-mono shrink-0">
                                {qIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed break-words">
                                  {q.questionText}
                                </h5>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800/50">
                                    {q.points} Points
                                  </span>
                                  {q.negativePoints ? (
                                    <span className="text-[10px] font-mono text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded font-bold border border-rose-200 dark:border-rose-800/50">
                                      -{q.negativePoints} Negative
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 uppercase">
                                    {q.difficulty || "medium"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditQuestion(q)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                                title="Edit Question"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
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
                                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border min-w-0 ${
                                    isCorrect 
                                      ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-semibold" 
                                      : "bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                  )}
                                  <span className="break-words min-w-0 flex-1">{opt}</span>
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 break-words">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">Explanation: </span>
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

            {/* Step 3 Bottom Navigation Bar */}
            <div className="col-span-1 lg:col-span-4 mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("curriculum")}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Step 2: Curriculum Builder</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{assessments.length} Practice Tests</span>
                <span>•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{totalQuestions} Questions total</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("publish")}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <span>Continue to Step 4: Review & Publish</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: REVIEW & PUBLISH                                  */}
        {/* ======================================================== */}
        {activeTab === "publish" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* Header Description */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Course Review & Production Release</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                MRTECHLMS enforces curriculum completeness standards and safe versioning before releasing content to students. Verify readiness and manage lifecycle transitions below.
              </p>
            </div>

            {/* Curriculum Metrics & Lifecycle Status Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Specifications</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Title:</span>
                  <strong className="text-slate-900 truncate max-w-[180px] text-right" title={courseTitle}>{courseTitle || "Untitled Course"}</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Version:</span>
                  <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    v{courseVersion}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Modules:</span>
                  <strong className="text-slate-900 font-mono">{modules.length} Modules</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Published Lessons:</span>
                  <strong className="text-slate-900 font-mono">{totalLessons} Lessons</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Assessments / Tests:</span>
                  <strong className="text-slate-900 font-mono">{assessments.length} Tests ({totalQuestions} Questions)</strong>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Lifecycle Status:</span>
                  <span className={`font-mono font-bold uppercase px-2 py-0.5 rounded-md text-[11px] ${
                    courseStatus === "published"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : courseStatus === "review"
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : courseStatus === "archived"
                      ? "bg-slate-100 text-slate-700 border border-slate-300"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {courseStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Pre-Publish Content Validation Guard */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pre-Publish Verification Guard</h4>
                    <p className="text-xs text-slate-500">Audits metadata, published modules, lessons, and content activity references</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleValidateCourse}
                  disabled={validating || !currentCourseId}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validating ? "animate-spin" : ""}`} />
                  <span>{validating ? "Checking Readiness..." : "Run Readiness Audit"}</span>
                </button>
              </div>

              {/* Validation Results Display */}
              {validationResults ? (
                <div className={`p-4 rounded-xl border text-xs space-y-3 ${
                  validationResults.valid 
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                    : "bg-rose-50/70 border-rose-200 text-rose-900"
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {validationResults.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Ready for Release (All checks passed)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Publication Blocked: {validationResults.issues.length} Issue(s) Found</span>
                      </>
                    )}
                  </div>

                  {validationResults.valid ? (
                    <p className="text-xs text-emerald-800">
                      This course satisfies all publishing criteria: valid title, descriptions, category, thumbnail, at least 1 published module, and all lessons have required activity links.
                    </p>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1 text-xs text-rose-800 font-medium">
                      {validationResults.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Click <strong>"Run Readiness Audit"</strong> above to test whether this course meets publication standards.</span>
                </div>
              )}
            </div>

            {/* Course Lifecycle Actions & Safe Versioning */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <h4 className="text-sm font-bold text-slate-900">Publishing & Lifecycle Controls</h4>

              {/* Version Bump Checkbox */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="bumpVersionCheckbox"
                  checked={bumpVersionOnPublish}
                  onChange={(e) => setBumpVersionOnPublish(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="bumpVersionCheckbox" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold text-slate-900">Increment version number upon publishing</span>
                  <p className="text-slate-500 mt-0.5">
                    Publishes this course as <strong>v{courseVersion + 1}</strong>. Historical student completions and certificates are safely preserved.
                  </p>
                </label>
              </div>

              {/* Primary Publish Action */}
              <button
                type="button"
                onClick={() => handlePublishCourse(bumpVersionOnPublish)}
                disabled={saving || validating || !currentCourseId}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Course to Active Catalog (Enrolled Students Can Access)</span>
              </button>

              {/* Secondary Status Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdateCourseStatus("review")}
                  disabled={saving || !currentCourseId}
                  className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Mark course as ready for quality review before publishing"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Mark as Under Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateCourseStatus("draft")}
                  disabled={saving || !currentCourseId}
                  className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Hide course completely from students"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Revert to Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateCourseStatus("archived")}
                  disabled={saving || !currentCourseId}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Archive course: hidden from catalog, read-only for already-enrolled students"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Archive Course</span>
                </button>
              </div>

              {/* Step 4 Bottom Navigation Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("assessments")}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back to Step 3: Practice Tests</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("access")}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <span>Proceed to Step 5: Student Access Allocation</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: STUDENT ACCESS ALLOCATION & ENROLLMENT CONTROL     */}
        {/* ======================================================== */}
        {activeTab === "access" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* STATS METRIC SUMMARY BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold">Active Enrolled</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-slate-900">{enrolledCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Learners with access</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold">In Progress</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-blue-600">{inProgressCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Actively learning</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold">Completed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-emerald-600">{completedCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">100% finished</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold">Overdue</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-amber-600">{overdueCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Past deadline</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold">Mandatory</span>
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xl font-bold text-rose-600">{mandatoryCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Required training</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-semibold">Revoked</span>
                  <UserX className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-xl font-bold text-slate-500">{revokedCount}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Blocked historical</div>
              </div>
            </div>

            {/* ACTION & FILTER TOOLBAR */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Course Access Control Matrix</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assign individual learners, cohorts, set completion deadlines, and enforce mandatory compliance for <strong>{courseTitle}</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentIds([]);
                      setAssignDueDate("");
                      setAssignIsMandatory(false);
                      setShowAssignModal(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assign Students</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(availableGroups[0]?.id || "");
                      setAssignDueDate("");
                      setAssignIsMandatory(false);
                      setShowGroupModal(true);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Assign Group / Cohort</span>
                  </button>

                  <button
                    type="button"
                    onClick={loadAccessData}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                    title="Refresh Access Matrix"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SEARCH & STATUS FILTER PILLS */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: "all", label: "All Access", count: accessMatrix.length },
                    { id: "assigned", label: "Assigned", count: accessMatrix.filter(r => r.status === "assigned" || r.status === "not_started").length },
                    { id: "in_progress", label: "In Progress", count: inProgressCount },
                    { id: "completed", label: "Completed", count: completedCount },
                    { id: "overdue", label: "Overdue", count: overdueCount },
                    { id: "mandatory", label: "Mandatory", count: mandatoryCount },
                    { id: "revoked", label: "Revoked", count: revokedCount }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAccessFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        accessFilter === tab.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        accessFilter === tab.id ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search learners by name or email..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ACCESS MATRIX TABLE */}
              {accessLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs font-medium">Loading Access Control Matrix...</p>
                </div>
              ) : filteredMatrix.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <UserX className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">No enrollment records matching this filter.</p>
                  <p className="text-[11px] text-slate-400">Click "Assign Students" or "Assign Group" above to grant access.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono bg-slate-50/50">
                        <th className="py-3 px-6">Learner</th>
                        <th className="py-3 px-4">Access State</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Training Type</th>
                        <th className="py-3 px-4">Progress</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredMatrix.map((row) => (
                        <tr key={row.enrollmentId} className="hover:bg-slate-50/60 transition">
                          {/* LEARNER INFO */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                                {row.studentName ? row.studentName.slice(0, 2).toUpperCase() : "ST"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{row.studentName}</p>
                                <p className="text-slate-400 font-mono text-[11px]">{row.studentEmail}</p>
                              </div>
                            </div>
                          </td>

                          {/* ACCESS STATE */}
                          <td className="py-4 px-4">
                            {row.status === "completed" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Completed</span>
                              </span>
                            )}
                            {row.status === "in_progress" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>In Progress</span>
                              </span>
                            )}
                            {(row.status === "assigned" || row.status === "not_started") && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <CircleDot className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Assigned</span>
                              </span>
                            )}
                            {row.status === "expired" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Expired</span>
                              </span>
                            )}
                            {row.status === "revoked" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200" title={row.revocationReason || undefined}>
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                                <span>Revoked</span>
                              </span>
                            )}
                          </td>

                          {/* ASSIGNMENT SOURCE */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                              {row.sourceLabel || "Individual"}
                            </span>
                          </td>

                          {/* DUE DATE */}
                          <td className="py-4 px-4">
                            {row.dueDate ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{new Date(row.dueDate).toLocaleDateString()}</span>
                                </div>
                                {row.isOverdue && (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-rose-100 text-rose-700 uppercase">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No deadline</span>
                            )}
                          </td>

                          {/* MANDATORY */}
                          <td className="py-4 px-4">
                            {row.isMandatory ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                                <ShieldCheck className="w-3 h-3 text-rose-600" />
                                <span>MANDATORY</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Optional</span>
                            )}
                          </td>

                          {/* PROGRESS */}
                          <td className="py-4 px-4">
                            <div className="w-28 space-y-1">
                              <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                                <span>{row.progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    row.progressPercentage === 100 ? "bg-emerald-500" : "bg-blue-600"
                                  }`}
                                  style={{ width: `${row.progressPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.rawStatus !== "revoked" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEnrollment(row);
                                      setEditDueDate(row.dueDate ? row.dueDate.split("T")[0] : "");
                                      setEditIsMandatory(Boolean(row.isMandatory));
                                      setShowEditEnrollmentModal(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition cursor-pointer"
                                    title="Edit Due Date or Mandatory State"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRevokingEnrollment(row);
                                      setRevocationReason("");
                                      setShowRevokeModal(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                                  >
                                    Revoke
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreAccess(row.studentId, row.studentName)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                >
                                  Restore Access
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* MODAL: ASSIGN STUDENTS (INDIVIDUAL & BULK) */}
            {showAssignModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Assign Course to Learners</span>
                      </h3>
                      <p className="text-xs text-slate-500">Select one or multiple students to enroll in {courseTitle}.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* DEADLINE & MANDATORY CONFIG */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Completion Due Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={assignDueDate}
                        onChange={(e) => setAssignDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="assignMandatory"
                        checked={assignIsMandatory}
                        onChange={(e) => setAssignIsMandatory(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer"
                      />
                      <label htmlFor="assignMandatory" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Mandatory Training Requirement
                      </label>
                    </div>
                  </div>

                  {/* STUDENT SEARCH & SELECT */}
                  <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="relative flex-1 mr-2">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={assignSearch}
                          onChange={(e) => setAssignSearch(e.target.value)}
                          placeholder="Search learners..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const matching = allStudents
                            .filter(s => !assignSearch || s.name.toLowerCase().includes(assignSearch.toLowerCase()) || s.email.toLowerCase().includes(assignSearch.toLowerCase()))
                            .map(s => s.id);
                          if (selectedStudentIds.length === matching.length) {
                            setSelectedStudentIds([]);
                          } else {
                            setSelectedStudentIds(matching);
                          }
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 cursor-pointer"
                      >
                        {selectedStudentIds.length > 0 ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-60 divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/30">
                      {allStudents
                        .filter(s => 
                          !assignSearch || 
                          s.name.toLowerCase().includes(assignSearch.toLowerCase()) || 
                          s.email.toLowerCase().includes(assignSearch.toLowerCase())
                        )
                        .map(st => {
                          const isAlreadyEnrolled = accessMatrix.some(m => m.studentId === st.id && m.rawStatus !== "revoked");
                          const isChecked = selectedStudentIds.includes(st.id);
                          return (
                            <label
                              key={st.id}
                              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white transition ${
                                isChecked ? "bg-blue-50/50" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedStudentIds([...selectedStudentIds, st.id]);
                                    } else {
                                      setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                                />
                                <div>
                                  <p className="font-bold text-slate-800 text-xs">{st.name}</p>
                                  <p className="text-[11px] font-mono text-slate-400">{st.email}</p>
                                </div>
                              </div>
                              {isAlreadyEnrolled && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Already Enrolled
                                </span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      {selectedStudentIds.length} learner(s) selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAssignStudents}
                        disabled={selectedStudentIds.length === 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                      >
                        Grant Access ({selectedStudentIds.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: ASSIGN GROUP / COHORT */}
            {showGroupModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Assign Course to Group / Cohort</span>
                      </h3>
                      <p className="text-xs text-slate-500">All current and future members will gain access.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Cohort / Group <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white"
                    >
                      <option value="">-- Choose a Group --</option>
                      {availableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.memberCount || 0} members)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Completion Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="groupMandatory"
                      checked={assignIsMandatory}
                      onChange={(e) => setAssignIsMandatory(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="groupMandatory" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Mandatory Training for all members
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAssignGroup}
                      disabled={!selectedGroupId}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      Assign Group
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: REVOKE COURSE ACCESS */}
            {showRevokeModal && revokingEnrollment && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                      <UserX className="w-4 h-4" />
                      <span>Revoke Course Access</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRevokeModal(false);
                        setRevokingEnrollment(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-900">{revokingEnrollment.studentName}</p>
                    <p className="text-slate-500 font-mono text-[11px]">{revokingEnrollment.studentEmail}</p>
                    <p className="text-slate-600 mt-1">Current Progress: <strong>{revokingEnrollment.progressPercentage}%</strong></p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reason for Revocation (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={revocationReason}
                      onChange={(e) => setRevocationReason(e.target.value)}
                      placeholder="e.g. Role changed, completed elsewhere, or administrative decision..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                    />
                  </div>

                  {/* NON-DESTRUCTIVE REASSURANCE */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Non-Destructive Protection:</strong> Revocation stops future access to lessons and quizzes. All past progress, completed activities, quiz scores, and certificate records are safely preserved in audit logs.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRevokeModal(false);
                        setRevokingEnrollment(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeAccess}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Confirm Revocation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: EDIT ENROLLMENT (DUE DATE & MANDATORY STATE) */}
            {showEditEnrollmentModal && editingEnrollment && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <span>Edit Enrollment Parameters</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditEnrollmentModal(false);
                        setEditingEnrollment(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600">
                    Editing assignment parameters for <strong>{editingEnrollment.studentName}</strong> ({editingEnrollment.studentEmail}).
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="editMandatory"
                      checked={editIsMandatory}
                      onChange={(e) => setEditIsMandatory(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="editMandatory" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Mandatory Training Requirement
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditEnrollmentModal(false);
                        setEditingEnrollment(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateEnrollment}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Save Parameters
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5 Bottom Navigation Bar */}
            <div className="mt-8 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveTab("publish")}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Step 4: Review & Publish</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{enrolledCount} Active Learners Assigned</span>
                <span>•</span>
                <span>{accessMatrix.length} total roster records</span>
              </div>

              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish & Return to Course Catalog</span>
              </button>
            </div>
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
                  onClick={() => {
                    setLessonActiveTab("video");
                    setLessonType(LessonType.VIDEO);
                  }}
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
                  onClick={() => {
                    setLessonActiveTab("text");
                    setLessonType(LessonType.TEXT);
                  }}
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
                  onClick={() => {
                    setLessonActiveTab("pdf");
                    setLessonType(LessonType.PDF);
                  }}
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingQuestionId ? "Edit Question" : "Add MCQ Question"}
              </h3>
              <button
                type="button"
                onClick={handleCloseQuestionModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                title="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Question Text <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What is the primary function of...?"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Marks / Points
                </label>
                <input
                  type="number"
                  min="1"
                  value={questionPoints}
                  onChange={(e) => setQuestionPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={questionDifficulty}
                  onChange={(e) => setQuestionDifficulty(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Options (Select radio/checkbox to mark correct answer)
                </label>
                <button
                  type="button"
                  onClick={() => setQuestionOptions([...questionOptions, ""])}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                >
                  + Add Option
                </button>
              </div>

              <div className="space-y-2">
                {questionOptions.map((opt, i) => {
                  const isCorrect = correctOptionIndices.includes(i);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (questionType === QuestionType.MCQ_SINGLE) {
                            setCorrectOptionIndices([i]);
                          } else {
                            if (isCorrect) {
                              setCorrectOptionIndices(correctOptionIndices.filter(idx => idx !== i));
                            } else {
                              setCorrectOptionIndices([...correctOptionIndices, i]);
                            }
                          }
                        }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition cursor-pointer shrink-0 ${
                          isCorrect 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 hover:border-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700"
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
                          updated[i] = e.target.value;
                          setQuestionOptions(updated);
                        }}
                        placeholder={`Enter option ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900"
                      />

                      {questionOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = questionOptions.filter((_, idx) => idx !== i);
                            setQuestionOptions(updated);
                            setCorrectOptionIndices(prev => {
                              const filtered = prev
                                .filter(idx => idx !== i)
                                .map(idx => (idx > i ? idx - 1 : idx));
                              return filtered.length > 0 ? filtered : [0];
                            });
                          }}
                          className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remove Option"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Answer Explanation (Optional, revealed to student)
              </label>
              <textarea
                rows={2}
                value={questionExplanation}
                onChange={(e) => setQuestionExplanation(e.target.value)}
                placeholder="Explain why this answer is correct..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseQuestionModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingQuestion}
                onClick={handleSaveQuestion}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingQuestion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isSavingQuestion 
                    ? (editingQuestionId ? "Updating..." : "Saving...") 
                    : (editingQuestionId ? "Update Question" : "Save Question")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Excel Bulk Import Modal */}
      {showExcelImportModal && activeAssessment && (
        <AssessmentExcelImportModal
          isOpen={showExcelImportModal}
          onClose={() => setShowExcelImportModal(false)}
          assessmentId={activeAssessment.id}
          assessmentTitle={activeAssessment.title}
          authToken={authToken}
          onSuccess={async () => {
            if (currentCourseId) {
              await loadCourse(currentCourseId);
              showToast("Questions successfully imported into assessment", "success");
            }
          }}
        />
      )}
    </div>
  );
}
