/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Compass, Layers, Video, FileText, Award, Users, CheckCircle2, 
  AlertCircle, Trash2, Plus, Edit3, Save, Upload, Eye, ArrowLeft, 
  ExternalLink, Clock, HelpCircle, X, ChevronDown, ChevronRight, 
  MoveUp, MoveDown, File, Play, Sparkles, Check, CheckSquare, 
  Square, CircleDot, Circle, RefreshCw, Download, FileSpreadsheet,
  Lock, ArrowRight, Bold, Italic, Heading1, Heading2, List, Code2, Link2
} from "lucide-react";
import { 
  LearningPath, LearningPathSection, LearningPathItem, 
  LearningPathItemType, Assessment, Question, QuestionType 
} from "../../types.js";

interface LearningPathBuilderProps {
  pathId: string | null; // null or "new" for brand new learning path
  authToken: string;
  onBack: () => void;
  onSaved?: (path: LearningPath) => void;
}

export function LearningPathBuilder({ 
  pathId: initialPathId, 
  authToken, 
  onBack, 
  onSaved 
}: LearningPathBuilderProps) {
  const [currentPathId, setCurrentPathId] = useState<string | null>(
    initialPathId && initialPathId !== "new" ? initialPathId : null
  );

  const [activeTab, setActiveTab] = useState<"info" | "curriculum" | "final-assessment" | "publish" | "access">("info");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Path Information State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Software Engineering");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [estimatedDuration, setEstimatedDuration] = useState("8 weeks");
  const [thumbnail, setThumbnail] = useState("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [requirements, setRequirements] = useState<string[]>(["Basic Computer Literacy"]);
  const [reqInput, setReqInput] = useState("");
  const [learningObjectives, setLearningObjectives] = useState<string[]>(["Complete structured milestones"]);
  const [objInput, setObjInput] = useState("");

  // Curriculum Data
  const [sections, setSections] = useState<LearningPathSection[]>([]);
  const [finalAssessment, setFinalAssessment] = useState<Assessment | null>(null);
  const [assignedStudentsCount, setAssignedStudentsCount] = useState<number>(0);

  // Section Modal State
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");

  // Item Modal / Editor State
  const [showItemModal, setShowItemModal] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemType, setItemType] = useState<LearningPathItemType>("text");
  const [itemDuration, setItemDuration] = useState<number>(15);
  const [itemIsRequired, setItemIsRequired] = useState(true);
  const [itemContent, setItemContent] = useState("");
  const [itemVideoSource, setItemVideoSource] = useState<"youtube" | "vimeo" | "upload">("youtube");
  const [itemVideoUrl, setItemVideoUrl] = useState("");
  const [itemFileUrl, setItemFileUrl] = useState("");
  const [itemFileName, setItemFileName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState(false);

  // In-Section Practice Assessment Builder
  const [itemQuestions, setItemQuestions] = useState<Array<{
    questionText: string;
    options: string[];
    correctAnswers: string[];
    points: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
  }>>([]);
  const [itemAssPassingScore, setItemAssPassingScore] = useState<number>(70);

  // Final Assessment Form State
  const [finalAssTitle, setFinalAssTitle] = useState("");
  const [finalAssDesc, setFinalAssDesc] = useState("");
  const [finalAssDuration, setFinalAssDuration] = useState(30);
  const [finalAssPassingScore, setFinalAssPassingScore] = useState(75);
  const [finalAssQuestions, setFinalAssQuestions] = useState<Array<{
    questionText: string;
    options: string[];
    correctAnswers: string[];
    points: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
  }>>([]);

  // Question editing modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionTarget, setQuestionTarget] = useState<"item" | "final">("item");
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["Option A", "Option B", "Option C", "Option D"]);
  const [qCorrect, setQCorrect] = useState<string[]>(["Option A"]);
  const [qPoints, setQPoints] = useState(10);
  const [qExplanation, setQExplanation] = useState("");
  const [qDifficulty, setQDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Validation State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Student Access State
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Live Student Preview Modal
  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const [previewActiveItem, setPreviewActiveItem] = useState<LearningPathItem | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch full tree
  const loadLearningPath = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/learning-paths/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to load learning path");
      const data = await res.json();

      setTitle(data.title || "");
      setSlug(data.slug || "");
      setShortDescription(data.shortDescription || "");
      setDescription(data.description || "");
      setCategory(data.category || "Software Engineering");
      setDifficulty(data.difficulty || "Beginner");
      setEstimatedDuration(data.estimatedDuration || "8 weeks");
      setThumbnail(data.thumbnail || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80");
      setStatus(data.status || "draft");
      setRequirements(data.requirements || []);
      setLearningObjectives(data.learningObjectives || []);
      setSections(data.sections || []);
      setFinalAssessment(data.finalAssessment || null);
      setAssignedStudentsCount(data.assignedStudentsCount || 0);

      if (data.finalAssessment) {
        setFinalAssTitle(data.finalAssessment.title || "");
        setFinalAssDesc(data.finalAssessment.description || "");
        setFinalAssDuration(data.finalAssessment.durationMinutes || 30);
        setFinalAssPassingScore(data.finalAssessment.passingScore || 75);
        if (data.finalAssessment.questions) {
          setFinalAssQuestions(data.finalAssessment.questions.map((q: any) => ({
            questionText: q.questionText,
            options: q.options || ["Option A", "Option B", "Option C", "Option D"],
            correctAnswers: q.correctAnswers || [q.options?.[0] || "Option A"],
            points: q.points || 10,
            explanation: q.explanation || "",
            difficulty: q.difficulty || "medium"
          })));
        }
      }

      // Check validation
      loadValidation(id);
    } catch (err: any) {
      showToast(err.message || "Failed to load learning path", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadValidation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/learning-paths/${id}/validation`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const valData = await res.json();
        setValidationErrors(valData.errors || []);
        setValidationWarnings(valData.warnings || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudents = async (id: string) => {
    setAccessLoading(true);
    try {
      const res = await fetch(`/api/admin/learning-paths/${id}/students`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setAccessLoading(false);
    }
  };

  useEffect(() => {
    if (currentPathId) {
      loadLearningPath(currentPathId);
    }
  }, [currentPathId]);

  useEffect(() => {
    if (activeTab === "access" && currentPathId) {
      loadStudents(currentPathId);
    }
    if (activeTab === "publish" && currentPathId) {
      loadValidation(currentPathId);
    }
  }, [activeTab, currentPathId]);

  // Save or Create Basic Info
  const handleSaveInfo = async () => {
    if (!title.trim()) {
      showToast("Path title is required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        category,
        difficulty,
        estimatedDuration,
        thumbnail,
        requirements,
        learningObjectives,
        status
      };

      if (!currentPathId) {
        // Create new
        const res = await fetch("/api/admin/learning-paths", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create learning path");
        }
        const created = await res.json();
        setCurrentPathId(created.id);
        showToast("Learning Path created! Now design your curriculum.", "success");
        if (onSaved) onSaved(created);
        setActiveTab("curriculum");
      } else {
        // Update existing
        const res = await fetch(`/api/admin/learning-paths/${currentPathId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update learning path");
        }
        const updated = await res.json();
        showToast("Learning Path details saved successfully", "success");
        if (onSaved) onSaved(updated);
        loadValidation(currentPathId);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Section Handlers
  const handleSaveSection = async () => {
    if (!sectionTitle.trim()) {
      showToast("Section title is required", "error");
      return;
    }
    if (!currentPathId) {
      showToast("Please save basic info first", "error");
      return;
    }

    try {
      if (editingSectionId) {
        const res = await fetch(`/api/admin/learning-path-sections/${editingSectionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ title: sectionTitle.trim(), description: sectionDescription.trim() })
        });
        if (!res.ok) throw new Error("Failed to update section");
        showToast("Section updated", "success");
      } else {
        const res = await fetch(`/api/admin/learning-paths/${currentPathId}/sections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ title: sectionTitle.trim(), description: sectionDescription.trim() })
        });
        if (!res.ok) throw new Error("Failed to create section");
        showToast("Section added", "success");
      }
      setShowSectionModal(false);
      setEditingSectionId(null);
      setSectionTitle("");
      setSectionDescription("");
      loadLearningPath(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if (!confirm("Are you sure you want to delete this section and all its items?")) return;
    try {
      const res = await fetch(`/api/admin/learning-path-sections/${secId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to delete section");
      showToast("Section deleted", "success");
      if (currentPathId) loadLearningPath(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleMoveSection = async (index: number, direction: "up" | "down") => {
    if (!currentPathId) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);

    const sectionIds = newSections.map(s => s.id);
    await fetch(`/api/admin/learning-paths/${currentPathId}/sections/reorder`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ sectionIds })
    });
  };

  // Item Handlers
  const handleOpenAddItem = (secId: string) => {
    setTargetSectionId(secId);
    setEditingItemId(null);
    setItemTitle("");
    setItemDescription("");
    setItemType("text");
    setItemDuration(15);
    setItemIsRequired(true);
    setItemContent("# Introduction\n\nWrite structured markdown here...");
    setItemVideoSource("youtube");
    setItemVideoUrl("");
    setItemFileUrl("");
    setItemFileName("");
    setItemQuestions([]);
    setItemAssPassingScore(70);
    setPreviewMarkdown(false);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (secId: string, item: LearningPathItem) => {
    setTargetSectionId(secId);
    setEditingItemId(item.id);
    setItemTitle(item.title);
    setItemDescription(item.description || "");
    setItemType(item.type);
    setItemDuration(item.durationMinutes);
    setItemIsRequired(item.isRequired);
    setItemContent(item.content || "");
    setItemVideoSource(item.videoSource || "youtube");
    setItemVideoUrl(item.videoUrl || "");
    setItemFileUrl(item.fileUrl || "");
    setItemFileName(item.fileName || "");
    if (item.assessment) {
      setItemAssPassingScore(item.assessment.passingScore || 70);
      setItemQuestions((item.assessment.questions || []).map(q => ({
        questionText: q.questionText,
        options: q.options || ["Option A", "Option B", "Option C", "Option D"],
        correctAnswers: q.correctAnswers || [q.options?.[0] || "Option A"],
        points: q.points || 10,
        explanation: q.explanation || "",
        difficulty: q.difficulty || "medium"
      })));
    } else {
      setItemQuestions([]);
      setItemAssPassingScore(70);
    }
    setPreviewMarkdown(false);
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemTitle.trim()) {
      showToast("Item title is required", "error");
      return;
    }
    if (!targetSectionId || !currentPathId) return;

    try {
      const payload: any = {
        title: itemTitle.trim(),
        description: itemDescription.trim(),
        type: itemType,
        durationMinutes: itemDuration,
        isRequired: itemIsRequired,
        content: itemContent,
        videoSource: itemVideoSource,
        videoUrl: itemVideoUrl,
        fileUrl: itemFileUrl,
        fileName: itemFileName
      };

      let savedItemId = editingItemId;

      if (editingItemId) {
        const res = await fetch(`/api/admin/learning-path-items/${editingItemId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update item");
      } else {
        const res = await fetch(`/api/admin/learning-path-sections/${targetSectionId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create item");
        const createdItem = await res.json();
        savedItemId = createdItem.id;
      }

      // If practice assessment, save assessment & questions
      if (itemType === "assessment" && savedItemId) {
        await fetch(`/api/admin/learning-path-items/${savedItemId}/assessment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: `${itemTitle.trim()} Quiz`,
            description: itemDescription.trim() || "Practice checkpoint",
            durationMinutes: itemDuration,
            passingScore: itemAssPassingScore,
            questions: itemQuestions
          })
        });
      }

      showToast("Learning item saved successfully", "success");
      setShowItemModal(false);
      loadLearningPath(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/admin/learning-path-items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to delete item");
      showToast("Item deleted", "success");
      if (currentPathId) loadLearningPath(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleMoveItem = async (secId: string, index: number, direction: "up" | "down") => {
    const sec = sections.find(s => s.id === secId);
    if (!sec || !sec.items) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sec.items.length) return;

    const newItems = [...sec.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const updatedSections = sections.map(s => {
      if (s.id === secId) return { ...s, items: newItems };
      return s;
    });
    setSections(updatedSections);

    const itemIds = newItems.map(i => i.id);
    await fetch(`/api/admin/learning-path-sections/${secId}/items/reorder`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ itemIds })
    });
  };

  // Upload Asset (PDF or Video)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: "material" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/upload?folder=${folder}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });

      if (!res.ok) throw new Error("File upload failed");
      const data = await res.json();

      if (folder === "material") {
        setItemFileUrl(data.url);
        setItemFileName(data.filename);
      } else {
        setItemVideoUrl(data.url);
        setItemVideoSource("upload");
      }
      showToast(`Uploaded ${data.filename}`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUploadingFile(false);
    }
  };

  // Final Assessment Save
  const handleSaveFinalAssessment = async () => {
    if (!currentPathId) {
      showToast("Please save basic info first", "error");
      return;
    }
    if (!finalAssTitle.trim()) {
      showToast("Final assessment title is required", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/learning-paths/${currentPathId}/final-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: finalAssTitle.trim(),
          description: finalAssDesc.trim(),
          durationMinutes: finalAssDuration,
          passingScore: finalAssPassingScore,
          questions: finalAssQuestions
        })
      });

      if (!res.ok) throw new Error("Failed to save final assessment");
      const created = await res.json();
      setFinalAssessment(created);
      showToast("Final Assessment saved successfully", "success");
      loadValidation(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Publish / Archive Path
  const handlePublishPath = async () => {
    if (!currentPathId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/learning-paths/${currentPathId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || (data.errors ? data.errors.join(", ") : "Failed to publish"));
      }
      const updated = await res.json();
      setStatus("published");
      showToast("🎉 Learning Path published successfully!", "success");
      if (onSaved) onSaved(updated);
      loadValidation(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArchivePath = async () => {
    if (!currentPathId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/learning-paths/${currentPathId}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Failed to archive path");
      setStatus("archived");
      showToast("Learning Path archived", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Student Access Toggles
  const handleToggleStudentAccess = async (studentId: string, currentlyAssigned: boolean) => {
    if (!currentPathId) return;
    try {
      const endpoint = currentlyAssigned
        ? `/api/admin/learning-paths/${currentPathId}/revoke`
        : `/api/admin/learning-paths/${currentPathId}/assign`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ studentIds: [studentId] })
      });

      if (!res.ok) throw new Error("Failed to update access");
      showToast(currentlyAssigned ? "Access revoked" : "Access granted", "success");
      loadStudents(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleBulkAccess = async (assign: boolean) => {
    if (!currentPathId || selectedStudentIds.length === 0) return;
    try {
      const endpoint = assign
        ? `/api/admin/learning-paths/${currentPathId}/assign`
        : `/api/admin/learning-paths/${currentPathId}/revoke`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      });

      if (!res.ok) throw new Error("Bulk action failed");
      showToast(assign ? `Granted access to ${selectedStudentIds.length} students` : `Revoked access for ${selectedStudentIds.length} students`, "success");
      setSelectedStudentIds([]);
      loadStudents(currentPathId);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Question Modal Helpers
  const handleOpenQuestionModal = (target: "item" | "final", index?: number) => {
    setQuestionTarget(target);
    setEditingQuestionIndex(index !== undefined ? index : null);

    const questionsList = target === "item" ? itemQuestions : finalAssQuestions;
    if (index !== undefined && questionsList[index]) {
      const q = questionsList[index];
      setQText(q.questionText);
      setQOptions([...q.options]);
      setQCorrect([...q.correctAnswers]);
      setQPoints(q.points);
      setQExplanation(q.explanation);
      setQDifficulty(q.difficulty);
    } else {
      setQText("");
      setQOptions(["Option A", "Option B", "Option C", "Option D"]);
      setQCorrect(["Option A"]);
      setQPoints(10);
      setQExplanation("");
      setQDifficulty("medium");
    }
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = () => {
    if (!qText.trim()) {
      showToast("Question text is required", "error");
      return;
    }
    if (qCorrect.length === 0) {
      showToast("Please mark at least one correct option", "error");
      return;
    }

    const questionObj = {
      questionText: qText.trim(),
      options: qOptions.filter(o => o.trim().length > 0),
      correctAnswers: qCorrect,
      points: Number(qPoints) || 10,
      explanation: qExplanation.trim(),
      difficulty: qDifficulty
    };

    if (questionTarget === "item") {
      const updated = [...itemQuestions];
      if (editingQuestionIndex !== null) {
        updated[editingQuestionIndex] = questionObj;
      } else {
        updated.push(questionObj);
      }
      setItemQuestions(updated);
    } else {
      const updated = [...finalAssQuestions];
      if (editingQuestionIndex !== null) {
        updated[editingQuestionIndex] = questionObj;
      } else {
        updated.push(questionObj);
      }
      setFinalAssQuestions(updated);
    }

    setShowQuestionModal(false);
  };

  const handleDeleteQuestion = (target: "item" | "final", index: number) => {
    if (target === "item") {
      setItemQuestions(itemQuestions.filter((_, i) => i !== index));
    } else {
      setFinalAssQuestions(finalAssQuestions.filter((_, i) => i !== index));
    }
  };

  // Helper for Markdown insertion
  const insertMarkdownTag = (prefix: string, suffix: string = "") => {
    setItemContent(prev => `${prev}\n${prefix}Sample Text${suffix}`);
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1440px] w-full min-w-0 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 text-sm font-medium transition-all ${
          toastMessage.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Action & Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="Back to Learning Paths"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {title || "New Learning Path"}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                status === "published" 
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : status === "archived"
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {currentPathId ? `ID: ${currentPathId} • ${sections.length} Sections • ${assignedStudentsCount} Students Assigned` : "Create and structure a multi-stage student learning journey"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentPathId && (
            <button
              onClick={() => {
                if (sections[0]?.items?.[0]) {
                  setPreviewActiveItem(sections[0].items[0]);
                }
                setShowStudentPreview(true);
              }}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Student Preview</span>
            </button>
          )}

          <button
            onClick={handleSaveInfo}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Path"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-thin">
        {[
          { id: "info", label: "1. Basic Info", icon: Compass },
          { id: "curriculum", label: `2. Curriculum (${sections.length})`, icon: Layers, disabled: !currentPathId },
          { id: "final-assessment", label: "3. Final Assessment", icon: Award, disabled: !currentPathId },
          { id: "publish", label: "4. Review & Publish", icon: Sparkles, disabled: !currentPathId },
          { id: "access", label: `5. Student Access (${assignedStudentsCount})`, icon: Users, disabled: !currentPathId }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : tab.disabled
                  ? "border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BASIC INFORMATION */}
      {activeTab === "info" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Learning Path Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Path Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Cloud Native DevOps Engineer Track"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  URL Slug (Auto-generated if blank)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="e.g. cloud-native-devops-track"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Software Engineering"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Estimated Completion Duration
                </label>
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={e => setEstimatedDuration(e.target.value)}
                  placeholder="e.g. 10 weeks (40 hours)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value)}
                  placeholder="A one-line punchy summary for the catalog"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detailed overview of what learners will accomplish..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Thumbnail Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={thumbnail}
                    onChange={e => setThumbnail(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100">
                    <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Prerequisites & Requirements
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={reqInput}
                    onChange={e => setReqInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && reqInput.trim()) {
                        e.preventDefault();
                        setRequirements([...requirements, reqInput.trim()]);
                        setReqInput("");
                      }
                    }}
                    placeholder="Type prerequisite and press Enter"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (reqInput.trim()) {
                        setRequirements([...requirements, reqInput.trim()]);
                        setReqInput("");
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {requirements.map((req, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-md flex items-center gap-1.5">
                      {req}
                      <button
                        type="button"
                        onClick={() => setRequirements(requirements.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Learning Objectives */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Key Learning Objectives
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={objInput}
                    onChange={e => setObjInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && objInput.trim()) {
                        e.preventDefault();
                        setLearningObjectives([...learningObjectives, objInput.trim()]);
                        setObjInput("");
                      }
                    }}
                    placeholder="Type objective and press Enter"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (objInput.trim()) {
                        setLearningObjectives([...learningObjectives, objInput.trim()]);
                        setObjInput("");
                      }
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {learningObjectives.map((obj, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs rounded-md flex items-center gap-1.5">
                      {obj}
                      <button
                        type="button"
                        onClick={() => setLearningObjectives(learningObjectives.filter((_, i) => i !== idx))}
                        className="text-blue-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSaveInfo}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{currentPathId ? "Update Path Details" : "Create Path & Continue to Curriculum"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM BUILDER */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Curriculum Structure (Sections & Learning Items)
              </h2>
              <p className="text-xs text-slate-500">
                Organize sequential sections with rich markdown text, videos, PDFs, and checkpoint assessments.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingSectionId(null);
                setSectionTitle("");
                setSectionDescription("");
                setShowSectionModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
              <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Sections Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Begin constructing this learning path by adding your first curriculum section.
              </p>
              <button
                onClick={() => {
                  setEditingSectionId(null);
                  setSectionTitle("");
                  setSectionDescription("");
                  setShowSectionModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                + Add Section 1
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map((section, secIdx) => (
                <div key={section.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  {/* Section Header */}
                  <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {secIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-xs text-slate-500 truncate">{section.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveSection(secIdx, "up")}
                        disabled={secIdx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-sm"
                        title="Move Section Up"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(secIdx, "down")}
                        disabled={secIdx === sections.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-sm"
                        title="Move Section Down"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setSectionTitle(section.title);
                          setSectionDescription(section.description || "");
                          setShowSectionModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-sm ml-1"
                        title="Edit Section"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-sm"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenAddItem(section.id)}
                        className="ml-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Items List */}
                  <div className="p-4 space-y-2">
                    {(!section.items || section.items.length === 0) ? (
                      <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        No learning items in this section. Click "+ Add Item" above.
                      </div>
                    ) : (
                      section.items.map((item, itemIdx) => {
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-3 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono text-slate-400 w-5">
                                {secIdx + 1}.{itemIdx + 1}
                              </span>

                              {/* Item Type Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                                item.type === "text" 
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : item.type === "video"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                  : item.type === "pdf"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}>
                                {item.type === "text" && <FileText className="w-3 h-3" />}
                                {item.type === "video" && <Video className="w-3 h-3" />}
                                {item.type === "pdf" && <File className="w-3 h-3" />}
                                {item.type === "assessment" && <Award className="w-3 h-3" />}
                                <span>{item.type}</span>
                              </span>

                              <div className="min-w-0">
                                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate block">
                                  {item.title}
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <span>{item.durationMinutes} mins</span>
                                  <span>•</span>
                                  <span>{item.isRequired ? "Required" : "Optional"}</span>
                                  {item.type === "assessment" && item.assessment && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600 font-semibold">{item.assessment.questions?.length || 0} Questions</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveItem(section.id, itemIdx, "up")}
                                disabled={itemIdx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-sm"
                                title="Move Item Up"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveItem(section.id, itemIdx, "down")}
                                disabled={itemIdx === (section.items?.length || 0) - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-sm"
                                title="Move Item Down"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditItem(section.id, item)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded-sm ml-1"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-sm"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FINAL ASSESSMENT */}
      {activeTab === "final-assessment" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Learning Path Final Assessment</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates learners at the end of the journey before certifying path completion.
              </p>
            </div>

            <button
              onClick={handleSaveFinalAssessment}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Final Assessment"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  value={finalAssTitle}
                  onChange={e => setFinalAssTitle(e.target.value)}
                  placeholder="e.g. Full Track Certification Exam"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={finalAssDesc}
                  onChange={e => setFinalAssDesc(e.target.value)}
                  placeholder="Explain instructions, rules, and topics covered..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={finalAssDuration}
                    onChange={e => setFinalAssDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={finalAssPassingScore}
                    onChange={e => setFinalAssPassingScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Questions ({finalAssQuestions.length})
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenQuestionModal("final")}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              {finalAssQuestions.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400">
                  No questions configured yet. Click "+ Add Question" to author MCQ questions.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {finalAssQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Q{qIdx + 1}.</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{q.questionText}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Correct: <span className="text-emerald-600 font-semibold">{q.correctAnswers.join(", ")}</span> • {q.points} pts • {q.difficulty}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenQuestionModal("final", qIdx)}
                          className="p-1 text-slate-400 hover:text-blue-600"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion("final", qIdx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEW & PUBLISH */}
      {activeTab === "publish" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Review & Publish Status</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify curriculum readiness before publishing to enrolled students.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {status === "published" ? (
                <button
                  onClick={handleArchivePath}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
                >
                  Archive Path
                </button>
              ) : (
                <button
                  onClick={handlePublishPath}
                  disabled={saving || validationErrors.length > 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish Learning Path</span>
                </button>
              )}
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Publication Requirements Checklist
              </h3>

              <div className="space-y-2">
                {[
                  { label: "Valid Path Title and Description", valid: !!title.trim() && !!description.trim() },
                  { label: "At least one Section added", valid: sections.length > 0 },
                  { label: "At least one Learning Item across sections", valid: sections.some(s => s.items && s.items.length > 0) },
                  { label: "Final Assessment configured", valid: !!finalAssessment || finalAssQuestions.length > 0, warning: true }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.valid 
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300"
                        : item.warning
                        ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300"
                        : "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {item.valid ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className={`w-4 h-4 shrink-0 ${item.warning ? "text-amber-600" : "text-red-600"}`} />
                    )}
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Curriculum Summary
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{sections.length}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">Total Sections</span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {sections.reduce((sum, s) => sum + (s.items?.length || 0), 0)}
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">Total Learning Items</span>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="p-3.5 bg-red-100/60 dark:bg-red-950/40 text-red-800 dark:text-red-300 rounded-lg text-xs space-y-1">
                  <p className="font-bold">Missing requirements before publish:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationWarnings.length > 0 && (
                <div className="p-3.5 bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg text-xs space-y-1">
                  <p className="font-bold">Warnings / Recommendations:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationWarnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STUDENT ACCESS */}
      {activeTab === "access" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Student Access Management</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Explicitly grant or revoke student access to this Learning Path.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedStudentIds.length > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAccess(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Grant Access ({selectedStudentIds.length})
                  </button>
                  <button
                    onClick={() => handleBulkAccess(false)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Revoke Access ({selectedStudentIds.length})
                  </button>
                </>
              )}

              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {accessLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading student roster...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No students found matching your filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedStudentIds(filteredStudents.map(s => s.id));
                          } else {
                            setSelectedStudentIds([]);
                          }
                        }}
                        className="rounded-sm"
                      />
                    </th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Access Status</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Assigned Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map(student => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                              }
                            }}
                            className="rounded-sm"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {student.name}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{student.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                            student.isAssigned
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {student.isAssigned ? "Assigned" : "Not Assigned"}
                          </span>
                        </td>
                        <td className="p-3">
                          {student.isAssigned ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full"
                                  style={{ width: `${student.progressPercent || 0}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono">{student.progressPercent || 0}%</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {student.assignedAt ? new Date(student.assignedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleToggleStudentAccess(student.id, student.isAssigned)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                              student.isAssigned
                                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {student.isAssigned ? "Revoke Access" : "Grant Access"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT SECTION */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingSectionId ? "Edit Section" : "Add New Section"}
              </h3>
              <button
                onClick={() => setShowSectionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Section Title *
                </label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  placeholder="e.g. Core Architecture Patterns"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  value={sectionDescription}
                  onChange={e => setSectionDescription(e.target.value)}
                  placeholder="e.g. Master fundamental architectural concepts"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSectionModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT LEARNING ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingItemId ? "Edit Learning Item" : "Add Learning Item"}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  placeholder="e.g. Microservices vs Monoliths"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Item Type
                </label>
                <select
                  value={itemType}
                  onChange={e => setItemType(e.target.value as LearningPathItemType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-semibold"
                >
                  <option value="text">Rich Markdown Reading Material</option>
                  <option value="video">Video Lesson (YouTube / Vimeo / Upload)</option>
                  <option value="pdf">PDF Document & Study Guide</option>
                  <option value="assessment">In-Section Practice Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Estimated Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={itemDuration}
                  onChange={e => setItemDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isRequiredToggle"
                  checked={itemIsRequired}
                  onChange={e => setItemIsRequired(e.target.checked)}
                  className="rounded-sm"
                />
                <label htmlFor="isRequiredToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Required Item (Must complete to unlock subsequent items)
                </label>
              </div>
            </div>

            {/* CONTENT EDITOR ACCORDING TO TYPE */}
            {itemType === "text" && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Markdown Content & Reading Material
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("**", "**")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("*", "*")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("# ")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="H1"
                    >
                      <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("## ")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="H2"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("- ")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("`", "`")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="Code"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertMarkdownTag("[Link Title](https://example.com)")}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs text-slate-600 dark:text-slate-300"
                      title="Link"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMarkdown(!previewMarkdown)}
                      className={`ml-2 px-2 py-0.5 rounded-sm text-xs font-medium border ${
                        previewMarkdown ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700"
                      }`}
                    >
                      {previewMarkdown ? "Edit Raw" : "Preview"}
                    </button>
                  </div>
                </div>

                {previewMarkdown ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg min-h-[160px] text-sm space-y-2 border border-slate-200 dark:border-slate-700">
                    {itemContent.split("\n").map((line, i) => {
                      if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold text-slate-900 dark:text-white">{line.substring(2)}</h1>;
                      if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold text-slate-800 dark:text-slate-200">{line.substring(3)}</h2>;
                      if (line.startsWith("- ")) return <li key={i} className="text-xs text-slate-700 dark:text-slate-300 ml-4 list-disc">{line.substring(2)}</li>;
                      return <p key={i} className="text-xs text-slate-700 dark:text-slate-300">{line}</p>;
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={7}
                    value={itemContent}
                    onChange={e => setItemContent(e.target.value)}
                    placeholder="Type lesson markdown text..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                  />
                )}
              </div>
            )}

            {itemType === "video" && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="videoSource"
                      checked={itemVideoSource === "youtube"}
                      onChange={() => setItemVideoSource("youtube")}
                    />
                    <span>YouTube URL</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="videoSource"
                      checked={itemVideoSource === "vimeo"}
                      onChange={() => setItemVideoSource("vimeo")}
                    />
                    <span>Vimeo URL</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="videoSource"
                      checked={itemVideoSource === "upload"}
                      onChange={() => setItemVideoSource("upload")}
                    />
                    <span>Upload MP4 Video</span>
                  </label>
                </div>

                {itemVideoSource === "upload" ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={e => handleFileUpload(e, "video")}
                      disabled={uploadingFile}
                      className="text-xs"
                    />
                    {uploadingFile && <span className="text-xs text-blue-600 font-semibold block">Uploading video...</span>}
                    {itemVideoUrl && <p className="text-xs text-slate-500 font-mono">Uploaded: {itemVideoUrl}</p>}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Video Stream URL
                    </label>
                    <input
                      type="text"
                      value={itemVideoUrl}
                      onChange={e => setItemVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {itemType === "pdf" && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Upload PDF Document
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => handleFileUpload(e, "material")}
                    disabled={uploadingFile}
                    className="text-xs"
                  />
                  {uploadingFile && <span className="text-xs text-blue-600 font-semibold block">Uploading PDF...</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Or Direct Document URL
                  </label>
                  <input
                    type="text"
                    value={itemFileUrl}
                    onChange={e => setItemFileUrl(e.target.value)}
                    placeholder="https://.../document.pdf or /storage/materials/..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Display File Name
                  </label>
                  <input
                    type="text"
                    value={itemFileName}
                    onChange={e => setItemFileName(e.target.value)}
                    placeholder="e.g. Architecture-Guide-v1.pdf"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {itemType === "assessment" && (
              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Practice Assessment Questions ({itemQuestions.length})
                    </span>
                    <span className="text-xs text-slate-500 block">Passing score: {itemAssPassingScore}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenQuestionModal("item")}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {itemQuestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      No questions configured yet for this checkpoint quiz.
                    </div>
                  ) : (
                    itemQuestions.map((q, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            Q{idx + 1}: {q.questionText}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            Ans: {q.correctAnswers.join(", ")} ({q.points} pts)
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenQuestionModal("item", idx)}
                            className="p-1 text-slate-400 hover:text-blue-600"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion("item", idx)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Save Learning Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MCQ QUESTION BUILDER */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-5 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingQuestionIndex !== null ? "Edit Question" : "Add MCQ Question"}
              </h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={2}
                  value={qText}
                  onChange={e => setQText(e.target.value)}
                  placeholder="Enter the question..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Options (Radio marks correct answer) *
                </label>
                <div className="space-y-2">
                  {qOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswerOption"
                        checked={qCorrect.includes(opt)}
                        onChange={() => setQCorrect([opt])}
                        className="rounded-full text-blue-600"
                        title="Mark as correct"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const newOpts = [...qOptions];
                          const oldVal = newOpts[oIdx];
                          newOpts[oIdx] = e.target.value;
                          setQOptions(newOpts);
                          if (qCorrect.includes(oldVal)) {
                            setQCorrect([e.target.value]);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                      {qOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = qOptions.filter((_, i) => i !== oIdx);
                            setQOptions(newOpts);
                            if (qCorrect.includes(opt)) {
                              setQCorrect([newOpts[0]]);
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {qOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setQOptions([...qOptions, `Option ${String.fromCharCode(65 + qOptions.length)}`])}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={qPoints}
                    onChange={e => setQPoints(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Difficulty
                  </label>
                  <select
                    value={qDifficulty}
                    onChange={e => setQDifficulty(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Explanation
                </label>
                <input
                  type="text"
                  value={qExplanation}
                  onChange={e => setQExplanation(e.target.value)}
                  placeholder="Why is this the correct answer?"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LIVE STUDENT PREVIEW */}
      {showStudentPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Student View Preview</span>
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{title}</h3>
              </div>
              <button
                onClick={() => setShowStudentPreview(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200"
              >
                Exit Preview
              </button>
            </div>

            {/* Split Screen Player Simulation */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar */}
              <div className="w-72 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/50">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Curriculum Path</span>
                  <p className="text-xs text-slate-500">{sections.length} Sections • Linear Progression</p>
                </div>

                <div className="space-y-3">
                  {sections.map((sec, sIdx) => (
                    <div key={sec.id} className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                        {sIdx + 1}. {sec.title}
                      </span>
                      <div className="space-y-1 pl-2">
                        {sec.items?.map(it => {
                          const isSelected = previewActiveItem?.id === it.id;
                          return (
                            <button
                              key={it.id}
                              onClick={() => setPreviewActiveItem(it)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className="truncate">{it.title}</span>
                              <span className="text-[10px] opacity-75">{it.type}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 overflow-y-auto">
                {previewActiveItem ? (
                  <div className="max-w-3xl space-y-6">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{previewActiveItem.type} lesson</span>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{previewActiveItem.title}</h2>
                      <span className="text-xs text-slate-400 font-mono">{previewActiveItem.durationMinutes} minutes duration</span>
                    </div>

                    {previewActiveItem.type === "text" && (
                      <div className="prose dark:prose-invert text-xs space-y-2">
                        {previewActiveItem.content?.split("\n").map((line, idx) => {
                          if (line.startsWith("# ")) return <h1 key={idx} className="text-lg font-bold mt-3 text-slate-900 dark:text-white">{line.substring(2)}</h1>;
                          if (line.startsWith("## ")) return <h2 key={idx} className="text-base font-bold mt-2 text-slate-800 dark:text-slate-200">{line.substring(3)}</h2>;
                          if (line.startsWith("- ")) return <li key={idx} className="text-xs ml-4 list-disc text-slate-700 dark:text-slate-300">{line.substring(2)}</li>;
                          return <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{line}</p>;
                        })}
                      </div>
                    )}

                    {previewActiveItem.type === "video" && (
                      <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                        {previewActiveItem.videoSource === "upload" ? (
                          <video src={previewActiveItem.videoUrl} controls className="w-full h-full" />
                        ) : previewActiveItem.videoUrl?.includes("youtube.com") || previewActiveItem.videoUrl?.includes("youtu.be") ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${previewActiveItem.videoUrl.split("v=")[1]?.split("&")[0] || ""}`}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        ) : (
                          <div className="text-white text-xs">Video preview for {previewActiveItem.videoUrl}</div>
                        )}
                      </div>
                    )}

                    {previewActiveItem.type === "pdf" && (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                        <File className="w-12 h-12 text-rose-500 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{previewActiveItem.fileName || "Study Document"}</h4>
                        <div className="flex justify-center gap-3">
                          <a
                            href={previewActiveItem.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Document</span>
                          </a>
                          <a
                            href={previewActiveItem.fileUrl}
                            download
                            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {previewActiveItem.type === "assessment" && previewActiveItem.assessment && (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
                          <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Practice Quiz Simulation</h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                            {previewActiveItem.assessment.questions?.length || 0} Questions • Passing: {previewActiveItem.assessment.passingScore}%
                          </p>
                        </div>

                        <div className="space-y-3">
                          {previewActiveItem.assessment.questions?.map((q, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">Q{i + 1}. {q.questionText}</span>
                              <div className="space-y-1.5 pl-2">
                                {q.options?.map((opt, oi) => (
                                  <label key={oi} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <input type="radio" name={`prev-q-${i}`} disabled />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Select an item on the left to preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
