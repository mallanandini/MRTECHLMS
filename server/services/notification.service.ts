/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../mysql.js";
import { 
  notificationsDb, 
  notificationPreferencesDb, 
  reminderLogsDb, 
  notificationTemplatesDb,
  usersDb 
} from "../db.js";
import { emailService } from "../email/email.service.js";
import { 
  NotificationItem, 
  NotificationType, 
  NotificationChannel, 
  NotificationPreferences, 
  NotificationTemplate, 
  ReminderLog, 
  ReminderSweepResult,
  Certificate
} from "../../src/types.js";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  organizationId?: string;
  channel?: NotificationChannel;
  actionUrl?: string;
  emailSubject?: string;
  emailBodyHtml?: string;
  emailBodyText?: string;
}

export class NotificationService {
  private static recentBroadcasts: Array<{ key: string; timestamp: number }> = [];

  private static checkAndRecordBroadcast(key: string): boolean {
    const now = Date.now();
    // Prune entries older than 20 seconds
    this.recentBroadcasts = this.recentBroadcasts.filter(b => now - b.timestamp < 20000);
    const existing = this.recentBroadcasts.find(b => b.key === key);
    if (existing) {
      return false; // Duplicate
    }
    this.recentBroadcasts.push({ key, timestamp: now });
    return true;
  }

  // ==========================================
  // 1. TEMPLATE ENGINE & RENDERING
  // ==========================================

