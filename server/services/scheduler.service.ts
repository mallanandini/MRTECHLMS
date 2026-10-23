/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { emailService } from "../email/email.service.js";
import { NotificationService } from "./notification.service.js";

export class SchedulerService {
  private static instance: SchedulerService;
  private emailQueueInterval: NodeJS.Timeout | null = null;
  private reminderSweepInterval: NodeJS.Timeout | null = null;
  private running = false;

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Start background jobs
   */
  public start(options?: { emailIntervalMs?: number; reminderIntervalMs?: number }): void {
    if (this.running) return;
    this.running = true;

    const emailInterval = options?.emailIntervalMs || 15000; // 15 seconds
    const reminderInterval = options?.reminderIntervalMs || 60 * 60 * 1000; // 1 hour

    console.log(`[Scheduler] Starting background jobs (Email Queue: ${emailInterval}ms, Reminder Sweep: ${reminderInterval}ms)...`);

    // 1. Email queue worker
    this.emailQueueInterval = setInterval(async () => {
      try {
        await emailService.processQueue(30);
      } catch (err: any) {
        console.error("[Scheduler] Error in email queue worker:", err.message);
      }
    }, emailInterval);
    this.emailQueueInterval.unref();

    // 2. Reminder sweep worker
    this.reminderSweepInterval = setInterval(async () => {
      try {
        const result = await NotificationService.runDueRemindersSweep("org-default");
        const total = result.coursesReminded + result.assessmentsReminded + result.learningPathsReminded + result.overdueAlerts + result.certReminders;
        if (total > 0) {
          console.log(`[Scheduler] Reminder sweep sent ${total} alerts:`, result);
        }
      } catch (err: any) {
        console.error("[Scheduler] Error in reminder sweep worker:", err.message);
      }
    }, reminderInterval);
    this.reminderSweepInterval.unref();
  }

  /**
   * Stop background jobs
   */
  public stop(): void {
    if (!this.running) return;
    if (this.emailQueueInterval) clearInterval(this.emailQueueInterval);
    if (this.reminderSweepInterval) clearInterval(this.reminderSweepInterval);
    this.emailQueueInterval = null;
    this.reminderSweepInterval = null;
    this.running = false;
    console.log("[Scheduler] Background jobs stopped.");
  }

  public isRunning(): boolean {
    return this.running;
  }
}

export const schedulerService = SchedulerService.getInstance();
