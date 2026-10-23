/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { tableExists } from "./utils.js";

export const migration001: Migration = {
  id: "001_initial_baseline",
  name: "Record existing 26 core tables as baseline schema",
  up: async (pool: Pool) => {
    const requiredTables = [
      "users", "courses", "modules", "lessons", "enrollments", "progress",
      "assessments", "questions", "submissions", "assessment_assignments",
      "learning_paths", "learning_path_sections", "learning_path_items",
      "learning_path_assignments", "learning_path_progress", "coding_challenges",
      "coding_saved_code", "coding_submissions", "coding_chapters", "coding_topics",
      "student_playground_programs", "blogs", "comments", "reviews",
      "user_preferences", "audit_logs"
    ];

    for (const table of requiredTables) {
      const exists = await tableExists(pool, table);
      if (!exists) {
        console.log(`[Migration 001] Table '${table}' does not exist yet; will be created by baseline init.`);
      }
    }
  },
  down: async (_pool: Pool) => {
    // Baseline down: intentionally no-op to preserve operational data
    console.log("[Migration 001] Down migration on baseline is preserved without dropping core tables.");
  }
};
