/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { createRateLimiter } from "../rateLimiter.js";
import { AiCourseGeneratorService } from "../services/ai/ai-course-generator.service.js";
import { AiQuizGeneratorService } from "../services/ai/ai-quiz-generator.service.js";
import { AiLessonTutorService } from "../services/ai/ai-lesson-tutor.service.js";
import { AiCodingHintsService } from "../services/ai/ai-coding-hints.service.js";
import { AiAssessmentExplainerService } from "../services/ai/ai-assessment-explainer.service.js";
import { AiSkillGapService } from "../services/ai/ai-skill-gap.service.js";
import { UserRole } from "../../src/types.js";
import { AiQuotaService } from "../services/ai/ai-quota.service.js";

export const aiRouter = express.Router();

// Strict rate limiter for AI operations: 30 requests per minute per client IP
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxAttempts: 30,
  message: "Too many AI requests. Please slow down and try again shortly."
});

// ============================================================================
// 1. AI COURSE GENERATOR (HUMAN REVIEW ENFORCED)
// ============================================================================

/**
 * POST /api/ai/courses/generate
 * Admin triggers course draft syllabus generation.
 * Result stays in 'draft' status until explicitly reviewed and published.
 */
aiRouter.post("/ai/courses/generate", authenticateToken, requireAdmin, aiRateLimiter.middleware, async (req, res) => {
  try {
    const { topic, targetAudience, difficulty, durationHours, learningObjectives } = req.body;
    if (!topic || !targetAudience) {
      return res.status(400).json({ error: "Topic and targetAudience are required." });
    }

    aiRateLimiter.recordHit(req);
    const orgId = req.user!.organizationId || "org-default";

    const draft = await AiCourseGeneratorService.generateDraftCourse({
      organizationId: orgId,
      adminUserId: req.user!.id,
      input: {
        topic,
        targetAudience,
        difficulty: difficulty || "intermediate",
        durationHours: Number(durationHours) || 10,
        learningObjectives: Array.isArray(learningObjectives) ? learningObjectives : [learningObjectives].filter(Boolean)
      }
    });

    res.status(201).json(draft);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to generate course draft." });
  }
});

/**
 * GET /api/ai/courses/drafts
 * List all generated course drafts pending review.
 */
aiRouter.get("/ai/courses/drafts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const drafts = await AiCourseGeneratorService.getDrafts(orgId);
    res.json(drafts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list course drafts." });
  }
});

/**
 * GET /api/ai/courses/drafts/:id
 * Retrieve a specific course draft by ID.
 */
aiRouter.get("/ai/courses/drafts/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const draft = await AiCourseGeneratorService.getDraftById(req.params.id, orgId);
    if (!draft) {
      return res.status(404).json({ error: "Course draft not found." });
    }
    res.json(draft);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch course draft." });
  }
});

/**
 * POST /api/ai/courses/drafts/:id/publish
 * HUMAN REVIEW STEP: Admin approves and publishes the draft course into the LMS catalog.
 */
aiRouter.post("/ai/courses/drafts/:id/publish", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const result = await AiCourseGeneratorService.publishDraft(req.params.id, orgId, req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to publish course draft." });
  }
});

/**
 * POST /api/ai/courses/drafts/:id/reject
 * Admin rejects a generated course draft.
 */
aiRouter.post("/ai/courses/drafts/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const success = await AiCourseGeneratorService.rejectDraft(req.params.id, orgId);
    res.json({ success, message: "Draft course rejected." });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to reject draft." });
  }
});

// ============================================================================
// 2. AI QUIZ GENERATOR (HUMAN REVIEW ENFORCED)
// ============================================================================

/**
 * POST /api/ai/quizzes/generate
 * Admin generates quiz questions from course/lesson material.
 * Stays in 'draft' status until reviewed.
 */
aiRouter.post("/ai/quizzes/generate", authenticateToken, requireAdmin, aiRateLimiter.middleware, async (req, res) => {
  try {
    const { courseId, lessonId, questionsCount, difficulty } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required." });
    }

    aiRateLimiter.recordHit(req);
    const orgId = req.user!.organizationId || "org-default";

    const draft = await AiQuizGeneratorService.generateDraftQuiz({
      organizationId: orgId,
      adminUserId: req.user!.id,
      input: {
        courseId,
        lessonId,
        questionsCount: Number(questionsCount) || 5,
        difficulty: difficulty || "intermediate"
      }
    });

    res.status(201).json(draft);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to generate quiz draft." });
  }
});

/**
 * GET /api/ai/quizzes/drafts
 * List all quiz drafts pending review.
 */
aiRouter.get("/ai/quizzes/drafts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const drafts = await AiQuizGeneratorService.getDrafts(orgId);
    res.json(drafts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list quiz drafts." });
  }
});

/**
 * POST /api/ai/quizzes/drafts/:id/publish
 * HUMAN REVIEW STEP: Admin approves quiz draft and publishes into assessment question bank.
 */
aiRouter.post("/ai/quizzes/drafts/:id/publish", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { assessmentTitle } = req.body;
    const result = await AiQuizGeneratorService.publishDraft(req.params.id, orgId, req.user!.id, assessmentTitle);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to publish quiz draft." });
  }
});

