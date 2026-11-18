-- =====================================================================
-- MRTECHLMS Database Schema: 02_curriculum_and_learning.sql
-- Tables: courses, modules, lessons, enrollments, progress, reviews
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `courses`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `thumbnail` text,
  `banner` text,
  `instructorId` varchar(36) NOT NULL,
  `instructorName` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `requirements` json DEFAULT NULL,
  `skillsCovered` json DEFAULT NULL,
  `status` enum('draft','review','published','rejected','archived') DEFAULT 'draft',
  `isFeatured` tinyint(1) DEFAULT '0',
  `rating` decimal(3,2) DEFAULT '5.00',
  `reviewsCount` int DEFAULT '0',
  `createdAt` varchar(50) NOT NULL,
  `shortDescription` text,
  `difficulty` varchar(50) NOT NULL DEFAULT 'Beginner',
  `deletedAt` varchar(50) DEFAULT NULL,
  `estimatedDuration` varchar(50) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `prerequisites` json DEFAULT NULL,
  `version` int NOT NULL DEFAULT '1',
  `updatedAt` varchar(50) DEFAULT NULL,
  `certificateEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `certificateTemplateId` varchar(36) DEFAULT NULL,
  `certificateTitle` varchar(255) DEFAULT NULL,
  `requireFinalAssessment` tinyint(1) NOT NULL DEFAULT '0',
  `validityMonths` int DEFAULT NULL,
  `signatoryName` varchar(255) DEFAULT NULL,
  `signatoryTitle` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `instructorId` (`instructorId`),
  KEY `idx_courses_org` (`organizationId`),
  KEY `idx_courses_deleted` (`deletedAt`),
  KEY `idx_courses_org_status` (`organizationId`,`status`),
  CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`instructorId`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `modules`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `id` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `order` int NOT NULL,
  `description` text,
  `status` enum('draft','published') NOT NULL DEFAULT 'published',
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_modules_deleted` (`deletedAt`),
  KEY `idx_modules_course_order` (`courseId`,`order`),
  CONSTRAINT `modules_ibfk_1` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `lessons`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `lessons`;
CREATE TABLE `lessons` (
  `id` varchar(36) NOT NULL,
  `moduleId` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` enum('video','pdf','image','text','coding','assessment') NOT NULL DEFAULT 'video',
  `content` text,
  `videoUrl` text,
  `fileUrl` text,
  `codingPrompt` json DEFAULT NULL,
  `order` int NOT NULL,
  `durationMinutes` int NOT NULL,
  `description` text,
  `materialTitle` varchar(255) DEFAULT NULL,
  `materialUrl` text,
  `assessmentId` varchar(36) DEFAULT NULL,
  `status` enum('draft','published') NOT NULL DEFAULT 'published',
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `courseId` (`courseId`),
  KEY `idx_lessons_deleted` (`deletedAt`),
  KEY `idx_lessons_module_order` (`moduleId`,`order`),
  CONSTRAINT `lessons_ibfk_1` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lessons_ibfk_2` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `enrollments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `enrollments`;
CREATE TABLE `enrollments` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `studentId` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `enrolledAt` varchar(50) NOT NULL,
  `completedAt` varchar(50) DEFAULT NULL,
  `lastLessonId` varchar(36) DEFAULT NULL,
  `lastAccessedAt` varchar(50) DEFAULT NULL,
  `progressPercentage` int NOT NULL DEFAULT '0',
  `status` enum('assigned','not_started','in_progress','completed','expired','revoked') NOT NULL DEFAULT 'assigned',
  `assignedBy` varchar(36) DEFAULT NULL,
  `assignedAt` varchar(50) DEFAULT NULL,
  `dueDate` varchar(50) DEFAULT NULL,
  `isMandatory` tinyint(1) NOT NULL DEFAULT '0',
  `assignmentSource` enum('individual','bulk','group','learning_path','self','batch') NOT NULL DEFAULT 'individual',
  `assignmentSourceId` varchar(36) DEFAULT NULL,
  `revokedAt` varchar(50) DEFAULT NULL,
  `revokedBy` varchar(36) DEFAULT NULL,
  `revocationReason` text,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_course_uniq` (`studentId`,`courseId`),
  KEY `idx_enrollments_org` (`organizationId`),
  KEY `idx_enrollments_student_course` (`studentId`,`courseId`),
  KEY `idx_enrollments_status` (`status`),
  KEY `idx_enrollments_due_date` (`dueDate`),
  KEY `idx_enr_org_status_comp` (`organizationId`,`status`,`completedAt`),
  KEY `idx_enr_course_progress` (`courseId`,`status`,`progressPercentage`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `progress`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `progress`;
CREATE TABLE `progress` (
  `id` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `lessonId` varchar(36) NOT NULL,
  `completed` tinyint(1) DEFAULT '0',
  `completedAt` varchar(50) DEFAULT NULL,
  `timeSpentSeconds` int DEFAULT '0',
  `status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  `lastAccessedAt` varchar(50) DEFAULT NULL,
  `progressPercent` int NOT NULL DEFAULT '0',
  `lastPositionSeconds` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_lesson_uniq` (`studentId`,`lessonId`),
  KEY `lessonId` (`lessonId`),
  KEY `idx_progress_student_course` (`studentId`,`courseId`),
  KEY `idx_prog_course_student_comp` (`courseId`,`studentId`,`completed`),
  KEY `idx_prog_course_lesson_comp` (`courseId`,`lessonId`,`completed`),
  CONSTRAINT `progress_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `progress_ibfk_2` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `progress_ibfk_3` FOREIGN KEY (`lessonId`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `reviews`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `rating` int NOT NULL,
  `comment` text NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_course_review` (`studentId`,`courseId`),
  KEY `courseId` (`courseId`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
