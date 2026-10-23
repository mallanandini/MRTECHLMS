/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, indexExists, tableExists } from "./utils.js";

export const migration018: Migration = {
  id: "018_batch_learning_paths_and_denials",
  name: "Batch Learning Paths and Explicit Student Learning Path Denials",
  up: async (pool: Pool) => {
    console.log("[Migration 018] Applying Batch Learning Paths and Student Denial schema updates...");

    // 1. Create batch_learning_paths table
    if (!(await tableExists(pool, "batch_learning_paths"))) {
      console.log("[Migration 018] Creating batch_learning_paths table...");
      await pool.query(`
        CREATE TABLE \`batch_learning_paths\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`batchId\` VARCHAR(36) NOT NULL,
          \`learningPathId\` VARCHAR(36) NOT NULL,
          \`assignedAt\` VARCHAR(50) NOT NULL,
          \`assignedBy\` VARCHAR(36) NULL,
          \`status\` ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
          INDEX \`idx_blp_batch\` (\`batchId\`),
          INDEX \`idx_blp_path\` (\`learningPathId\`),
          INDEX \`idx_blp_status\` (\`status\`),
          UNIQUE KEY \`batch_lp_uniq\` (\`batchId\`, \`learningPathId\`),
          FOREIGN KEY (\`batchId\`) REFERENCES \`batches\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`learningPathId\`) REFERENCES \`learning_paths\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Add isDenied column to learning_path_assignments if not present
    if (await tableExists(pool, "learning_path_assignments")) {
      if (!(await columnExists(pool, "learning_path_assignments", "isDenied"))) {
        console.log("[Migration 018] Adding isDenied to learning_path_assignments...");
        await pool.query("ALTER TABLE `learning_path_assignments` ADD COLUMN `isDenied` TINYINT(1) NOT NULL DEFAULT 0");
      }
      if (!(await indexExists(pool, "learning_path_assignments", "idx_lpa_denied"))) {
        await pool.query("ALTER TABLE `learning_path_assignments` ADD INDEX `idx_lpa_denied` (`isDenied`)");
      }

      // 3. Extend assignmentSource enum to support 'batch'
      try {
        await pool.query(`
          ALTER TABLE \`learning_path_assignments\` 
          MODIFY COLUMN \`assignmentSource\` ENUM('individual','bulk','group','self','batch') NOT NULL DEFAULT 'individual'
        `);
      } catch (err: any) {
        console.log("[Migration 018] Note modifying assignmentSource enum:", err.message);
      }
    }

    console.log("[Migration 018] Batch Learning Paths schema updates completed successfully.");
  },
  down: async (pool: Pool) => {
    console.log("[Migration 018] Rolling back Batch Learning Paths schema...");
    await pool.query("DROP TABLE IF EXISTS `batch_learning_paths`");
  }
};
