/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { indexExists } from "./utils.js";

export const migration011: Migration = {
  id: "011_analytics_reporting_indexes",
  name: "Analytics & Reporting Performance Optimization Composite Indexes",
  up: async (pool: Pool) => {
    console.log("[Migration 011] Applying Analytics & Reporting composite indexes...");

    // 1. Enrollments reporting indexes
    if (!(await indexExists(pool, "enrollments", "idx_enr_org_status_comp"))) {
      console.log("[Migration 011] Adding idx_enr_org_status_comp to enrollments...");
      await pool.query(`
        ALTER TABLE \`enrollments\` 
        ADD INDEX \`idx_enr_org_status_comp\` (\`organizationId\`, \`status\`, \`completedAt\`);
      `);
    }

    if (!(await indexExists(pool, "enrollments", "idx_enr_course_progress"))) {
      console.log("[Migration 011] Adding idx_enr_course_progress to enrollments...");
      await pool.query(`
        ALTER TABLE \`enrollments\` 
        ADD INDEX \`idx_enr_course_progress\` (\`courseId\`, \`status\`, \`progressPercentage\`);
      `);
    }

    // 2. Submissions reporting indexes
    if (!(await indexExists(pool, "submissions", "idx_sub_org_passed_score"))) {
      console.log("[Migration 011] Adding idx_sub_org_passed_score to submissions...");
      await pool.query(`
        ALTER TABLE \`submissions\` 
        ADD INDEX \`idx_sub_org_passed_score\` (\`organizationId\`, \`passed\`, \`score\`);
      `);
    }

    if (!(await indexExists(pool, "submissions", "idx_sub_ass_passed_score"))) {
      console.log("[Migration 011] Adding idx_sub_ass_passed_score to submissions...");
      await pool.query(`
        ALTER TABLE \`submissions\` 
        ADD INDEX \`idx_sub_ass_passed_score\` (\`assessmentId\`, \`passed\`, \`score\`);
      `);
    }

    // 3. Progress reporting indexes
    if (!(await indexExists(pool, "progress", "idx_prog_course_student_comp"))) {
      console.log("[Migration 011] Adding idx_prog_course_student_comp to progress...");
      await pool.query(`
        ALTER TABLE \`progress\` 
        ADD INDEX \`idx_prog_course_student_comp\` (\`courseId\`, \`studentId\`, \`completed\`);
      `);
    }

    if (!(await indexExists(pool, "progress", "idx_prog_course_lesson_comp"))) {
      console.log("[Migration 011] Adding idx_prog_course_lesson_comp to progress...");
      await pool.query(`
        ALTER TABLE \`progress\` 
        ADD INDEX \`idx_prog_course_lesson_comp\` (\`courseId\`, \`lessonId\`, \`completed\`);
      `);
    }

    // 4. Certificates reporting index
    if (!(await indexExists(pool, "certificates", "idx_cert_org_status_issued"))) {
      console.log("[Migration 011] Adding idx_cert_org_status_issued to certificates...");
      await pool.query(`
        ALTER TABLE \`certificates\` 
        ADD INDEX \`idx_cert_org_status_issued\` (\`organizationId\`, \`status\`, \`issuedAt\`);
      `);
    }

    // 5. Audit logs reporting index
    if (!(await indexExists(pool, "audit_logs", "idx_audit_org_action_date"))) {
      console.log("[Migration 011] Adding idx_audit_org_action_date to audit_logs...");
      await pool.query(`
        ALTER TABLE \`audit_logs\` 
        ADD INDEX \`idx_audit_org_action_date\` (\`organizationId\`, \`action\`, \`createdAt\`);
      `);
    }

    console.log("[Migration 011] Analytics & Reporting indexes applied successfully.");
  },

  down: async (pool: Pool) => {
    console.log("[Migration 011] Reverting Analytics composite indexes...");
    if (await indexExists(pool, "enrollments", "idx_enr_org_status_comp")) {
      await pool.query("ALTER TABLE `enrollments` DROP INDEX `idx_enr_org_status_comp`");
    }
    if (await indexExists(pool, "enrollments", "idx_enr_course_progress")) {
      await pool.query("ALTER TABLE `enrollments` DROP INDEX `idx_enr_course_progress`");
    }
    if (await indexExists(pool, "submissions", "idx_sub_org_passed_score")) {
      await pool.query("ALTER TABLE `submissions` DROP INDEX `idx_sub_org_passed_score`");
    }
    if (await indexExists(pool, "submissions", "idx_sub_ass_passed_score")) {
      await pool.query("ALTER TABLE `submissions` DROP INDEX `idx_sub_ass_passed_score`");
    }
    if (await indexExists(pool, "progress", "idx_prog_course_student_comp")) {
      await pool.query("ALTER TABLE `progress` DROP INDEX `idx_prog_course_student_comp`");
    }
    if (await indexExists(pool, "progress", "idx_prog_course_lesson_comp")) {
      await pool.query("ALTER TABLE `progress` DROP INDEX `idx_prog_course_lesson_comp`");
    }
    if (await indexExists(pool, "certificates", "idx_cert_org_status_issued")) {
      await pool.query("ALTER TABLE `certificates` DROP INDEX `idx_cert_org_status_issued`");
    }
    if (await indexExists(pool, "audit_logs", "idx_audit_org_action_date")) {
      await pool.query("ALTER TABLE `audit_logs` DROP INDEX `idx_audit_org_action_date`");
    }
    console.log("[Migration 011] Reverted successfully.");
  }
};
