/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { NotificationService } from "../services/notification.service.js";
import { emailService } from "../email/email.service.js";
import { pool } from "../mysql.js";

const router = Router();

// ==========================================
// 1. STUDENT / USER NOTIFICATION ROUTES
// ==========================================

/**
 * GET /api/notifications
 * List user notifications with filtering and pagination
 */
router.get("/notifications", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const unreadOnly = req.query.unreadOnly === "true";
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const type = req.query.type as any;

    const result = await NotificationService.getUserNotifications(userId, {
      unreadOnly,
      limit,
      offset,
      type
    });

    res.json(result);
  } catch (err: any) {
    console.error("[Notifications] Error getting user notifications:", err);
    res.status(500).json({ error: err.message || "Failed to fetch notifications" });
  }
});

/**
 * GET /api/notifications/unread-count
 * Quick query for topbar bell badge
 */
router.get("/notifications/unread-count", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await NotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (err: any) {
    console.error("[Notifications] Error getting unread count:", err);
    res.status(500).json({ error: err.message || "Failed to fetch unread count" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch("/notifications/:id/read", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await NotificationService.markAsRead(id, userId);
    if (!success) {
      return res.status(404).json({ error: "Notification not found or already read" });
    }
    res.json({ success: true, message: "Marked as read" });
  } catch (err: any) {
    console.error("[Notifications] Error marking notification as read:", err);
    res.status(500).json({ error: err.message || "Failed to mark as read" });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all user notifications as read
 */
router.post("/notifications/mark-all-read", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updatedCount = await NotificationService.markAllAsRead(userId);
    res.json({ success: true, updatedCount });
  } catch (err: any) {
    console.error("[Notifications] Error marking all notifications as read:", err);
    res.status(500).json({ error: err.message || "Failed to mark all as read" });
  }
});

/**
 * DELETE /api/notifications/:id
 * Dismiss/delete notification
 */
router.delete("/notifications/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const success = await NotificationService.deleteNotification(id, userId);
    if (!success) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json({ success: true, message: "Notification deleted" });
  } catch (err: any) {
    console.error("[Notifications] Error deleting notification:", err);
    res.status(500).json({ error: err.message || "Failed to delete notification" });
  }
});

/**
 * GET /api/notifications/preferences
 * Fetch user notification preferences
 */
router.get("/notifications/preferences", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const prefs = await NotificationService.getPreferences(userId, req.user!.organizationId);
    res.json(prefs);
  } catch (err: any) {
    console.error("[Notifications] Error getting preferences:", err);
    res.status(500).json({ error: err.message || "Failed to fetch notification preferences" });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put("/notifications/preferences", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;
    const prefs = await NotificationService.updatePreferences(userId, updates, req.user!.organizationId);
    res.json(prefs);
  } catch (err: any) {
    console.error("[Notifications] Error updating preferences:", err);
    res.status(500).json({ error: err.message || "Failed to update notification preferences" });
  }
});

// ==========================================
// 2. ADMIN NOTIFICATION & REMINDER MANAGEMENT
// ==========================================

/**
 * GET /api/admin/notifications/templates
 * List all notification templates
 */
router.get("/admin/notifications/templates", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const templates = await NotificationService.getAllTemplates(req.user!.organizationId);
    res.json(templates);
  } catch (err: any) {
    console.error("[Notifications] Error getting templates:", err);
    res.status(500).json({ error: err.message || "Failed to fetch notification templates" });
  }
});

/**
 * PUT /api/admin/notifications/templates/:type
 * Update a notification template
 */
router.put("/admin/notifications/templates/:type", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const updates = req.body;
    const template = await NotificationService.updateTemplate(type as any, updates, req.user!.organizationId);
    res.json(template);
  } catch (err: any) {
    console.error("[Notifications] Error updating template:", err);
    if (err.message && (err.message.includes("is required") || err.message.includes("cannot be empty"))) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "Failed to update notification template" });
  }
});

/**
 * POST /api/admin/notifications/announce
 * Broadcast announcement to users
 */
router.post("/admin/notifications/announce", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, message, targetRole, targetDepartmentId, actionUrl } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const sentCount = await NotificationService.broadcastAnnouncement({
      title,
      message,
      targetRole,
      targetDepartmentId,
      actionUrl,
      orgId: req.user!.organizationId
    });

    res.json({ success: true, sentCount, message: `Announcement broadcasted to ${sentCount} recipient(s)` });
  } catch (err: any) {
    console.error("[Notifications] Error broadcasting announcement:", err);
    if (err.message && err.message.includes("Duplicate announcement detected")) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message && (err.message.includes("is required") || err.message.includes("is disabled"))) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "Failed to broadcast announcement" });
  }
});

