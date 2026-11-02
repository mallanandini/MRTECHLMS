/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists, tableExists } from "./utils.js";

export const migration019: Migration = {
  id: "019_proctoring_and_answer_persistence",
  name: "Full-screen Exam Mode, Proctoring Events, and Answer Persistence",
  up: async (pool: Pool) => {
    console.log("[Migration 019] Applying Proctoring & Answer Persistence schema updates...");

    // 1. Add proctoringEvents to assessment_attempts
    if (await tableExists(pool, "assessment_attempts")) {
      if (!(await columnExists(pool, "assessment_attempts", "proctoringEvents"))) {
        console.log("[Migration 019] Adding proctoringEvents JSON column to assessment_attempts...");
        await pool.query("ALTER TABLE `assessment_attempts` ADD COLUMN `proctoringEvents` JSON NULL AFTER `answers`");
      }
    }

    // 2. Add proctoringConfig to assessments
    if (await tableExists(pool, "assessments")) {
      if (!(await columnExists(pool, "assessments", "proctoringConfig"))) {
        console.log("[Migration 019] Adding proctoringConfig JSON column to assessments...");
        await pool.query("ALTER TABLE `assessments` ADD COLUMN `proctoringConfig` JSON NULL AFTER `revealAnswers`");
      }
    }

    console.log("[Migration 019] Proctoring & Answer Persistence schema updates applied successfully.");
  },

  down: async (pool: Pool) => {
    console.log("[Migration 019] Reverting Proctoring & Answer Persistence schema updates...");
    if (await tableExists(pool, "assessment_attempts")) {
      if (await columnExists(pool, "assessment_attempts", "proctoringEvents")) {
        await pool.query("ALTER TABLE `assessment_attempts` DROP COLUMN `proctoringEvents`");
      }
    }
    if (await tableExists(pool, "assessments")) {
      if (await columnExists(pool, "assessments", "proctoringConfig")) {
        await pool.query("ALTER TABLE `assessments` DROP COLUMN `proctoringConfig`");
      }
    }
  }
};
