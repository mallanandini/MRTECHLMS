/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../mysql.js";
import { runMigrations, rollbackLastBatch, getMigrationStatus } from "./runner.js";

async function main() {
  const command = process.argv[2] || "up";

  console.log("=================================================");
  console.log(`  MRTECHLMS Database Migration Engine: '${command}'`);
  console.log("=================================================\n");

  try {
    if (command === "up") {
      const result = await runMigrations(pool);
      console.log(`\nMigration run completed. Applied: ${result.applied.length}`);
    } else if (command === "down") {
      const result = await rollbackLastBatch(pool);
      console.log(`\nRollback completed. Rolled back: ${result.rolledBack.length}`);
    } else if (command === "status") {
      const status = await getMigrationStatus(pool);
      console.log("Migration Status Summary:");
      console.table(status.all.map(s => ({
        Version: s.version,
        Name: s.name,
        Status: s.status.toUpperCase(),
        Batch: s.batch ?? "-",
        AppliedAt: s.appliedAt ? new Date(s.appliedAt).toLocaleString() : "-"
      })));
    } else {
      console.error(`Unknown command: '${command}'. Available commands: up, down, status`);
      process.exit(1);
    }
  } catch (err) {
    console.error("\nMigration CLI encountered an unrecoverable error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
