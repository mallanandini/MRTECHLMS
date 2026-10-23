/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration, AppliedMigration } from "./types.js";
import { migration001 } from "./001_initial_baseline.js";
import { migration002 } from "./002_multi_tenancy_organizations.js";
import { migration003 } from "./003_soft_deletes_and_roles.js";
import { migration004 } from "./004_composite_indexes.js";
import { migration005 } from "./005_core_learning_engine.js";
import { migration006 } from "./006_enrollment_access_control.js";
import { migration007 } from "./007_assessment_attempts.js";
import { migration008 } from "./008_certification_system.js";
import { migration009 } from "./009_organization_management.js";
import { migration010 } from "./010_notifications_and_reminders.js";
import { migration011 } from "./011_analytics_reporting_indexes.js";
import { migration012 } from "./012_gamification_system.js";
import { migration013 } from "./013_enterprise_integrations.js";
import { migration014 } from "./014_secure_coding_execution.js";
import { migration015 } from "./015_ai_learning_layer.js";
import { migration016 } from "./016_batch_management.js";
import { migration017 } from "./017_user_phone_and_location.js";
import { migration018 } from "./018_batch_learning_paths_and_denials.js";

export const ALL_MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
  migration012,
  migration013,
  migration014,
  migration015,
  migration016,
  migration017,
  migration018
];

export async function ensureMigrationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`version\` VARCHAR(100) UNIQUE NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`batch\` INT NOT NULL,
      \`appliedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function getAppliedMigrations(pool: Pool): Promise<AppliedMigration[]> {
  await ensureMigrationTable(pool);
  const [rows] = await pool.query<any[]>("SELECT * FROM `schema_migrations` ORDER BY `id` ASC");
  return rows;
}

export async function runMigrations(pool: Pool): Promise<{ applied: string[]; alreadyUpToDate: boolean }> {
  await ensureMigrationTable(pool);
  const appliedList = await getAppliedMigrations(pool);
  const appliedSet = new Set(appliedList.map(m => m.version));

  // Determine current max batch
  const maxBatch = appliedList.reduce((max, m) => Math.max(max, m.batch), 0);
  const newBatch = maxBatch + 1;

  const appliedThisRun: string[] = [];

  for (const migration of ALL_MIGRATIONS) {
    if (!appliedSet.has(migration.id)) {
      console.log(`[Migration Runner] Applying migration: ${migration.id} - ${migration.name}...`);
      const startTime = Date.now();
      try {
        await migration.up(pool);
        await pool.query(
          "INSERT INTO `schema_migrations` (`version`, `name`, `batch`) VALUES (?, ?, ?)",
          [migration.id, migration.name, newBatch]
        );
        const duration = Date.now() - startTime;
        console.log(`[Migration Runner] ✓ Successfully applied ${migration.id} (${duration}ms)`);
        appliedThisRun.push(migration.id);
      } catch (err) {
        console.error(`[Migration Runner] ✗ Fatal failure applying migration ${migration.id}:`, err);
        throw err;
      }
    }
  }

  if (appliedThisRun.length === 0) {
    console.log("[Migration Runner] Database schema is up to date (no pending migrations).");
  }

  return {
    applied: appliedThisRun,
    alreadyUpToDate: appliedThisRun.length === 0
  };
}

export async function rollbackLastBatch(pool: Pool): Promise<{ rolledBack: string[] }> {
  await ensureMigrationTable(pool);
  const appliedList = await getAppliedMigrations(pool);
  if (appliedList.length === 0) {
    console.log("[Migration Runner] No migrations to rollback.");
    return { rolledBack: [] };
  }

  const maxBatch = appliedList.reduce((max, m) => Math.max(max, m.batch), 0);
  const toRollback = appliedList.filter(m => m.batch === maxBatch).reverse();

  const rolledBack: string[] = [];
  for (const record of toRollback) {
    const migrationDef = ALL_MIGRATIONS.find(m => m.id === record.version);
    if (!migrationDef) {
      console.warn(`[Migration Runner] Warning: Migration definition not found for ${record.version}`);
      continue;
    }

    if (migrationDef.down) {
      console.log(`[Migration Runner] Rolling back migration: ${record.version}...`);
      await migrationDef.down(pool);
    } else {
      console.log(`[Migration Runner] Migration ${record.version} has no down() handler; skipping down execution.`);
    }

    await pool.query("DELETE FROM `schema_migrations` WHERE `version` = ?", [record.version]);
    console.log(`[Migration Runner] ✓ Rolled back ${record.version}`);
    rolledBack.push(record.version);
  }

  return { rolledBack };
}

export async function getMigrationStatus(pool: Pool): Promise<{
  all: { version: string; name: string; status: "applied" | "pending"; batch?: number; appliedAt?: Date }[];
}> {
  await ensureMigrationTable(pool);
  const appliedList = await getAppliedMigrations(pool);
  const appliedMap = new Map(appliedList.map(m => [m.version, m]));

  const all = ALL_MIGRATIONS.map(m => {
    const applied = appliedMap.get(m.id);
    return {
      version: m.id,
      name: m.name,
      status: applied ? ("applied" as const) : ("pending" as const),
      batch: applied?.batch,
      appliedAt: applied?.appliedAt
    };
  });

  return { all };
}
