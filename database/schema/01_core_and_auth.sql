-- =====================================================================
-- MRTECHLMS Database Schema: 01_core_and_auth.sql
-- Tables: organizations, users, user_preferences, audit_logs, schema_migrations
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `organizations`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `organizations`;
CREATE TABLE `organizations` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `logoUrl` text,
  `settings` json DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) DEFAULT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_org_slug` (`slug`),
  KEY `idx_org_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `users`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('student','trainer','admin','super_admin','manager') NOT NULL DEFAULT 'student',
  `profilePhoto` text,
  `createdAt` varchar(50) NOT NULL,
  `status` enum('active','suspended') DEFAULT 'active',
  `bookmarkedBlogIds` json DEFAULT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  `departmentId` varchar(36) DEFAULT NULL,
  `managerId` varchar(36) DEFAULT NULL,
  `jobTitle` varchar(100) DEFAULT NULL,
  `phoneNumber` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_org` (`organizationId`),
  KEY `idx_users_deleted` (`deletedAt`),
  KEY `idx_users_org_role_status` (`organizationId`,`role`,`status`),
  KEY `idx_users_dept` (`departmentId`),
  KEY `idx_users_manager` (`managerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `user_preferences`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `user_preferences`;
CREATE TABLE `user_preferences` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `theme` varchar(50) NOT NULL DEFAULT 'default-blue',
  `primaryColor` varchar(50) NOT NULL DEFAULT '#2563eb',
  `secondaryColor` varchar(50) NOT NULL DEFAULT '#4f46e5',
  `backgroundColor` varchar(50) NOT NULL DEFAULT '#f8fafc',
  `surfaceColor` varchar(50) NOT NULL DEFAULT '#ffffff',
  `textColor` varchar(50) NOT NULL DEFAULT '#0f172a',
  `mode` enum('light','dark') NOT NULL DEFAULT 'light',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `audit_logs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` varchar(64) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `userEmail` varchar(255) DEFAULT NULL,
  `userRole` varchar(32) DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `resourceType` varchar(64) NOT NULL,
  `resourceId` varchar(64) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ipAddress` varchar(64) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'success',
  `createdAt` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`userId`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`createdAt`),
  KEY `idx_audit_logs_org` (`organizationId`),
  KEY `idx_audit_org_action` (`organizationId`,`action`),
  KEY `idx_audit_org_action_date` (`organizationId`,`action`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `schema_migrations`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `schema_migrations`;
CREATE TABLE `schema_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `version` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  `appliedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `version` (`version`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
