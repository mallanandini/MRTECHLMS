/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration008: Migration = {
  id: "008_certification_system",
  name: "Certification System: Templates, issued certificates, verification, and revocation",
  up: async (pool: Pool) => {
    console.log("[Migration 008] Applying Certification System schema updates...");

    // 1. Create certificate_templates table
    if (!(await tableExists(pool, "certificate_templates"))) {
      console.log("[Migration 008] Creating certificate_templates table...");
      await pool.query(`
        CREATE TABLE \`certificate_templates\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`name\` VARCHAR(255) NOT NULL,
          \`description\` TEXT NULL,
          \`style\` ENUM('classic_gold', 'modern_emerald', 'executive_navy', 'tech_violet') NOT NULL DEFAULT 'classic_gold',
          \`primaryColor\` VARCHAR(50) NOT NULL DEFAULT '#1e3a8a',
          \`accentColor\` VARCHAR(50) NOT NULL DEFAULT '#d97706',
          \`badgeIcon\` VARCHAR(50) NOT NULL DEFAULT 'award',
          \`borderStyle\` VARCHAR(50) NOT NULL DEFAULT 'ornate',
          \`defaultSignatoryName\` VARCHAR(255) NOT NULL DEFAULT 'Dr. M. R. Tech',
          \`defaultSignatoryTitle\` VARCHAR(255) NOT NULL DEFAULT 'Director of Academic Affairs',
          \`organizationName\` VARCHAR(255) NOT NULL DEFAULT 'MRTECH Learning Academy',
          \`isDefault\` TINYINT(1) NOT NULL DEFAULT 0,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_templates_org\` (\`organizationId\`),
          INDEX \`idx_templates_deleted\` (\`deletedAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Create certificates table
    if (!(await tableExists(pool, "certificates"))) {
      console.log("[Migration 008] Creating certificates table...");
      await pool.query(`
        CREATE TABLE \`certificates\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`certificateNumber\` VARCHAR(100) NOT NULL,
          \`verificationCode\` VARCHAR(64) NOT NULL,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`studentId\` VARCHAR(36) NOT NULL,
          \`studentName\` VARCHAR(255) NOT NULL,
          \`studentEmail\` VARCHAR(255) NOT NULL,
          \`type\` ENUM('course', 'learning_path') NOT NULL DEFAULT 'course',
          \`courseId\` VARCHAR(36) NULL,
          \`learningPathId\` VARCHAR(36) NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`certificateTitle\` VARCHAR(255) NOT NULL DEFAULT 'Certificate of Completion',
          \`templateId\` VARCHAR(36) NULL,
          \`templateStyle\` VARCHAR(50) NOT NULL DEFAULT 'classic_gold',
          \`scorePercentage\` DECIMAL(5,2) NULL,
          \`issuedAt\` VARCHAR(50) NOT NULL,
          \`expiresAt\` VARCHAR(50) NULL,
          \`status\` ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
          \`signatoryName\` VARCHAR(255) NOT NULL DEFAULT 'Dr. M. R. Tech',
          \`signatoryTitle\` VARCHAR(255) NOT NULL DEFAULT 'Director of Academic Affairs',
          \`organizationName\` VARCHAR(255) NOT NULL DEFAULT 'MRTECH Learning Academy',
          \`revokedAt\` VARCHAR(50) NULL,
          \`revokedBy\` VARCHAR(36) NULL,
          \`revocationReason\` TEXT NULL,
          \`metadata\` JSON NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_cert_student\` (\`studentId\`),
          INDEX \`idx_cert_org\` (\`organizationId\`),
          INDEX \`idx_cert_status\` (\`status\`),
          INDEX \`idx_cert_deleted\` (\`deletedAt\`),
          UNIQUE KEY \`uniq_cert_number\` (\`certificateNumber\`),
          UNIQUE KEY \`uniq_cert_code\` (\`verificationCode\`),
          FOREIGN KEY (\`studentId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. Add certificate configuration fields to courses
    if (await tableExists(pool, "courses")) {
      if (!(await columnExists(pool, "courses", "certificateEnabled"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`certificateEnabled\` TINYINT(1) NOT NULL DEFAULT 1`);
      }
      if (!(await columnExists(pool, "courses", "certificateTemplateId"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`certificateTemplateId\` VARCHAR(36) NULL`);
      }
      if (!(await columnExists(pool, "courses", "certificateTitle"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`certificateTitle\` VARCHAR(255) NULL`);
      }
      if (!(await columnExists(pool, "courses", "requireFinalAssessment"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`requireFinalAssessment\` TINYINT(1) NOT NULL DEFAULT 0`);
      }
      if (!(await columnExists(pool, "courses", "validityMonths"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`validityMonths\` INT NULL DEFAULT NULL`);
      }
      if (!(await columnExists(pool, "courses", "signatoryName"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`signatoryName\` VARCHAR(255) NULL`);
      }
      if (!(await columnExists(pool, "courses", "signatoryTitle"))) {
        await pool.query(`ALTER TABLE \`courses\` ADD COLUMN \`signatoryTitle\` VARCHAR(255) NULL`);
      }
    }

    // 4. Add certificate configuration fields to learning_paths
    if (await tableExists(pool, "learning_paths")) {
      if (!(await columnExists(pool, "learning_paths", "certificateEnabled"))) {
        await pool.query(`ALTER TABLE \`learning_paths\` ADD COLUMN \`certificateEnabled\` TINYINT(1) NOT NULL DEFAULT 1`);
      }
      if (!(await columnExists(pool, "learning_paths", "certificateTemplateId"))) {
        await pool.query(`ALTER TABLE \`learning_paths\` ADD COLUMN \`certificateTemplateId\` VARCHAR(36) NULL`);
      }
      if (!(await columnExists(pool, "learning_paths", "certificateTitle"))) {
        await pool.query(`ALTER TABLE \`learning_paths\` ADD COLUMN \`certificateTitle\` VARCHAR(255) NULL`);
      }
      if (!(await columnExists(pool, "learning_paths", "validityMonths"))) {
        await pool.query(`ALTER TABLE \`learning_paths\` ADD COLUMN \`validityMonths\` INT NULL DEFAULT NULL`);
      }
      if (!(await columnExists(pool, "learning_paths", "signatoryName"))) {
        await pool.query(`ALTER TABLE \`learning_paths\` ADD COLUMN \`signatoryName\` VARCHAR(255) NULL`);
      }
      if (!(await columnExists(pool, "learning_paths", "signatoryTitle"))) {
        await pool.query(`ALTER TABLE \`learning_paths\` ADD COLUMN \`signatoryTitle\` VARCHAR(255) NULL`);
      }
    }

    console.log("[Migration 008] Certification System schema updates applied successfully.");
  },

  down: async (pool: Pool) => {
    console.log("[Migration 008] Reverting Certification System schema updates...");
    if (await tableExists(pool, "certificates")) {
      await pool.query("DROP TABLE IF EXISTS `certificates`");
    }
    if (await tableExists(pool, "certificate_templates")) {
      await pool.query("DROP TABLE IF EXISTS `certificate_templates`");
    }
  }
};
