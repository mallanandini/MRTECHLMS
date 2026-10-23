/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../mysql.js";
import { 
  coursesDb, modulesDb, lessonsDb, enrollmentsDb, progressDb, 
  assessmentsDb, questionsDb, reviewsDb, submissionsDb 
} from "../db.js";
import { 
  Course, Module, Lesson, LessonType, Enrollment, 
  Progress, Assessment, UserRole 
} from "../../src/types.js";
import { GamificationService } from "./gamification.service.js";

export interface CourseValidationResult {
  valid: boolean;
  issues: string[];
  moduleCount: number;
  lessonCount: number;
}

export class CourseService {
  /**
   * Validate course readiness for publication.
   * Checks course metadata, published modules, published lessons, and activity content.
   */
  static async validateCourseForPublishing(courseId: string): Promise<CourseValidationResult> {
    const issues: string[] = [];
    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      return { valid: false, issues: ["Course not found"], moduleCount: 0, lessonCount: 0 };
    }

    if (!course.title || course.title.trim().length < 3) {
      issues.push("Course title must be at least 3 characters long.");
    }
    if (!course.description && !course.shortDescription) {
      issues.push("Course must have a description or short overview.");
    }
    if (!course.category || !course.category.trim()) {
      issues.push("Course category is required.");
    }
    if (!course.thumbnail || !course.thumbnail.trim()) {
      issues.push("Course thumbnail image URL is required.");
    }

    const allModules = await modulesDb.find({ courseId });
    const publishedModules = allModules.filter(m => (m.status || "published") === "published");

    if (publishedModules.length === 0) {
      issues.push("Course must have at least one published module.");
    }

    const allLessons = await lessonsDb.find({ courseId });
    const publishedLessons = allLessons.filter(l => (l.status || "published") === "published");

    if (publishedLessons.length === 0) {
      issues.push("Course must have at least one published lesson.");
    }

    // Verify each published module has at least one published lesson
    for (const mod of publishedModules) {
      const modLessons = publishedLessons.filter(l => l.moduleId === mod.id);
      if (modLessons.length === 0) {
        issues.push(`Module "${mod.title}" has no published lessons.`);
      }
    }

    // Verify activity content for each published lesson
    for (const les of publishedLessons) {
      switch (les.type) {
        case LessonType.VIDEO:
          if (!les.videoUrl || !les.videoUrl.trim()) {
            issues.push(`Video lesson "${les.title}" is missing a valid video URL.`);
          }
          break;
        case LessonType.PDF:
          if ((!les.fileUrl || !les.fileUrl.trim()) && (!les.materialUrl || !les.materialUrl.trim()) && (!les.content || !les.content.trim())) {
            issues.push(`PDF lesson "${les.title}" is missing a document file or material URL.`);
          }
          break;
        case LessonType.IMAGE:
          if ((!les.fileUrl || !les.fileUrl.trim()) && (!les.materialUrl || !les.materialUrl.trim()) && (!les.content || !les.content.trim())) {
            issues.push(`Image lesson "${les.title}" is missing an image URL.`);
          }
          break;
        case LessonType.TEXT:
          if (!les.content || les.content.trim().length < 10) {
            issues.push(`Text lesson "${les.title}" is missing substantive reading content.`);
          }
          break;
        case LessonType.CODING:
          if (!les.codingPrompt && (!les.content || les.content.trim().length < 10)) {
            issues.push(`Coding lesson "${les.title}" is missing coding problem specifications.`);
          }
          break;
        case LessonType.ASSESSMENT:
          if (!les.assessmentId) {
            // Check if there is an assessment attached by lessonId
            const attached = await assessmentsDb.findOne({ lessonId: les.id });
            if (!attached) {
              issues.push(`Assessment lesson "${les.title}" is missing an assigned assessment or quiz.`);
            }
          }
          break;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      moduleCount: publishedModules.length,
      lessonCount: publishedLessons.length
    };
  }

  /**
   * Publish a course after enforcing content validation rules.
   * Increments course version safely preserving existing student progress.
   */
  static async publishCourse(
    courseId: string, 
    options: { incrementVersion?: boolean } = {}
  ): Promise<{ success: boolean; course?: Course; issues?: string[] }> {
    const validation = await this.validateCourseForPublishing(courseId);
    if (!validation.valid) {
      return { success: false, issues: validation.issues };
    }

    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      return { success: false, issues: ["Course not found"] };
    }

