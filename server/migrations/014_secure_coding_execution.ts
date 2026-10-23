/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { tableExists, columnExists } from "./utils.js";

export const migration014: Migration = {
  id: "014_secure_coding_execution",
  name: "Secure Coding Execution Engine (Job Queue, Resource Telemetry & Sandboxing)",

  async up(pool: Pool): Promise<void> {
    // 1. Asynchronous Coding Execution Jobs Table
    if (!(await tableExists(pool, "coding_execution_jobs"))) {
      console.log("[Migration 014] Creating coding_execution_jobs table...");
      await pool.query(`
        CREATE TABLE \`coding_execution_jobs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`userId\` VARCHAR(36) NOT NULL,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`challengeId\` VARCHAR(100) NULL,
          \`language\` VARCHAR(50) NOT NULL,
          \`code\` MEDIUMTEXT NOT NULL,
          \`stdin\` TEXT NULL,
          \`jobType\` ENUM('run', 'submit', 'playground') NOT NULL DEFAULT 'run',
          \`status\` ENUM('queued', 'running', 'completed', 'failed', 'timeout') NOT NULL DEFAULT 'queued',
          \`result\` JSON NULL,
          \`error\` TEXT NULL,
          \`executionDriver\` VARCHAR(50) NOT NULL DEFAULT 'isolated-process',
          \`executionTimeMs\` INT NULL,
          \`memoryBytes\` BIGINT NULL,
          \`enqueuedAt\` VARCHAR(50) NOT NULL,
          \`startedAt\` VARCHAR(50) NULL,
          \`completedAt\` VARCHAR(50) NULL,
          INDEX \`idx_jobs_user_org\` (\`organizationId\`, \`userId\`),
          INDEX \`idx_jobs_status\` (\`status\`),
          INDEX \`idx_jobs_challenge\` (\`challengeId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Extend coding_submissions with telemetry and score
    if (await tableExists(pool, "coding_submissions")) {
      if (!(await columnExists(pool, "coding_submissions", "organizationId"))) {
        console.log("[Migration 014] Adding organizationId to coding_submissions...");
        await pool.query(`
          ALTER TABLE \`coding_submissions\` 
          ADD COLUMN \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default' AFTER \`studentId\`,
          ADD INDEX \`idx_coding_sub_org\` (\`organizationId\`);
        `);
      }

      if (!(await columnExists(pool, "coding_submissions", "score"))) {
        console.log("[Migration 014] Adding score to coding_submissions...");
        await pool.query(`
          ALTER TABLE \`coding_submissions\` 
          ADD COLUMN \`score\` INT NOT NULL DEFAULT 0 AFTER \`totalCount\`;
        `);
      }

      if (!(await columnExists(pool, "coding_submissions", "executionTimeMs"))) {
        console.log("[Migration 014] Adding executionTimeMs to coding_submissions...");
        await pool.query(`
          ALTER TABLE \`coding_submissions\` 
          ADD COLUMN \`executionTimeMs\` INT NOT NULL DEFAULT 0 AFTER \`score\`;
        `);
      }

      if (!(await columnExists(pool, "coding_submissions", "memoryBytes"))) {
        console.log("[Migration 014] Adding memoryBytes to coding_submissions...");
        await pool.query(`
          ALTER TABLE \`coding_submissions\` 
          ADD COLUMN \`memoryBytes\` BIGINT NOT NULL DEFAULT 0 AFTER \`executionTimeMs\`;
        `);
      }

      if (!(await columnExists(pool, "coding_submissions", "resultsJson"))) {
        console.log("[Migration 014] Adding resultsJson to coding_submissions...");
        await pool.query(`
          ALTER TABLE \`coding_submissions\` 
          ADD COLUMN \`resultsJson\` JSON NULL AFTER \`output\`;
        `);
      }
    }
  },

  async down(pool: Pool): Promise<void> {
    if (await tableExists(pool, "coding_execution_jobs")) {
      await pool.query("DROP TABLE `coding_execution_jobs`");
    }

    if (await tableExists(pool, "coding_submissions")) {
      if (await columnExists(pool, "coding_submissions", "resultsJson")) {
        await pool.query("ALTER TABLE `coding_submissions` DROP COLUMN `resultsJson`");
      }
      if (await columnExists(pool, "coding_submissions", "memoryBytes")) {
        await pool.query("ALTER TABLE `coding_submissions` DROP COLUMN `memoryBytes`");
      }
      if (await columnExists(pool, "coding_submissions", "executionTimeMs")) {
        await pool.query("ALTER TABLE `coding_submissions` DROP COLUMN `executionTimeMs`");
      }
      if (await columnExists(pool, "coding_submissions", "score")) {
        await pool.query("ALTER TABLE `coding_submissions` DROP COLUMN `score`");
      }
    }
  }
};
