/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration009: Migration = {
  id: "009_organization_management",
  name: "Organization Management Layer: Departments, Cohorts, Groups, Manager Scoping and Hierarchy",
  up: async (pool: Pool) => {
    console.log("[Migration 009] Applying Organization Management schema updates...");

    // 1. Create departments table
    if (!(await tableExists(pool, "departments"))) {
      console.log("[Migration 009] Creating departments table...");
      await pool.query(`
        CREATE TABLE \`departments\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`name\` VARCHAR(255) NOT NULL,
          \`code\` VARCHAR(50) NOT NULL,
          \`description\` TEXT NULL,
          \`managerId\` VARCHAR(36) NULL,
          \`status\` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_dept_org\` (\`organizationId\`),
          INDEX \`idx_dept_manager\` (\`managerId\`),
          INDEX \`idx_dept_code\` (\`code\`),
          INDEX \`idx_dept_status\` (\`status\`),
          INDEX \`idx_dept_deleted\` (\`deletedAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Create department_members table
    if (!(await tableExists(pool, "department_members"))) {
      console.log("[Migration 009] Creating department_members table...");
      await pool.query(`
        CREATE TABLE \`department_members\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`departmentId\` VARCHAR(36) NOT NULL,
          \`userId\` VARCHAR(36) NOT NULL,
          \`role\` VARCHAR(50) NOT NULL DEFAULT 'member',
          \`joinedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_dept_mem_dept\` (\`departmentId\`),
          INDEX \`idx_dept_mem_user\` (\`userId\`),
          UNIQUE KEY \`dept_user_uniq\` (\`departmentId\`, \`userId\`),
          FOREIGN KEY (\`departmentId\`) REFERENCES \`departments\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. Create cohorts table
    if (!(await tableExists(pool, "cohorts"))) {
      console.log("[Migration 009] Creating cohorts table...");
      await pool.query(`
        CREATE TABLE \`cohorts\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`name\` VARCHAR(255) NOT NULL,
          \`code\` VARCHAR(50) NOT NULL,
          \`description\` TEXT NULL,
          \`startDate\` VARCHAR(50) NULL,
          \`endDate\` VARCHAR(50) NULL,
          \`status\` ENUM('upcoming', 'active', 'completed', 'archived') NOT NULL DEFAULT 'active',
          \`managerId\` VARCHAR(36) NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_cohorts_org\` (\`organizationId\`),
          INDEX \`idx_cohorts_manager\` (\`managerId\`),
          INDEX \`idx_cohorts_status\` (\`status\`),
          INDEX \`idx_cohorts_code\` (\`code\`),
          INDEX \`idx_cohorts_deleted\` (\`deletedAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 4. Create cohort_members table
    if (!(await tableExists(pool, "cohort_members"))) {
      console.log("[Migration 009] Creating cohort_members table...");
      await pool.query(`
        CREATE TABLE \`cohort_members\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`cohortId\` VARCHAR(36) NOT NULL,
          \`userId\` VARCHAR(36) NOT NULL,
          \`status\` ENUM('active', 'completed', 'dropped') NOT NULL DEFAULT 'active',
          \`joinedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_cohort_mem_cohort\` (\`cohortId\`),
          INDEX \`idx_cohort_mem_user\` (\`userId\`),
          INDEX \`idx_cohort_mem_status\` (\`status\`),
          UNIQUE KEY \`cohort_user_uniq\` (\`cohortId\`, \`userId\`),
          FOREIGN KEY (\`cohortId\`) REFERENCES \`cohorts\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 5. Enhance users table with departmentId, managerId, and jobTitle
    if (await tableExists(pool, "users")) {
      if (!(await columnExists(pool, "users", "departmentId"))) {
        console.log("[Migration 009] Adding departmentId to users...");
        await pool.query("ALTER TABLE `users` ADD COLUMN `departmentId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "users", "managerId"))) {
        console.log("[Migration 009] Adding managerId to users...");
        await pool.query("ALTER TABLE `users` ADD COLUMN `managerId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "users", "jobTitle"))) {
        console.log("[Migration 009] Adding jobTitle to users...");
        await pool.query("ALTER TABLE `users` ADD COLUMN `jobTitle` VARCHAR(100) NULL");
      }

      if (!(await indexExists(pool, "users", "idx_users_dept"))) {
        await pool.query("ALTER TABLE `users` ADD INDEX `idx_users_dept` (`departmentId`)");
      }
      if (!(await indexExists(pool, "users", "idx_users_manager"))) {
        await pool.query("ALTER TABLE `users` ADD INDEX `idx_users_manager` (`managerId`)");
      }
    }

    // 6. Enhance groups table with type, departmentId, cohortId, managerId, status
    if (await tableExists(pool, "groups")) {
      if (!(await columnExists(pool, "groups", "type"))) {
        console.log("[Migration 009] Adding type to groups...");
        await pool.query(`
          ALTER TABLE \`groups\` 
          ADD COLUMN \`type\` ENUM('general', 'department', 'cohort', 'team', 'track') NOT NULL DEFAULT 'general'
        `);
      }
      if (!(await columnExists(pool, "groups", "departmentId"))) {
        console.log("[Migration 009] Adding departmentId to groups...");
        await pool.query("ALTER TABLE `groups` ADD COLUMN `departmentId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "groups", "cohortId"))) {
        console.log("[Migration 009] Adding cohortId to groups...");
        await pool.query("ALTER TABLE `groups` ADD COLUMN `cohortId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "groups", "managerId"))) {
        console.log("[Migration 009] Adding managerId to groups...");
        await pool.query("ALTER TABLE `groups` ADD COLUMN `managerId` VARCHAR(36) NULL");
      }
      if (!(await columnExists(pool, "groups", "status"))) {
        console.log("[Migration 009] Adding status to groups...");
        await pool.query("ALTER TABLE `groups` ADD COLUMN `status` ENUM('active', 'archived') NOT NULL DEFAULT 'active'");
      }

      if (!(await indexExists(pool, "groups", "idx_groups_type"))) {
        await pool.query("ALTER TABLE `groups` ADD INDEX `idx_groups_type` (`type`)");
      }
      if (!(await indexExists(pool, "groups", "idx_groups_manager"))) {
        await pool.query("ALTER TABLE `groups` ADD INDEX `idx_groups_manager` (`managerId`)");
      }
    }
  },

  down: async (pool: Pool) => {
    console.log("[Migration 009] Rollback: Retaining organization tables to preserve audit and operational data.");
  }
};
