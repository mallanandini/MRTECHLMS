/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";

/**
 * Check if a column exists in a given MySQL table.
 */
export async function columnExists(pool: Pool, tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await pool.query<any[]>(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

/**
 * Check if an index exists in a given MySQL table.
 */
export async function indexExists(pool: Pool, tableName: string, indexName: string): Promise<boolean> {
  const [rows] = await pool.query<any[]>(
    `SELECT COUNT(*) as count FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}

/**
 * Check if a table exists in the current database.
 */
export async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const [rows] = await pool.query<any[]>(
    `SELECT COUNT(*) as count FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}