/**
 * GET /api/admin/notifications/email-queue
 * Get email queue statistics and recent items
 */
router.get("/admin/notifications/email-queue", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const stats = await emailService.getQueueStats(orgId);

    const [recent]: any = await pool.query(
      `SELECT * FROM \`email_queue\` WHERE \`organizationId\` = ? ORDER BY \`createdAt\` DESC LIMIT 50`,
      [orgId]
    );

    res.json({
      stats,
      provider: emailService.getProvider().name,
      recentItems: recent
    });
  } catch (err: any) {
    console.error("[Notifications] Error getting email queue:", err);
    res.status(500).json({ error: err.message || "Failed to fetch email queue" });
  }
});

/**
 * POST /api/admin/notifications/email-queue/retry
 * Retry failed emails in queue
 */
router.post("/admin/notifications/email-queue/retry", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const retriedCount = await emailService.retryFailedEmails(req.user!.organizationId);
    res.json({ success: true, retriedCount, message: `Reset ${retriedCount} failed email(s) for retry` });
  } catch (err: any) {
    console.error("[Notifications] Error retrying emails:", err);
    res.status(500).json({ error: err.message || "Failed to retry emails" });
  }
});

/**
 * POST /api/admin/notifications/email-queue/process
 * Manually trigger email queue processing batch
 */
router.post("/admin/notifications/email-queue/process", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await emailService.processQueue(50);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[Notifications] Error processing email queue:", err);
    res.status(500).json({ error: err.message || "Failed to process email queue" });
  }
});

/**
 * POST /api/admin/reminders/run
 * Manually trigger reminder sweep
 */
router.post("/admin/reminders/run", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await NotificationService.runDueRemindersSweep(req.user!.organizationId);
    res.json({
      success: true,
      result,
      message: `Reminder sweep complete: ${result.processed} processed (${result.coursesReminded} courses, ${result.assessmentsReminded} assessments, ${result.learningPathsReminded} learning paths, ${result.overdueAlerts} overdue alerts, ${result.certReminders} cert reminders; ${result.skipped} skipped, ${result.failed} failed).`
    });
  } catch (err: any) {
    console.error("[Notifications] Error running reminder sweep:", err);
    res.status(500).json({ error: err.message || "Failed to execute reminder sweep" });
  }
});

/**
 * GET /api/admin/reminders/preview
 * Preview upcoming due dates and overdue items without modifying anything
 */
router.get("/admin/reminders/preview", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const [upcomingCourses]: any = await pool.query(`
      SELECT 
        e.id, e.studentId, e.courseId, e.dueDate, e.status, e.progressPercentage,
        c.title AS courseTitle, u.name AS studentName, u.email AS studentEmail,
        DATEDIFF(e.dueDate, NOW()) AS daysRemaining
      FROM enrollments e
      JOIN courses c ON e.courseId = c.id
      JOIN users u ON e.studentId = u.id
      WHERE e.organizationId = ?
        AND e.dueDate IS NOT NULL
        AND e.status NOT IN ('completed', 'revoked')
        AND (e.progressPercentage IS NULL OR e.progressPercentage < 100)
        AND e.deletedAt IS NULL
      ORDER BY e.dueDate ASC
      LIMIT 100
    `, [orgId]);

    const [upcomingAssessments]: any = await pool.query(`
      SELECT 
        aa.id, aa.studentId, aa.assessmentId, aa.dueDate, aa.status,
        a.title AS assessmentTitle, u.name AS studentName, u.email AS studentEmail,
        DATEDIFF(aa.dueDate, NOW()) AS daysRemaining
      FROM assessment_assignments aa
      JOIN assessments a ON aa.assessmentId = a.id
      JOIN users u ON aa.studentId = u.id
      WHERE aa.organizationId = ?
        AND aa.dueDate IS NOT NULL
        AND aa.status NOT IN ('completed', 'revoked')
        AND aa.deletedAt IS NULL
      ORDER BY aa.dueDate ASC
      LIMIT 100
    `, [orgId]);

    res.json({
      courses: upcomingCourses,
      assessments: upcomingAssessments
    });
  } catch (err: any) {
    console.error("[Notifications] Error previewing reminders:", err);
    res.status(500).json({ error: err.message || "Failed to preview reminders" });
  }
});

export default router;
