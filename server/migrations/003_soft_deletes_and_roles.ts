/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

const SOFT_DELETE_TABLES = [
  "users",
  "courses",
  "assessments",
  "questions",
  "learning_paths"
];

export const migration003: Migration = {
  id: "003_soft_deletes_and_roles",
  name: "Expand user roles (super_admin, manager) and add soft delete columns (deletedAt) with indexes",
  up: async (pool: Pool) => {
    // 1. Expand users.role ENUM
    console.log("[Migration 003] Expanding users.role enum with super_admin and manager...");
    await pool.query(`
      ALTER TABLE \`users\` 
      MODIFY COLUMN \`role\` ENUM('student', 'trainer', 'admin', 'super_admin', 'manager') NOT NULL DEFAULT 'student'
    `);

    // 2. Add deletedAt column and index to soft-delete enabled tables
    for (const table of SOFT_DELETE_TABLES) {
      const tExists = await tableExists(pool, table);
      if (!tExists) continue;

      const hasCol = await columnExists(pool, table, "deletedAt");
      if (!hasCol) {
        console.log(`[Migration 003] Adding deletedAt to table ${table}...`);
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`deletedAt\` VARCHAR(50) NULL`);
      }

      const idxName = `idx_${table}_deleted`;
      const hasIdx = await indexExists(pool, table, idxName);
      if (!hasIdx) {
        await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${idxName}\` (\`deletedAt\`)`);
      }
    }
  },
  down: async (pool: Pool) => {
    console.log("[Migration 003] Down migration: dropping deletedAt columns...");
    for (const table of SOFT_DELETE_TABLES) {
      const hasCol = await columnExists(pool, table, "deletedAt");
      if (hasCol) {
        const idxName = `idx_${table}_deleted`;
        const hasIdx = await indexExists(pool, table, idxName);
        if (hasIdx) {
          await pool.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idxName}\``);
        }
        await pool.query(`ALTER TABLE \`${table}\` DROP COLUMN \`deletedAt\``);
      }
    }
  }
};
