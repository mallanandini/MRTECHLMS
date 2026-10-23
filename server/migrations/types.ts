/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";

export interface Migration {
  id: string; // Unique identifier / version string, e.g. "001_initial_baseline"
  name: string; // Human readable description
  up: (pool: Pool) => Promise<void>;
  down?: (pool: Pool) => Promise<void>;
}

export interface AppliedMigration {
  id: number;
  version: string;
  name: string;
  batch: number;
  appliedAt: Date;
}
