-- =====================================================================
-- MRTECHLMS Database Schema: 06_certifications.sql
-- Tables: certificate_templates, certificates
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `certificate_templates`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `certificate_templates`;
CREATE TABLE `certificate_templates` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `name` varchar(255) NOT NULL,
  `description` text,
  `style` enum('classic_gold','modern_emerald','executive_navy','tech_violet') NOT NULL DEFAULT 'classic_gold',
  `primaryColor` varchar(50) NOT NULL DEFAULT '#1e3a8a',
  `accentColor` varchar(50) NOT NULL DEFAULT '#d97706',
  `badgeIcon` varchar(50) NOT NULL DEFAULT 'award',
  `borderStyle` varchar(50) NOT NULL DEFAULT 'ornate',
  `defaultSignatoryName` varchar(255) NOT NULL DEFAULT 'Dr. M. R. Tech',
  `defaultSignatoryTitle` varchar(255) NOT NULL DEFAULT 'Director of Academic Affairs',
  `organizationName` varchar(255) NOT NULL DEFAULT 'MRTECH Learning Academy',
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_templates_org` (`organizationId`),
  KEY `idx_templates_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `certificates`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `certificates`;
CREATE TABLE `certificates` (
  `id` varchar(36) NOT NULL,
  `certificateNumber` varchar(100) NOT NULL,
  `verificationCode` varchar(64) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `studentId` varchar(36) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `studentEmail` varchar(255) NOT NULL,
  `type` enum('course','learning_path') NOT NULL DEFAULT 'course',
  `courseId` varchar(36) DEFAULT NULL,
  `learningPathId` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `certificateTitle` varchar(255) NOT NULL DEFAULT 'Certificate of Completion',
  `templateId` varchar(36) DEFAULT NULL,
  `templateStyle` varchar(50) NOT NULL DEFAULT 'classic_gold',
  `scorePercentage` decimal(5,2) DEFAULT NULL,
  `issuedAt` varchar(50) NOT NULL,
  `expiresAt` varchar(50) DEFAULT NULL,
  `status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
  `signatoryName` varchar(255) NOT NULL DEFAULT 'Dr. M. R. Tech',
  `signatoryTitle` varchar(255) NOT NULL DEFAULT 'Director of Academic Affairs',
  `organizationName` varchar(255) NOT NULL DEFAULT 'MRTECH Learning Academy',
  `revokedAt` varchar(50) DEFAULT NULL,
  `revokedBy` varchar(36) DEFAULT NULL,
  `revocationReason` text,
  `metadata` json DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cert_number` (`certificateNumber`),
  UNIQUE KEY `uniq_cert_code` (`verificationCode`),
  KEY `idx_cert_student` (`studentId`),
  KEY `idx_cert_org` (`organizationId`),
  KEY `idx_cert_status` (`status`),
  KEY `idx_cert_deleted` (`deletedAt`),
  KEY `idx_cert_org_status_issued` (`organizationId`,`status`,`issuedAt`),
  CONSTRAINT `certificates_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
