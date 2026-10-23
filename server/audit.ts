/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "./mysql.js";

export interface AuditEventParams {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  organizationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: "success" | "failure";
}

/**
 * Foundation Audit Logger for security-sensitive operations.
 * Non-blocking: logs asynchronously so audit failures do not interrupt primary user transactions.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const id = "aud-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const createdAt = new Date().toISOString();
    const detailsJson = params.details ? JSON.stringify(params.details) : null;
    const orgId = params.organizationId || "org-default";

    const sql = `
      INSERT INTO audit_logs 
        (id, organizationId, userId, userEmail, userRole, action, resourceType, resourceId, details, ipAddress, userAgent, status, createdAt)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      id,
      orgId,
      params.userId || null,
      params.userEmail || null,
      params.userRole || null,
      params.action,
      params.resourceType,
      params.resourceId || null,
      detailsJson,
      params.ipAddress || null,
      params.userAgent ? params.userAgent.substring(0, 255) : null,
      params.status || "success",
      createdAt
    ]);
  } catch (err) {
    // Fail-safe: log to stderr, never crash application logic
    console.error("[AuditLogger Error] Failed to persist audit record:", err);
  }
}
