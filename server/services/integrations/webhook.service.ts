/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import crypto, { randomUUID } from "crypto";
import { logAuditEvent } from "../../audit.js";

export type WebhookEventType = 
  | "user.created"
  | "user.updated"
  | "course.completed"
  | "assessment.passed"
  | "certificate.issued"
  | "gamification.badge_awarded"
  | "enrollment.assigned"
  | "webhook.test_ping";

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  name: string;
  targetUrl: string;
  secretKey: string;
  subscribedEvents: WebhookEventType[];
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  organizationId: string;
  eventType: string;
  payload: any;
  statusCode: number | null;
  responseBody: string | null;
  attemptCount: number;
  status: "success" | "failed" | "retrying";
  durationMs: number | null;
  createdAt: string;
}

export class WebhookService {
  public static readonly EVENT_DEFINITIONS: Array<{ event: WebhookEventType; description: string; samplePayload: any }> = [
    {
      event: "user.created",
      description: "Triggered whenever a new learner, trainer, or manager profile is created.",
      samplePayload: { userId: "usr-123", email: "learner@org.com", role: "student", name: "John Doe" }
    },
    {
      event: "user.updated",
      description: "Triggered when user details or department assignments are modified.",
      samplePayload: { userId: "usr-123", email: "learner@org.com", updatedFields: ["departmentId"] }
    },
    {
      event: "course.completed",
      description: "Triggered when a learner reaches 100% progress in an assigned or elective course.",
      samplePayload: { courseId: "crs-999", studentId: "usr-123", completedAt: "2026-09-30T12:00:00Z", progressPercent: 100 }
    },
    {
      event: "assessment.passed",
      description: "Triggered when a student passes an evaluation assessment with score >= passing score.",
      samplePayload: { assessmentId: "ass-456", studentId: "usr-123", score: 92, percentage: 92, passed: true }
    },
    {
      event: "certificate.issued",
      description: "Triggered when an official cryptographic certificate of completion is generated.",
      samplePayload: { certificateId: "cert-789", certificateCode: "MRTECH-2026-XXXX", studentId: "usr-123", type: "course" }
    },
    {
      event: "gamification.badge_awarded",
      description: "Triggered when a student unlocks an achievement badge or milestone rank.",
      samplePayload: { badgeId: "badge-first-lesson", badgeName: "First Step", studentId: "usr-123", bonusPoints: 10 }
    },
    {
      event: "enrollment.assigned",
      description: "Triggered when a mandatory or optional training item is assigned to a user.",
      samplePayload: { enrollmentId: "enr-555", studentId: "usr-123", courseId: "crs-999", dueDate: "2026-10-15" }
    }
  ];

  /**
   * Cryptographically sign a webhook payload using HMAC-SHA256
   */
  public static signPayload(payloadJsonString: string, secretKey: string): string {
    return crypto
      .createHmac("sha256", secretKey)
      .update(payloadJsonString)
      .digest("hex");
  }

  /**
   * Verify HMAC-SHA256 signature
   */
  public static verifySignature(payloadJsonString: string, signatureWithPrefix: string, secretKey: string): boolean {
    if (!signatureWithPrefix || !secretKey) return false;
    const cleanSig = signatureWithPrefix.replace(/^sha256=/, "").trim();
    const expectedSig = this.signPayload(payloadJsonString, secretKey);
    try {
      return crypto.timingSafeEqual(Buffer.from(cleanSig, "hex"), Buffer.from(expectedSig, "hex"));
    } catch {
      return false;
    }
  }

