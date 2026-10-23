/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { indexExists, tableExists } from "./utils.js";

interface IndexDef {
  table: string;
  indexName: string;
  columns: string[];
}

const INDEXES_TO_ADD: IndexDef[] = [
  { table: "users", indexName: "idx_users_org_role_status", columns: ["organizationId", "role", "status"] },
  { table: "courses", indexName: "idx_courses_org_status", columns: ["organizationId", "status"] },
  { table: "assessments", indexName: "idx_assessments_org_status", columns: ["organizationId", "status"] },
  { table: "assessment_assignments", indexName: "idx_assign_student_status", columns: ["studentId", "status"] },
  { table: "submissions", indexName: "idx_submissions_student_assessment", columns: ["studentId", "assessmentId"] },
  { table: "submissions", indexName: "idx_submissions_assessment_date", columns: ["assessmentId", "submittedAt"] },
  { table: "audit_logs", indexName: "idx_audit_org_action", columns: ["organizationId", "action"] }
];

export const migration004: Migration = {
  id: "004_composite_indexes",
  name: "Add composite performance indexes for multi-tenant querying and high-volume workloads",
  up: async (pool: Pool) => {
    for (const def of INDEXES_TO_ADD) {
      const tExists = await tableExists(pool, def.table);
      if (!tExists) continue;

      const hasIdx = await indexExists(pool, def.table, def.indexName);
      if (!hasIdx) {
        console.log(`[Migration 004] Adding composite index ${def.indexName} to ${def.table}...`);
        const colList = def.columns.map(c => `\`${c}\``).join(", ");
        await pool.query(`ALTER TABLE \`${def.table}\` ADD INDEX \`${def.indexName}\` (${colList})`);
      }
    }
  },
  down: async (pool: Pool) => {
    console.log("[Migration 004] Down migration: dropping composite indexes...");
    for (const def of INDEXES_TO_ADD) {
      const hasIdx = await indexExists(pool, def.table, def.indexName);
      if (hasIdx) {
        await pool.query(`ALTER TABLE \`${def.table}\` DROP INDEX \`${def.indexName}\``);
      }
    }
  }
};