    const currentVersion = Number(course.version) || 1;
    const newVersion = (options.incrementVersion || course.status === "published") 
      ? currentVersion + 1 
      : currentVersion;

    const updated = await coursesDb.update(courseId, {
      status: "published",
      version: newVersion,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      course: updated || undefined
    };
  }

  /**
   * Reorder modules within a course.
   */
  static async reorderModules(courseId: string, moduleIds: string[]): Promise<boolean> {
    for (let i = 0; i < moduleIds.length; i++) {
      const modId = moduleIds[i];
      await modulesDb.update(modId, { order: i + 1 });
    }
    return true;
  }

  /**
   * Reorder lessons within a module.
   */
  static async reorderLessons(moduleId: string, lessonIds: string[]): Promise<boolean> {
    for (let i = 0; i < lessonIds.length; i++) {
      const lesId = lessonIds[i];
      await lessonsDb.update(lesId, { order: i + 1 });
    }
    return true;
  }

  /**
   * Duplicate a lesson with its content and attached practice assessments.
   */
  static async duplicateLesson(lessonId: string): Promise<Lesson> {
    const original = await lessonsDb.findOne({ id: lessonId });
    if (!original) {
      throw new Error("Lesson not found");
    }

    const siblings = await lessonsDb.find({ moduleId: original.moduleId });
    const maxOrder = siblings.reduce((max, s) => Math.max(max, s.order || 0), 0);

    const newLessonId = crypto.randomUUID();
    const duplicatedLesson = await lessonsDb.insert({
      id: newLessonId,
      moduleId: original.moduleId,
      courseId: original.courseId,
      title: `${original.title} (Copy)`,
      description: original.description || "",
      type: original.type,
      content: original.content || "",
      videoUrl: original.videoUrl || "",
      fileUrl: original.fileUrl || "",
      materialTitle: original.materialTitle ? `${original.materialTitle} (Copy)` : "",
      materialUrl: original.materialUrl || "",
      codingPrompt: original.codingPrompt,
      assessmentId: original.assessmentId,
      order: maxOrder + 1,
      durationMinutes: original.durationMinutes || 10,
      status: "published"
    });

    // If original had an attached practice test, duplicate it as well
    const originalTest = await assessmentsDb.findOne({ lessonId: original.id });
    if (originalTest) {
      const newTestId = crypto.randomUUID();
      await assessmentsDb.insert({
        id: newTestId,
        courseId: original.courseId,
        moduleId: original.moduleId,
        lessonId: newLessonId,
        type: originalTest.type,
        title: `${originalTest.title} (Copy)`,
        description: originalTest.description,
        durationMinutes: originalTest.durationMinutes,
        passingScore: originalTest.passingScore,
        totalPoints: originalTest.totalPoints,
        questionsCount: originalTest.questionsCount,
        status: originalTest.status,
        createdAt: new Date().toISOString()
      });

      // Duplicate questions
      const questions = await questionsDb.find({ assessmentId: originalTest.id });
      for (const q of questions) {
        await questionsDb.insert({
          id: crypto.randomUUID(),
          assessmentId: newTestId,
          questionText: q.questionText,
          type: q.type,
          options: q.options,
          correctAnswers: q.correctAnswers,
          points: q.points,
          negativePoints: q.negativePoints,
          explanation: q.explanation,
          difficulty: q.difficulty,
          order: q.order
        });
      }
    }

    return duplicatedLesson;
  }

  /**
   * Soft-delete a module and all associated lessons.
   */
  static async softDeleteModule(moduleId: string): Promise<boolean> {
    const mod = await modulesDb.findOne({ id: moduleId });
    if (!mod) return false;

    const lessons = await lessonsDb.find({ moduleId });
    for (const les of lessons) {
      await this.softDeleteLesson(les.id);
    }

    return modulesDb.softDelete(moduleId);
  }

  /**
   * Soft-delete a lesson and any attached assessments.
   */
  static async softDeleteLesson(lessonId: string): Promise<boolean> {
    const lesson = await lessonsDb.findOne({ id: lessonId });
    if (!lesson) return false;

    const test = await assessmentsDb.findOne({ lessonId });
    if (test) {
      await assessmentsDb.softDelete(test.id);
    }

    return lessonsDb.softDelete(lessonId);
  }

