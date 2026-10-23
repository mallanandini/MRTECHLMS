/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

const TENANT_TABLES = [
  "users",
  "courses",
  "assessments",
  "assessment_assignments",
  "submissions",
  "learning_paths",
  "learning_path_assignments",
  "enrollments",
  "blogs",
  "audit_logs"
];

export const migration002: Migration = {
  id: "002_multi_tenancy_organizations",
  name: "Create organizations table, default organization, and organizationId on tenant-scoped tables",
  up: async (pool: Pool) => {
    // 1. Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`organizations\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(100) UNIQUE NOT NULL,
        \`domain\` VARCHAR(255) NULL,
        \`logoUrl\` TEXT NULL,
        \`settings\` JSON NULL,
        \`status\` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        \`createdAt\` VARCHAR(50) NOT NULL,
        \`updatedAt\` VARCHAR(50) NULL,
        \`deletedAt\` VARCHAR(50) NULL,
        INDEX \`idx_org_slug\` (\`slug\`),
        INDEX \`idx_org_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Insert default organization for backward compatibility
    await pool.query(`
      INSERT IGNORE INTO \`organizations\` (\`id\`, \`name\`, \`slug\`, \`status\`, \`createdAt\`)
      VALUES ('org-default', 'Default Institution', 'default', 'active', '${new Date().toISOString()}');
    `);

    // 3. Add organizationId column and index to each tenant-owned table
    for (const table of TENANT_TABLES) {
      const tExists = await tableExists(pool, table);
      if (!tExists) continue;

      const hasCol = await columnExists(pool, table, "organizationId");
      if (!hasCol) {
        console.log(`[Migration 002] Adding organizationId to table ${table}...`);
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`organizationId\` VARCHAR(36) NULL AFTER \`id\``);
      }

      // Backfill any NULL records to org-default
      await pool.query(`UPDATE \`${table}\` SET \`organizationId\` = 'org-default' WHERE \`organizationId\` IS NULL`);

      // Add index if not already present
      const idxName = `idx_${table}_org`;
      const hasIdx = await indexExists(pool, table, idxName);
      if (!hasIdx) {
        await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${idxName}\` (\`organizationId\`)`);
      }
    }
  },
  down: async (pool: Pool) => {
    console.log("[Migration 002] Down migration: dropping organizationId columns...");
    for (const table of TENANT_TABLES) {
      const hasCol = await columnExists(pool, table, "organizationId");
      if (hasCol) {
        const idxName = `idx_${table}_org`;
        const hasIdx = await indexExists(pool, table, idxName);
        if (hasIdx) {
          await pool.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idxName}\``);
        }
        await pool.query(`ALTER TABLE \`${table}\` DROP COLUMN \`organizationId\``);
      }
    }
  }
};
