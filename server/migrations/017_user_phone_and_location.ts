/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { columnExists } from "./utils.js";

export const migration017: Migration = {
  id: "017_user_phone_and_location",
  name: "Add phoneNumber and location contact fields to users table",
  up: async (pool: Pool) => {
    console.log("[Migration 017] Checking and adding phoneNumber and location to users table...");

    if (!(await columnExists(pool, "users", "phoneNumber"))) {
      console.log("[Migration 017] Adding column phoneNumber to users...");
      await pool.query("ALTER TABLE `users` ADD COLUMN `phoneNumber` VARCHAR(50) NULL DEFAULT NULL;");
    }

    if (!(await columnExists(pool, "users", "location"))) {
      console.log("[Migration 017] Adding column location to users...");
      await pool.query("ALTER TABLE `users` ADD COLUMN `location` VARCHAR(255) NULL DEFAULT NULL;");
    }
  },
  down: async (pool: Pool) => {
    console.log("[Migration 017] Rolling back phoneNumber and location from users table...");

    if (await columnExists(pool, "users", "location")) {
      await pool.query("ALTER TABLE `users` DROP COLUMN `location`;");
    }

    if (await columnExists(pool, "users", "phoneNumber")) {
      await pool.query("ALTER TABLE `users` DROP COLUMN `phoneNumber`;");
    }
  }
};
