/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { EmailProvider, EmailMessage, EmailResult } from "./email.interface.js";
import { MockEmailProvider } from "./providers/mock.provider.js";
import { SmtpEmailProvider } from "./providers/smtp.provider.js";
import { ConsoleEmailProvider } from "./providers/console.provider.js";
import { emailQueueDb } from "../db.js";
import { EmailQueueItem } from "../../src/types.js";
import { pool } from "../mysql.js";

export interface QueueEmailOptions {
  to: string;
  toName?: string | null;
  userId?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  notificationType: string;
  organizationId?: string;
  scheduledAt?: string;
}

export class EmailService {
  private static instance: EmailService;
  private provider: EmailProvider;

  private constructor() {
    this.provider = this.createConfiguredProvider();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private createConfiguredProvider(): EmailProvider {
    const isEmailEnabled = process.env.EMAIL_ENABLED === "true";
    const configuredProvider = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();

    // Safety rule: "Do not send emails during development unless explicitly configured."
    if (!isEmailEnabled) {
      return new MockEmailProvider();
    }

    switch (configuredProvider) {
      case "smtp":
        return new SmtpEmailProvider();
      case "console":
        return new ConsoleEmailProvider();
      case "mock":
      default:
        return new MockEmailProvider();
    }
  }

  /**
   * Set custom or test provider
   */
  public setProvider(provider: EmailProvider): void {
    this.provider = provider;
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  /**
   * Enqueue email to database queue (non-blocking, returns immediately)
   */
  public async queueEmail(options: QueueEmailOptions): Promise<EmailQueueItem> {
    const now = new Date().toISOString();
    const queueItem: EmailQueueItem = {
      id: crypto.randomUUID(),
      organizationId: options.organizationId || "org-default",
      recipientEmail: options.to,
      recipientName: options.toName || null,
      userId: options.userId || null,
      subject: options.subject,
      bodyText: options.bodyText,
      bodyHtml: options.bodyHtml,
      notificationType: options.notificationType,
      status: "pending",
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      scheduledAt: options.scheduledAt || now,
      sentAt: null,
      createdAt: now,
      updatedAt: now
    };

    await emailQueueDb.insert(queueItem);
    return queueItem;
  }

  /**
   * Background processor: grabs pending emails in batches and sends them
   */
  public async processQueue(batchSize = 25): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const now = new Date().toISOString();

    // Query pending emails ready for sending
    const [rows]: any = await pool.query(
      `SELECT * FROM \`email_queue\` 
       WHERE \`status\` = 'pending' AND \`scheduledAt\` <= ? 
       ORDER BY \`createdAt\` ASC LIMIT ?`,
      [now, batchSize]
    );

    if (!rows || rows.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    const itemIds = rows.map((r: any) => r.id);
    const placeholders = itemIds.map(() => "?").join(",");

    // Mark as processing
    await pool.query(
      `UPDATE \`email_queue\` SET \`status\` = 'processing', \`updatedAt\` = ? WHERE \`id\` IN (${placeholders})`,
      [now, ...itemIds]
    );

    let sent = 0;
    let failed = 0;

    for (const item of rows) {
      const emailMessage: EmailMessage = {
        to: item.recipientEmail,
        toName: item.recipientName,
        subject: item.subject,
        text: item.bodyText,
        html: item.bodyHtml,
        metadata: {
          queueId: item.id,
          notificationType: item.notificationType,
          userId: item.userId
        }
      };

      try {
        const result: EmailResult = await this.provider.send(emailMessage);
        const updateNow = new Date().toISOString();

        if (result.success) {
          await pool.query(
            `UPDATE \`email_queue\` SET 
              \`status\` = 'sent', 
              \`sentAt\` = ?, 
              \`attempts\` = \`attempts\` + 1,
              \`updatedAt\` = ? 
             WHERE \`id\` = ?`,
            [updateNow, updateNow, item.id]
          );
          sent++;
        } else {
          const nextAttempts = (item.attempts || 0) + 1;
          const newStatus = nextAttempts >= (item.maxAttempts || 3) ? "failed" : "pending";
          await pool.query(
            `UPDATE \`email_queue\` SET 
              \`status\` = ?, 
              \`attempts\` = ?, 
              \`lastError\` = ?, 
              \`updatedAt\` = ? 
             WHERE \`id\` = ?`,
            [newStatus, nextAttempts, result.error || "Unknown delivery failure", updateNow, item.id]
          );
          failed++;
        }
      } catch (err: any) {
        const updateNow = new Date().toISOString();
        const nextAttempts = (item.attempts || 0) + 1;
        const newStatus = nextAttempts >= (item.maxAttempts || 3) ? "failed" : "pending";

        await pool.query(
          `UPDATE \`email_queue\` SET 
            \`status\` = ?, 
            \`attempts\` = ?, 
            \`lastError\` = ?, 
            \`updatedAt\` = ? 
           WHERE \`id\` = ?`,
          [newStatus, nextAttempts, err.message, updateNow, item.id]
        );
        failed++;
      }
    }

    return {
      processed: rows.length,
      sent,
      failed
    };
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(orgId = "org-default"): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    const [rows]: any = await pool.query(
      `SELECT \`status\`, COUNT(\`id\`) AS cnt 
       FROM \`email_queue\` 
       WHERE \`organizationId\` = ? 
       GROUP BY \`status\``,
      [orgId]
    );

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0
    };

    rows.forEach((r: any) => {
      counts[r.status] = Number(r.cnt) || 0;
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      pending: counts.pending,
      processing: counts.processing,
      sent: counts.sent,
      failed: counts.failed,
      total
    };
  }

  /**
   * Retry all failed emails
   */
  public async retryFailedEmails(orgId = "org-default"): Promise<number> {
    const now = new Date().toISOString();
    const [result]: any = await pool.query(
      `UPDATE \`email_queue\` 
       SET \`status\` = 'pending', \`attempts\` = 0, \`updatedAt\` = ? 
       WHERE \`organizationId\` = ? AND \`status\` = 'failed'`,
      [now, orgId]
    );
    return result.affectedRows || 0;
  }
}

export const emailService = EmailService.getInstance();
