-- =====================================================================
-- MRTECHLMS Database Schema: 03_assessments_and_attempts.sql
-- Tables: assessments, questions, assessment_assignments, assessment_attempts, submissions
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `assessments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `assessments`;
CREATE TABLE `assessments` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `courseId` varchar(36) DEFAULT NULL,
  `moduleId` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `durationMinutes` int NOT NULL,
  `passingScore` int NOT NULL,
  `totalPoints` int NOT NULL,
  `questionsCount` int NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  `status` enum('published','draft','archived') DEFAULT 'draft',
  `lessonId` varchar(36) DEFAULT NULL,
  `type` enum('lesson_practice','course_final','path_practice','path_final','standalone') DEFAULT 'standalone',
  `learningPathId` varchar(36) DEFAULT NULL,
  `learningPathItemId` varchar(36) DEFAULT NULL,
  `shortDescription` text,
  `instructions` text,
  `category` varchar(100) NOT NULL DEFAULT 'General',
  `difficulty` varchar(50) NOT NULL DEFAULT 'medium',
  `assessmentType` varchar(50) NOT NULL DEFAULT 'practice_test',
  `maxAttempts` int NOT NULL DEFAULT '1',
  `questionNavigation` enum('free','sequential') DEFAULT 'free',
  `randomizeQuestions` tinyint(1) DEFAULT '0',
  `randomizeOptions` tinyint(1) DEFAULT '0',
  `revealAnswers` tinyint(1) DEFAULT '1',
  `proctoringConfig` json DEFAULT NULL,
  `authorId` varchar(36) DEFAULT NULL,
  `authorName` varchar(255) DEFAULT NULL,
  `updatedAt` varchar(50) DEFAULT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `courseId` (`courseId`),
  KEY `moduleId` (`moduleId`),
  KEY `idx_assessments_org` (`organizationId`),
  KEY `idx_assessments_deleted` (`deletedAt`),
  KEY `idx_assessments_org_status` (`organizationId`,`status`),
  CONSTRAINT `assessments_ibfk_1` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assessments_ibfk_2` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `questions`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `questions`;
CREATE TABLE `questions` (
  `id` varchar(36) NOT NULL,
  `assessmentId` varchar(36) NOT NULL,
  `type` enum('mcq_single','mcq_multi','true_false','fill_blanks','subjective') NOT NULL,
  `questionText` text NOT NULL,
  `options` json DEFAULT NULL,
  `correctAnswers` json NOT NULL,
  `points` int NOT NULL,
  `negativePoints` int DEFAULT '0',
  `explanation` text,
  `difficulty` varchar(50) NOT NULL DEFAULT 'medium',
  `order` int NOT NULL DEFAULT '1',
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assessmentId` (`assessmentId`),
  KEY `idx_questions_deleted` (`deletedAt`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`assessmentId`) REFERENCES `assessments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `assessment_assignments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `assessment_assignments`;
CREATE TABLE `assessment_assignments` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `assessmentId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `assignedBy` varchar(36) NOT NULL,
  `assignedAt` varchar(50) NOT NULL,
  `dueDate` varchar(50) DEFAULT NULL,
  `status` enum('assigned','not_started','in_progress','completed','expired','revoked') NOT NULL DEFAULT 'assigned',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `isMandatory` tinyint(1) NOT NULL DEFAULT '0',
  `assignmentSource` enum('individual','bulk','group','course','learning_path','self') NOT NULL DEFAULT 'individual',
  `assignmentSourceId` varchar(36) DEFAULT NULL,
  `revokedAt` varchar(50) DEFAULT NULL,
  `revokedBy` varchar(36) DEFAULT NULL,
  `revocationReason` text,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_assessment_uniq` (`assessmentId`,`studentId`),
  KEY `assignedBy` (`assignedBy`),
  KEY `idx_assessment_assignments_org` (`organizationId`),
  KEY `idx_assign_student_status` (`studentId`,`status`),
  KEY `idx_assessment_assign_status` (`status`),
  KEY `idx_assessment_assign_due_date` (`dueDate`),
  CONSTRAINT `assessment_assignments_ibfk_1` FOREIGN KEY (`assessmentId`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assessment_assignments_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assessment_assignments_ibfk_3` FOREIGN KEY (`assignedBy`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `assessment_attempts`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `assessment_attempts`;
CREATE TABLE `assessment_attempts` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `assessmentId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `attemptNumber` int NOT NULL DEFAULT '1',
  `startedAt` varchar(50) NOT NULL,
  `expiresAt` varchar(50) NOT NULL,
  `submittedAt` varchar(50) DEFAULT NULL,
  `timeTakenSeconds` int NOT NULL DEFAULT '0',
  `status` enum('in_progress','submitted','timed_out','abandoned') NOT NULL DEFAULT 'in_progress',
  `questionOrder` json DEFAULT NULL,
  `answers` json DEFAULT NULL,
  `proctoringEvents` json DEFAULT NULL,
  `score` int DEFAULT NULL,
  `totalPoints` int DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `passed` tinyint(1) DEFAULT NULL,
  `correctCount` int NOT NULL DEFAULT '0',
  `incorrectCount` int NOT NULL DEFAULT '0',
  `unansweredCount` int NOT NULL DEFAULT '0',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attempts_assessment_student` (`assessmentId`,`studentId`),
  KEY `idx_attempts_status` (`status`),
  KEY `idx_attempts_org` (`organizationId`),
  KEY `idx_attempts_deleted` (`deletedAt`),
  KEY `studentId` (`studentId`),
  CONSTRAINT `assessment_attempts_ibfk_1` FOREIGN KEY (`assessmentId`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assessment_attempts_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `submissions`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `submissions`;
CREATE TABLE `submissions` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `assessmentId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `studentName` varchar(255) NOT NULL,
  `attemptId` varchar(36) DEFAULT NULL,
  `attemptNumber` int DEFAULT '1',
  `answers` json NOT NULL,
  `score` int NOT NULL,
  `totalPoints` int NOT NULL,
  `passed` tinyint(1) NOT NULL,
  `submittedAt` varchar(50) NOT NULL,
  `timeTakenSeconds` int NOT NULL,
  `correctCount` int NOT NULL DEFAULT '0',
  `incorrectCount` int NOT NULL DEFAULT '0',
  `unansweredCount` int NOT NULL DEFAULT '0',
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_submissions_org` (`organizationId`),
  KEY `idx_submissions_student_assessment` (`studentId`,`assessmentId`),
  KEY `idx_submissions_assessment_date` (`assessmentId`,`submittedAt`),
  KEY `idx_submissions_attempt` (`attemptId`),
  KEY `idx_sub_org_passed_score` (`organizationId`,`passed`,`score`),
  KEY `idx_sub_ass_passed_score` (`assessmentId`,`passed`,`score`),
  CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`assessmentId`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