  /**
   * List subscriptions for an organization
   */
  public static async listSubscriptions(organizationId: string): Promise<WebhookSubscription[]> {
    const [rows]: any = await pool.query(
      `SELECT * FROM webhook_subscriptions WHERE organizationId = ? ORDER BY createdAt DESC`,
      [organizationId]
    );

    return rows.map((r: any) => ({
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      targetUrl: r.targetUrl,
      secretKey: r.secretKey,
      subscribedEvents: typeof r.subscribedEvents === "string" ? JSON.parse(r.subscribedEvents) : r.subscribedEvents,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  /**
   * Create a new webhook subscription
   */
  public static async createSubscription(
    organizationId: string,
    data: {
      name: string;
      targetUrl: string;
      subscribedEvents: WebhookEventType[];
    },
    actor: { id: string; email: string; role: string }
  ): Promise<WebhookSubscription> {
    const id = randomUUID();
    const secretKey = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO webhook_subscriptions 
       (id, organizationId, name, targetUrl, secretKey, subscribedEvents, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        id, organizationId, data.name, data.targetUrl, secretKey,
        JSON.stringify(data.subscribedEvents), now, now
      ]
    );

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "webhook_subscription_created",
      resourceType: "webhook_subscription",
      resourceId: id,
      details: { name: data.name, targetUrl: data.targetUrl, events: data.subscribedEvents }
    });

    return {
      id,
      organizationId,
      name: data.name,
      targetUrl: data.targetUrl,
      secretKey,
      subscribedEvents: data.subscribedEvents,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Delete a webhook subscription
   */
  public static async deleteSubscription(
    subscriptionId: string,
    organizationId: string,
    actor: { id: string; email: string; role: string }
  ): Promise<boolean> {
    await pool.query(
      `DELETE FROM webhook_subscriptions WHERE id = ? AND organizationId = ?`,
      [subscriptionId, organizationId]
    );

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "webhook_subscription_deleted",
      resourceType: "webhook_subscription",
      resourceId: subscriptionId,
      details: {}
    });

    return true;
  }

  /**
   * Dispatch webhook event to all subscribed endpoints with signing, retry, and delivery logging
   */
  public static async dispatch(
    organizationId: string,
    eventType: WebhookEventType,
    eventData: any
  ): Promise<void> {
    const subscriptions = await this.listSubscriptions(organizationId);
    const eligibleSubs = subscriptions.filter(s => 
      s.status === "active" && s.subscribedEvents.includes(eventType)
    );

    if (eligibleSubs.length === 0) return;

    for (const sub of eligibleSubs) {
      this.sendWithRetry(sub, eventType, eventData).catch(err => {
        console.warn(`[Webhook Delivery Error] Subscription ${sub.id}:`, err);
      });
    }
  }

  /**
   * Internal Delivery Routine with Exponential Backoff Retry (Max 3 Attempts)
   */
  private static async sendWithRetry(
    sub: WebhookSubscription,
    eventType: WebhookEventType,
    eventData: any
  ): Promise<void> {
    const deliveryId = randomUUID();
    const timestamp = new Date().toISOString();
    const payloadObject = {
      id: deliveryId,
      event: eventType,
      timestamp,
      organizationId: sub.organizationId,
      data: eventData
    };
    const payloadString = JSON.stringify(payloadObject);
    const signature = this.signPayload(payloadString, sub.secretKey);

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "MRTECHLMS-Webhook-Dispatcher/1.0",
      "X-MRTech-Signature": `sha256=${signature}`,
      "X-MRTech-Event": eventType,
      "X-MRTech-Delivery": deliveryId,
      "X-MRTech-Timestamp": timestamp
    };

    let attempt = 0;
    const maxAttempts = 3;
    let success = false;
    let lastStatusCode: number | null = null;
    let lastResponseBody: string | null = null;
    let durationMs: number = 0;

    while (attempt < maxAttempts && !success) {
      attempt++;
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(sub.targetUrl, {
          method: "POST",
          headers,
          body: payloadString,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        durationMs = Date.now() - startTime;
        lastStatusCode = response.status;
        const text = await response.text();
        lastResponseBody = text.substring(0, 1000); // Limit log size

        if (response.ok) {
          success = true;
        } else {
          // Retry on 5xx server errors
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, attempt * 2000));
          }
        }
      } catch (err: any) {
        durationMs = Date.now() - startTime;
        lastStatusCode = 0;
        lastResponseBody = err.message || "Network Error / Timeout";
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }
    }

    // Record Delivery Log
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO webhook_deliveries 
       (id, subscriptionId, organizationId, eventType, payload, statusCode, responseBody, attemptCount, status, durationMs, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deliveryId, sub.id, sub.organizationId, eventType,
        payloadString, lastStatusCode, lastResponseBody,
        attempt, success ? "success" : "failed", durationMs, now
      ]
    );
  }

  /**
   * Send a test ping webhook
   */
  public static async sendTestPing(
    subscriptionId: string,
    organizationId: string,
    actor: { id: string; email: string; role: string }
  ) {
    const [rows]: any = await pool.query(
      `SELECT * FROM webhook_subscriptions WHERE id = ? AND organizationId = ?`,
      [subscriptionId, organizationId]
    );
    if (!rows || rows.length === 0) throw new Error("Webhook subscription not found.");

    const sub: WebhookSubscription = {
      id: rows[0].id,
      organizationId: rows[0].organizationId,
      name: rows[0].name,
      targetUrl: rows[0].targetUrl,
      secretKey: rows[0].secretKey,
      subscribedEvents: typeof rows[0].subscribedEvents === "string" ? JSON.parse(rows[0].subscribedEvents) : rows[0].subscribedEvents,
      status: rows[0].status,
      createdAt: rows[0].createdAt,
      updatedAt: rows[0].updatedAt
    };

    await this.sendWithRetry(sub, "webhook.test_ping", {
      message: "Hello from MRTECHLMS! Webhook delivery configuration verified.",
      testedBy: actor.email,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: "Test ping dispatched." };
  }

  /**
   * Retrieve delivery logs with pagination
   */
  public static async getDeliveryLogs(params: {
    organizationId: string;
    subscriptionId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: WebhookDeliveryLog[]; total: number }> {
    const { organizationId, subscriptionId, limit = 50, offset = 0 } = params;

    let query = `SELECT * FROM webhook_deliveries WHERE organizationId = ?`;
    const qParams: any[] = [organizationId];

    if (subscriptionId) {
      query += ` AND subscriptionId = ?`;
      qParams.push(subscriptionId);
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    qParams.push(limit, offset);

    const [rows]: any = await pool.query(query, qParams);

    const [countRows]: any = await pool.query(
      `SELECT COUNT(id) AS total FROM webhook_deliveries WHERE organizationId = ?` + 
      (subscriptionId ? ` AND subscriptionId = ?` : ""),
      [organizationId, ...(subscriptionId ? [subscriptionId] : [])]
    );

    return {
      logs: rows.map((r: any) => ({
        id: r.id,
        subscriptionId: r.subscriptionId,
        organizationId: r.organizationId,
        eventType: r.eventType,
        payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
        statusCode: r.statusCode,
        responseBody: r.responseBody,
        attemptCount: r.attemptCount,
        status: r.status,
        durationMs: r.durationMs,
        createdAt: r.createdAt
      })),
      total: Number(countRows[0]?.total) || 0
    };
  }
}
