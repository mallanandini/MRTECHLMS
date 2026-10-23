/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { tableExists } from "./utils.js";

export const migration010: Migration = {
  id: "010_notifications_and_reminders",
  name: "Notification and Reminder System: In-App Notifications, Email Queue, Preferences, Dedup Logs, and Configurable Templates",
  up: async (pool: Pool) => {
    console.log("[Migration 010] Applying Notification and Reminder System schema updates...");

    // 1. Create notifications table
    if (!(await tableExists(pool, "notifications"))) {
      console.log("[Migration 010] Creating notifications table...");
      await pool.query(`
        CREATE TABLE \`notifications\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`userId\` VARCHAR(36) NOT NULL,
          \`type\` VARCHAR(50) NOT NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`message\` TEXT NOT NULL,
          \`data\` TEXT NULL,
          \`read\` TINYINT(1) NOT NULL DEFAULT 0,
          \`readAt\` VARCHAR(50) NULL,
          \`channel\` VARCHAR(20) NOT NULL DEFAULT 'in_app',
          \`deliveryStatus\` VARCHAR(20) NOT NULL DEFAULT 'delivered',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          \`deletedAt\` VARCHAR(50) NULL,
          INDEX \`idx_notif_user_read\` (\`userId\`, \`read\`, \`deletedAt\`),
          INDEX \`idx_notif_user_created\` (\`userId\`, \`createdAt\`),
          INDEX \`idx_notif_org\` (\`organizationId\`),
          INDEX \`idx_notif_type\` (\`type\`),
          INDEX \`idx_notif_deleted\` (\`deletedAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. Create email_queue table
    if (!(await tableExists(pool, "email_queue"))) {
      console.log("[Migration 010] Creating email_queue table...");
      await pool.query(`
        CREATE TABLE \`email_queue\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`recipientEmail\` VARCHAR(255) NOT NULL,
          \`recipientName\` VARCHAR(255) NULL,
          \`userId\` VARCHAR(36) NULL,
          \`subject\` VARCHAR(255) NOT NULL,
          \`bodyText\` TEXT NOT NULL,
          \`bodyHtml\` MEDIUMTEXT NOT NULL,
          \`notificationType\` VARCHAR(50) NOT NULL,
          \`status\` ENUM('pending', 'processing', 'sent', 'failed') NOT NULL DEFAULT 'pending',
          \`attempts\` INT NOT NULL DEFAULT 0,
          \`maxAttempts\` INT NOT NULL DEFAULT 3,
          \`lastError\` TEXT NULL,
          \`scheduledAt\` VARCHAR(50) NOT NULL,
          \`sentAt\` VARCHAR(50) NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_eq_status_sched\` (\`status\`, \`scheduledAt\`),
          INDEX \`idx_eq_user\` (\`userId\`),
          INDEX \`idx_eq_email\` (\`recipientEmail\`),
          INDEX \`idx_eq_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. Create notification_preferences table
    if (!(await tableExists(pool, "notification_preferences"))) {
      console.log("[Migration 010] Creating notification_preferences table...");
      await pool.query(`
        CREATE TABLE \`notification_preferences\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`userId\` VARCHAR(36) NOT NULL UNIQUE,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`emailNotifications\` TINYINT(1) NOT NULL DEFAULT 1,
          \`inAppNotifications\` TINYINT(1) NOT NULL DEFAULT 1,
          \`courseAssigned\` TINYINT(1) NOT NULL DEFAULT 1,
          \`learningPathAssigned\` TINYINT(1) NOT NULL DEFAULT 1,
          \`assessmentAssigned\` TINYINT(1) NOT NULL DEFAULT 1,
          \`dueDateReminders\` TINYINT(1) NOT NULL DEFAULT 1,
          \`overdueAlerts\` TINYINT(1) NOT NULL DEFAULT 1,
          \`assessmentResults\` TINYINT(1) NOT NULL DEFAULT 1,
          \`certificateAlerts\` TINYINT(1) NOT NULL DEFAULT 1,
          \`coursePublished\` TINYINT(1) NOT NULL DEFAULT 1,
          \`announcements\` TINYINT(1) NOT NULL DEFAULT 1,
          \`reminderDaysBefore\` VARCHAR(50) NOT NULL DEFAULT '7,3,1',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_np_user\` (\`userId\`),
          INDEX \`idx_np_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 4. Create reminder_logs table for deduplication
    if (!(await tableExists(pool, "reminder_logs"))) {
      console.log("[Migration 010] Creating reminder_logs table...");
      await pool.query(`
        CREATE TABLE \`reminder_logs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`userId\` VARCHAR(36) NOT NULL,
          \`entityType\` VARCHAR(50) NOT NULL,
          \`entityId\` VARCHAR(36) NOT NULL,
          \`reminderType\` VARCHAR(50) NOT NULL,
          \`dedupKey\` VARCHAR(255) NOT NULL UNIQUE,
          \`sentAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_rl_dedup\` (\`dedupKey\`),
          INDEX \`idx_rl_user_entity\` (\`userId\`, \`entityType\`, \`entityId\`),
          INDEX \`idx_rl_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 5. Create notification_templates table
    if (!(await tableExists(pool, "notification_templates"))) {
      console.log("[Migration 010] Creating notification_templates table...");
      await pool.query(`
        CREATE TABLE \`notification_templates\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL DEFAULT 'org-default',
          \`type\` VARCHAR(50) NOT NULL UNIQUE,
          \`name\` VARCHAR(255) NOT NULL,
          \`description\` TEXT NULL,
          \`inAppTitleTemplate\` VARCHAR(255) NOT NULL,
          \`inAppBodyTemplate\` TEXT NOT NULL,
          \`emailSubjectTemplate\` VARCHAR(255) NOT NULL,
          \`emailBodyTemplate\` MEDIUMTEXT NOT NULL,
          \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_nt_type\` (\`type\`),
          INDEX \`idx_nt_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed standard default templates
      console.log("[Migration 010] Seeding default notification templates...");
      const now = new Date().toISOString();
      const defaultTemplates = [
        {
          id: "tmpl-course-assigned",
          type: "course_assigned",
          name: "Course Assigned",
          description: "Sent when a course is assigned to a learner",
          inAppTitle: "Course Assigned: {{title}}",
          inAppBody: "You have been enrolled in {{title}}. {{#dueDate}}Due by {{dueDate}}.{{/dueDate}}",
          emailSub: "New Course Assigned: {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>You have been assigned to the course <strong>{{title}}</strong>.</p>{{#dueDate}}<p><strong>Target Completion Date:</strong> {{dueDate}}</p>{{/dueDate}}<p><a href=\"{{actionUrl}}\">Click here to access your course</a>.</p>"
        },
        {
          id: "tmpl-lp-assigned",
          type: "learning_path_assigned",
          name: "Learning Path Assigned",
          description: "Sent when a learning path is assigned to a learner",
          inAppTitle: "Learning Path Assigned: {{title}}",
          inAppBody: "You have been assigned to the learning path {{title}} containing {{totalItems}} modules.",
          emailSub: "New Learning Path Assigned: {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>You have been enrolled in the structured learning path: <strong>{{title}}</strong>.</p><p><a href=\"{{actionUrl}}\">Start Learning Path</a></p>"
        },
        {
          id: "tmpl-assess-assigned",
          type: "assessment_assigned",
          name: "Assessment Assigned",
          description: "Sent when an assessment is assigned to a learner",
          inAppTitle: "Assessment Assigned: {{title}}",
          inAppBody: "You have a new assessment to complete: {{title}}. {{#dueDate}}Due: {{dueDate}}{{/dueDate}}",
          emailSub: "Assessment Assigned: {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>An assessment has been assigned to you: <strong>{{title}}</strong>.</p>{{#dueDate}}<p><strong>Due Date:</strong> {{dueDate}}</p>{{/dueDate}}<p><a href=\"{{actionUrl}}\">Take Assessment Now</a></p>"
        },
        {
          id: "tmpl-due-reminder",
          type: "approaching_due_date",
          name: "Approaching Due Date Reminder",
          description: "Sent 7, 3, or 1 days prior to an assignment due date",
          inAppTitle: "Upcoming Due Date: {{title}}",
          inAppBody: "Reminder: {{title}} is due in {{daysRemaining}} day(s) on {{dueDate}}.",
          emailSub: "Reminder: {{title}} is due in {{daysRemaining}} day(s)",
          emailBody: "<p>Hello {{name}},</p><p>This is a reminder that your assignment <strong>{{title}}</strong> is due on <strong>{{dueDate}}</strong> (in {{daysRemaining}} day(s)).</p><p><a href=\"{{actionUrl}}\">Continue Learning</a></p>"
        },
        {
          id: "tmpl-overdue",
          type: "overdue_learning",
          name: "Overdue Learning Alert",
          description: "Sent when learning deadline has lapsed without completion",
          inAppTitle: "Overdue Alert: {{title}}",
          inAppBody: "Your assignment {{title}} was due on {{dueDate}} and is currently overdue.",
          emailSub: "Action Required: Overdue Learning - {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>Your assignment <strong>{{title}}</strong> was due on <strong>{{dueDate}}</strong> and has not yet been marked completed.</p><p>Please prioritize finishing this requirement.</p><p><a href=\"{{actionUrl}}\">Complete Assignment</a></p>"
        },
        {
          id: "tmpl-assess-result",
          type: "assessment_result",
          name: "Assessment Graded Result",
          description: "Sent when an assessment is submitted and scored",
          inAppTitle: "Assessment Result: {{title}} ({{statusText}})",
          inAppBody: "You scored {{percentage}}% on {{title}}. Status: {{statusText}}.",
          emailSub: "Assessment Scorecard: {{title}} - {{statusText}}",
          emailBody: "<p>Hello {{name}},</p><p>Your submission for <strong>{{title}}</strong> has been evaluated.</p><p><strong>Score:</strong> {{score}} / {{totalPoints}} ({{percentage}}%)<br/><strong>Outcome:</strong> {{statusText}}</p><p><a href=\"{{actionUrl}}\">View Detailed Scorecard</a></p>"
        },
        {
          id: "tmpl-cert-issued",
          type: "certificate_issued",
          name: "Certificate Issued",
          description: "Sent when an official certificate is awarded",
          inAppTitle: "Certificate Awarded: {{title}}",
          inAppBody: "Congratulations! Your certificate for {{title}} is now ready to view and download.",
          emailSub: "Congratulations! You earned a Certificate for {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>Congratulations on satisfying all requirements for <strong>{{title}}</strong>!</p><p>Your official Certificate Number is: <strong>{{certificateNumber}}</strong>.</p><p><a href=\"{{actionUrl}}\">View and Download Certificate</a></p>"
        },
        {
          id: "tmpl-cert-expiring",
          type: "certificate_expiring",
          name: "Certificate Expiring Warning",
          description: "Sent when a certificate is nearing its expiration date",
          inAppTitle: "Certificate Expiring: {{title}}",
          inAppBody: "Your certification for {{title}} expires on {{expiresAt}} (in {{daysRemaining}} days).",
          emailSub: "Certificate Expiring Soon: {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>This is an advisory notice that your certification for <strong>{{title}}</strong> will expire on <strong>{{expiresAt}}</strong>.</p><p><a href=\"{{actionUrl}}\">Renew / View Certification</a></p>"
        },
        {
          id: "tmpl-course-published",
          type: "course_published",
          name: "Course Published Announcement",
          description: "Sent to learners when a new course is published to the catalog",
          inAppTitle: "New Course Available: {{title}}",
          inAppBody: "Check out the newly published course: {{title}} ({{category}}).",
          emailSub: "New Course Published: {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>A new course has just been published: <strong>{{title}}</strong> in <em>{{category}}</em>.</p><p>{{description}}</p><p><a href=\"{{actionUrl}}\">Explore Course</a></p>"
        },
        {
          id: "tmpl-admin-announcement",
          type: "admin_announcement",
          name: "Important Organization Announcement",
          description: "Sent when administrators broadcast an announcement",
          inAppTitle: "{{title}}",
          inAppBody: "{{message}}",
          emailSub: "Announcement: {{title}}",
          emailBody: "<p>Hello {{name}},</p><p>An announcement has been issued by your learning administration:</p><blockquote>{{message}}</blockquote>{{#actionUrl}}<p><a href=\"{{actionUrl}}\">View Details</a></p>{{/actionUrl}}"
        }
      ];

      for (const t of defaultTemplates) {
        await pool.query(`
          INSERT INTO \`notification_templates\` 
          (\`id\`, \`organizationId\`, \`type\`, \`name\`, \`description\`, \`inAppTitleTemplate\`, \`inAppBodyTemplate\`, \`emailSubjectTemplate\`, \`emailBodyTemplate\`, \`enabled\`, \`createdAt\`, \`updatedAt\`)
          VALUES (?, 'org-default', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [t.id, t.type, t.name, t.description, t.inAppTitle, t.inAppBody, t.emailSub, t.emailBody, now, now]);
      }
    }

    console.log("[Migration 010] Notification and Reminder System migration applied successfully.");
  },

  down: async (pool: Pool) => {
    console.log("[Migration 010] Reverting Notification and Reminder System schema...");
    await pool.query("DROP TABLE IF EXISTS `notification_templates`");
    await pool.query("DROP TABLE IF EXISTS `reminder_logs`");
    await pool.query("DROP TABLE IF EXISTS `notification_preferences`");
    await pool.query("DROP TABLE IF EXISTS `email_queue`");
    await pool.query("DROP TABLE IF EXISTS `notifications`");
    console.log("[Migration 010] Reverted successfully.");
  }
};