  /**
   * Evaluate course completion for a student.
   * A course is completed if and only if:
   * 1. All published lessons within published modules have completed = true.
   * 2. If the course has a Course Final Exam (type = 'course_final' or course.finalAssessmentId),
   *    the student has submitted and passed that final assessment.
   */
  static async evaluateCourseCompletion(
    studentId: string, 
    courseId: string
  ): Promise<{
    isCourseCompleted: boolean;
    courseProgressPercentage: number;
    completedCount: number;
    totalLessons: number;
    finalAssessmentRequired: boolean;
    finalAssessmentPassed: boolean;
  }> {
    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      return {
        isCourseCompleted: false,
        courseProgressPercentage: 0,
        completedCount: 0,
        totalLessons: 0,
        finalAssessmentRequired: false,
        finalAssessmentPassed: false
      };
    }

    const allModules = await modulesDb.find({ courseId });
    const publishedModuleIds = new Set(
      allModules.filter(m => (m.status || "published") === "published").map(m => m.id)
    );

    const allLessons = await lessonsDb.find({ courseId });
    const publishedLessons = allLessons.filter(l => 
      publishedModuleIds.has(l.moduleId) && (l.status || "published") === "published"
    );
    const totalLessons = publishedLessons.length;
    const publishedLessonIds = new Set(publishedLessons.map(l => l.id));

    // Count student's completed published lessons
    const studentAllProgress = await progressDb.find({ studentId, courseId });
    const completedCount = studentAllProgress.filter(p => p.completed && publishedLessonIds.has(p.lessonId)).length;

    const courseProgressPercentage = totalLessons > 0 
      ? Math.min(100, Math.round((completedCount / totalLessons) * 100))
      : 0;

    // Check Course Final Exam
    const finalAssessment = await assessmentsDb.findOne({ courseId, type: "course_final" });
    const finalAssessmentId = finalAssessment?.id || (course as any).finalAssessmentId;
    const finalAssessmentRequired = Boolean(finalAssessmentId);
    let finalAssessmentPassed = false;

    if (finalAssessmentRequired && finalAssessmentId) {
      const passingSub = await submissionsDb.findOne({
        assessmentId: finalAssessmentId,
        studentId,
        passed: true
      });
      finalAssessmentPassed = Boolean(passingSub);
    }

    const allLessonsCompleted = totalLessons > 0 ? completedCount >= totalLessons : true;
    const finalExamSatisfied = !finalAssessmentRequired || finalAssessmentPassed;

    // Course is completed IF AND ONLY IF all lessons are completed AND the required final exam is passed
    const isCourseCompleted = allLessonsCompleted && finalExamSatisfied;

    const enrollment = await enrollmentsDb.findOne({ studentId, courseId });
    if (enrollment) {
      const now = new Date().toISOString();
      const wasCompleted = Boolean(enrollment.completedAt);

      await enrollmentsDb.update(enrollment.id, {
        progressPercentage: courseProgressPercentage,
        completedAt: isCourseCompleted ? (enrollment.completedAt || now) : undefined,
        status: enrollment.status === "revoked" ? "revoked" : (isCourseCompleted ? "completed" : (courseProgressPercentage > 0 ? "in_progress" : (enrollment.status || "assigned")))
      });

      if (isCourseCompleted && !wasCompleted) {
        const orgId = enrollment.organizationId || (course as any)?.organizationId || "org-default";
        GamificationService.awardPointsForEvent({
          organizationId: orgId,
          studentId,
          eventType: "course_completed",
          eventReferenceId: courseId,
          description: `Completed course: ${course.title || courseId}`
        }).catch(err => console.warn("[Gamification] Course points award failed:", err));
      }
    }

