-- =====================================================================
-- MRTECHLMS Database Schema: 04_learning_paths.sql
-- Tables: learning_paths, learning_path_sections, learning_path_items, learning_path_assignments, learning_path_progress
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `learning_paths`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `learning_paths`;
CREATE TABLE `learning_paths` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `shortDescription` text,
  `description` text NOT NULL,
  `category` varchar(100) NOT NULL,
  `difficulty` varchar(50) DEFAULT 'Beginner',
  `thumbnail` text,
  `estimatedDuration` varchar(50) DEFAULT NULL,
  `requirements` json DEFAULT NULL,
  `learningObjectives` json DEFAULT NULL,
  `status` enum('draft','published','archived') DEFAULT 'draft',
  `authorId` varchar(36) NOT NULL,
  `authorName` varchar(255) NOT NULL,
  `finalAssessmentId` varchar(36) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  `certificateEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `certificateTemplateId` varchar(36) DEFAULT NULL,
  `certificateTitle` varchar(255) DEFAULT NULL,
  `validityMonths` int DEFAULT NULL,
  `signatoryName` varchar(255) DEFAULT NULL,
  `signatoryTitle` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `authorId` (`authorId`),
  KEY `idx_learning_paths_org` (`organizationId`),
  KEY `idx_learning_paths_deleted` (`deletedAt`),
  CONSTRAINT `learning_paths_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `learning_path_sections`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `learning_path_sections`;
CREATE TABLE `learning_path_sections` (
  `id` varchar(36) NOT NULL,
  `learningPathId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `order` int NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `learningPathId` (`learningPathId`),
  CONSTRAINT `learning_path_sections_ibfk_1` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `learning_path_items`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `learning_path_items`;
CREATE TABLE `learning_path_items` (
  `id` varchar(36) NOT NULL,
  `sectionId` varchar(36) NOT NULL,
  `learningPathId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `type` enum('text','video','pdf','assessment') NOT NULL,
  `order` int NOT NULL,
  `durationMinutes` int NOT NULL DEFAULT '10',
  `isRequired` tinyint(1) DEFAULT '1',
  `content` longtext,
  `videoSource` enum('youtube','vimeo','upload') DEFAULT NULL,
  `videoUrl` text,
  `fileUrl` text,
  `fileName` varchar(255) DEFAULT NULL,
  `assessmentId` varchar(36) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sectionId` (`sectionId`),
  KEY `learningPathId` (`learningPathId`),
  CONSTRAINT `learning_path_items_ibfk_1` FOREIGN KEY (`sectionId`) REFERENCES `learning_path_sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `learning_path_items_ibfk_2` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `learning_path_assignments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `learning_path_assignments`;
CREATE TABLE `learning_path_assignments` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `learningPathId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `assignedBy` varchar(36) NOT NULL,
  `assignedAt` varchar(50) NOT NULL,
  `completedAt` varchar(50) DEFAULT NULL,
  `status` enum('assigned','not_started','in_progress','completed','expired','revoked') NOT NULL DEFAULT 'assigned',
  `dueDate` varchar(50) DEFAULT NULL,
  `isMandatory` tinyint(1) NOT NULL DEFAULT '0',
  `assignmentSource` enum('individual','bulk','group','self','batch') NOT NULL DEFAULT 'individual',
  `assignmentSourceId` varchar(36) DEFAULT NULL,
  `revokedAt` varchar(50) DEFAULT NULL,
  `revokedBy` varchar(36) DEFAULT NULL,
  `revocationReason` text,
  `deletedAt` varchar(50) DEFAULT NULL,
  `isDenied` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_path_uniq` (`learningPathId`,`studentId`),
  KEY `studentId` (`studentId`),
  KEY `assignedBy` (`assignedBy`),
  KEY `idx_learning_path_assignments_org` (`organizationId`),
  KEY `idx_lp_assign_status` (`status`),
  KEY `idx_lp_assign_due_date` (`dueDate`),
  KEY `idx_lpa_denied` (`isDenied`),
  CONSTRAINT `learning_path_assignments_ibfk_1` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths` (`id`) ON DELETE CASCADE,
  CONSTRAINT `learning_path_assignments_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `learning_path_assignments_ibfk_3` FOREIGN KEY (`assignedBy`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `learning_path_progress`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `learning_path_progress`;
CREATE TABLE `learning_path_progress` (
  `id` varchar(36) NOT NULL,
  `learningPathId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `itemId` varchar(36) NOT NULL,
  `completed` tinyint(1) DEFAULT '0',
  `completedAt` varchar(50) DEFAULT NULL,
  `timeSpentSeconds` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_path_item_uniq` (`studentId`,`itemId`),
  KEY `learningPathId` (`learningPathId`),
  KEY `itemId` (`itemId`),
  CONSTRAINT `learning_path_progress_ibfk_1` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths` (`id`) ON DELETE CASCADE,
  CONSTRAINT `learning_path_progress_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `learning_path_progress_ibfk_3` FOREIGN KEY (`itemId`) REFERENCES `learning_path_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
