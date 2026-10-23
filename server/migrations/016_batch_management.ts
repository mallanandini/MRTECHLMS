/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration016: Migration = {
  id: "016_batch_management",
  name: "Batch Management Layer: Institutions, Batches, Multi-Batch Student Memberships, and Batch Course Access",
  up: async (pool: Pool) => {
    console.log("[Migration 016] Applying Batch Management schema updates...");

    // 1. Create institutions table
    if (!(await tableExists(pool, "institutions"))) {
      console.log("[Migration 016] Creating institutions table...");
      await pool.query(`
        CREATE TABLE \`institutions\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`name\` VARCHAR(255) NOT NULL,
          \`code\` VARCHAR(50) NOT NULL,
          \`contactEmail\` VARCHAR(255) NULL,
          \`contactPhone\` VARCHAR(50) NULL,
          \`address\` TEXT NULL,
          \`academicYears\` JSON NULL,
          \`status\` ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_inst_org\` (\`organizationId\`),
          INDEX \`idx_inst_code\` (\`code\`),
          INDEX \`idx_inst_status\` (\`status\`),
          INDEX \`idx_inst_deleted\` (\`deletedAt\`),
          UNIQUE KEY \`inst_code_uniq\` (\`organizationId\`, \`code\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed baseline default institution
      const now = new Date().toISOString();
      const defaultYears = JSON.stringify(["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"]);
      await pool.query(`
        INSERT INTO \`institutions\` 
          (\`id\`, \`organizationId\`, \`name\`, \`code\`, \`academicYears\`, \`status\`, \`createdAt\`, \`updatedAt\`)
        VALUES 
          ('inst-mrtech-main', 'org-default', 'MR Technologies Academy', 'MRTECH-MAIN', ?, 'active', ?, ?)
      `, [defaultYears, now, now]);
    }

    // 2. Create batches table
    if (!(await tableExists(pool, "batches"))) {
      console.log("[Migration 016] Creating batches table...");
      await pool.query(`
        CREATE TABLE \`batches\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`institutionId\` VARCHAR(36) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`code\` VARCHAR(50) NOT NULL,
          \`academicYear\` VARCHAR(50) NOT NULL,
          \`courseId\` VARCHAR(36) NULL,
          \`startDate\` VARCHAR(50) NULL,
          \`endDate\` VARCHAR(50) NULL,
          \`maxStudents\` INT NULL DEFAULT NULL,
          \`description\` TEXT NULL,
          \`status\` ENUM('active', 'inactive', 'archived') NOT NULL DEFAULT 'active',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_batches_org\` (\`organizationId\`),
          INDEX \`idx_batches_inst\` (\`institutionId\`),
          INDEX \`idx_batches_year\` (\`academicYear\`),
          INDEX \`idx_batches_course\` (\`courseId\`),
          INDEX \`idx_batches_status\` (\`status\`),
          INDEX \`idx_batches_code\` (\`code\`),
          INDEX \`idx_batches_deleted\` (\`deletedAt\`),
          UNIQUE KEY \`batch_inst_code_uniq\` (\`institutionId\`, \`code\`),
          FOREIGN KEY (\`institutionId\`) REFERENCES \`institutions\`(\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. Create batch_students table (Enforces (batchId, studentId) uniqueness, allows same student across multiple batches)
    if (!(await tableExists(pool, "batch_students"))) {
      console.log("[Migration 016] Creating batch_students table...");
      await pool.query(`
        CREATE TABLE \`batch_students\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`batchId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`enrolledAt\` VARCHAR(50) NOT NULL,
          \`status\` ENUM('active', 'inactive', 'completed', 'dropped') NOT NULL DEFAULT 'active',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_bs_batch\` (\`batchId\`),
          INDEX \`idx_bs_student\` (\`studentId\`),
          INDEX \`idx_bs_status\` (\`status\`),
          UNIQUE KEY \`batch_student_uniq\` (\`batchId\`, \`studentId\`),
          FOREIGN KEY (\`batchId\`) REFERENCES \`batches\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`studentId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 4. Create batch_courses table
    if (!(await tableExists(pool, "batch_courses"))) {
      console.log("[Migration 016] Creating batch_courses table...");
      await pool.query(`
        CREATE TABLE \`batch_courses\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`batchId\` VARCHAR(36) NOT NULL,
          \`courseId\` VARCHAR(36) NOT NULL,
          \`assignedAt\` VARCHAR(50) NOT NULL,
          \`assignedBy\` VARCHAR(36) NULL,
          \`status\` ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
          INDEX \`idx_bc_batch\` (\`batchId\`),
          INDEX \`idx_bc_course\` (\`courseId\`),
          INDEX \`idx_bc_status\` (\`status\`),
          UNIQUE KEY \`batch_course_uniq\` (\`batchId\`, \`courseId\`),
          FOREIGN KEY (\`batchId\`) REFERENCES \`batches\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`courseId\`) REFERENCES \`courses\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 5. Create batch_assessments table
    if (!(await tableExists(pool, "batch_assessments"))) {
      console.log("[Migration 016] Creating batch_assessments table...");
      await pool.query(`
        CREATE TABLE \`batch_assessments\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`batchId\` VARCHAR(36) NOT NULL,
          \`assessmentId\` VARCHAR(36) NOT NULL,
          \`assignedAt\` VARCHAR(50) NOT NULL,
          \`assignedBy\` VARCHAR(36) NULL,
          \`status\` ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
          INDEX \`idx_ba_batch\` (\`batchId\`),
          INDEX \`idx_ba_ass\` (\`assessmentId\`),
          INDEX \`idx_ba_status\` (\`status\`),
          UNIQUE KEY \`batch_ass_uniq\` (\`batchId\`, \`assessmentId\`),
          FOREIGN KEY (\`batchId\`) REFERENCES \`batches\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`assessmentId\`) REFERENCES \`assessments\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 6. Extend enrollments.assignmentSource enum to include 'batch' if not present
    try {
      await pool.query(`
        ALTER TABLE \`enrollments\` 
        MODIFY COLUMN \`assignmentSource\` ENUM('individual','bulk','group','learning_path','self','batch') NOT NULL DEFAULT 'individual'
      `);
      console.log("[Migration 016] Updated enrollments.assignmentSource to include 'batch'.");
    } catch (e: any) {
      console.log("[Migration 016] Note on enrollments.assignmentSource modification:", e.message);
    }

    console.log("[Migration 016] Batch Management schema updates completed successfully.");
  },
  down: async (pool: Pool) => {
    console.log("[Migration 016] Rollback Batch Management schema...");
    await pool.query("DROP TABLE IF EXISTS `batch_assessments`");
    await pool.query("DROP TABLE IF EXISTS `batch_courses`");
    await pool.query("DROP TABLE IF EXISTS `batch_students`");
    await pool.query("DROP TABLE IF EXISTS `batches`");
    await pool.query("DROP TABLE IF EXISTS `institutions`");
  }
};