    return {
      isCourseCompleted,
      courseProgressPercentage,
      completedCount,
      totalLessons,
      finalAssessmentRequired,
      finalAssessmentPassed
    };
  }

  /**
   * Record lesson progress and calculate course completion percentage reliably.
   * Progress % = (completed_published_lessons / total_published_lessons) * 100.
   */
  static async recordLessonProgress(
    studentId: string, 
    lessonId: string, 
    updates: {
      completed?: boolean;
      timeSpentSeconds?: number;
      progressPercent?: number;
      lastPositionSeconds?: number;
      event?: string;
      isAssessmentPassed?: boolean;
    }
  ): Promise<{ 
    progress: Progress; 
    courseProgressPercentage: number; 
    isCourseCompleted: boolean 
  }> {
    const lesson = await lessonsDb.findOne({ id: lessonId });
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Verify access
    const access = await this.checkCourseAccess({ id: studentId, role: UserRole.STUDENT }, lesson.courseId);
    if (!access.allowed) {
      throw new Error(access.message || "Access denied. You are not enrolled in this course.");
    }

    let enrollment = await enrollmentsDb.findOne({ studentId, courseId: lesson.courseId });
    if (!enrollment) {
      const course = await coursesDb.findOne({ id: lesson.courseId });
      enrollment = await enrollmentsDb.insert({
        organizationId: course?.organizationId || "org-default",
        studentId,
        courseId: lesson.courseId,
        enrolledAt: new Date().toISOString(),
        status: "assigned",
        assignedBy: "batch_system",
        assignedAt: new Date().toISOString(),
        assignmentSource: "batch",
        progressPercentage: 0
      });
    }

    const existingProgress = await progressDb.findOne({ studentId, lessonId });
    const additionalTime = updates.timeSpentSeconds !== undefined ? Math.max(0, Number(updates.timeSpentSeconds)) : 0;
    const timeSpentSeconds = (existingProgress?.timeSpentSeconds || 0) + additionalTime;

    // 1. IMMUTABLE RULE: A student CANNOT revert or undo a completed lesson
    let isCompleted = existingProgress ? Boolean(existingProgress.completed) : false;

    // 2. AUTOMATIC COMPLETION ENFORCEMENT: Server validates actual event & consumption
    if (!isCompleted) {
      const incomingProgressPercent = updates.progressPercent !== undefined ? Math.max(0, Math.min(100, Number(updates.progressPercent))) : 0;
      const incomingPositionSeconds = updates.lastPositionSeconds !== undefined ? Math.max(0, Number(updates.lastPositionSeconds)) : 0;

      switch (lesson.type) {
        case LessonType.VIDEO: {
          // Rule: Video reaches >= 90% progress, or position reaches >= 90% of duration, or natural ended event
          const durationSeconds = (Number(lesson.durationMinutes) || 0) * 60;
          const reaches90Percent = incomingProgressPercent >= 90;
          const reachesDuration90 = durationSeconds > 0 && incomingPositionSeconds >= durationSeconds * 0.9;
          const naturalEnd = updates.event === "video_ended";

          if (reaches90Percent || reachesDuration90 || naturalEnd) {
            isCompleted = true;
          }
          break;
        }

        case LessonType.TEXT: {
          // Rule: Text reading reaches >= 90% scroll or material_read event with cumulative reading time >= 5s
          const scrollDone = incomingProgressPercent >= 90 || updates.event === "material_read";
          const hasTime = timeSpentSeconds >= 5;

          if (scrollDone && hasTime) {
            isCompleted = true;
          }
          break;
        }

        case LessonType.PDF: {
          // Rule: PDF material viewed/scrolled >= 90% or material_read event with cumulative reading time >= 5s
          const pdfDone = incomingProgressPercent >= 90 || updates.event === "material_read";
          const hasTime = timeSpentSeconds >= 5;

          if (pdfDone && hasTime) {
            isCompleted = true;
          }
          break;
        }

        case LessonType.IMAGE: {
          // Rule: Image inspected with scroll/view >= 90% or viewing time >= 5s
          const imgDone = incomingProgressPercent >= 90 || updates.event === "material_read";
          const hasTime = timeSpentSeconds >= 5;

          if (imgDone || hasTime) {
            isCompleted = true;
          }
          break;
        }

        case LessonType.CODING: {
          // Rule: Coding exercise problem specifications reviewed & worked on (viewed + >= 5s)
          const codeDone = incomingProgressPercent >= 90 || updates.event === "material_read";
          const hasTime = timeSpentSeconds >= 5;

          if (codeDone && hasTime) {
            isCompleted = true;
          }
          break;
        }

        case LessonType.ASSESSMENT: {
          // Rule: Must be validated via an actual passing submission in submissionsDb
          const targetAssessmentId = lesson.assessmentId || (await assessmentsDb.findOne({ lessonId: lesson.id }))?.id;
          if (targetAssessmentId) {
            const passedSubmission = await submissionsDb.findOne({
              assessmentId: targetAssessmentId,
              studentId,
              passed: true
            });
            if (passedSubmission) {
              isCompleted = true;
            }
          }
          break;
        }

        default: {
          if (incomingProgressPercent >= 90 && timeSpentSeconds >= 5) {
            isCompleted = true;
          }
          break;
        }
      }

      // If the lesson has an attached practice test (assessment attached by lessonId),
      // that practice test MUST be submitted and passed before the lesson can be completed!
      const attachedPracticeTest = await assessmentsDb.findOne({ lessonId: lesson.id });
      if (attachedPracticeTest) {
        const passedPractice = await submissionsDb.findOne({
          assessmentId: attachedPracticeTest.id,
          studentId,
          passed: true
        });
        if (!passedPractice) {
          isCompleted = false;
        }
      }
    }

    // Determine status enum
    let status: "not_started" | "in_progress" | "completed" = "not_started";
    if (isCompleted) {
      status = "completed";
    } else if (
      (updates.progressPercent && updates.progressPercent > 0) || 
      (updates.lastPositionSeconds && updates.lastPositionSeconds > 0) ||
      timeSpentSeconds > 0 ||
      (existingProgress && (existingProgress.progressPercent || 0) > 0)
    ) {
      status = "in_progress";
    }

    const progressPercent = isCompleted 
      ? 100 
      : (updates.progressPercent !== undefined ? updates.progressPercent : (existingProgress?.progressPercent || 0));

    const lastPositionSeconds = updates.lastPositionSeconds !== undefined
      ? updates.lastPositionSeconds
      : (existingProgress?.lastPositionSeconds || 0);

    const now = new Date().toISOString();

    let savedProgress: Progress;
    if (existingProgress) {
      const updated = await progressDb.update(existingProgress.id, {
        completed: isCompleted,
        completedAt: isCompleted ? (existingProgress.completedAt || now) : undefined,
        status,
        progressPercent,
        lastPositionSeconds,
        timeSpentSeconds,
        lastAccessedAt: now
      });
      savedProgress = updated!;
    } else {
      savedProgress = await progressDb.insert({
        studentId,
        courseId: lesson.courseId,
        lessonId,
        completed: isCompleted,
        completedAt: isCompleted ? now : undefined,
        status,
        progressPercent,
        lastPositionSeconds,
        timeSpentSeconds,
        lastAccessedAt: now
      });
    }

    // Gamification Integration (Controlled server-side awards)
    if (isCompleted && (!existingProgress || !existingProgress.completed)) {
      coursesDb.findOne({ id: lesson.courseId }).then(course => {
        const orgId = enrollment.organizationId || (course as any)?.organizationId || "org-default";
        GamificationService.awardPointsForEvent({
          organizationId: orgId,
          studentId,
          eventType: "lesson_completed",
          eventReferenceId: `${lesson.courseId}:${lessonId}`,
          description: `Completed lesson: ${lesson.title || lessonId}`
        }).catch(err => console.warn("[Gamification] Lesson points award failed:", err));
      }).catch(err => console.warn("[Gamification] Course lookup failed:", err));
    }

    // Recalculate Course Progress & Completion
    const courseEval = await CourseService.evaluateCourseCompletion(studentId, lesson.courseId);

    // Update last accessed lesson pointer on enrollment
    await enrollmentsDb.update(enrollment.id, {
      lastLessonId: lessonId,
      lastAccessedAt: now
    });

    return {
      progress: savedProgress,
      courseProgressPercentage: courseEval.courseProgressPercentage,
      isCourseCompleted: courseEval.isCourseCompleted
    };
  }

  /**
   * Retrieve student resume state for seamless continuation of learning.
   */
  static async getResumePosition(studentId: string, courseId: string): Promise<{
    lastLessonId: string | null;
    lastLesson?: Lesson | null;
    lastPositionSeconds: number;
    progressPercentage: number;
    completed: boolean;
    lastAccessedAt: string | null;
  }> {
    const access = await this.checkCourseAccess({ id: studentId, role: UserRole.STUDENT }, courseId);
    if (!access.allowed) {
      throw new Error(access.message || "Access denied. You are not enrolled in this course.");
    }

    let enrollment = await enrollmentsDb.findOne({ studentId, courseId });
    if (!enrollment) {
      const course = await coursesDb.findOne({ id: courseId });
      enrollment = await enrollmentsDb.insert({
        organizationId: course?.organizationId || "org-default",
        studentId,
        courseId,
        enrolledAt: new Date().toISOString(),
        status: "assigned",
        assignedBy: "batch_system",
        assignedAt: new Date().toISOString(),
        assignmentSource: "batch",
        progressPercentage: 0
      });
    }

    let targetLessonId = enrollment.lastLessonId || null;
    let positionSeconds = 0;

    // Verify if last lesson still exists and is not soft deleted
    if (targetLessonId) {
      const lesson = await lessonsDb.findOne({ id: targetLessonId });
      if (lesson) {
        const prog = await progressDb.findOne({ studentId, lessonId: targetLessonId });
        positionSeconds = prog?.lastPositionSeconds || 0;
      } else {
        targetLessonId = null;
      }
    }

    // Fallback: pick the first published lesson in the course
    if (!targetLessonId) {
      const allModules = await modulesDb.find({ courseId });
      const sortedModules = allModules
        .filter(m => (m.status || "published") === "published")
        .sort((a, b) => a.order - b.order);

      for (const mod of sortedModules) {
        const modLessons = await lessonsDb.find({ moduleId: mod.id });
        const publishedLessons = modLessons
          .filter(l => (l.status || "published") === "published")
          .sort((a, b) => a.order - b.order);

        if (publishedLessons.length > 0) {
          targetLessonId = publishedLessons[0].id;
          break;
        }
      }
    }

    let targetLesson = null;
    if (targetLessonId) {
      targetLesson = await lessonsDb.findOne({ id: targetLessonId });
    }

    return {
      lastLessonId: targetLessonId,
      lastLesson: targetLesson,
      lastPositionSeconds: positionSeconds,
      progressPercentage: enrollment.progressPercentage || 0,
      completed: !!enrollment.completedAt,
      lastAccessedAt: enrollment.lastAccessedAt || null
    };
  }

  /**
   * Check access permissions for a course based on lifecycle status and multi-tenant rules.
   */
  static async checkCourseAccess(
    user: { id: string; role: string; organizationId?: string },
    courseId: string
  ): Promise<{ allowed: boolean; status: number; message?: string; course?: Course; enrollment?: Enrollment }> {
    const course = await coursesDb.findOne({ id: courseId });
    if (!course) {
      return { allowed: false, status: 404, message: "Course not found" };
    }

    // Admins and Trainers have full management and preview access
    if (user.role === UserRole.ADMIN || user.role === "super_admin" || user.role === UserRole.TRAINER) {
      return { allowed: true, status: 200, course };
    }

    // Students:
    // 1. Cannot access Draft or Review courses
    if (course.status === "draft" || course.status === "review" || course.status === "rejected") {
      return { 
        allowed: false, 
        status: 403, 
        message: "This course is currently in draft or review mode and is not accessible to students." 
      };
    }

    // 2. Tenant isolation check
    if (
      course.organizationId && 
      user.organizationId && 
      course.organizationId !== "org-default" && 
      user.organizationId !== "org-default" &&
      course.organizationId !== user.organizationId
    ) {
      return { 
        allowed: false, 
        status: 403, 
        message: "Access denied. Course belongs to a different organization." 
      };
    }

    // 3. Enrollment check
    const enrollment = await enrollmentsDb.findOne({ studentId: user.id, courseId: course.id });
    let hasBatchAccess = false;
    const [batchRows]: any = await pool.query(`
      SELECT b.id, b.name
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.courseId = ? AND bc.status = 'active'
      WHERE bs.studentId = ?
        AND bs.status = 'active'
        AND b.status = 'active'
        AND b.deletedAt IS NULL
        AND (b.courseId = ? OR bc.courseId = ?)
      LIMIT 1
    `, [course.id, user.id, course.id, course.id]);

    if (batchRows && batchRows.length > 0) {
      hasBatchAccess = true;
    }

    if (!enrollment && !hasBatchAccess) {
      return { 
        allowed: false, 
        status: 403, 
        message: "Access denied. You are not enrolled in this course. Please contact your LMS Administrator." 
      };
    }

    // 4. Revocation check: explicit student revocation overrides batch access
    if (enrollment && enrollment.status === "revoked" && !enrollment.deletedAt) {
      return { 
        allowed: false, 
        status: 403, 
        message: `Access denied. Course access has been revoked: ${enrollment.revocationReason || "Contact your LMS administrator."}` 
      };
    }

    // 5. Due date & expiration check
    if (enrollment?.dueDate && new Date(enrollment.dueDate) < new Date() && !enrollment.completedAt && (enrollment.progressPercentage || 0) < 100) {
      return {
        allowed: false,
        status: 403,
        message: `Course assignment expired on ${enrollment.dueDate}. Please contact your administrator for an extension.`
      };
    }

    // 6. If archived: Enrolled students have historical read-only access
    return { allowed: true, status: 200, course, enrollment };
  }
}
