/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration006: Migration = {
  id: "006_enrollment_access_control",
  name: "Unified Enrollment & Access-Control: Groups, Access States, Due Dates, Mandatory Training, and Non-destructive Revocation",
  up: async (pool: Pool) => {
    console.log("[Migration 006] Applying Enrollment & Access-Control schema updates...");

    // 1. Create groups table
    if (!(await tableExists(pool, "groups"))) {
      console.log("[Migration 006] Creating groups table...");
      await pool.query(`
        CREATE TABLE \`groups\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`name\` VARCHAR(255) NOT NULL,
          \`description\` TEXT NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_groups_org\` (\`organizationId\`),
          INDEX \`idx_groups_deleted\` (\`deletedAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Create group_members table
    if (!(await tableExists(pool, "group_members"))) {
      console.log("[Migration 006] Creating group_members table...");
      await pool.query(`
        CREATE TABLE \`group_members\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`groupId\` VARCHAR(36) NOT NULL,
          \`userId\` VARCHAR(36) NOT NULL,
          \`addedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_group_members_group\` (\`groupId\`),
          INDEX \`idx_group_members_user\` (\`userId\`),
          UNIQUE KEY \`group_user_uniq\` (\`groupId\`, \`userId\`),
          FOREIGN KEY (\`groupId\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. Enhance enrollments table
    if (await tableExists(pool, "enrollments")) {
      if (!(await columnExists(pool, "enrollments", "status"))) {
        console.log("[Migration 006] Adding status to enrollments...");
        await pool.query(`
          ALTER TABLE \`enrollments\` 
          ADD COLUMN \`status\` ENUM('assigned', 'not_started', 'in_progress', 'completed', 'expired', 'revoked') NOT NULL DEFAULT 'assigned'
        `);
      }
      if (!(await columnExists(pool, "enrollments", "assignedBy"))) {
        console.log("[Migration 006] Adding assignedBy to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `assignedBy` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "assignedAt"))) {
        console.log("[Migration 006] Adding assignedAt to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `assignedAt` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "dueDate"))) {
        console.log("[Migration 006] Adding dueDate to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `dueDate` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "isMandatory"))) {
        console.log("[Migration 006] Adding isMandatory to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `isMandatory` BOOLEAN NOT NULL DEFAULT FALSE");
      }
      if (!(await columnExists(pool, "enrollments", "assignmentSource"))) {
        console.log("[Migration 006] Adding assignmentSource to enrollments...");
        await pool.query(`
          ALTER TABLE \`enrollments\` 
          ADD COLUMN \`assignmentSource\` ENUM('individual', 'bulk', 'group', 'learning_path', 'self') NOT NULL DEFAULT 'individual'
        `);
      }
      if (!(await columnExists(pool, "enrollments", "assignmentSourceId"))) {
        console.log("[Migration 006] Adding assignmentSourceId to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `assignmentSourceId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "revokedAt"))) {
        console.log("[Migration 006] Adding revokedAt to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `revokedAt` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "revokedBy"))) {
        console.log("[Migration 006] Adding revokedBy to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `revokedBy` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "enrollments", "revocationReason"))) {
        console.log("[Migration 006] Adding revocationReason to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `revocationReason` TEXT NULL");
      }
      if (!(await columnExists(pool, "enrollments", "deletedAt"))) {
        console.log("[Migration 006] Adding deletedAt to enrollments...");
        await pool.query("ALTER TABLE `enrollments` ADD COLUMN `deletedAt` VARCHAR(50) NULL");
      }

      if (!(await indexExists(pool, "enrollments", "idx_enrollments_status"))) {
        await pool.query("ALTER TABLE `enrollments` ADD INDEX `idx_enrollments_status` (`status`)");
      }
      if (!(await indexExists(pool, "enrollments", "idx_enrollments_due_date"))) {
        await pool.query("ALTER TABLE `enrollments` ADD INDEX `idx_enrollments_due_date` (`dueDate`)");
      }
    }

    // 4. Enhance assessment_assignments table
    if (await tableExists(pool, "assessment_assignments")) {
      console.log("[Migration 006] Modifying assessment_assignments status enum...");
      await pool.query(`
        ALTER TABLE \`assessment_assignments\` 
        MODIFY COLUMN \`status\` ENUM('assigned', 'not_started', 'in_progress', 'completed', 'expired', 'revoked') NOT NULL DEFAULT 'assigned'
      `);

      if (!(await columnExists(pool, "assessment_assignments", "isMandatory"))) {
        console.log("[Migration 006] Adding isMandatory to assessment_assignments...");
        await pool.query("ALTER TABLE `assessment_assignments` ADD COLUMN `isMandatory` BOOLEAN NOT NULL DEFAULT FALSE");
      }
      if (!(await columnExists(pool, "assessment_assignments", "assignmentSource"))) {
        console.log("[Migration 006] Adding assignmentSource to assessment_assignments...");
        await pool.query(`
          ALTER TABLE \`assessment_assignments\` 
          ADD COLUMN \`assignmentSource\` ENUM('individual', 'bulk', 'group', 'course', 'learning_path', 'self') NOT NULL DEFAULT 'individual'
        `);
      }
      if (!(await columnExists(pool, "assessment_assignments", "assignmentSourceId"))) {
        console.log("[Migration 006] Adding assignmentSourceId to assessment_assignments...");
        await pool.query("ALTER TABLE `assessment_assignments` ADD COLUMN `assignmentSourceId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "assessment_assignments", "revokedAt"))) {
        console.log("[Migration 006] Adding revokedAt to assessment_assignments...");
        await pool.query("ALTER TABLE `assessment_assignments` ADD COLUMN `revokedAt` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "assessment_assignments", "revokedBy"))) {
        console.log("[Migration 006] Adding revokedBy to assessment_assignments...");
        await pool.query("ALTER TABLE `assessment_assignments` ADD COLUMN `revokedBy` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "assessment_assignments", "revocationReason"))) {
        console.log("[Migration 006] Adding revocationReason to assessment_assignments...");
        await pool.query("ALTER TABLE `assessment_assignments` ADD COLUMN `revocationReason` TEXT NULL");
      }
      if (!(await columnExists(pool, "assessment_assignments", "deletedAt"))) {
        console.log("[Migration 006] Adding deletedAt to assessment_assignments...");
        await pool.query("ALTER TABLE `assessment_assignments` ADD COLUMN `deletedAt` VARCHAR(50) NULL");
      }

      if (!(await indexExists(pool, "assessment_assignments", "idx_assessment_assign_status"))) {
        await pool.query("ALTER TABLE `assessment_assignments` ADD INDEX `idx_assessment_assign_status` (`status`)");
      }
      if (!(await indexExists(pool, "assessment_assignments", "idx_assessment_assign_due_date"))) {
        await pool.query("ALTER TABLE `assessment_assignments` ADD INDEX `idx_assessment_assign_due_date` (`dueDate`)");
      }
    }

    // 5. Enhance learning_path_assignments table
    if (await tableExists(pool, "learning_path_assignments")) {
      if (!(await columnExists(pool, "learning_path_assignments", "status"))) {
        console.log("[Migration 006] Adding status to learning_path_assignments...");
        await pool.query(`
          ALTER TABLE \`learning_path_assignments\` 
          ADD COLUMN \`status\` ENUM('assigned', 'not_started', 'in_progress', 'completed', 'expired', 'revoked') NOT NULL DEFAULT 'assigned'
        `);
      }
      if (!(await columnExists(pool, "learning_path_assignments", "dueDate"))) {
        console.log("[Migration 006] Adding dueDate to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `dueDate` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "learning_path_assignments", "isMandatory"))) {
        console.log("[Migration 006] Adding isMandatory to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `isMandatory` BOOLEAN NOT NULL DEFAULT FALSE");
      }
      if (!(await columnExists(pool, "learning_path_assignments", "assignmentSource"))) {
        console.log("[Migration 006] Adding assignmentSource to learning_path_assignments...");
        await pool.query(`
          ALTER TABLE \`learning_path_assignments\` 
          ADD COLUMN \`assignmentSource\` ENUM('individual', 'bulk', 'group', 'self') NOT NULL DEFAULT 'individual'
        `);
      }
      if (!(await columnExists(pool, "learning_path_assignments", "assignmentSourceId"))) {
        console.log("[Migration 006] Adding assignmentSourceId to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `assignmentSourceId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "learning_path_assignments", "revokedAt"))) {
        console.log("[Migration 006] Adding revokedAt to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `revokedAt` VARCHAR(50) NULL");
      }
      if (!(await columnExists(pool, "learning_path_assignments", "revokedBy"))) {
        console.log("[Migration 006] Adding revokedBy to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `revokedBy` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "learning_path_assignments", "revocationReason"))) {
        console.log("[Migration 006] Adding revocationReason to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `revocationReason` TEXT NULL");
      }
      if (!(await columnExists(pool, "learning_path_assignments", "deletedAt"))) {
        console.log("[Migration 006] Adding deletedAt to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `deletedAt` VARCHAR(50) NULL");
      }

      if (!(await indexExists(pool, "learning_path_assignments", "idx_lp_assign_status"))) {
        await pool.query("ALTER TABLE `learning_path_assignments` ADD INDEX `idx_lp_assign_status` (`status`)");
      }
      if (!(await indexExists(pool, "learning_path_assignments", "idx_lp_assign_due_date"))) {
        await pool.query("ALTER TABLE `learning_path_assignments` ADD INDEX `idx_lp_assign_due_date` (`dueDate`)");
      }
    }
  },

  down: async (pool: Pool) => {
    console.log("[Migration 006] Rollback not recommended for access-control tables to preserve integrity.");
  }
};
