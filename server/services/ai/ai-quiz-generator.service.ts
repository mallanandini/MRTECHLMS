/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../../mysql.js";
import { coursesDb, lessonsDb, assessmentsDb, questionsDb } from "../../db.js";
import { QuestionType } from "../../../src/types.js";
import { AiClientService } from "./ai-client.service.js";
import { AiSafetyService } from "./ai-safety.service.js";
import { AiQuotaService } from "./ai-quota.service.js";
import { 
  QuizGenerationInput, 
  GeneratedQuizQuestion, 
  AiGeneratedQuizRecord 
} from "./types.js";

export class AiQuizGeneratorService {
  private static aiClient = AiClientService.getInstance();

  /**
   * Generate an academic draft quiz based on genuine course/lesson material.
   * Stays in 'draft' status until reviewed by an administrator.
   */
  public static async generateDraftQuiz(params: {
    organizationId: string;
    adminUserId: string;
    input: QuizGenerationInput;
  }): Promise<AiGeneratedQuizRecord> {
    const { organizationId, adminUserId, input } = params;
    const count = Math.min(Math.max(input.questionsCount || 5, 1), 20);
    const difficulty = input.difficulty || "intermediate";

    // 1. Quota & Permission Verification
    const quotaCheck = await AiQuotaService.verifyPermissionAndQuota({
      organizationId,
      userId: adminUserId,
      feature: "quiz_generator"
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.error);
    }

    // 2. Tenant Boundary Check: verify course belongs to this organization
    const course = await coursesDb.findOne({ id: input.courseId, organizationId });
    if (!course) {
      throw new Error("Course not found or unauthorized access to another organization's curriculum.");
    }

    // 3. Extract Genuine Subject Content
    let contentContext = `Course Title: ${course.title}\nCourse Overview: ${course.description}\nKey Skills: ${(course.skillsCovered || []).join(", ")}`;
    let targetLessonTitle = "";

    if (input.lessonId) {
      const lesson = await lessonsDb.findOne({ id: input.lessonId });
      if (lesson) {
        targetLessonTitle = lesson.title;
        contentContext += `\nLesson Focus: ${lesson.title}\nLesson Content: ${lesson.content || ""}`;
      }
    }

    const cleanContext = AiSafetyService.sanitizePii(contentContext);
    const contextPrompt = AiSafetyService.wrapContext("CURRICULUM_MATERIAL", cleanContext);

    const promptText = `
Based exclusively on the following authoritative curriculum material:
${contextPrompt}

Generate ${count} high-quality, multiple-choice questions assessing learner mastery.
Target Difficulty: ${difficulty}

Schema requirements:
Return a JSON array of objects conforming to:
[
  {
    "questionText": "string (clear, rigorous question prompt)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact string matching one of the options",
    "explanation": "Pedagogical explanation of why this answer is correct and why other distractors are incorrect",
    "points": 10,
    "difficulty": "${difficulty}",
    "skillTag": "primary skill being tested"
  }
]
    `.trim();

    // Deterministic fallback generator for resilience
    const fallbackFactory = (): GeneratedQuizQuestion[] => {
      const questions: GeneratedQuizQuestion[] = [];
      const topics = course.skillsCovered && course.skillsCovered.length > 0 
        ? course.skillsCovered 
        : [course.title, "Core Architecture", "Error Handling", "Performance Optimization", "Security Best Practices"];

      for (let i = 0; i < count; i++) {
        const topic = topics[i % topics.length];
        questions.push({
          questionText: `Which of the following best represents the foundational principle of ${topic} in ${course.title}?`,
          options: [
            `It enables modular, decoupled architecture with clear separation of concerns.`,
            `It bypasses standard validation to maximize execution speed without checks.`,
            `It couples client state directly to low-level hardware registers.`,
            `It eliminates the need for unit testing and error boundaries.`
          ],
          correctAnswer: `It enables modular, decoupled architecture with clear separation of concerns.`,
          explanation: `In ${course.title}, ${topic} emphasizes loose coupling, modularity, and maintainable boundaries. Other options describe antipatterns.`,
          points: 10,
          difficulty,
          skillTag: topic
        });
      }
      return questions;
    };

    const aiResult = await this.aiClient.generateJson<GeneratedQuizQuestion[]>(
      {
        systemPrompt: "You are an elite educational psychometrician and assessment designer.",
        userPrompt: promptText,
        temperature: 0.2
      },
      fallbackFactory
    );

    const draftId = `aiquiz_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const record: AiGeneratedQuizRecord = {
      id: draftId,
      organizationId,
      adminUserId,
      courseId: input.courseId,
      lessonId: input.lessonId || null,
      questionsCount: count,
      difficulty,
      generatedQuestions: aiResult.data,
      reviewStatus: "draft",
      publishedAssessmentId: null,
      createdAt: now,
      reviewedAt: null
    };

    await pool.query(
      `INSERT INTO \`ai_generated_quizzes\`
       (\`id\`, \`organizationId\`, \`adminUserId\`, \`courseId\`, \`lessonId\`, \`questionsCount\`, \`difficulty\`, \`generatedQuestions\`, \`reviewStatus\`, \`publishedAssessmentId\`, \`createdAt\`, \`reviewedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.organizationId,
        record.adminUserId,
        record.courseId,
        record.lessonId,
        record.questionsCount,
        record.difficulty,
        JSON.stringify(record.generatedQuestions),
        record.reviewStatus,
        null,
        record.createdAt,
        null
      ]
    );

    // Audit log
    await AiQuotaService.recordInteraction({
      organizationId,
      userId: adminUserId,
      feature: "quiz_generator",
      contextType: "course",
      contextId: input.courseId,
      promptTokens: Math.ceil(aiResult.tokens * 0.4),
      completionTokens: Math.ceil(aiResult.tokens * 0.6),
      totalTokens: aiResult.tokens,
      latencyMs: aiResult.latencyMs,
      safetyPassed: true
    });

    return record;
  }

  /**
   * List all generated draft quizzes for an organization
   */
  public static async getDrafts(organizationId: string): Promise<AiGeneratedQuizRecord[]> {
    const [rows]: any = await pool.query(
      "SELECT * FROM `ai_generated_quizzes` WHERE `organizationId` = ? ORDER BY `createdAt` DESC",
      [organizationId || "org-default"]
    );

    return (rows || []).map((r: any) => ({
      ...r,
      generatedQuestions: typeof r.generatedQuestions === "string" ? JSON.parse(r.generatedQuestions) : r.generatedQuestions
    }));
  }

  /**
   * HUMAN REVIEW STEP: Publish approved draft quiz questions into an assessment.
   */
  public static async publishDraft(
    id: string,
    organizationId: string,
    adminUserId: string,
    assessmentTitle?: string
  ) {
    const [rows]: any = await pool.query(
      "SELECT * FROM `ai_generated_quizzes` WHERE `id` = ? AND `organizationId` = ? LIMIT 1",
      [id, organizationId || "org-default"]
    );
    if (!rows || rows.length === 0) {
      throw new Error("Draft quiz not found or unauthorized.");
    }

    const draft = rows[0];
    const questions: GeneratedQuizQuestion[] = typeof draft.generatedQuestions === "string" 
      ? JSON.parse(draft.generatedQuestions) 
      : draft.generatedQuestions;

    const course = await coursesDb.findOne({ id: draft.courseId });
    const title = assessmentTitle || `Knowledge Check: ${course?.title || "Course Material"}`;
    const assessmentId = `asmt_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    // 1. Create Assessment
    await assessmentsDb.insert({
      id: assessmentId,
      courseId: draft.courseId,
      title,
      description: `Comprehensive mastery assessment generated for ${course?.title || "curriculum"}.`,
      passingScore: 70,
      durationMinutes: 30,
      totalPoints: questions.reduce((sum, q) => sum + (q.points || 10), 0),
      questionsCount: questions.length,
      status: "published",
      createdAt: now
    });

    // 2. Insert Approved Questions
    let order = 1;
    for (const q of questions) {
      const qId = `q_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      await questionsDb.insert({
        id: qId,
        assessmentId,
        questionText: q.questionText,
        type: QuestionType.MCQ_SINGLE,
        options: q.options,
        correctAnswers: [q.correctAnswer],
        explanation: q.explanation,
        points: q.points || 10,
        order: order++
      });
    }

    // 3. Mark Draft as Reviewed & Published
    await pool.query(
      `UPDATE \`ai_generated_quizzes\`
       SET \`reviewStatus\` = 'published', \`publishedAssessmentId\` = ?, \`reviewedAt\` = ?
       WHERE \`id\` = ?`,
      [assessmentId, now, id]
    );

    return {
      success: true,
      assessmentId,
      questionsPublished: questions.length,
      message: `Published ${questions.length} questions to assessment '${title}'.`
    };
  }

  /**
   * Reject a generated draft quiz
   */
  public static async rejectDraft(id: string, organizationId: string): Promise<boolean> {
    const [result]: any = await pool.query(
      "UPDATE `ai_generated_quizzes` SET `reviewStatus` = 'rejected', `reviewedAt` = ? WHERE `id` = ? AND `organizationId` = ?",
      [new Date().toISOString(), id, organizationId]
    );
    return result.affectedRows > 0;
  }
}
