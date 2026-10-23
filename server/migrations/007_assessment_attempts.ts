/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration007: Migration = {
  id: "007_assessment_attempts",
  name: "Assessment Engine: Server-side attempts tracking, time enforcement, and attempt linking",
  up: async (pool: Pool) => {
    console.log("[Migration 007] Applying Assessment Attempts schema updates...");

    // 1. Create assessment_attempts table
    if (!(await tableExists(pool, "assessment_attempts"))) {
      console.log("[Migration 007] Creating assessment_attempts table...");
      await pool.query(`
        CREATE TABLE \`assessment_attempts\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`assessmentId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`attemptNumber\` INT NOT NULL DEFAULT 1,
          \`startedAt\` VARCHAR(50) NOT NULL,
          \`expiresAt\` VARCHAR(50) NOT NULL,
          \`submittedAt\` VARCHAR(50) NULL,
          \`timeTakenSeconds\` INT NOT NULL DEFAULT 0,
          \`status\` ENUM('in_progress', 'submitted', 'timed_out', 'abandoned') NOT NULL DEFAULT 'in_progress',
          \`questionOrder\` JSON NULL,
          \`answers\` JSON NULL,
          \`score\` INT NULL,
          \`totalPoints\` INT NULL,
          \`percentage\` DECIMAL(5,2) NULL,
          \`passed\` BOOLEAN NULL,
          \`correctCount\` INT NOT NULL DEFAULT 0,
          \`incorrectCount\` INT NOT NULL DEFAULT 0,
          \`unansweredCount\` INT NOT NULL DEFAULT 0,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_attempts_assessment_student\` (\`assessmentId\`, \`studentId\`),
          INDEX \`idx_attempts_status\` (\`status\`),
          INDEX \`idx_attempts_org\` (\`organizationId\`),
          INDEX \`idx_attempts_deleted\` (\`deletedAt\`),
          FOREIGN KEY (\`assessmentId\`) REFERENCES \`assessments\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`studentId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Add attemptId and attemptNumber to submissions if missing
    if (await tableExists(pool, "submissions")) {
      if (!(await columnExists(pool, "submissions", "attemptId"))) {
        console.log("[Migration 007] Adding attemptId to submissions...");
        await pool.query(`
          ALTER TABLE \`submissions\`
          ADD COLUMN \`attemptId\` VARCHAR(36) NULL AFTER \`studentName\`
        `);
      }
      if (!(await columnExists(pool, "submissions", "attemptNumber"))) {
        console.log("[Migration 007] Adding attemptNumber to submissions...");
        await pool.query(`
          ALTER TABLE \`submissions\`
          ADD COLUMN \`attemptNumber\` INT NULL DEFAULT 1 AFTER \`attemptId\`
        `);
      }
      if (!(await indexExists(pool, "submissions", "idx_submissions_attempt"))) {
        await pool.query(`
          ALTER TABLE \`submissions\`
          ADD INDEX \`idx_submissions_attempt\` (\`attemptId\`)
        `);
      }
    }

    console.log("[Migration 007] Assessment Attempts schema updates applied successfully.");
  },

  down: async (pool: Pool) => {
    console.log("[Migration 007] Reverting Assessment Attempts schema updates...");
    if (await tableExists(pool, "assessment_attempts")) {
      await pool.query("DROP TABLE IF EXISTS `assessment_attempts`");
    }
    if (await tableExists(pool, "submissions")) {
      if (await columnExists(pool, "submissions", "attemptId")) {
        await pool.query("ALTER TABLE `submissions` DROP COLUMN `attemptId`");
      }
      if (await columnExists(pool, "submissions", "attemptNumber")) {
        await pool.query("ALTER TABLE `submissions` DROP COLUMN `attemptNumber`");
      }
    }
  }
};