  /**
   * Simple template interpolation engine supporting {{key}} and {{#condition}}...{{/condition}}
   */
  public static renderTemplate(template: string, vars: Record<string, any>): string {
    if (!template) return "";

    // 1. Process conditional blocks: {{#key}}content{{/key}}
    let rendered = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
      const val = vars[key];
      return val ? content : "";
    });

    // 2. Process variable tags: {{key}}
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = vars[key];
      return val !== undefined && val !== null ? String(val) : "";
    });

    return rendered;
  }

  /**
   * Retrieve template by notification type
   */
  public static async getTemplate(type: NotificationType, orgId = "org-default"): Promise<NotificationTemplate | null> {
    const tmpl = await notificationTemplatesDb.findOne({ type });
    return tmpl || null;
  }

  public static async getAllTemplates(orgId = "org-default"): Promise<NotificationTemplate[]> {
    return notificationTemplatesDb.find();
  }

  public static async updateTemplate(
    type: NotificationType, 
    updates: Partial<NotificationTemplate>, 
    orgId = "org-default"
  ): Promise<NotificationTemplate> {
    const existing = await notificationTemplatesDb.findOne({ type });
    if (!existing) {
      throw new Error(`Template for type '${type}' not found.`);
    }

    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error("Template name cannot be empty.");
    }
    if (updates.inAppTitleTemplate !== undefined && !updates.inAppTitleTemplate.trim()) {
      throw new Error("In-app title template cannot be empty.");
    }
    if (updates.inAppBodyTemplate !== undefined && !updates.inAppBodyTemplate.trim()) {
      throw new Error("In-app body template cannot be empty.");
    }

    const now = new Date().toISOString();
    const sanitizedUpdates: Partial<NotificationTemplate> = {};
    if (updates.name !== undefined) sanitizedUpdates.name = updates.name.trim();
    if (updates.description !== undefined) sanitizedUpdates.description = updates.description.trim();
    if (updates.inAppTitleTemplate !== undefined) sanitizedUpdates.inAppTitleTemplate = updates.inAppTitleTemplate.trim();
    if (updates.inAppBodyTemplate !== undefined) sanitizedUpdates.inAppBodyTemplate = updates.inAppBodyTemplate.trim();
    if (updates.emailSubjectTemplate !== undefined) sanitizedUpdates.emailSubjectTemplate = updates.emailSubjectTemplate.trim();
    if (updates.emailBodyTemplate !== undefined) sanitizedUpdates.emailBodyTemplate = updates.emailBodyTemplate.trim();
    if (updates.enabled !== undefined) sanitizedUpdates.enabled = Boolean(updates.enabled);

    const updated: NotificationTemplate = {
      ...existing,
      ...sanitizedUpdates,
      updatedAt: now
    };

    await notificationTemplatesDb.update(existing.id, updated);
    return updated;
  }

  // ==========================================
  // 2. USER PREFERENCES
  // ==========================================

  /**
   * Get or initialize user notification preferences
   */
  public static async getPreferences(userId: string, orgId = "org-default"): Promise<NotificationPreferences> {
    const existing = await notificationPreferencesDb.findOne({ userId });
    if (existing) {
      return existing;
    }

    // Default preferences
    const now = new Date().toISOString();
    const defaults: NotificationPreferences = {
      id: crypto.randomUUID(),
      userId,
      organizationId: orgId,
      emailNotifications: true,
      inAppNotifications: true,
      courseAssigned: true,
      learningPathAssigned: true,
      assessmentAssigned: true,
      dueDateReminders: true,
      overdueAlerts: true,
      assessmentResults: true,
      certificateAlerts: true,
      coursePublished: true,
      announcements: true,
      reminderDaysBefore: "7,3,1",
      createdAt: now,
      updatedAt: now
    };

    await notificationPreferencesDb.insert(defaults);
    return defaults;
  }

  /**
   * Update user notification preferences
   */
  public static async updatePreferences(
    userId: string, 
    updates: Partial<NotificationPreferences>, 
    orgId = "org-default"
  ): Promise<NotificationPreferences> {
    let prefs = await notificationPreferencesDb.findOne({ userId });
    const now = new Date().toISOString();

    if (!prefs) {
      prefs = await this.getPreferences(userId, orgId);
    }

    const updated: NotificationPreferences = {
      ...prefs,
      ...updates,
      updatedAt: now
    };

    await notificationPreferencesDb.update(prefs.id, updated);
    return updated;
  }

  /**
   * Determine if a notification should be delivered based on user preferences
   */
  private static shouldDeliver(
    prefs: NotificationPreferences, 
    type: NotificationType, 
    channel: "in_app" | "email"
  ): boolean {
    if (channel === "in_app" && !prefs.inAppNotifications) return false;
    if (channel === "email" && !prefs.emailNotifications) return false;

    switch (type) {
      case "course_assigned":
        return prefs.courseAssigned;
      case "learning_path_assigned":
        return prefs.learningPathAssigned;
      case "assessment_assigned":
        return prefs.assessmentAssigned;
      case "approaching_due_date":
        return prefs.dueDateReminders;
      case "overdue_learning":
        return prefs.overdueAlerts;
      case "assessment_result":
        return prefs.assessmentResults;
      case "certificate_issued":
      case "certificate_expiring":
        return prefs.certificateAlerts;
      case "course_published":
        return prefs.coursePublished;
      case "admin_announcement":
        return prefs.announcements;
      default:
        return true;
    }
  }

  // ==========================================
  // 3. CORE NOTIFICATION DISPATCHER
  // ==========================================

  /**
   * Create and deliver notification according to user channel preferences
   */
  public static async createNotification(input: CreateNotificationInput): Promise<NotificationItem | null> {
    const orgId = input.organizationId || "org-default";
    const user = await usersDb.findOne({ id: input.userId });
    if (!user) return null;

    const prefs = await this.getPreferences(input.userId, orgId);
    const channel = input.channel || "both";

    const deliverInApp = (channel === "in_app" || channel === "both") && 
      this.shouldDeliver(prefs, input.type, "in_app");

    const deliverEmail = (channel === "email" || channel === "both") && 
      this.shouldDeliver(prefs, input.type, "email");

    const now = new Date().toISOString();
    let createdItem: NotificationItem | null = null;

    // 1. In-App Notification
    if (deliverInApp) {
      createdItem = {
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data || {},
        read: false,
        readAt: null,
        channel: channel,
        deliveryStatus: "delivered",
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };

      await notificationsDb.insert(createdItem);
    }

    // 2. Email Delivery (enqueued into database email queue - non-blocking!)
    if (deliverEmail && user.email) {
      const subject = input.emailSubject || input.title;
      const bodyHtml = input.emailBodyHtml || `<p>${input.message}</p>${input.actionUrl ? `<p><a href="${input.actionUrl}">View Details</a></p>` : ""}`;
      const bodyText = input.emailBodyText || `${input.message}${input.actionUrl ? `\n\nView details: ${input.actionUrl}` : ""}`;

      await emailService.queueEmail({
        to: user.email,
        toName: user.name,
        userId: user.id,
        subject,
        bodyText,
        bodyHtml,
        notificationType: input.type,
        organizationId: orgId
      });
    }

    return createdItem;
  }

  // ==========================================
  // 4. STUDENT NOTIFICATION CENTER API
  // ==========================================

  /**
   * List user notifications with filtering and pagination
   */
  public static async getUserNotifications(
    userId: string, 
    options?: { unreadOnly?: boolean; limit?: number; offset?: number; type?: NotificationType }
  ): Promise<{ notifications: NotificationItem[]; total: number; unreadCount: number }> {
    const unreadOnly = options?.unreadOnly || false;
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = `
      SELECT * FROM \`notifications\` 
      WHERE \`userId\` = ? AND \`deletedAt\` IS NULL
    `;
    const params: any[] = [userId];

    if (unreadOnly) {
      query += ` AND \`read\` = 0`;
    }

    if (options?.type) {
      query += ` AND \`type\` = ?`;
      params.push(options.type);
    }

    query += ` ORDER BY \`createdAt\` DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows]: any = await pool.query(query, params);

    // Get counts
    const [totalRows]: any = await pool.query(
      `SELECT COUNT(\`id\`) as count FROM \`notifications\` WHERE \`userId\` = ? AND \`deletedAt\` IS NULL`,
      [userId]
    );
    const [unreadRows]: any = await pool.query(
      `SELECT COUNT(\`id\`) as count FROM \`notifications\` WHERE \`userId\` = ? AND \`read\` = 0 AND \`deletedAt\` IS NULL`,
      [userId]
    );

    const notifications: NotificationItem[] = rows.map((r: any) => ({
      id: r.id,
      organizationId: r.organizationId,
      userId: r.userId,
      type: r.type,
      title: r.title,
      message: r.message,
      data: r.data ? (typeof r.data === "string" ? JSON.parse(r.data) : r.data) : null,
      read: Boolean(r.read),
      readAt: r.readAt,
      channel: r.channel,
      deliveryStatus: r.deliveryStatus,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt
    }));

    return {
      notifications,
      total: Number(totalRows[0]?.count) || 0,
      unreadCount: Number(unreadRows[0]?.count) || 0
    };
  }

  /**
   * Get unread notification count
   */
  public static async getUnreadCount(userId: string): Promise<number> {
    const [rows]: any = await pool.query(
      `SELECT COUNT(\`id\`) as count FROM \`notifications\` WHERE \`userId\` = ? AND \`read\` = 0 AND \`deletedAt\` IS NULL`,
      [userId]
    );
    return Number(rows[0]?.count) || 0;
  }

  /**
   * Mark single notification as read
   */
  public static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const [result]: any = await pool.query(
      `UPDATE \`notifications\` 
       SET \`read\` = 1, \`readAt\` = ?, \`updatedAt\` = ? 
       WHERE \`id\` = ? AND \`userId\` = ? AND \`deletedAt\` IS NULL`,
      [now, now, notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Mark all user notifications as read
   */
  public static async markAllAsRead(userId: string): Promise<number> {
    const now = new Date().toISOString();
    const [result]: any = await pool.query(
      `UPDATE \`notifications\` 
       SET \`read\` = 1, \`readAt\` = ?, \`updatedAt\` = ? 
       WHERE \`userId\` = ? AND \`read\` = 0 AND \`deletedAt\` IS NULL`,
      [now, now, userId]
    );
    return result.affectedRows || 0;
  }

  /**
   * Soft-delete a notification
   */
  public static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const [result]: any = await pool.query(
      `UPDATE \`notifications\` 
       SET \`deletedAt\` = ?, \`updatedAt\` = ? 
       WHERE \`id\` = ? AND \`userId\` = ?`,
      [now, now, notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  // ==========================================
  // 5. DEDUPLICATION & REMINDER LOGS
  // ==========================================

  public static async isReminderSent(dedupKey: string): Promise<boolean> {
    const [rows]: any = await pool.query(
      `SELECT \`id\` FROM \`reminder_logs\` WHERE \`dedupKey\` = ? LIMIT 1`,
      [dedupKey]
    );
    return rows.length > 0;
  }

  public static async logReminder(
    userId: string,
    entityType: "course" | "learning_path" | "assessment" | "certificate",
    entityId: string,
    reminderType: string,
    dedupKey: string,
    orgId = "org-default"
  ): Promise<void> {
    const now = new Date().toISOString();
    await pool.query(
      `INSERT IGNORE INTO \`reminder_logs\` 
       (\`id\`, \`organizationId\`, \`userId\`, \`entityType\`, \`entityId\`, \`reminderType\`, \`dedupKey\`, \`sentAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), orgId, userId, entityType, entityId, reminderType, dedupKey, now]
    );
  }

  // ==========================================
  // 6. SPECIALIZED NOTIFICATION TRIGGERS
  // ==========================================

  /**
   * Trigger: Course Assigned
   */
  public static async notifyCourseAssigned(
    studentId: string,
    course: { id: string; title: string; category?: string },
    options?: { dueDate?: string | null; isMandatory?: boolean; assignedByName?: string; orgId?: string }
  ): Promise<void> {
    const tmpl = await this.getTemplate("course_assigned", options?.orgId);
    if (tmpl && tmpl.enabled === false) return;
    const user = await usersDb.findOne({ id: studentId });
    if (!user) return;

    const dueDateFormatted = options?.dueDate ? options.dueDate.split("T")[0] : null;
    const actionUrl = `/courses/${course.id}`;

    const templateVars = {
      name: user.name,
      title: course.title,
      category: course.category || "General",
      dueDate: dueDateFormatted,
      isMandatory: options?.isMandatory ? "Mandatory" : "Optional",
      assignedBy: options?.assignedByName || "Administrator",
      actionUrl
    };

    const title = tmpl 
      ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
      : `Course Assigned: ${course.title}`;

    const message = tmpl
      ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
      : `You have been enrolled in ${course.title}.${dueDateFormatted ? ` Due by ${dueDateFormatted}.` : ""}`;

    const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
    const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

    await this.createNotification({
      userId: studentId,
      type: "course_assigned",
      title,
      message,
      data: {
        courseId: course.id,
        courseTitle: course.title,
        dueDate: options?.dueDate || null,
        isMandatory: options?.isMandatory || false,
        actionUrl
      },
      organizationId: options?.orgId,
      actionUrl,
      emailSubject,
      emailBodyHtml
    });
  }

  /**
   * Trigger: Learning Path Assigned
   */
  public static async notifyLearningPathAssigned(
    studentId: string,
    path: { id: string; title: string; totalItems?: number },
    options?: { dueDate?: string | null; orgId?: string }
  ): Promise<void> {
    const tmpl = await this.getTemplate("learning_path_assigned", options?.orgId);
    if (tmpl && tmpl.enabled === false) return;
    const user = await usersDb.findOne({ id: studentId });
    if (!user) return;

    const actionUrl = `/learning-paths/${path.id}`;
    const templateVars = {
      name: user.name,
      title: path.title,
      totalItems: path.totalItems || "several",
      dueDate: options?.dueDate ? options.dueDate.split("T")[0] : null,
      actionUrl
    };

    const title = tmpl 
      ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
      : `Learning Path Assigned: ${path.title}`;

    const message = tmpl
      ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
      : `You have been assigned to the structured learning path: ${path.title}.`;

    const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
    const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

    await this.createNotification({
      userId: studentId,
      type: "learning_path_assigned",
      title,
      message,
      data: {
        learningPathId: path.id,
        pathTitle: path.title,
        actionUrl
      },
      organizationId: options?.orgId,
      actionUrl,
      emailSubject,
      emailBodyHtml
    });
  }

  /**
   * Trigger: Assessment Assigned
   */
  public static async notifyAssessmentAssigned(
    studentId: string,
    assessment: { id: string; title: string; passingScore?: number },
    options?: { dueDate?: string | null; orgId?: string }
  ): Promise<void> {
    const tmpl = await this.getTemplate("assessment_assigned", options?.orgId);
    if (tmpl && tmpl.enabled === false) return;
    const user = await usersDb.findOne({ id: studentId });
    if (!user) return;

    const dueDateFormatted = options?.dueDate ? options.dueDate.split("T")[0] : null;
    const actionUrl = `/assessments/${assessment.id}`;

    const templateVars = {
      name: user.name,
      title: assessment.title,
      passingScore: assessment.passingScore || 70,
      dueDate: dueDateFormatted,
      actionUrl
    };

    const title = tmpl 
      ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
      : `Assessment Assigned: ${assessment.title}`;

    const message = tmpl
      ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
      : `An assessment has been assigned to you: ${assessment.title}.${dueDateFormatted ? ` Due: ${dueDateFormatted}` : ""}`;

    const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
    const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

    await this.createNotification({
      userId: studentId,
      type: "assessment_assigned",
      title,
      message,
      data: {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        dueDate: options?.dueDate || null,
        actionUrl
      },
      organizationId: options?.orgId,
      actionUrl,
      emailSubject,
      emailBodyHtml
    });
  }

  /**
   * Trigger: Assessment Graded Result
   */
  public static async notifyAssessmentResult(
    studentId: string,
    assessment: { id: string; title: string; passingScore?: number },
    submission: { id: string; score: number; totalPoints: number; percentage: number; passed: boolean },
    orgId = "org-default"
  ): Promise<void> {
    const tmpl = await this.getTemplate("assessment_result", orgId);
    if (tmpl && tmpl.enabled === false) return;
    const user = await usersDb.findOne({ id: studentId });
    if (!user) return;

    const statusText = submission.passed ? "PASSED" : "FAILED";
    const actionUrl = `/assessments/${assessment.id}`;

    const templateVars = {
      name: user.name,
      title: assessment.title,
      score: submission.score,
      totalPoints: submission.totalPoints,
      percentage: submission.percentage,
      statusText,
      actionUrl
    };

    const title = tmpl 
      ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
      : `Assessment Result: ${assessment.title} (${statusText})`;

    const message = tmpl
      ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
      : `You scored ${submission.percentage}% on ${assessment.title}. Result: ${statusText}.`;

    const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
    const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

    await this.createNotification({
      userId: studentId,
      type: "assessment_result",
      title,
      message,
      data: {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        submissionId: submission.id,
        score: submission.score,
        totalPoints: submission.totalPoints,
        percentage: submission.percentage,
        passed: submission.passed,
        actionUrl
      },
      organizationId: orgId,
      actionUrl,
      emailSubject,
      emailBodyHtml
    });
  }

  /**
   * Trigger: Certificate Issued
   */
  public static async notifyCertificateIssued(
    studentId: string,
    certificate: Certificate,
    orgId = "org-default"
  ): Promise<void> {
    const tmpl = await this.getTemplate("certificate_issued", orgId);
    if (tmpl && tmpl.enabled === false) return;
    const user = await usersDb.findOne({ id: studentId });
    if (!user) return;

    const actionUrl = `/student/certificates`;
    const templateVars = {
      name: user.name,
      title: certificate.title,
      certificateNumber: certificate.certificateNumber,
      actionUrl
    };

    const title = tmpl 
      ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
      : `Certificate Awarded: ${certificate.title}`;

    const message = tmpl
      ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
      : `Congratulations! Your official certificate for ${certificate.title} has been issued.`;

    const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
    const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

    await this.createNotification({
      userId: studentId,
      type: "certificate_issued",
      title,
      message,
      data: {
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        title: certificate.title,
        type: certificate.type,
        actionUrl
      },
      organizationId: orgId,
      actionUrl,
      emailSubject,
      emailBodyHtml
    });
  }

  /**
   * Trigger: Certificate Expiring Soon
   */
  public static async notifyCertificateExpiring(
    studentId: string,
    certificate: Certificate,
    daysRemaining: number,
    orgId = "org-default"
  ): Promise<void> {
    const tmpl = await this.getTemplate("certificate_expiring", orgId);
    if (tmpl && tmpl.enabled === false) return;
    const user = await usersDb.findOne({ id: studentId });
    if (!user) return;

    const actionUrl = `/student/certificates`;
    const expiresAtStr = certificate.expiresAt ? certificate.expiresAt.split("T")[0] : "soon";

    const templateVars = {
      name: user.name,
      title: certificate.title,
      certificateNumber: certificate.certificateNumber,
      expiresAt: expiresAtStr,
      daysRemaining,
      actionUrl
    };

    const title = tmpl 
      ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
      : `Certificate Expiring: ${certificate.title}`;

    const message = tmpl
      ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
      : `Your certification for ${certificate.title} will expire in ${daysRemaining} day(s) on ${expiresAtStr}.`;

    const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
    const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

    await this.createNotification({
      userId: studentId,
      type: "certificate_expiring",
      title,
      message,
      data: {
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        title: certificate.title,
        expiresAt: certificate.expiresAt,
        daysRemaining,
        actionUrl
      },
      organizationId: orgId,
      actionUrl,
      emailSubject,
      emailBodyHtml
    });
  }

  /**
   * Trigger: Course Published (Broadcast to all active learners in the organization)
   */
  public static async notifyCoursePublished(
    course: { id: string; title: string; category?: string; description?: string },
    orgId = "org-default"
  ): Promise<number> {
    const tmpl = await this.getTemplate("course_published", orgId);
    if (tmpl && tmpl.enabled === false) return 0;
    const [students]: any = await pool.query(
      `SELECT \`id\`, \`name\`, \`email\` FROM \`users\` 
       WHERE \`role\` = 'student' AND \`status\` = 'active' AND \`organizationId\` = ? AND \`deletedAt\` IS NULL`,
      [orgId]
    );

    const actionUrl = `/courses/${course.id}`;
    let sentCount = 0;

    for (const student of students) {
      const templateVars = {
        name: student.name,
        title: course.title,
        category: course.category || "General",
        description: course.description || "",
        actionUrl
      };

      const title = tmpl 
        ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
        : `New Course Available: ${course.title}`;

      const message = tmpl
        ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
        : `Check out the newly published course: ${course.title}.`;

      const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : undefined;
      const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

      await this.createNotification({
        userId: student.id,
        type: "course_published",
        title,
        message,
        data: {
          courseId: course.id,
          courseTitle: course.title,
          category: course.category,
          actionUrl
        },
        organizationId: orgId,
        actionUrl,
        emailSubject,
        emailBodyHtml
      });
      sentCount++;
    }

    return sentCount;
  }

  /**
   * Broadcast Admin Announcement to all or selected users
   */
  public static async broadcastAnnouncement(options: {
    title: string;
    message: string;
    actionUrl?: string;
    targetRole?: string; // 'all' | 'student' | 'manager' | 'admin'
    targetDepartmentId?: string;
    orgId?: string;
  }): Promise<number> {
    if (!options.title || !options.title.trim()) {
      throw new Error("Announcement title is required.");
    }
    if (!options.message || !options.message.trim()) {
      throw new Error("Announcement message is required.");
    }

    const orgId = options.orgId || "org-default";
    const tmpl = await this.getTemplate("admin_announcement", orgId);
    if (tmpl && tmpl.enabled === false) {
      throw new Error("Admin Announcement template is disabled. Please enable it in Notification Templates before broadcasting.");
    }

    const dedupKey = `${orgId}:${options.targetRole || "all"}:${options.targetDepartmentId || "none"}:${options.title.trim()}:${options.message.trim()}`;
    if (!this.checkAndRecordBroadcast(dedupKey)) {
      throw new Error("Duplicate announcement detected. An identical announcement was dispatched within the last 20 seconds. Please wait before broadcasting again.");
    }

    let sql = `SELECT \`id\`, \`name\`, \`email\` FROM \`users\` WHERE \`status\` = 'active' AND \`organizationId\` = ? AND \`deletedAt\` IS NULL`;
    const params: any[] = [orgId];

    if (options.targetRole && options.targetRole !== "all") {
      sql += ` AND \`role\` = ?`;
      params.push(options.targetRole);
    }

    if (options.targetDepartmentId) {
      sql += ` AND \`departmentId\` = ?`;
      params.push(options.targetDepartmentId);
    }

    const [recipients]: any = await pool.query(sql, params);
    let sentCount = 0;

    for (const recipient of recipients) {
      const templateVars = {
        name: recipient.name,
        title: options.title,
        message: options.message,
        actionUrl: options.actionUrl || ""
      };

      const title = tmpl 
        ? this.renderTemplate(tmpl.inAppTitleTemplate, templateVars)
        : options.title;

      const message = tmpl
        ? this.renderTemplate(tmpl.inAppBodyTemplate, templateVars)
        : options.message;

      const emailSubject = tmpl ? this.renderTemplate(tmpl.emailSubjectTemplate, templateVars) : `Announcement: ${options.title}`;
      const emailBodyHtml = tmpl ? this.renderTemplate(tmpl.emailBodyTemplate, templateVars) : undefined;

      await this.createNotification({
        userId: recipient.id,
        type: "admin_announcement",
        title,
        message,
        data: {
          announcementTitle: options.title,
          actionUrl: options.actionUrl || null
        },
        organizationId: orgId,
        actionUrl: options.actionUrl,
        emailSubject,
        emailBodyHtml
      });
      sentCount++;
    }

    return sentCount;
  }

  // ==========================================
  // 7. BACKGROUND REMINDER & OVERDUE SWEEP ENGINE
  // ==========================================

  /**
   * Periodic sweep: inspects all due dates and overdue learning items,
   * generates reminders, and enforces strict duplicate prevention.
   */
  public static async runDueRemindersSweep(orgId = "org-default"): Promise<ReminderSweepResult> {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let coursesReminded = 0;
    let assessmentsReminded = 0;
    let learningPathsReminded = 0;
    let overdueAlerts = 0;
    let certReminders = 0;
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    // Load templates
    const dueTmpl = await this.getTemplate("approaching_due_date", orgId);
    const overdueTmpl = await this.getTemplate("overdue_learning", orgId);
    const certTmpl = await this.getTemplate("certificate_expiring", orgId);

    // ----------------------------------------------------
    // A. Course Enrollments (Approaching Due Date & Overdue)
    // ----------------------------------------------------
    const [enrollments]: any = await pool.query(`
      SELECT 
        e.id, e.studentId, e.courseId, e.dueDate, e.status, e.progressPercentage,
        c.title AS courseTitle,
        u.name AS studentName, u.email AS studentEmail
      FROM enrollments e
      JOIN courses c ON e.courseId = c.id
      JOIN users u ON e.studentId = u.id
      WHERE e.organizationId = ?
        AND e.dueDate IS NOT NULL
        AND e.status NOT IN ('completed', 'revoked')
        AND (e.progressPercentage IS NULL OR e.progressPercentage < 100)
        AND e.deletedAt IS NULL
    `, [orgId]);

    for (const e of enrollments) {
      processed++;
      const dueDate = new Date(e.dueDate);
      const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
      const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      const actionUrl = `/courses/${e.courseId}`;

      // Check upcoming reminders: 7 days, 3 days, 1 day
      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        if (dueTmpl && dueTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `course:${e.id}:due_${diffDays}d:${dueDateStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const templateVars = {
                name: e.studentName,
                title: e.courseTitle,
                daysRemaining: diffDays,
                dueDate: dueDateStr,
                actionUrl
              };

              const title = dueTmpl 
                ? this.renderTemplate(dueTmpl.inAppTitleTemplate, templateVars)
                : `Upcoming Due Date: ${e.courseTitle}`;
              const message = dueTmpl
                ? this.renderTemplate(dueTmpl.inAppBodyTemplate, templateVars)
                : `Reminder: ${e.courseTitle} is due in ${diffDays} day(s) on ${dueDateStr}.`;

              await this.createNotification({
                userId: e.studentId,
                type: "approaching_due_date",
                title,
                message,
                data: {
                  enrollmentId: e.id,
                  courseId: e.courseId,
                  courseTitle: e.courseTitle,
                  dueDate: e.dueDate,
                  daysRemaining: diffDays,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: dueTmpl ? this.renderTemplate(dueTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: dueTmpl ? this.renderTemplate(dueTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(e.studentId, "course", e.id, `due_${diffDays}d`, dedupKey, orgId);
              coursesReminded++;
            } catch (err) {
              console.error("[Notifications] Error reminding course upcoming due:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else if (diffDays < 0 || (diffDays === 0 && dueDate.getTime() < now.getTime())) {
        // Overdue check
        if (overdueTmpl && overdueTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `course:${e.id}:overdue:${todayStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const daysOverdue = Math.max(1, Math.abs(diffDays));
              const templateVars = {
                name: e.studentName,
                title: e.courseTitle,
                dueDate: dueDateStr,
                daysOverdue,
                actionUrl
              };

              const title = overdueTmpl 
                ? this.renderTemplate(overdueTmpl.inAppTitleTemplate, templateVars)
                : `Overdue Alert: ${e.courseTitle}`;
              const message = overdueTmpl
                ? this.renderTemplate(overdueTmpl.inAppBodyTemplate, templateVars)
                : `Your course assignment ${e.courseTitle} was due on ${dueDateStr} and is currently overdue.`;

              await this.createNotification({
                userId: e.studentId,
                type: "overdue_learning",
                title,
                message,
                data: {
                  enrollmentId: e.id,
                  courseId: e.courseId,
                  courseTitle: e.courseTitle,
                  dueDate: e.dueDate,
                  daysOverdue,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: overdueTmpl ? this.renderTemplate(overdueTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: overdueTmpl ? this.renderTemplate(overdueTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(e.studentId, "course", e.id, "overdue", dedupKey, orgId);
              overdueAlerts++;
            } catch (err) {
              console.error("[Notifications] Error reminding course overdue:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else {
        skipped++;
      }
    }

    // ----------------------------------------------------
    // B. Assessment Assignments (Approaching Due Date & Overdue)
    // ----------------------------------------------------
    const [assessments]: any = await pool.query(`
      SELECT 
        aa.id, aa.studentId, aa.assessmentId, aa.dueDate, aa.status,
        a.title AS assessmentTitle,
        u.name AS studentName, u.email AS studentEmail
      FROM assessment_assignments aa
      JOIN assessments a ON aa.assessmentId = a.id
      JOIN users u ON aa.studentId = u.id
      WHERE aa.organizationId = ?
        AND aa.dueDate IS NOT NULL
        AND aa.status NOT IN ('completed', 'revoked')
        AND aa.deletedAt IS NULL
    `, [orgId]);

    for (const a of assessments) {
      processed++;
      const dueDate = new Date(a.dueDate);
      const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
      const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      const actionUrl = `/assessments/${a.assessmentId}`;

      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        if (dueTmpl && dueTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `assessment:${a.id}:due_${diffDays}d:${dueDateStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const templateVars = {
                name: a.studentName,
                title: a.assessmentTitle,
                daysRemaining: diffDays,
                dueDate: dueDateStr,
                actionUrl
              };

              const title = dueTmpl 
                ? this.renderTemplate(dueTmpl.inAppTitleTemplate, templateVars)
                : `Upcoming Due Date: ${a.assessmentTitle}`;
              const message = dueTmpl
                ? this.renderTemplate(dueTmpl.inAppBodyTemplate, templateVars)
                : `Reminder: Assessment ${a.assessmentTitle} is due in ${diffDays} day(s) on ${dueDateStr}.`;

              await this.createNotification({
                userId: a.studentId,
                type: "approaching_due_date",
                title,
                message,
                data: {
                  assignmentId: a.id,
                  assessmentId: a.assessmentId,
                  assessmentTitle: a.assessmentTitle,
                  dueDate: a.dueDate,
                  daysRemaining: diffDays,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: dueTmpl ? this.renderTemplate(dueTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: dueTmpl ? this.renderTemplate(dueTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(a.studentId, "assessment", a.id, `due_${diffDays}d`, dedupKey, orgId);
              assessmentsReminded++;
            } catch (err) {
              console.error("[Notifications] Error reminding assessment upcoming:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else if (diffDays < 0 || (diffDays === 0 && dueDate.getTime() < now.getTime())) {
        if (overdueTmpl && overdueTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `assessment:${a.id}:overdue:${todayStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const daysOverdue = Math.max(1, Math.abs(diffDays));
              const templateVars = {
                name: a.studentName,
                title: a.assessmentTitle,
                dueDate: dueDateStr,
                daysOverdue,
                actionUrl
              };

              const title = overdueTmpl 
                ? this.renderTemplate(overdueTmpl.inAppTitleTemplate, templateVars)
                : `Overdue Alert: ${a.assessmentTitle}`;
              const message = overdueTmpl
                ? this.renderTemplate(overdueTmpl.inAppBodyTemplate, templateVars)
                : `Your assessment ${a.assessmentTitle} was due on ${dueDateStr} and is currently overdue.`;

              await this.createNotification({
                userId: a.studentId,
                type: "overdue_learning",
                title,
                message,
                data: {
                  assignmentId: a.id,
                  assessmentId: a.assessmentId,
                  assessmentTitle: a.assessmentTitle,
                  dueDate: a.dueDate,
                  daysOverdue,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: overdueTmpl ? this.renderTemplate(overdueTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: overdueTmpl ? this.renderTemplate(overdueTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(a.studentId, "assessment", a.id, "overdue", dedupKey, orgId);
              overdueAlerts++;
            } catch (err) {
              console.error("[Notifications] Error reminding assessment overdue:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else {
        skipped++;
      }
    }

    // ----------------------------------------------------
    // C. Learning Path Assignments (Approaching Due Date & Overdue)
    // ----------------------------------------------------
    const [paths]: any = await pool.query(`
      SELECT 
        lpa.id, lpa.studentId, lpa.learningPathId, lpa.dueDate, lpa.status,
        lp.title AS pathTitle,
        u.name AS studentName, u.email AS studentEmail
      FROM learning_path_assignments lpa
      JOIN learning_paths lp ON lpa.learningPathId = lp.id
      JOIN users u ON lpa.studentId = u.id
      WHERE lpa.organizationId = ?
        AND lpa.dueDate IS NOT NULL
        AND lpa.status NOT IN ('completed', 'revoked')
        AND lpa.deletedAt IS NULL
    `, [orgId]);

    for (const p of paths) {
      processed++;
      const dueDate = new Date(p.dueDate);
      const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
      const diffDays = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      const actionUrl = `/learning-paths/${p.learningPathId}`;

      if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        if (dueTmpl && dueTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `learning_path:${p.id}:due_${diffDays}d:${dueDateStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const templateVars = {
                name: p.studentName,
                title: p.pathTitle,
                daysRemaining: diffDays,
                dueDate: dueDateStr,
                actionUrl
              };

              const title = dueTmpl 
                ? this.renderTemplate(dueTmpl.inAppTitleTemplate, templateVars)
                : `Upcoming Due Date: ${p.pathTitle}`;
              const message = dueTmpl
                ? this.renderTemplate(dueTmpl.inAppBodyTemplate, templateVars)
                : `Reminder: Learning Path ${p.pathTitle} is due in ${diffDays} day(s) on ${dueDateStr}.`;

              await this.createNotification({
                userId: p.studentId,
                type: "approaching_due_date",
                title,
                message,
                data: {
                  assignmentId: p.id,
                  learningPathId: p.learningPathId,
                  pathTitle: p.pathTitle,
                  dueDate: p.dueDate,
                  daysRemaining: diffDays,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: dueTmpl ? this.renderTemplate(dueTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: dueTmpl ? this.renderTemplate(dueTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(p.studentId, "learning_path", p.id, `due_${diffDays}d`, dedupKey, orgId);
              learningPathsReminded++;
            } catch (err) {
              console.error("[Notifications] Error reminding learning path upcoming:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else if (diffDays < 0 || (diffDays === 0 && dueDate.getTime() < now.getTime())) {
        if (overdueTmpl && overdueTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `learning_path:${p.id}:overdue:${todayStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const daysOverdue = Math.max(1, Math.abs(diffDays));
              const templateVars = {
                name: p.studentName,
                title: p.pathTitle,
                dueDate: dueDateStr,
                daysOverdue,
                actionUrl
              };

              const title = overdueTmpl 
                ? this.renderTemplate(overdueTmpl.inAppTitleTemplate, templateVars)
                : `Overdue Alert: ${p.pathTitle}`;
              const message = overdueTmpl
                ? this.renderTemplate(overdueTmpl.inAppBodyTemplate, templateVars)
                : `Your learning path assignment ${p.pathTitle} was due on ${dueDateStr} and is currently overdue.`;

              await this.createNotification({
                userId: p.studentId,
                type: "overdue_learning",
                title,
                message,
                data: {
                  assignmentId: p.id,
                  learningPathId: p.learningPathId,
                  pathTitle: p.pathTitle,
                  dueDate: p.dueDate,
                  daysOverdue,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: overdueTmpl ? this.renderTemplate(overdueTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: overdueTmpl ? this.renderTemplate(overdueTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(p.studentId, "learning_path", p.id, "overdue", dedupKey, orgId);
              overdueAlerts++;
            } catch (err) {
              console.error("[Notifications] Error reminding learning path overdue:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else {
        skipped++;
      }
    }

    // ----------------------------------------------------
    // D. Certificate Expiration Warnings (30 days & 7 days)
    // ----------------------------------------------------
    const [expiringCerts]: any = await pool.query(`
      SELECT 
        c.id, c.studentId, c.title, c.certificateNumber, c.expiresAt, c.status,
        u.name AS studentName, u.email AS studentEmail
      FROM certificates c
      JOIN users u ON c.studentId = u.id
      WHERE c.organizationId = ?
        AND c.status = 'active'
        AND c.expiresAt IS NOT NULL
        AND c.deletedAt IS NULL
    `, [orgId]);

    for (const cert of expiringCerts) {
      processed++;
      const expiresAt = new Date(cert.expiresAt);
      const expMidnight = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate()).getTime();
      const diffDays = Math.round((expMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      const expDateStr = expiresAt.toISOString().slice(0, 10);
      const actionUrl = `/student/certificates`;

      if (diffDays === 30 || diffDays === 7) {
        if (certTmpl && certTmpl.enabled === false) {
          skipped++;
        } else {
          const dedupKey = `certificate:${cert.id}:exp_${diffDays}d:${expDateStr}`;
          const alreadySent = await this.isReminderSent(dedupKey);

          if (!alreadySent) {
            try {
              const templateVars = {
                name: cert.studentName,
                title: cert.title,
                certificateNumber: cert.certificateNumber,
                expiresAt: expDateStr,
                daysRemaining: diffDays,
                actionUrl
              };

              const title = certTmpl 
                ? this.renderTemplate(certTmpl.inAppTitleTemplate, templateVars)
                : `Certificate Expiring Soon: ${cert.title}`;
              const message = certTmpl
                ? this.renderTemplate(certTmpl.inAppBodyTemplate, templateVars)
                : `Your certification for ${cert.title} expires in ${diffDays} day(s) on ${expDateStr}.`;

              await this.createNotification({
                userId: cert.studentId,
                type: "certificate_expiring",
                title,
                message,
                data: {
                  certificateId: cert.id,
                  certificateNumber: cert.certificateNumber,
                  title: cert.title,
                  expiresAt: cert.expiresAt,
                  daysRemaining: diffDays,
                  actionUrl
                },
                organizationId: orgId,
                actionUrl,
                emailSubject: certTmpl ? this.renderTemplate(certTmpl.emailSubjectTemplate, templateVars) : undefined,
                emailBodyHtml: certTmpl ? this.renderTemplate(certTmpl.emailBodyTemplate, templateVars) : undefined
              });

              await this.logReminder(cert.studentId, "certificate", cert.id, `exp_${diffDays}d`, dedupKey, orgId);
              certReminders++;
            } catch (err) {
              console.error("[Notifications] Error reminding certificate expiring:", err);
              failed++;
            }
          } else {
            skipped++;
          }
        }
      } else {
        skipped++;
      }
    }

    return {
      coursesReminded,
      assessmentsReminded,
      learningPathsReminded,
      overdueAlerts,
      certReminders,
      processed,
      skipped,
      failed,
      timestamp: now.toISOString()
    };
  }
}
