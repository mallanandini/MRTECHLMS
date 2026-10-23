/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { tableExists } from "./utils.js";

export const migration015: Migration = {
  id: "015_ai_learning_layer",
  name: "AI Learning Layer (Scoped Tutor, Course/Quiz Generators, Guardrails, Logs & Quotas)",

  async up(pool: Pool): Promise<void> {
    // 1. Organization AI Settings & Quotas
    if (!(await tableExists(pool, "ai_organization_settings"))) {
      console.log("[Migration 015] Creating ai_organization_settings table...");
      await pool.query(`
        CREATE TABLE \`ai_organization_settings\` (
          \`organizationId\` VARCHAR(36) PRIMARY KEY,
          \`aiEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`courseGeneratorEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`quizGeneratorEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`lessonTutorEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`codingHintsEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`assessmentExplanationsEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`skillGapAnalysisEnabled\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`monthlyTokenQuota\` INT NOT NULL DEFAULT 500000,
          \`monthlyTokensUsed\` INT NOT NULL DEFAULT 0,
          \`dailyUserRequestLimit\` INT NOT NULL DEFAULT 50,
          \`quotaResetMonth\` VARCHAR(7) NOT NULL DEFAULT '2026-10',
          \`updatedAt\` VARCHAR(50) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed initial default organization record
      const now = new Date().toISOString();
      await pool.query(`
        INSERT IGNORE INTO \`ai_organization_settings\` 
        (\`organizationId\`, \`aiEnabled\`, \`courseGeneratorEnabled\`, \`quizGeneratorEnabled\`, \`lessonTutorEnabled\`, \`codingHintsEnabled\`, \`assessmentExplanationsEnabled\`, \`skillGapAnalysisEnabled\`, \`monthlyTokenQuota\`, \`monthlyTokensUsed\`, \`dailyUserRequestLimit\`, \`quotaResetMonth\`, \`updatedAt\`)
        VALUES ('org-default', 1, 1, 1, 1, 1, 1, 1, 1000000, 0, 100, '2026-10', ?)
      `, [now]);
    }

    // 2. AI Interaction Logs (Observability, Safety & Cost Control)
    if (!(await tableExists(pool, "ai_interaction_logs"))) {
      console.log("[Migration 015] Creating ai_interaction_logs table...");
      await pool.query(`
        CREATE TABLE \`ai_interaction_logs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`userId\` VARCHAR(36) NOT NULL,
          \`feature\` VARCHAR(50) NOT NULL,
          \`contextType\` VARCHAR(50) NULL,
          \`contextId\` VARCHAR(100) NULL,
          \`promptTokensEstimate\` INT NOT NULL DEFAULT 0,
          \`completionTokensEstimate\` INT NOT NULL DEFAULT 0,
          \`totalTokens\` INT NOT NULL DEFAULT 0,
          \`latencyMs\` INT NOT NULL DEFAULT 0,
          \`safetyPassed\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`safetyNotes\` TEXT NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_ai_log_org_created\` (\`organizationId\`, \`createdAt\`),
          INDEX \`idx_ai_log_user_created\` (\`userId\`, \`createdAt\`),
          INDEX \`idx_ai_log_feature\` (\`feature\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. AI Generated Draft Courses (Human-in-the-Loop Review)
    if (!(await tableExists(pool, "ai_generated_courses"))) {
      console.log("[Migration 015] Creating ai_generated_courses table...");
      await pool.query(`
        CREATE TABLE \`ai_generated_courses\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`adminUserId\` VARCHAR(36) NOT NULL,
          \`topic\` VARCHAR(255) NOT NULL,
          \`targetAudience\` VARCHAR(255) NOT NULL,
          \`difficulty\` VARCHAR(50) NOT NULL,
          \`durationHours\` INT NOT NULL DEFAULT 10,
          \`learningObjectives\` JSON NOT NULL,
          \`generatedStructure\` JSON NOT NULL,
          \`reviewStatus\` ENUM('draft', 'reviewed', 'published', 'rejected') NOT NULL DEFAULT 'draft',
          \`publishedCourseId\` VARCHAR(36) NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`reviewedAt\` VARCHAR(50) NULL,
          INDEX \`idx_ai_course_org_status\` (\`organizationId\`, \`reviewStatus\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 4. AI Generated Draft Quizzes (Human-in-the-Loop Review)
    if (!(await tableExists(pool, "ai_generated_quizzes"))) {
      console.log("[Migration 015] Creating ai_generated_quizzes table...");
      await pool.query(`
        CREATE TABLE \`ai_generated_quizzes\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`adminUserId\` VARCHAR(36) NOT NULL,
          \`courseId\` VARCHAR(36) NOT NULL,
          \`lessonId\` VARCHAR(36) NULL,
          \`questionsCount\` INT NOT NULL DEFAULT 5,
          \`difficulty\` VARCHAR(50) NOT NULL DEFAULT 'intermediate',
          \`generatedQuestions\` JSON NOT NULL,
          \`reviewStatus\` ENUM('draft', 'reviewed', 'published', 'rejected') NOT NULL DEFAULT 'draft',
          \`publishedAssessmentId\` VARCHAR(36) NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`reviewedAt\` VARCHAR(50) NULL,
          INDEX \`idx_ai_quiz_org_status\` (\`organizationId\`, \`reviewStatus\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }
  },

  async down(pool: Pool): Promise<void> {
    await pool.query("DROP TABLE IF EXISTS `ai_generated_quizzes`");
    await pool.query("DROP TABLE IF EXISTS `ai_generated_courses`");
    await pool.query("DROP TABLE IF EXISTS `ai_interaction_logs`");
    await pool.query("DROP TABLE IF EXISTS `ai_organization_settings`");
  }
};
