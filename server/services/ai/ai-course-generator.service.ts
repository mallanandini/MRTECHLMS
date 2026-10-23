/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../../mysql.js";
import { coursesDb, modulesDb, lessonsDb } from "../../db.js";
import { LessonType } from "../../../src/types.js";
import { AiClientService } from "./ai-client.service.js";
import { AiSafetyService } from "./ai-safety.service.js";
import { AiQuotaService } from "./ai-quota.service.js";
import { 
  CourseGenerationPromptInput, 
  GeneratedCourseStructure, 
  AiGeneratedCourseRecord 
} from "./types.js";

export class AiCourseGeneratorService {
  private static aiClient = AiClientService.getInstance();

  /**
   * Generate an academic draft course syllabus using AI.
   * Remains in 'draft' status until reviewed and published by an administrator.
   */
  public static async generateDraftCourse(params: {
    organizationId: string;
    adminUserId: string;
    input: CourseGenerationPromptInput;
  }): Promise<AiGeneratedCourseRecord> {
    const { organizationId, adminUserId, input } = params;

    // 1. Quota & Permission Verification
    const quotaCheck = await AiQuotaService.verifyPermissionAndQuota({
      organizationId,
      userId: adminUserId,
      feature: "course_generator"
    });
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.error);
    }

    // 2. Input Sanitization & Safety
    const cleanTopic = AiSafetyService.sanitizePii(input.topic);
    const cleanAudience = AiSafetyService.sanitizePii(input.targetAudience);
    const cleanObjectives = (input.learningObjectives || []).map(o => AiSafetyService.sanitizePii(o));

    const promptText = `
Design a comprehensive, industry-grade curriculum structure for the following educational course:
- Topic: ${cleanTopic}
- Target Audience: ${cleanAudience}
- Academic Difficulty: ${input.difficulty}
- Total Duration: ${input.durationHours} hours
- Key Learning Objectives: ${cleanObjectives.join("; ")}

Return a strict JSON object with this exact schema:
{
  "title": "string (concise, professional course title)",
  "description": "string (engaging 2-3 paragraph overview)",
  "difficulty": "${input.difficulty}",
  "estimatedHours": ${input.durationHours},
  "tags": ["tag1", "tag2", "tag3"],
  "skillsCovered": ["skill1", "skill2", "skill3"],
  "prerequisites": ["prerequisite1", "prerequisite2"],
  "modules": [
    {
      "title": "string (Module 1 title)",
      "description": "string (module learning scope)",
      "orderIndex": 1,
      "lessons": [
        {
          "title": "string",
          "type": "video" | "article" | "coding",
          "durationMinutes": number,
          "contentSummary": "string (rich outline of concepts taught in this lesson)"
        }
      ]
    }
  ]
}
    `.trim();

    // Fallback generator for zero-API-key or offline environments
    const fallbackFactory = (): GeneratedCourseStructure => ({
      title: `${cleanTopic}: Complete Masterclass`,
      description: `A comprehensive masterclass on ${cleanTopic} designed specifically for ${cleanAudience}. Covers core fundamentals through advanced architectural patterns with hands-on labs and assessments.`,
      difficulty: input.difficulty,
      estimatedHours: input.durationHours,
      tags: [cleanTopic.toLowerCase().replace(/\s+/g, "-"), "engineering", input.difficulty],
      skillsCovered: [`${cleanTopic} Core`, "Architecture", "Best Practices", "Debugging"],
      prerequisites: input.difficulty === "beginner" ? ["Basic computer literacy"] : ["Prior foundational programming experience"],
      modules: [
        {
          title: `Module 1: Foundations of ${cleanTopic}`,
          description: `Introduction to the foundational principles, design concepts, and development environment setup for ${cleanTopic}.`,
          orderIndex: 1,
          lessons: [
            {
              title: "1.1 Architectural Overview & Core Concepts",
              type: "article",
              durationMinutes: 20,
              contentSummary: `Comprehensive overview of ${cleanTopic}, key terminology, system architecture, and real-world industrial applications.`
            },
            {
              title: "1.2 Environment Setup & Hands-on Quickstart",
              type: "video",
              durationMinutes: 30,
              contentSummary: "Step-by-step walkthrough to set up the development runtime, install dependencies, and run a smoke test."
            },
            {
              title: "1.3 Practical Lab: First Implementation",
              type: "coding",
              durationMinutes: 45,
              contentSummary: "Practical coding exercise where students construct their first working program and test basic features."
            }
          ]
        },
        {
          title: `Module 2: Advanced Techniques & Optimization in ${cleanTopic}`,
          description: `Deep-dive into performance tuning, error handling, security considerations, and production deployment patterns.`,
          orderIndex: 2,
          lessons: [
            {
              title: "2.1 Advanced Architectural Patterns",
              type: "article",
              durationMinutes: 35,
              contentSummary: "Analysis of scalable architectures, design patterns, separation of concerns, and modularity."
            },
            {
              title: "2.2 Capstone Project: End-to-End Application",
              type: "coding",
              durationMinutes: 60,
              contentSummary: "Full implementation project integrating all taught concepts into a cohesive, production-ready solution."
            }
          ]
        }
      ]
    });

    const aiResult = await this.aiClient.generateJson<GeneratedCourseStructure>(
      {
        systemPrompt: "You are an elite university curriculum designer and instructional technologist.",
        userPrompt: promptText,
        temperature: 0.2
      },
      fallbackFactory
    );

    const draftId = `aicourse_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const record: AiGeneratedCourseRecord = {
      id: draftId,
      organizationId,
      adminUserId,
      topic: cleanTopic,
      targetAudience: cleanAudience,
      difficulty: input.difficulty,
      durationHours: input.durationHours,
      learningObjectives: cleanObjectives,
      generatedStructure: aiResult.data,
      reviewStatus: "draft",
      publishedCourseId: null,
      createdAt: now,
      reviewedAt: null
    };

    await pool.query(
      `INSERT INTO \`ai_generated_courses\`
       (\`id\`, \`organizationId\`, \`adminUserId\`, \`topic\`, \`targetAudience\`, \`difficulty\`, \`durationHours\`, \`learningObjectives\`, \`generatedStructure\`, \`reviewStatus\`, \`publishedCourseId\`, \`createdAt\`, \`reviewedAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.organizationId,
        record.adminUserId,
        record.topic,
        record.targetAudience,
        record.difficulty,
        record.durationHours,
        JSON.stringify(record.learningObjectives),
        JSON.stringify(record.generatedStructure),
        record.reviewStatus,
        null,
        record.createdAt,
        null
      ]
    );

    // Record interaction audit
    await AiQuotaService.recordInteraction({
      organizationId,
      userId: adminUserId,
      feature: "course_generator",
      contextType: "course_draft",
      contextId: draftId,
      promptTokens: Math.ceil(aiResult.tokens * 0.4),
      completionTokens: Math.ceil(aiResult.tokens * 0.6),
      totalTokens: aiResult.tokens,
      latencyMs: aiResult.latencyMs,
      safetyPassed: true
    });

    return record;
  }

  /**
   * List all generated draft courses for an organization
   */
  public static async getDrafts(organizationId: string): Promise<AiGeneratedCourseRecord[]> {
    const [rows]: any = await pool.query(
      "SELECT * FROM `ai_generated_courses` WHERE `organizationId` = ? ORDER BY `createdAt` DESC",
      [organizationId || "org-default"]
    );

    return (rows || []).map((r: any) => ({
      ...r,
      learningObjectives: typeof r.learningObjectives === "string" ? JSON.parse(r.learningObjectives) : r.learningObjectives,
      generatedStructure: typeof r.generatedStructure === "string" ? JSON.parse(r.generatedStructure) : r.generatedStructure
    }));
  }

  /**
   * Fetch single draft course by ID
   */
  public static async getDraftById(id: string, organizationId: string): Promise<AiGeneratedCourseRecord | null> {
    const [rows]: any = await pool.query(
      "SELECT * FROM `ai_generated_courses` WHERE `id` = ? AND `organizationId` = ? LIMIT 1",
      [id, organizationId || "org-default"]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      learningObjectives: typeof r.learningObjectives === "string" ? JSON.parse(r.learningObjectives) : r.learningObjectives,
      generatedStructure: typeof r.generatedStructure === "string" ? JSON.parse(r.generatedStructure) : r.generatedStructure
    };
  }

  /**
   * HUMAN REVIEW STEP: Publish an approved draft course into the LMS catalog.
   * Materializes the course, modules, and lessons in the core database.
   */
  public static async publishDraft(id: string, organizationId: string, adminUserId: string) {
    const draft = await this.getDraftById(id, organizationId);
    if (!draft) {
      throw new Error("Draft course not found or does not belong to your organization.");
    }

    if (draft.reviewStatus === "published" && draft.publishedCourseId) {
      return { success: true, courseId: draft.publishedCourseId, message: "Course already published." };
    }

    const structure = draft.generatedStructure;
    const courseId = `course_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    // 1. Insert Course into courses table
    await coursesDb.insert({
      id: courseId,
      organizationId,
      instructorId: adminUserId,
      instructorName: "LMS Administrator",
      title: structure.title,
      description: structure.description,
      difficulty: structure.difficulty,
      thumbnail: "",
      banner: "",
      category: "Engineering",
      requirements: structure.prerequisites || [],
      skillsCovered: structure.skillsCovered || [],
      status: "published",
      isFeatured: false,
      rating: 5,
      reviewsCount: 0,
      tags: structure.tags,
      prerequisites: structure.prerequisites,
      createdAt: now,
      updatedAt: now
    });

    // 2. Insert Modules and Lessons
    for (const mod of structure.modules || []) {
      const moduleId = `mod_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      await modulesDb.insert({
        id: moduleId,
        courseId,
        title: mod.title,
        description: mod.description,
        order: mod.orderIndex || 1,
        status: "published"
      });

      let lessonOrder = 1;
      for (const les of mod.lessons || []) {
        const lessonId = `les_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
        const lessonType = les.type === "video" 
          ? LessonType.VIDEO 
          : (les.type === "coding" ? LessonType.CODING : LessonType.TEXT);

        await lessonsDb.insert({
          id: lessonId,
          moduleId,
          courseId,
          title: les.title,
          type: lessonType,
          content: les.contentSummary,
          durationMinutes: les.durationMinutes || 15,
          order: lessonOrder++,
          status: "published"
        });
      }
    }

    // 3. Mark Draft as Reviewed & Published
    await pool.query(
      `UPDATE \`ai_generated_courses\`
       SET \`reviewStatus\` = 'published', \`publishedCourseId\` = ?, \`reviewedAt\` = ?
       WHERE \`id\` = ?`,
      [courseId, now, id]
    );

    return {
      success: true,
      courseId,
      message: `Course '${structure.title}' has been successfully published to the curriculum catalog.`
    };
  }

  /**
   * Reject a generated draft course
   */
  public static async rejectDraft(id: string, organizationId: string): Promise<boolean> {
    const [result]: any = await pool.query(
      "UPDATE `ai_generated_courses` SET `reviewStatus` = 'rejected', `reviewedAt` = ? WHERE `id` = ? AND `organizationId` = ?",
      [new Date().toISOString(), id, organizationId]
    );
    return result.affectedRows > 0;
  }
}
