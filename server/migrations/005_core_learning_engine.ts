/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration005: Migration = {
  id: "005_core_learning_engine",
  name: "Core learning engine enhancements: course lifecycle, module/lesson management, progress tracking & resume learning",
  up: async (pool: Pool) => {
    console.log("[Migration 005] Applying Core Learning Engine schema updates...");

    // 1. Courses table enhancements
    if (await tableExists(pool, "courses")) {
      if (!(await columnExists(pool, "courses", "estimatedDuration"))) {
        console.log("[Migration 005] Adding estimatedDuration to courses...");
        await pool.query("ALTER TABLE `courses` ADD COLUMN `estimatedDuration` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "courses", "tags"))) {
        console.log("[Migration 005] Adding tags to courses...");
        await pool.query("ALTER TABLE `courses` ADD COLUMN `tags` JSON NULL");
      }
      if (!(await columnExists(pool, "courses", "prerequisites"))) {
        console.log("[Migration 005] Adding prerequisites to courses...");
        await pool.query("ALTER TABLE `courses` ADD COLUMN `prerequisites` JSON NULL");
      }
      if (!(await columnExists(pool, "courses", "version"))) {
        console.log("[Migration 005] Adding version to courses...");
        await pool.query("ALTER TABLE `courses` ADD COLUMN `version` INT NOT NULL DEFAULT 1");
      }
      if (!(await columnExists(pool, "courses", "updatedAt"))) {
        console.log("[Migration 005] Adding updatedAt to courses...");
        await pool.query("ALTER TABLE `courses` ADD COLUMN `updatedAt` VARCHAR(50) NULL");
      }

      console.log("[Migration 005] Updating courses.status enum to include 'review'...");
      await pool.query(`
        ALTER TABLE \`courses\` 
        MODIFY COLUMN \`status\` ENUM('draft', 'review', 'published', 'archived', 'rejected') NOT NULL DEFAULT 'draft'
      `);
    }

    // 2. Modules table enhancements
    if (await tableExists(pool, "modules")) {
      if (!(await columnExists(pool, "modules", "status"))) {
        console.log("[Migration 005] Adding status to modules...");
        await pool.query("ALTER TABLE `modules` ADD COLUMN `status` ENUM('draft', 'published') NOT NULL DEFAULT 'published'");
      }
      if (!(await columnExists(pool, "modules", "deletedAt"))) {
        console.log("[Migration 005] Adding deletedAt to modules...");
        await pool.query("ALTER TABLE `modules` ADD COLUMN `deletedAt` VARCHAR(50) NULL");
      }

      if (!(await indexExists(pool, "modules", "idx_modules_deleted"))) {
        await pool.query("ALTER TABLE `modules` ADD INDEX `idx_modules_deleted` (`deletedAt`)");
      }
      if (!(await indexExists(pool, "modules", "idx_modules_course_order"))) {
        await pool.query("ALTER TABLE `modules` ADD INDEX `idx_modules_course_order` (`courseId`, `order`)");
      }
    }

    // 3. Lessons table enhancements
    if (await tableExists(pool, "lessons")) {
      if (!(await columnExists(pool, "lessons", "assessmentId"))) {
        console.log("[Migration 005] Adding assessmentId to lessons...");
        await pool.query("ALTER TABLE `lessons` ADD COLUMN `assessmentId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "lessons", "status"))) {
        console.log("[Migration 005] Adding status to lessons...");
        await pool.query("ALTER TABLE `lessons` ADD COLUMN `status` ENUM('draft', 'published') NOT NULL DEFAULT 'published'");
      }
      if (!(await columnExists(pool, "lessons", "deletedAt"))) {
        console.log("[Migration 005] Adding deletedAt to lessons...");
        await pool.query("ALTER TABLE `lessons` ADD COLUMN `deletedAt` VARCHAR(50) NULL");
      }

      console.log("[Migration 005] Updating lessons.type enum to include 'assessment'...");
      await pool.query(`
        ALTER TABLE \`lessons\` 
        MODIFY COLUMN \`type\` ENUM('video', 'pdf', 'image', 'text', 'coding', 'assessment') NOT NULL DEFAULT 'video'
      `);

      if (!(await indexExists(pool, "lessons", "idx_lessons_deleted"))) {
        await pool.query("ALTER TABLE `lessons` ADD INDEX `idx_lessons_deleted` (`deletedAt`)");
      }
      if (!(await indexExists(pool, "lessons", "idx_lessons_module_order"))) {
        await pool.query("ALTER TABLE `lessons` ADD INDEX `idx_lessons_module_order` (`moduleId`, `order`)");
      }
    }

    // 4. Progress table enhancements
    if (await tableExists(pool, "progress")) {
      if (!(await columnExists(pool, "progress", "status"))) {
        console.log("[Migration 005] Adding status to progress...");
        await pool.query("ALTER TABLE `progress` ADD COLUMN `status` ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started'");
      }
      if (!(await columnExists(pool, "progress", "lastAccessedAt"))) {
        console.log("[Migration 005] Adding lastAccessedAt to progress...");
        await pool.query("ALTER TABLE `progress` ADD COLUMN `lastAccessedAt` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "progress", "progressPercent"))) {
        console.log("[Migration 005] Adding progressPercent to progress...");
        await pool.query("ALTER TABLE `progress` ADD COLUMN `progressPercent` INT NOT NULL DEFAULT 0");
      }
      if (!(await columnExists(pool, "progress", "lastPositionSeconds"))) {
        console.log("[Migration 005] Adding lastPositionSeconds to progress...");
        await pool.query("ALTER TABLE `progress` ADD COLUMN `lastPositionSeconds` INT NOT NULL DEFAULT 0");
      }

      if (!(await indexExists(pool, "progress", "idx_progress_student_course"))) {
        await pool.query("ALTER TABLE `progress` ADD INDEX `idx_progress_student_course` (`studentId`, `courseId`)");
      }
    }

    // 5. Enrollments table enhancements
    if (await tableExists(pool, "enrollments")) {
      if (!(await columnExists(pool, "enrollments", "lastLessonId"))) {
        console.log("[Migration 005] Adding lastLessonId to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `lastLessonId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "lastAccessedAt"))) {
        console.log("[Migration 005] Adding lastAccessedAt to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `lastAccessedAt` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "progressPercentage"))) {
        console.log("[Migration 005] Adding progressPercentage to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `progressPercentage` INT NOT NULL DEFAULT 0");
      }

      if (!(await indexExists(pool, "enrollments", "idx_enrollments_student_course"))) {
        await pool.query("ALTER TABLE `enrollments` ADD INDEX `idx_enrollments_student_course` (`studentId`, `courseId`)");
      }
    }
  },

  down: async (pool: Pool) => {
    console.log("[Migration 005] Down migration: dropping learning engine enhancements...");
    // Drop indexes and columns if needed for rollback
    const drops = [
      { table: "enrollments", cols: ["lastLessonId", "lastAccessedAt", "progressPercentage"], idxs: ["idx_enrollments_student_course"] },
      { table: "progress", cols: ["status", "lastAccessedAt", "progressPercent", "lastPositionSeconds"], idxs: ["idx_progress_student_course"] },
      { table: "lessons", cols: ["assessmentId", "status", "deletedAt"], idxs: ["idx_lessons_deleted", "idx_lessons_module_order"] },
      { table: "modules", cols: ["status", "deletedAt"], idxs: ["idx_modules_deleted", "idx_modules_course_order"] },
      { table: "courses", cols: ["estimatedDuration", "tags", "prerequisites", "version", "updatedAt"], idxs: [] }
    ];

    for (const d of drops) {
      if (await tableExists(pool, d.table)) {
        for (const idx of d.idxs) {
          if (await indexExists(pool, d.table, idx)) {
            await pool.query(`ALTER TABLE \`${d.table}\` DROP INDEX \`${idx}\``);
          }
        }
        for (const col of d.cols) {
          if (await columnExists(pool, d.table, col)) {
            await pool.query(`ALTER TABLE \`${d.table}\` DROP COLUMN \`${col}\``);
          }
        }
      }
    }
  }
};
