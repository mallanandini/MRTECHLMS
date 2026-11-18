-- =====================================================================
-- MRTECHLMS Database Schema: 08_notifications_and_gamification.sql
-- Tables: notification_templates, notifications, notification_preferences, email_queue, reminder_logs, gamification_badges, gamification_configs, gamification_profiles, gamification_points_ledger, gamification_student_badges, gamification_streak_logs
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `notification_templates`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notification_templates`;
CREATE TABLE `notification_templates` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `type` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `inAppTitleTemplate` varchar(255) NOT NULL,
  `inAppBodyTemplate` text NOT NULL,
  `emailSubjectTemplate` varchar(255) NOT NULL,
  `emailBodyTemplate` mediumtext NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type` (`type`),
  KEY `idx_nt_type` (`type`),
  KEY `idx_nt_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `notifications`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `userId` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` text,
  `read` tinyint(1) NOT NULL DEFAULT '0',
  `readAt` varchar(50) DEFAULT NULL,
  `channel` varchar(20) NOT NULL DEFAULT 'in_app',
  `deliveryStatus` varchar(20) NOT NULL DEFAULT 'delivered',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`userId`,`read`,`deletedAt`),
  KEY `idx_notif_user_created` (`userId`,`createdAt`),
  KEY `idx_notif_org` (`organizationId`),
  KEY `idx_notif_type` (`type`),
  KEY `idx_notif_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `notification_preferences`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `notification_preferences`;
CREATE TABLE `notification_preferences` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `emailNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `inAppNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `courseAssigned` tinyint(1) NOT NULL DEFAULT '1',
  `learningPathAssigned` tinyint(1) NOT NULL DEFAULT '1',
  `assessmentAssigned` tinyint(1) NOT NULL DEFAULT '1',
  `dueDateReminders` tinyint(1) NOT NULL DEFAULT '1',
  `overdueAlerts` tinyint(1) NOT NULL DEFAULT '1',
  `assessmentResults` tinyint(1) NOT NULL DEFAULT '1',
  `certificateAlerts` tinyint(1) NOT NULL DEFAULT '1',
  `coursePublished` tinyint(1) NOT NULL DEFAULT '1',
  `announcements` tinyint(1) NOT NULL DEFAULT '1',
  `reminderDaysBefore` varchar(50) NOT NULL DEFAULT '7,3,1',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  KEY `idx_np_user` (`userId`),
  KEY `idx_np_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `email_queue`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `email_queue`;
