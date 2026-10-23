/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import crypto, { randomUUID } from "crypto";
import express from "express";
import { logAuditEvent } from "../../audit.js";

export type ApiScope = 
  | "users:read"
  | "users:write"
  | "courses:read"
  | "courses:write"
  | "enrollments:read"
  | "enrollments:write"
  | "assessments:read"
  | "reports:read"
  | "webhooks:manage";

export interface ApiKeyRecord {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiScope[];
  rateLimitPerMin: number;
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export class PublicApiService {
  // Rate limiter tracker in memory: apiKeyId -> array of timestamp millis
  private static readonly rateLimitTracker = new Map<string, number[]>();

  public static readonly AVAILABLE_SCOPES: Array<{ scope: ApiScope; description: string }> = [
    { scope: "users:read", description: "Read user profiles, accounts, and department memberships." },
    { scope: "users:write", description: "Provision new users and update learner profiles." },
    { scope: "courses:read", description: "Access course catalog, modules, lessons, and metadata." },
    { scope: "courses:write", description: "Create and update course metadata and lessons." },
    { scope: "enrollments:read", description: "View student enrollments and course progress." },
    { scope: "enrollments:write", description: "Enroll or unenroll students in courses." },
    { scope: "assessments:read", description: "Query assessments, questions, and learner results." },
    { scope: "reports:read", description: "Export reporting analytics and tenant metrics." },
    { scope: "webhooks:manage", description: "Configure and inspect webhook subscriptions." }
  ];

  /**
   * Hash API key using SHA-256
   */
  public static hashKey(rawKey: string): string {
    return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
  }

  /**
   * Create a new Public API Key
   */
  public static async createApiKey(data: {
    organizationId: string;
    name: string;
    scopes: ApiScope[];
    rateLimitPerMin?: number;
    expiresInDays?: number;
  }, actor: { id: string; email: string; role: string }): Promise<{ apiKey: ApiKeyRecord; secretKey: string }> {
    const id = randomUUID();
    const rawSecret = `mrk_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawSecret.substring(0, 16);
    const keyHash = this.hashKey(rawSecret);
    const rateLimit = data.rateLimitPerMin || 60;

    let expiresAt: string | null = null;
    if (data.expiresInDays && data.expiresInDays > 0) {
      const exp = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
      expiresAt = exp.toISOString();
    }

    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO api_keys 
       (id, organizationId, name, keyPrefix, keyHash, scopes, rateLimitPerMin, status, expiresAt, lastUsedAt, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, ?)`,
      [
        id, data.organizationId, data.name, keyPrefix, keyHash,
        JSON.stringify(data.scopes), rateLimit, expiresAt, actor.id, now, now
      ]
    );

    await logAuditEvent({
      organizationId: data.organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "api_key_created",
      resourceType: "api_key",
      resourceId: id,
      details: { name: data.name, keyPrefix, scopes: data.scopes }
    });

    const apiKey: ApiKeyRecord = {
      id,
      organizationId: data.organizationId,
      name: data.name,
      keyPrefix,
      scopes: data.scopes,
      rateLimitPerMin: rateLimit,
      status: "active",
      expiresAt,
      lastUsedAt: null,
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now
    };

    return { apiKey, secretKey: rawSecret };
  }