/**
 * POST /api/ai/quizzes/drafts/:id/reject
 * Admin rejects a generated quiz draft.
 */
aiRouter.post("/ai/quizzes/drafts/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const success = await AiQuizGeneratorService.rejectDraft(req.params.id, orgId);
    res.json({ success, message: "Draft quiz rejected." });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to reject quiz draft." });
  }
});

// ============================================================================
// 3. LESSON-SCOPED AI TUTOR
// ============================================================================

/**
 * POST /api/ai/tutor/chat
 * Student asks question strictly scoped to the active lesson and course.
 */
aiRouter.post("/ai/tutor/chat", authenticateToken, aiRateLimiter.middleware, async (req, res) => {
  try {
    const { lessonId, question, chatHistory } = req.body;
    if (!lessonId || !question) {
      return res.status(400).json({ error: "lessonId and question are required." });
    }

    aiRateLimiter.recordHit(req);
    const orgId = req.user!.organizationId || "org-default";

    const result = await AiLessonTutorService.askLessonTutor({
      userId: req.user!.id,
      organizationId: orgId,
      lessonId,
      question,
      chatHistory
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Tutor query failed." });
  }
});

// ============================================================================
// 4. CODING CHALLENGE HINTS (NO SPOILERS)
// ============================================================================

/**
 * POST /api/ai/coding/hint
 * Student requests Socratic guidance for a coding challenge.
 * Complete solutions and copy-paste code are strictly prevented.
 */
aiRouter.post("/ai/coding/hint", authenticateToken, aiRateLimiter.middleware, async (req, res) => {
  try {
    const { challengeId, challengeTitle, problemDescription, language, studentCode, errorOutput, hintLevel } = req.body;
    if (!challengeId) {
      return res.status(400).json({ error: "challengeId is required." });
    }

    aiRateLimiter.recordHit(req);
    const orgId = req.user!.organizationId || "org-default";

    const hint = await AiCodingHintsService.generateHint({
      userId: req.user!.id,
      organizationId: orgId,
      request: {
        challengeId,
        challengeTitle: challengeTitle || "Coding Challenge",
        problemDescription: problemDescription || "",
        language: language || "python",
        studentCode: studentCode || "",
        errorOutput,
        hintLevel: Number(hintLevel) as any || 1
      }
    });

    res.json(hint);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to generate hint." });
  }
});

// ============================================================================
// 5. ASSESSMENT EXPLANATIONS
// ============================================================================

/**
 * POST /api/ai/assessments/explain
 * Student requests pedagogical explanation of an assessment question answer.
 */
aiRouter.post("/ai/assessments/explain", authenticateToken, aiRateLimiter.middleware, async (req, res) => {
  try {
    const { assessmentId, questionId, studentAnswer } = req.body;
    if (!assessmentId || !questionId) {
      return res.status(400).json({ error: "assessmentId and questionId are required." });
    }

    aiRateLimiter.recordHit(req);
    const orgId = req.user!.organizationId || "org-default";

    const explanation = await AiAssessmentExplainerService.explainAnswer({
      userId: req.user!.id,
      organizationId: orgId,
      assessmentId,
      questionId,
      studentAnswer: studentAnswer || ""
    });

    res.json(explanation);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to generate assessment explanation." });
  }
});

// ============================================================================
// 6. SKILL GAP ANALYSIS
// ============================================================================

/**
 * GET /api/ai/skills/gap-analysis
 * Synthesizes student coursework, assessment attempts, and coding submissions into a diagnostic report.
 */
aiRouter.get("/ai/skills/gap-analysis", authenticateToken, aiRateLimiter.middleware, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    let targetStudentId = req.user!.id;

    // Admins can query for specific students
    if ((req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN) && req.query.studentId) {
      targetStudentId = req.query.studentId as string;
    }

    aiRateLimiter.recordHit(req);

    const report = await AiSkillGapService.analyzeStudentGaps({
      studentId: targetStudentId,
      organizationId: orgId,
      requestingUserId: req.user!.id
    });

    res.json(report);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to perform skill gap analysis." });
  }
});

// ============================================================================
// 7. ADMIN CONTROLS, SETTINGS & OBSERVABILITY
// ============================================================================

/**
 * GET /api/ai/admin/settings
 * Admin fetches organization AI feature toggles and quota limits.
 */
aiRouter.get("/ai/admin/settings", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const settings = await AiQuotaService.getSettings(orgId);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch AI settings." });
  }
});

/**
 * PUT /api/ai/admin/settings
 * Admin updates organization AI feature toggles, monthly quotas, and daily user limits.
 */
aiRouter.put("/ai/admin/settings", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const updated = await AiQuotaService.updateSettings(orgId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update AI settings." });
  }
});

/**
 * GET /api/ai/admin/usage
 * Admin fetches AI interaction metrics, latency stats, and audit logs.
 */
aiRouter.get("/ai/admin/usage", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const metrics = await AiQuotaService.getUsageMetrics(orgId);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch AI usage metrics." });
  }
});
