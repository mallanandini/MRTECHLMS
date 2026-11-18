-- =====================================================================
-- MRTECHLMS Database Schema: 05_coding_and_playground.sql
-- Tables: coding_chapters, coding_topics, coding_challenges, coding_saved_code, coding_submissions, student_playground_programs, coding_execution_jobs
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `coding_chapters`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `coding_chapters`;
CREATE TABLE `coding_chapters` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text,
  `icon` varchar(50) DEFAULT NULL,
  `orderIndex` int NOT NULL DEFAULT '1',
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `coding_topics`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `coding_topics`;
CREATE TABLE `coding_topics` (
  `id` varchar(100) NOT NULL,
  `chapterId` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text,
  `orderIndex` int NOT NULL DEFAULT '1',
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `chapterId` (`chapterId`),
  CONSTRAINT `coding_topics_ibfk_1` FOREIGN KEY (`chapterId`) REFERENCES `coding_chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `coding_challenges`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `coding_challenges`;
CREATE TABLE `coding_challenges` (
  `id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'easy',
  `category` varchar(100) NOT NULL DEFAULT 'General',
  `challengeType` enum('programming','web') NOT NULL DEFAULT 'programming',
  `supportedLanguages` json NOT NULL,
  `starterCode` json NOT NULL,
  `htmlStarterCode` text,
  `cssStarterCode` text,
  `javascriptStarterCode` text,
  `inputFormat` text,
  `outputFormat` text,
  `constraints` text,
  `examples` json DEFAULT NULL,
  `publicTestCases` json NOT NULL,
  `privateTestCases` json NOT NULL,
  `hints` json DEFAULT NULL,
  `solutionExplanation` text,
  `timeLimit` int NOT NULL DEFAULT '3000',
  `memoryLimit` int NOT NULL DEFAULT '256',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `chapterId` varchar(100) DEFAULT NULL,
  `topicId` varchar(100) DEFAULT NULL,
  `orderIndex` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `coding_saved_code`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `coding_saved_code`;
CREATE TABLE `coding_saved_code` (
  `id` varchar(100) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `challengeId` varchar(100) NOT NULL,
  `language` varchar(50) NOT NULL,
  `code` text,
  `htmlCode` text,
  `cssCode` text,
  `jsCode` text,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_challenge_lang` (`studentId`,`challengeId`,`language`),
  CONSTRAINT `coding_saved_code_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `coding_submissions`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `coding_submissions`;
CREATE TABLE `coding_submissions` (
  `id` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `studentName` varchar(255) NOT NULL,
  `problemId` varchar(100) NOT NULL,
  `language` varchar(50) NOT NULL,
  `code` text NOT NULL,
  `status` enum('passed','failed','error') NOT NULL,
  `output` text,
  `resultsJson` json DEFAULT NULL,
  `passedCount` int NOT NULL,
  `totalCount` int NOT NULL,
  `score` int NOT NULL DEFAULT '0',
  `executionTimeMs` int NOT NULL DEFAULT '0',
  `memoryBytes` bigint NOT NULL DEFAULT '0',
  `submittedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `studentId` (`studentId`),
  KEY `idx_coding_sub_org` (`organizationId`),
  CONSTRAINT `coding_submissions_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `student_playground_programs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `student_playground_programs`;
CREATE TABLE `student_playground_programs` (
  `id` varchar(100) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `language` varchar(50) NOT NULL,
  `code` text NOT NULL,
  `input` text,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `studentId` (`studentId`),
  CONSTRAINT `student_playground_programs_ibfk_1` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `coding_execution_jobs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `coding_execution_jobs`;
CREATE TABLE `coding_execution_jobs` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `challengeId` varchar(100) DEFAULT NULL,
  `language` varchar(50) NOT NULL,
  `code` mediumtext NOT NULL,
  `stdin` text,
  `jobType` enum('run','submit','playground') NOT NULL DEFAULT 'run',
  `status` enum('queued','running','completed','failed','timeout') NOT NULL DEFAULT 'queued',
  `result` json DEFAULT NULL,
  `error` text,
  `executionDriver` varchar(50) NOT NULL DEFAULT 'isolated-process',
  `executionTimeMs` int DEFAULT NULL,
  `memoryBytes` bigint DEFAULT NULL,
  `enqueuedAt` varchar(50) NOT NULL,
  `startedAt` varchar(50) DEFAULT NULL,
  `completedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_user_org` (`organizationId`,`userId`),
  KEY `idx_jobs_status` (`status`),
  KEY `idx_jobs_challenge` (`challengeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