  /**
   * List API keys for an organization (secret key hash is never leaked)
   */
  public static async listApiKeys(organizationId: string): Promise<ApiKeyRecord[]> {
    const [rows]: any = await pool.query(
      `SELECT * FROM api_keys WHERE organizationId = ? ORDER BY createdAt DESC`,
      [organizationId]
    );

    return rows.map((r: any) => ({
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      keyPrefix: r.keyPrefix,
      scopes: typeof r.scopes === "string" ? JSON.parse(r.scopes) : r.scopes,
      rateLimitPerMin: Number(r.rateLimitPerMin) || 60,
      status: r.status,
      expiresAt: r.expiresAt,
      lastUsedAt: r.lastUsedAt,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  /**
   * Revoke an API key
   */
  public static async revokeApiKey(
    keyId: string,
    organizationId: string,
    actor: { id: string; email: string; role: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE api_keys SET status = 'revoked', updatedAt = ? WHERE id = ? AND organizationId = ?`,
      [now, keyId, organizationId]
    );

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "api_key_revoked",
      resourceType: "api_key",
      resourceId: keyId,
      details: {}
    });

    return true;
  }

  /**
   * Check Rate Limit for API Key (1-minute sliding window)
   */
  public static checkRateLimit(keyId: string, limitPerMin: number): { allowed: boolean; remaining: number; resetSeconds: number } {
    const now = Date.now();
    const oneMinAgo = now - 60000;

    let timestamps = this.rateLimitTracker.get(keyId) || [];
    timestamps = timestamps.filter(t => t > oneMinAgo);

    if (timestamps.length >= limitPerMin) {
      const oldest = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + 60000 - now) / 1000));
      return { allowed: false, remaining: 0, resetSeconds };
    }

    timestamps.push(now);
    this.rateLimitTracker.set(keyId, timestamps);

    return {
      allowed: true,
      remaining: Math.max(0, limitPerMin - timestamps.length),
      resetSeconds: 60
    };
  }

  /**
   * Verify an API key, check status, expiration, and required scope
   */
  public static async verifyApiKey(rawKey: string, requiredScope?: ApiScope): Promise<{
    valid: boolean;
    keyRecord?: ApiKeyRecord;
    error?: string;
    statusCode?: number;
  }> {
    if (!rawKey || !rawKey.trim()) {
      return { valid: false, error: "API Key missing.", statusCode: 401 };
    }

    const keyHash = this.hashKey(rawKey.trim());
    const [rows]: any = await pool.query(
      `SELECT * FROM api_keys WHERE keyHash = ?`,
      [keyHash]
    );

    if (!rows || rows.length === 0) {
      return { valid: false, error: "Invalid API key.", statusCode: 401 };
    }

    const keyRecord = rows[0];

    if (keyRecord.status !== "active") {
      return { valid: false, error: `API Key is ${keyRecord.status}.`, statusCode: 403 };
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return { valid: false, error: "API Key has expired.", statusCode: 403 };
    }

    const scopes: ApiScope[] = typeof keyRecord.scopes === "string" ? JSON.parse(keyRecord.scopes) : keyRecord.scopes;
    if (requiredScope && !scopes.includes(requiredScope)) {
      return {
        valid: false,
        error: `Insufficient permissions. This endpoint requires '${requiredScope}' scope.`,
        statusCode: 403
      };
    }

    return {
      valid: true,
      keyRecord: {
        id: keyRecord.id,
        organizationId: keyRecord.organizationId,
        name: keyRecord.name,
        keyPrefix: keyRecord.keyPrefix,
        scopes,
        rateLimitPerMin: Number(keyRecord.rateLimitPerMin) || 60,
        status: keyRecord.status,
        expiresAt: keyRecord.expiresAt,
        lastUsedAt: keyRecord.lastUsedAt,
        createdBy: keyRecord.createdBy,
        createdAt: keyRecord.createdAt,
        updatedAt: keyRecord.updatedAt
      }
    };
  }

  /**
   * Express Middleware: Authenticate and Authorize Public API Keys with Scopes & Rate Limits
   */
  public static requireApiKey(requiredScope?: ApiScope) {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // 1. Extract API Key from Header
      const rawHeader = req.headers["x-api-key"] as string || req.headers["authorization"] as string;
      let rawKey = "";

      if (rawHeader) {
        if (rawHeader.startsWith("Bearer mrk_")) {
          rawKey = rawHeader.substring(7).trim();
        } else if (rawHeader.startsWith("mrk_")) {
          rawKey = rawHeader.trim();
        }
      }

      if (!rawKey) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "API Key missing. Provide a valid API key via 'X-API-Key' or 'Authorization: Bearer <key>'."
        });
      }

      // 2. Validate Key Hash and Permissions
      const authResult = await PublicApiService.verifyApiKey(rawKey, requiredScope);
      if (!authResult.valid) {
        return res.status(authResult.statusCode || 401).json({
          error: authResult.statusCode === 403 ? "Forbidden" : "Unauthorized",
          message: authResult.error
        });
      }

      const keyRecord = authResult.keyRecord!;

      // 4. Rate Limiting Check
      const rateLimitCheck = PublicApiService.checkRateLimit(keyRecord.id, Number(keyRecord.rateLimitPerMin) || 60);
      res.setHeader("X-RateLimit-Limit", keyRecord.rateLimitPerMin);
      res.setHeader("X-RateLimit-Remaining", rateLimitCheck.remaining);
      res.setHeader("X-RateLimit-Reset", rateLimitCheck.resetSeconds);

      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit of ${keyRecord.rateLimitPerMin} requests per minute exceeded. Retry in ${rateLimitCheck.resetSeconds} seconds.`
        });
      }

      // 5. Update last used timestamp
      pool.query(`UPDATE api_keys SET lastUsedAt = ? WHERE id = ?`, [new Date().toISOString(), keyRecord.id]).catch(() => {});

      // Set tenant context for downstream handlers
      (req as any).apiKey = keyRecord;
      req.tenantId = keyRecord.organizationId;
      next();
    };
  }
}