CREATE TABLE `email_queue` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `recipientEmail` varchar(255) NOT NULL,
  `recipientName` varchar(255) DEFAULT NULL,
  `userId` varchar(36) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `bodyText` text NOT NULL,
  `bodyHtml` mediumtext NOT NULL,
  `notificationType` varchar(50) NOT NULL,
  `status` enum('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT '0',
  `maxAttempts` int NOT NULL DEFAULT '3',
  `lastError` text,
  `scheduledAt` varchar(50) NOT NULL,
  `sentAt` varchar(50) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_eq_status_sched` (`status`,`scheduledAt`),
  KEY `idx_eq_user` (`userId`),
  KEY `idx_eq_email` (`recipientEmail`),
  KEY `idx_eq_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `reminder_logs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `reminder_logs`;
CREATE TABLE `reminder_logs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `userId` varchar(36) NOT NULL,
  `entityType` varchar(50) NOT NULL,
  `entityId` varchar(36) NOT NULL,
  `reminderType` varchar(50) NOT NULL,
  `dedupKey` varchar(255) NOT NULL,
  `sentAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dedupKey` (`dedupKey`),
  KEY `idx_rl_dedup` (`dedupKey`),
  KEY `idx_rl_user_entity` (`userId`,`entityType`,`entityId`),
  KEY `idx_rl_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `gamification_badges`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gamification_badges`;
CREATE TABLE `gamification_badges` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `icon` varchar(50) NOT NULL DEFAULT 'Award',
  `tier` enum('bronze','silver','gold','platinum','diamond') NOT NULL DEFAULT 'bronze',
  `criteriaType` enum('lessons_completed','courses_completed','assessments_passed','streak_days','points_earned','coding_solved','manual') NOT NULL,
  `criteriaThreshold` int NOT NULL DEFAULT '1',
  `bonusPoints` int NOT NULL DEFAULT '0',
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `isSystem` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_gamif_badge_code_org` (`code`,`organizationId`),
  KEY `idx_badge_org_status` (`organizationId`,`status`,`criteriaType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `gamification_configs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gamification_configs`;
CREATE TABLE `gamification_configs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `pointsLessonComplete` int NOT NULL DEFAULT '10',
  `pointsCourseComplete` int NOT NULL DEFAULT '100',
  `pointsAssessmentPass` int NOT NULL DEFAULT '50',
  `pointsLearningPathComplete` int NOT NULL DEFAULT '200',
  `pointsCodingChallengeSolve` int NOT NULL DEFAULT '30',
  `pointsDailyStreakBonus` int NOT NULL DEFAULT '15',
  `leaderboardEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `leaderboardScope` enum('organization','department','cohort','group') NOT NULL DEFAULT 'organization',
  `leaderboardAnonymity` enum('real_name','partial_name','optional_anonymous') NOT NULL DEFAULT 'optional_anonymous',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizationId` (`organizationId`),
  KEY `idx_gamif_cfg_org` (`organizationId`,`isEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `gamification_profiles`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gamification_profiles`;
CREATE TABLE `gamification_profiles` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `totalPoints` int NOT NULL DEFAULT '0',
  `currentStreakDays` int NOT NULL DEFAULT '0',
  `longestStreakDays` int NOT NULL DEFAULT '0',
  `lastActiveDate` varchar(10) DEFAULT NULL,
  `tier` enum('novice','apprentice','scholar','master','grandmaster','legend') NOT NULL DEFAULT 'novice',
  `leaderboardAnonymous` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_gamif_student_org` (`studentId`,`organizationId`),
  KEY `idx_gamif_org_points` (`organizationId`,`totalPoints` DESC),
  KEY `idx_gamif_org_streak` (`organizationId`,`currentStreakDays` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `gamification_points_ledger`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gamification_points_ledger`;
CREATE TABLE `gamification_points_ledger` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `eventType` enum('lesson_completed','course_completed','assessment_passed','learning_path_completed','coding_solved','streak_bonus','manual_adjustment','badge_unlocked') NOT NULL,
  `eventReferenceId` varchar(100) DEFAULT NULL,
  `points` int NOT NULL,
  `balanceAfter` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `metadata` json DEFAULT NULL,
  `awardedBy` varchar(36) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ledger_student_created` (`studentId`,`organizationId`,`createdAt` DESC),
  KEY `idx_ledger_event_ref` (`studentId`,`eventType`,`eventReferenceId`),
  KEY `idx_ledger_org_created` (`organizationId`,`createdAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `gamification_student_badges`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gamification_student_badges`;
CREATE TABLE `gamification_student_badges` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `badgeId` varchar(36) NOT NULL,
  `awardedAt` varchar(50) NOT NULL,
  `awardedBy` varchar(36) DEFAULT NULL,
  `isRevoked` tinyint(1) NOT NULL DEFAULT '0',
  `revokedAt` varchar(50) DEFAULT NULL,
  `revokedBy` varchar(36) DEFAULT NULL,
  `revocationReason` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_gamif_student_badge` (`studentId`,`badgeId`,`organizationId`),
  KEY `idx_student_badge_active` (`studentId`,`organizationId`,`isRevoked`),
  KEY `idx_badge_awards` (`badgeId`,`isRevoked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `gamification_streak_logs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `gamification_streak_logs`;
CREATE TABLE `gamification_streak_logs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `activityDate` varchar(10) NOT NULL,
  `activityType` varchar(50) NOT NULL,
  `activityRefId` varchar(100) NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_gamif_student_date` (`studentId`,`activityDate`),
  KEY `idx_streak_org_date` (`organizationId`,`activityDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
