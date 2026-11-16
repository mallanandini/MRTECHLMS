-- ============================================================
-- MRTECHLMS — Complete Database Setup Script
-- Creates all 40+ tables and inserts realistic dummy data
-- Target: MySQL 8.0+ (InnoDB, utf8mb4)
-- ============================================================

-- 1. Create and use the database
CREATE DATABASE IF NOT EXISTS `mrtechlms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `mrtechlms`;

-- ============================================================
-- SCHEMA MIGRATIONS TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(100) UNIQUE NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `batch` INT NOT NULL,
  `appliedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MULTI-TENANCY & ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `domain` VARCHAR(255) NULL,
  `logoUrl` TEXT NULL,
  `settings` JSON NULL,
  `status` ENUM('active','inactive','suspended') DEFAULT 'active',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NULL,
  `deletedAt` VARCHAR(50) NULL,
  UNIQUE KEY `idx_org_slug` (`slug`),
  INDEX `idx_org_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- USERS & PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `role` ENUM('student','trainer','admin','super_admin','manager') NOT NULL DEFAULT 'student',
  `profilePhoto` TEXT NULL,
  `status` ENUM('active','suspended') DEFAULT 'active',
  `bookmarkedBlogIds` JSON NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `phoneNumber` VARCHAR(50) NULL,
  `location` VARCHAR(255) NULL,
  `departmentId` VARCHAR(36) NULL,
  `managerId` VARCHAR(36) NULL,
  `jobTitle` VARCHAR(255) NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_users_org` (`organizationId`),
  INDEX `idx_users_deleted` (`deletedAt`),
  INDEX `idx_users_org_role_status` (`organizationId`, `role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) UNIQUE NOT NULL,
  `theme` VARCHAR(50) NOT NULL DEFAULT 'default-blue',
  `primaryColor` VARCHAR(50) NOT NULL DEFAULT '#2563eb',
  `secondaryColor` VARCHAR(50) NOT NULL DEFAULT '#4f46e5',
  `backgroundColor` VARCHAR(50) NOT NULL DEFAULT '#f8fafc',
  `surfaceColor` VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  `textColor` VARCHAR(50) NOT NULL DEFAULT '#0f172a',
  `mode` ENUM('light','dark') NOT NULL DEFAULT 'light',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- COURSES & CURRICULUM
-- ============================================================
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `shortDescription` TEXT NULL,
  `difficulty` VARCHAR(50) DEFAULT 'Beginner',
  `thumbnail` TEXT NULL,
  `banner` TEXT NULL,
  `instructorId` VARCHAR(36) NOT NULL,
  `instructorName` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `requirements` JSON NULL,
  `skillsCovered` JSON NULL,
  `tags` JSON NULL,
  `prerequisites` JSON NULL,
  `status` ENUM('draft','review','published','rejected','archived') DEFAULT 'draft',
  `isFeatured` BOOLEAN DEFAULT FALSE,
  `rating` DECIMAL(3,2) DEFAULT 5.00,
  `reviewsCount` INT DEFAULT 0,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_courses_org` (`organizationId`),
  INDEX `idx_courses_status` (`status`),
  INDEX `idx_courses_deleted` (`deletedAt`),
  FOREIGN KEY (`instructorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `modules` (
  `id` VARCHAR(36) PRIMARY KEY,
  `courseId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `order` INT NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lessons` (
  `id` VARCHAR(36) PRIMARY KEY,
  `moduleId` VARCHAR(36) NOT NULL,
  `courseId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('video','pdf','image','text','coding') NOT NULL,
  `content` TEXT NULL,
  `videoUrl` TEXT NULL,
  `fileUrl` TEXT NULL,
  `materialTitle` VARCHAR(255) NULL,
  `materialUrl` TEXT NULL,
  `codingPrompt` JSON NULL,
  `order` INT NOT NULL,
  `durationMinutes` INT NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `enrollments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `studentId` VARCHAR(36) NOT NULL,
  `courseId` VARCHAR(36) NOT NULL,
  `enrolledAt` VARCHAR(50) NOT NULL,
  `completedAt` VARCHAR(50) NULL,
  `revokedAt` VARCHAR(50) NULL,
  `revokedBy` VARCHAR(36) NULL,
  `revocationReason` TEXT NULL,
  `assignmentSource` ENUM('individual','bulk','group','learning_path','self','batch') NOT NULL DEFAULT 'self',
  `deletedAt` VARCHAR(50) NULL,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `student_course_uniq` (`studentId`, `courseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `progress` (
  `id` VARCHAR(36) PRIMARY KEY,
  `studentId` VARCHAR(36) NOT NULL,
  `courseId` VARCHAR(36) NOT NULL,
  `lessonId` VARCHAR(36) NOT NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  `completedAt` VARCHAR(50) NULL,
  `timeSpentSeconds` INT DEFAULT 0,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `student_lesson_uniq` (`studentId`, `lessonId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(36) PRIMARY KEY,
  `courseId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NOT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `student_course_review` (`studentId`, `courseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ASSESSMENTS & GRADING
-- ============================================================
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `courseId` VARCHAR(36) NULL,
  `moduleId` VARCHAR(36) NULL,
  `lessonId` VARCHAR(36) NULL,
  `learningPathId` VARCHAR(36) NULL,
  `learningPathItemId` VARCHAR(36) NULL,
  `type` ENUM('lesson_practice','course_final','path_practice','path_final','standalone') DEFAULT 'standalone',
  `assessmentType` VARCHAR(50) NOT NULL DEFAULT 'practice_test',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `shortDescription` TEXT NULL,
  `instructions` TEXT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `difficulty` VARCHAR(50) NOT NULL DEFAULT 'medium',
  `durationMinutes` INT NOT NULL,
  `passingScore` INT NOT NULL,
  `totalPoints` INT NOT NULL,
  `questionsCount` INT NOT NULL,
  `maxAttempts` INT NOT NULL DEFAULT 1,
  `questionNavigation` ENUM('free','sequential') DEFAULT 'free',
  `randomizeQuestions` BOOLEAN DEFAULT FALSE,
  `randomizeOptions` BOOLEAN DEFAULT FALSE,
  `revealAnswers` BOOLEAN DEFAULT TRUE,
  `proctoringConfig` JSON NULL,
  `authorId` VARCHAR(36) NULL,
  `authorName` VARCHAR(255) NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NULL,
  `status` ENUM('published','draft','archived') DEFAULT 'draft',
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_assessments_org` (`organizationId`),
  INDEX `idx_assessments_course` (`courseId`),
  INDEX `idx_assessments_status` (`status`),
  INDEX `idx_assessments_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `questions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `assessmentId` VARCHAR(36) NOT NULL,
  `type` ENUM('mcq_single','mcq_multi','true_false','fill_blanks','subjective') NOT NULL,
  `questionText` TEXT NOT NULL,
  `options` JSON NULL,
  `correctAnswers` JSON NOT NULL,
  `explanation` TEXT NULL,
  `points` INT NOT NULL,
  `negativePoints` INT DEFAULT 0,
  `difficulty` VARCHAR(50) DEFAULT 'medium',
  `order` INT DEFAULT 1,
  `deletedAt` VARCHAR(50) NULL,
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `assessment_assignments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `assessmentId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `assignedBy` VARCHAR(36) NOT NULL,
  `assignedAt` VARCHAR(50) NOT NULL,
  `dueDate` VARCHAR(50) NULL,
  `status` ENUM('assigned','not_started','in_progress','completed','expired','revoked') DEFAULT 'assigned',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `student_assessment_uniq` (`assessmentId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `assessment_attempts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `assessmentId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `attemptNumber` INT NOT NULL DEFAULT 1,
  `startedAt` VARCHAR(50) NOT NULL,
  `expiresAt` VARCHAR(50) NOT NULL,
  `submittedAt` VARCHAR(50) NULL,
  `timeTakenSeconds` INT NOT NULL DEFAULT 0,
  `status` ENUM('in_progress','submitted','timed_out','abandoned') NOT NULL DEFAULT 'in_progress',
  `questionOrder` JSON NULL,
  `answers` JSON NULL,
  `proctoringEvents` JSON NULL,
  `score` INT NULL,
  `totalPoints` INT NULL,
  `percentage` DECIMAL(5,2) NULL,
  `passed` BOOLEAN NULL,
  `correctCount` INT NOT NULL DEFAULT 0,
  `incorrectCount` INT NOT NULL DEFAULT 0,
  `unansweredCount` INT NOT NULL DEFAULT 0,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_attempts_assessment_student` (`assessmentId`, `studentId`),
  INDEX `idx_attempts_status` (`status`),
  INDEX `idx_attempts_org` (`organizationId`),
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `submissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `assessmentId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `answers` JSON NOT NULL,
  `score` INT NOT NULL,
  `totalPoints` INT NOT NULL,
  `passed` BOOLEAN NOT NULL,
  `submittedAt` VARCHAR(50) NOT NULL,
  `timeTakenSeconds` INT NOT NULL,
  `attemptId` VARCHAR(36) NULL,
  `attemptNumber` INT NULL DEFAULT 1,
  `correctCount` INT NOT NULL DEFAULT 0,
  `incorrectCount` INT NOT NULL DEFAULT 0,
  `unansweredCount` INT NOT NULL DEFAULT 0,
  `percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- LEARNING PATHS
-- ============================================================
CREATE TABLE IF NOT EXISTS `learning_paths` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `shortDescription` TEXT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `difficulty` VARCHAR(50) DEFAULT 'Beginner',
  `thumbnail` TEXT NULL,
  `estimatedDuration` VARCHAR(50) NULL,
  `requirements` JSON NULL,
  `learningObjectives` JSON NULL,
  `status` ENUM('draft','published','archived') DEFAULT 'draft',
  `authorId` VARCHAR(36) NOT NULL,
  `authorName` VARCHAR(255) NOT NULL,
  `finalAssessmentId` VARCHAR(36) NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_lp_org` (`organizationId`),
  INDEX `idx_lp_status` (`status`),
  INDEX `idx_lp_deleted` (`deletedAt`),
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `learning_path_sections` (
  `id` VARCHAR(36) PRIMARY KEY,
  `learningPathId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `order` INT NOT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `learning_path_items` (
  `id` VARCHAR(36) PRIMARY KEY,
  `sectionId` VARCHAR(36) NOT NULL,
  `learningPathId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `type` ENUM('text','video','pdf','assessment') NOT NULL,
  `order` INT NOT NULL,
  `durationMinutes` INT NOT NULL DEFAULT 10,
  `isRequired` BOOLEAN DEFAULT TRUE,
  `content` LONGTEXT NULL,
  `videoSource` ENUM('youtube','vimeo','upload') NULL,
  `videoUrl` TEXT NULL,
  `fileUrl` TEXT NULL,
  `fileName` VARCHAR(255) NULL,
  `assessmentId` VARCHAR(36) NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`sectionId`) REFERENCES `learning_path_sections`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `learning_path_assignments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `learningPathId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `assignedBy` VARCHAR(36) NOT NULL,
  `assignedAt` VARCHAR(50) NOT NULL,
  `completedAt` VARCHAR(50) NULL,
  `deletedAt` VARCHAR(50) NULL,
  FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  UNIQUE KEY `student_path_uniq` (`learningPathId`, `studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `learning_path_progress` (
  `id` VARCHAR(36) PRIMARY KEY,
  `learningPathId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `itemId` VARCHAR(36) NOT NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  `completedAt` VARCHAR(50) NULL,
  `timeSpentSeconds` INT DEFAULT 0,
  FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`itemId`) REFERENCES `learning_path_items`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `student_path_item_uniq` (`studentId`, `itemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CODING CHALLENGES & PLAYGROUND
-- ============================================================
CREATE TABLE IF NOT EXISTS `coding_chapters` (
  `id` VARCHAR(100) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(50) NULL,
  `orderIndex` INT NOT NULL DEFAULT 1,
  `createdAt` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `coding_topics` (
  `id` VARCHAR(100) PRIMARY KEY,
  `chapterId` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `description` TEXT NULL,
  `orderIndex` INT NOT NULL DEFAULT 1,
  `createdAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`chapterId`) REFERENCES `coding_chapters`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `coding_challenges` (
  `id` VARCHAR(100) PRIMARY KEY,
  `chapterId` VARCHAR(100) NULL,
  `topicId` VARCHAR(100) NULL,
  `orderIndex` INT NOT NULL DEFAULT 1,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE,
  `description` TEXT NOT NULL,
  `difficulty` ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `challengeType` ENUM('programming','web') NOT NULL DEFAULT 'programming',
  `supportedLanguages` JSON NOT NULL,
  `starterCode` JSON NOT NULL,
  `htmlStarterCode` TEXT NULL,
  `cssStarterCode` TEXT NULL,
  `javascriptStarterCode` TEXT NULL,
  `inputFormat` TEXT NULL,
  `outputFormat` TEXT NULL,
  `constraints` TEXT NULL,
  `examples` JSON NULL,
  `publicTestCases` JSON NOT NULL,
  `privateTestCases` JSON NOT NULL,
  `hints` JSON NULL,
  `solutionExplanation` TEXT NULL,
  `timeLimit` INT NOT NULL DEFAULT 3000,
  `memoryLimit` INT NOT NULL DEFAULT 256,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `coding_saved_code` (
  `id` VARCHAR(100) PRIMARY KEY,
  `studentId` VARCHAR(36) NOT NULL,
  `challengeId` VARCHAR(100) NOT NULL,
  `language` VARCHAR(50) NOT NULL,
  `code` TEXT NULL,
  `htmlCode` TEXT NULL,
  `cssCode` TEXT NULL,
  `jsCode` TEXT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_student_challenge_lang` (`studentId`, `challengeId`, `language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `coding_submissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `studentId` VARCHAR(36) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `problemId` VARCHAR(100) NOT NULL,
  `language` VARCHAR(50) NOT NULL,
  `code` TEXT NOT NULL,
  `status` ENUM('passed','failed','error') NOT NULL,
  `output` TEXT NULL,
  `passedCount` INT NOT NULL,
  `totalCount` INT NOT NULL,
  `submittedAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_playground_programs` (
  `id` VARCHAR(100) PRIMARY KEY,
  `studentId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `language` VARCHAR(50) NOT NULL,
  `code` TEXT NOT NULL,
  `input` TEXT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- BLOGS & COMMUNITY
-- ============================================================
CREATE TABLE IF NOT EXISTS `blogs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `summary` TEXT NOT NULL,
  `coverImage` TEXT NULL,
  `authorId` VARCHAR(36) NOT NULL,
  `authorName` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `tags` JSON NULL,
  `likesCount` INT DEFAULT 0,
  `bookmarksCount` INT DEFAULT 0,
  `status` ENUM('published','draft') DEFAULT 'draft',
  `createdAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `comments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `blogId` VARCHAR(36) NOT NULL,
  `authorId` VARCHAR(36) NOT NULL,
  `authorName` VARCHAR(255) NOT NULL,
  `authorRole` ENUM('student','trainer','admin','super_admin','manager') NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  FOREIGN KEY (`blogId`) REFERENCES `blogs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- GROUPS & DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `groups` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_groups_org` (`organizationId`),
  INDEX `idx_groups_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `group_members` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `groupId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `addedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_group_members_group` (`groupId`),
  INDEX `idx_group_members_user` (`userId`),
  UNIQUE KEY `group_user_uniq` (`groupId`, `userId`),
  FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `managerId` VARCHAR(36) NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_dept_org` (`organizationId`),
  INDEX `idx_dept_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `department_members` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `departmentId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'member',
  `addedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_dm_dept` (`departmentId`),
  INDEX `idx_dm_user` (`userId`),
  UNIQUE KEY `dept_user_uniq` (`departmentId`, `userId`),
  FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cohorts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `startDate` VARCHAR(50) NULL,
  `endDate` VARCHAR(50) NULL,
  `status` ENUM('active','inactive','completed') NOT NULL DEFAULT 'active',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_cohort_org` (`organizationId`),
  INDEX `idx_cohort_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cohort_members` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `cohortId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `addedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_cm_cohort` (`cohortId`),
  INDEX `idx_cm_user` (`userId`),
  UNIQUE KEY `cohort_user_uniq` (`cohortId`, `userId`),
  FOREIGN KEY (`cohortId`) REFERENCES `cohorts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS `certificate_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `style` ENUM('classic_gold','modern_emerald','executive_navy','tech_violet') NOT NULL DEFAULT 'classic_gold',
  `primaryColor` VARCHAR(50) NOT NULL DEFAULT '#1e3a8a',
  `accentColor` VARCHAR(50) NOT NULL DEFAULT '#d97706',
  `badgeIcon` VARCHAR(50) NOT NULL DEFAULT 'award',
  `borderStyle` VARCHAR(50) NOT NULL DEFAULT 'ornate',
  `defaultSignatoryName` VARCHAR(255) NOT NULL DEFAULT 'Dr. M. R. Tech',
  `defaultSignatoryTitle` VARCHAR(255) NOT NULL DEFAULT 'Director of Academic Affairs',
  `organizationName` VARCHAR(255) NOT NULL DEFAULT 'MRTECH Learning Academy',
  `isDefault` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_templates_org` (`organizationId`),
  INDEX `idx_templates_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `certificates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `certificateNumber` VARCHAR(100) NOT NULL,
  `verificationCode` VARCHAR(64) NOT NULL,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `studentId` VARCHAR(36) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `studentEmail` VARCHAR(255) NOT NULL,
  `type` ENUM('course','learning_path') NOT NULL DEFAULT 'course',
  `courseId` VARCHAR(36) NULL,
  `learningPathId` VARCHAR(36) NULL,
  `title` VARCHAR(255) NOT NULL,
  `certificateTitle` VARCHAR(255) NOT NULL DEFAULT 'Certificate of Completion',
  `templateId` VARCHAR(36) NULL,
  `templateStyle` VARCHAR(50) NOT NULL DEFAULT 'classic_gold',
  `scorePercentage` DECIMAL(5,2) NULL,
  `issuedAt` VARCHAR(50) NOT NULL,
  `expiresAt` VARCHAR(50) NULL,
  `status` ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
  `signatoryName` VARCHAR(255) NOT NULL DEFAULT 'Dr. M. R. Tech',
  `signatoryTitle` VARCHAR(255) NOT NULL DEFAULT 'Director of Academic Affairs',
  `organizationName` VARCHAR(255) NOT NULL DEFAULT 'MRTECH Learning Academy',
  `revokedAt` VARCHAR(50) NULL,
  `revokedBy` VARCHAR(36) NULL,
  `revocationReason` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_cert_student` (`studentId`),
  INDEX `idx_cert_org` (`organizationId`),
  INDEX `idx_cert_status` (`status`),
  INDEX `idx_cert_deleted` (`deletedAt`),
  UNIQUE KEY `uniq_cert_number` (`certificateNumber`),
  UNIQUE KEY `uniq_cert_code` (`verificationCode`),
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NOTIFICATIONS & EMAIL
-- ============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `userId` VARCHAR(36) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `data` TEXT NULL,
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  `readAt` VARCHAR(50) NULL,
  `channel` VARCHAR(20) NOT NULL DEFAULT 'in_app',
  `deliveryStatus` VARCHAR(20) NOT NULL DEFAULT 'delivered',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_notif_user_read` (`userId`, `read`, `deletedAt`),
  INDEX `idx_notif_user_created` (`userId`, `createdAt`),
  INDEX `idx_notif_org` (`organizationId`),
  INDEX `idx_notif_type` (`type`),
  INDEX `idx_notif_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `email_queue` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `recipientEmail` VARCHAR(255) NOT NULL,
  `recipientName` VARCHAR(255) NULL,
  `userId` VARCHAR(36) NULL,
  `subject` VARCHAR(255) NOT NULL,
  `bodyText` TEXT NOT NULL,
  `bodyHtml` MEDIUMTEXT NOT NULL,
  `notificationType` VARCHAR(50) NOT NULL,
  `status` ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
  `attempts` INT NOT NULL DEFAULT 0,
  `maxAttempts` INT NOT NULL DEFAULT 3,
  `lastError` TEXT NULL,
  `scheduledAt` VARCHAR(50) NOT NULL,
  `sentAt` VARCHAR(50) NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_eq_status_sched` (`status`, `scheduledAt`),
  INDEX `idx_eq_user` (`userId`),
  INDEX `idx_eq_email` (`recipientEmail`),
  INDEX `idx_eq_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` VARCHAR(36) PRIMARY KEY,
  `userId` VARCHAR(36) NOT NULL UNIQUE,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `emailNotifications` TINYINT(1) NOT NULL DEFAULT 1,
  `inAppNotifications` TINYINT(1) NOT NULL DEFAULT 1,
  `courseAssigned` TINYINT(1) NOT NULL DEFAULT 1,
  `learningPathAssigned` TINYINT(1) NOT NULL DEFAULT 1,
  `assessmentAssigned` TINYINT(1) NOT NULL DEFAULT 1,
  `dueDateReminders` TINYINT(1) NOT NULL DEFAULT 1,
  `overdueAlerts` TINYINT(1) NOT NULL DEFAULT 1,
  `assessmentResults` TINYINT(1) NOT NULL DEFAULT 1,
  `certificateAlerts` TINYINT(1) NOT NULL DEFAULT 1,
  `coursePublished` TINYINT(1) NOT NULL DEFAULT 1,
  `announcements` TINYINT(1) NOT NULL DEFAULT 1,
  `reminderDaysBefore` VARCHAR(50) NOT NULL DEFAULT '7,3,1',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_np_user` (`userId`),
  INDEX `idx_np_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `reminder_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `userId` VARCHAR(36) NOT NULL,
  `entityType` VARCHAR(50) NOT NULL,
  `entityId` VARCHAR(36) NOT NULL,
  `reminderType` VARCHAR(50) NOT NULL,
  `dedupKey` VARCHAR(255) NOT NULL UNIQUE,
  `sentAt` VARCHAR(50) NOT NULL,
  INDEX `idx_rl_dedup` (`dedupKey`),
  INDEX `idx_rl_user_entity` (`userId`, `entityType`, `entityId`),
  INDEX `idx_rl_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `type` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `inAppTitleTemplate` VARCHAR(255) NOT NULL,
  `inAppBodyTemplate` TEXT NOT NULL,
  `emailSubjectTemplate` VARCHAR(255) NOT NULL,
  `emailBodyTemplate` MEDIUMTEXT NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_nt_type` (`type`),
  INDEX `idx_nt_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- GAMIFICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS `gamification_points` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `userId` VARCHAR(36) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `entityType` VARCHAR(50) NULL,
  `entityId` VARCHAR(36) NULL,
  `description` TEXT NULL,
  `createdAt` VARCHAR(50) NOT NULL,
  INDEX `idx_gp_user` (`userId`),
  INDEX `idx_gp_org` (`organizationId`),
  INDEX `idx_gp_action` (`action`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `gamification_badges` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(100) NOT NULL DEFAULT 'award',
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `criteria` JSON NULL,
  `pointsRequired` INT NOT NULL DEFAULT 0,
  `isAutoAwarded` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_gb_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `gamification_user_badges` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `userId` VARCHAR(36) NOT NULL,
  `badgeId` VARCHAR(36) NOT NULL,
  `awardedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_gub_user` (`userId`),
  INDEX `idx_gub_badge` (`badgeId`),
  UNIQUE KEY `user_badge_uniq` (`userId`, `badgeId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`badgeId`) REFERENCES `gamification_badges`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `gamification_streaks` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `userId` VARCHAR(36) NOT NULL,
  `currentStreak` INT NOT NULL DEFAULT 0,
  `longestStreak` INT NOT NULL DEFAULT 0,
  `lastActiveDate` VARCHAR(50) NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  UNIQUE KEY `user_streak_uniq` (`userId`),
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- BATCH MANAGEMENT (INSTITUTIONS + BATCHES)
-- ============================================================
CREATE TABLE IF NOT EXISTS `institutions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `contactEmail` VARCHAR(255) NULL,
  `contactPhone` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `academicYears` JSON NULL,
  `status` ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_inst_org` (`organizationId`),
  INDEX `idx_inst_code` (`code`),
  INDEX `idx_inst_status` (`status`),
  INDEX `idx_inst_deleted` (`deletedAt`),
  UNIQUE KEY `inst_code_uniq` (`organizationId`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `batches` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `institutionId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `academicYear` VARCHAR(50) NOT NULL,
  `courseId` VARCHAR(36) NULL,
  `startDate` VARCHAR(50) NULL,
  `endDate` VARCHAR(50) NULL,
  `maxStudents` INT NULL DEFAULT NULL,
  `description` TEXT NULL,
  `status` ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  `deletedAt` VARCHAR(50) NULL,
  INDEX `idx_batches_org` (`organizationId`),
  INDEX `idx_batches_inst` (`institutionId`),
  INDEX `idx_batches_year` (`academicYear`),
  INDEX `idx_batches_status` (`status`),
  INDEX `idx_batches_deleted` (`deletedAt`),
  UNIQUE KEY `batch_inst_code_uniq` (`institutionId`, `code`),
  FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `batch_students` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `batchId` VARCHAR(36) NOT NULL,
  `studentId` VARCHAR(36) NOT NULL,
  `enrolledAt` VARCHAR(50) NOT NULL,
  `status` ENUM('active','inactive','completed','dropped') NOT NULL DEFAULT 'active',
  `createdAt` VARCHAR(50) NOT NULL,
  `updatedAt` VARCHAR(50) NOT NULL,
  INDEX `idx_bs_batch` (`batchId`),
  INDEX `idx_bs_student` (`studentId`),
  INDEX `idx_bs_status` (`status`),
  UNIQUE KEY `batch_student_uniq` (`batchId`, `studentId`),
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `batch_courses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `batchId` VARCHAR(36) NOT NULL,
  `courseId` VARCHAR(36) NOT NULL,
  `assignedAt` VARCHAR(50) NOT NULL,
  `assignedBy` VARCHAR(36) NULL,
  `status` ENUM('active','revoked') NOT NULL DEFAULT 'active',
  INDEX `idx_bc_batch` (`batchId`),
  INDEX `idx_bc_course` (`courseId`),
  INDEX `idx_bc_status` (`status`),
  UNIQUE KEY `batch_course_uniq` (`batchId`, `courseId`),
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `batch_assessments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `batchId` VARCHAR(36) NOT NULL,
  `assessmentId` VARCHAR(36) NOT NULL,
  `assignedAt` VARCHAR(50) NOT NULL,
  `assignedBy` VARCHAR(36) NULL,
  `status` ENUM('active','revoked') NOT NULL DEFAULT 'active',
  INDEX `idx_ba_batch` (`batchId`),
  INDEX `idx_ba_ass` (`assessmentId`),
  INDEX `idx_ba_status` (`status`),
  UNIQUE KEY `batch_ass_uniq` (`batchId`, `assessmentId`),
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `batch_learning_paths` (
  `id` VARCHAR(36) PRIMARY KEY,
  `organizationId` VARCHAR(36) NOT NULL DEFAULT 'org-default',
  `batchId` VARCHAR(36) NOT NULL,
  `learningPathId` VARCHAR(36) NOT NULL,
  `assignedAt` VARCHAR(50) NOT NULL,
  `assignedBy` VARCHAR(36) NULL,
  `dueDate` VARCHAR(50) NULL,
  `status` ENUM('active','revoked') NOT NULL DEFAULT 'active',
  INDEX `idx_blp_batch` (`batchId`),
  INDEX `idx_blp_lp` (`learningPathId`),
  UNIQUE KEY `batch_lp_uniq` (`batchId`, `learningPathId`),
  FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) PRIMARY KEY,
  `organizationId` VARCHAR(36) DEFAULT 'org-default',
  `userId` VARCHAR(64) NULL,
  `userEmail` VARCHAR(255) NULL,
  `userRole` VARCHAR(32) NULL,
  `action` VARCHAR(64) NOT NULL,
  `resourceType` VARCHAR(64) NOT NULL,
  `resourceId` VARCHAR(64) NULL,
  `details` JSON NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` VARCHAR(255) NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'success',
  `createdAt` VARCHAR(32) NOT NULL,
  INDEX `idx_audit_user` (`userId`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`createdAt`),
  INDEX `idx_audit_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- ============================================================
--   DUMMY DATA — Realistic seed for development & testing
-- ============================================================
-- ============================================================

-- Timestamps used throughout
SET @now = '2026-11-16T08:00:00.000Z';
SET @past1 = '2026-01-10T00:00:00.000Z';
SET @past2 = '2026-02-01T00:00:00.000Z';
SET @past3 = '2026-03-15T00:00:00.000Z';
SET @past4 = '2026-06-01T00:00:00.000Z';
SET @past5 = '2026-08-20T00:00:00.000Z';
SET @past6 = '2025-10-01T00:00:00.000Z';
SET @past7 = '2025-11-15T00:00:00.000Z';

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
INSERT INTO `organizations` (`id`, `name`, `slug`, `domain`, `logoUrl`, `settings`, `status`, `createdAt`, `updatedAt`) VALUES
  ('org-default', 'Default Institution', 'default', NULL, NULL, '{"theme":"default","maxUsersPerOrg":500}', 'active', @past6, @now),
  ('org-acme-univ', 'ACME University', 'acme-university', 'acme-university.edu', NULL, '{"theme":"university-blue","maxUsersPerOrg":2000}', 'active', @past3, @now),
  ('org-techcorp', 'TechCorp Training', 'techcorp', 'training.techcorp.io', NULL, '{"theme":"corporate-dark","maxUsersPerOrg":1000}', 'active', @past4, @now);

-- ============================================================
-- USERS
-- Password hashes are SHA-256 of simple passwords for dev only:
--   admin@lms.com      -> "admin123"     -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
--   trainer@lms.com    -> "trainer123"   -> 5b3d264e4cdc2c39ca6708b3e1e21f082722be12e63ee21484bdbe15735ab066
--   student@lms.com    -> "student123"   -> 703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b
--   Others use: "password123"            -> ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f (bcrypt would differ, these are placeholder hashes)
-- ============================================================
INSERT INTO `users` (`id`, `organizationId`, `name`, `email`, `role`, `passwordHash`, `status`, `phoneNumber`, `location`, `jobTitle`, `createdAt`, `updatedAt`) VALUES
  -- Super Admin
  ('super-admin-1', 'org-default', 'Platform Owner', 'superadmin@mrtechlms.com', 'super_admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'active', '+91-9000000001', 'Hyderabad, India', 'Platform Administrator', @past6, @now),

  -- Default Org Users
  ('admin-1', 'org-default', 'System Administrator', 'admin@lms.com', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'active', '+91-9000000002', 'Hyderabad, India', 'Admin Lead', @past6, @now),
  ('trainer-1', 'org-default', 'Dr. Sarah Mitchell', 'trainer@lms.com', 'trainer', '5b3d264e4cdc2c39ca6708b3e1e21f082722be12e63ee21484bdbe15735ab066', 'active', '+91-9000000003', 'Bangalore, India', 'Senior Instructor', @past7, @now),
  ('manager-1', 'org-default', 'Rajesh Kumar', 'manager@lms.com', 'manager', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+91-9000000004', 'Chennai, India', 'Department Head', @past3, @now),
  ('student-1', 'org-default', 'Alex Johnson', 'student@lms.com', 'student', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'active', '+91-9000000005', 'Mumbai, India', NULL, @past1, @now),
  ('student-2', 'org-default', 'Priya Sharma', 'priya@lms.com', 'student', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+91-9000000006', 'Delhi, India', NULL, @past2, @now),
  ('student-3', 'org-default', 'James Wilson', 'james@lms.com', 'student', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+1-5551234567', 'New York, USA', NULL, @past3, @now),
  ('student-4', 'org-default', 'Aisha Patel', 'aisha@lms.com', 'student', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+91-9000000007', 'Pune, India', NULL, @past4, @now),
  ('student-5', 'org-default', 'Carlos Martinez', 'carlos@lms.com', 'student', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+1-5559876543', 'San Francisco, USA', NULL, @past5, @now),

  -- ACME University Users
  ('acme-admin-1', 'org-acme-univ', 'Prof. Robert Chen', 'admin@acme-university.edu', 'admin', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+1-5550001111', 'Boston, USA', 'Dean of Engineering', @past3, @now),
  ('acme-student-1', 'org-acme-univ', 'Emily Davis', 'emily@acme-university.edu', 'student', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+1-5550002222', 'Boston, USA', NULL, @past4, @now),
  ('acme-student-2', 'org-acme-univ', 'Michael Brown', 'michael@acme-university.edu', 'student', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'active', '+1-5550003333', 'Cambridge, USA', NULL, @past4, @now);

-- ============================================================
-- COURSES
-- ============================================================
INSERT INTO `courses` (`id`, `organizationId`, `title`, `description`, `shortDescription`, `difficulty`, `thumbnail`, `instructorId`, `instructorName`, `category`, `requirements`, `skillsCovered`, `status`, `isFeatured`, `rating`, `reviewsCount`, `createdAt`, `updatedAt`) VALUES
  ('course-1', 'org-default', 'Introduction to Full-Stack Web Development',
   'Learn HTML, CSS, JavaScript, React, Node.js, and Express to build scalable full-stack web applications from scratch.',
   'Master full-stack development with modern tools and frameworks.',
   'Beginner',
   'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
   'trainer-1', 'Dr. Sarah Mitchell', 'Web Development',
   '["Basic understanding of computers","No programming experience required"]',
   '["Modern React (v19)","Express.js REST APIs","Tailwind CSS Layouts","TypeScript Type Safety"]',
   'published', FALSE, 4.80, 150, @past1, @now),

  ('course-2', 'org-default', 'Mastering Python for AI and Data Science',
   'Go from absolute beginner to master in Python programming, covering data analysis and integrating Gemini AI models.',
   'Python from zero to hero with AI integration.',
   'Intermediate',
   'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
   'trainer-1', 'Dr. Sarah Mitchell', 'Artificial Intelligence',
   '["A working computer with Python installed"]',
   '["Python OOP","Data Manipulation with Pandas","Gemini AI SDK Integration","Statistical Analysis"]',
   'published', TRUE, 4.60, 75, @past2, @now),

  ('course-3', 'org-default', 'Database Design & SQL Mastery',
   'Learn relational database design, SQL queries, normalization, indexing, and performance optimization with MySQL.',
   'Master SQL and database architecture.',
   'Intermediate',
   'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80',
   'admin-1', 'System Administrator', 'Database',
   '["Basic programming knowledge"]',
   '["SQL Queries","Database Normalization","Indexing Strategies","Query Optimization"]',
   'published', FALSE, 4.70, 42, @past3, @now),

  ('course-4', 'org-acme-univ', 'Advanced Algorithms & Data Structures',
   'Deep dive into algorithms, complexity analysis, trees, graphs, dynamic programming, and competitive coding strategies.',
   'Ace technical interviews with advanced DSA.',
   'Advanced',
   'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=600&auto=format&fit=crop&q=80',
   'acme-admin-1', 'Prof. Robert Chen', 'Computer Science',
   '["Intermediate programming skills","Basic data structures knowledge"]',
   '["Graph Algorithms","Dynamic Programming","Tree Traversals","Complexity Analysis"]',
   'published', TRUE, 4.90, 210, @past4, @now),

  ('course-python-foundations-2026', 'org-default', 'Python Programming Foundations: From First Steps to Practical Projects',
   'A beginner-friendly, hands-on course covering Python data types, decisions, loops, collections, functions, files, errors, classes, testing, and a command-line expense tracker project.',
   'Learn Python from the ground up and build useful command-line programs along the way.',
   'Beginner',
   'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
   'trainer-1', 'Dr. Sarah Mitchell', 'Programming',
   '["A computer with Python 3 installed","No prior programming experience required"]',
   '["Python syntax and data types","Conditionals and loops","Lists and dictionaries","Functions and modules","Files and exceptions","Object-oriented programming","Testing and debugging"]',
   'published', FALSE, 0.00, 0, @now, @now);

-- ============================================================
-- MODULES
-- ============================================================
INSERT INTO `modules` (`id`, `courseId`, `title`, `description`, `order`) VALUES
  ('mod-1', 'course-1', 'Module 1: JavaScript & Web Foundations', 'Learn the fundamentals of web development and JavaScript ES6+.', 1),
  ('mod-2', 'course-1', 'Module 2: Building UIs with Modern React', 'Create dynamic user interfaces with React 19 and TypeScript.', 2),
  ('mod-3', 'course-2', 'Module 1: Python Core Foundations', 'Variables, data types, control flow, and functions in Python.', 1),
  ('mod-4', 'course-2', 'Module 2: Real-World Coding & AI Solutions', 'Build practical applications integrating AI and data science.', 2),
  ('mod-5', 'course-3', 'Module 1: SQL Fundamentals', 'SELECT, WHERE, JOINs, GROUP BY, and subqueries.', 1),
  ('mod-6', 'course-3', 'Module 2: Advanced Database Design', 'Normalization, indexing, transactions, and optimization.', 2),
  ('mod-7', 'course-4', 'Module 1: Foundations of Complexity', 'Big-O notation, recursion, and sorting algorithms.', 1),
  ('mod-8', 'course-4', 'Module 2: Graphs & Dynamic Programming', 'BFS, DFS, shortest paths, memoization, and tabulation.', 2),
  ('mod-python-foundations-01', 'course-python-foundations-2026', 'Module 1: Getting Started with Python', 'Set up Python, run your first program, and work with variables and basic expressions.', 1),
  ('mod-python-foundations-02', 'course-python-foundations-2026', 'Module 2: Decisions, Loops, and Collections', 'Control program flow and organize related data with lists and dictionaries.', 2),
  ('mod-python-foundations-03', 'course-python-foundations-2026', 'Module 3: Functions, Files, and Errors', 'Write reusable functions and work safely with files and common errors.', 3),
  ('mod-python-foundations-04', 'course-python-foundations-2026', 'Module 4: Classes and Your First Project', 'Learn classes, testing, and build a command-line expense tracker.', 4);

-- ============================================================
-- LESSONS
-- ============================================================
INSERT INTO `lessons` (`id`, `moduleId`, `courseId`, `title`, `type`, `content`, `videoUrl`, `order`, `durationMinutes`) VALUES
  ('les-1', 'mod-1', 'course-1', 'Welcome to Full-Stack Development', 'video', '## Welcome!\nWe start our full-stack engineering journey by exploring the internet structure, clients, and servers.', 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-his-computer-34282-large.mp4', 1, 5),
  ('les-2', 'mod-1', 'course-1', 'Understanding JavaScript ES6+ Features', 'text', '## JavaScript ES6+ Concepts\n\nArrow functions, destructuring, spread/rest operators, and template literals explained.', NULL, 2, 10),
  ('les-3', 'mod-2', 'course-1', 'Creating React Functional Components', 'text', '## React Functional Components\n\nLearn to build reusable UI components with props, state, and hooks in TypeScript.', NULL, 1, 12),
  ('les-4', 'mod-3', 'course-2', 'Python Variables and Control Flow', 'text', '## Python Variable Allocation & Logical Paths\n\nDeclaring variables, if/elif/else, for loops, and while loops.', NULL, 1, 15),
  ('les-5', 'mod-4', 'course-2', 'Hands-on Coding Practice: Python Prime Numbers', 'coding', NULL, NULL, 1, 20),
  ('les-6', 'mod-5', 'course-3', 'Your First SELECT Queries', 'text', '## SELECT Fundamentals\n\nLearn to query tables, filter with WHERE, and sort with ORDER BY.', NULL, 1, 10),
  ('les-7', 'mod-5', 'course-3', 'Mastering JOINs', 'text', '## JOIN Operations\n\nINNER JOIN, LEFT JOIN, RIGHT JOIN, and CROSS JOIN explained with examples.', NULL, 2, 15),
  ('les-8', 'mod-6', 'course-3', 'Database Normalization (1NF to 3NF)', 'text', '## Normalization\n\nEliminate redundancy by organizing tables into normal forms.', NULL, 1, 20),
  ('les-9', 'mod-7', 'course-4', 'Big-O Notation Explained', 'video', '## Understanding Time Complexity\n\nO(1), O(n), O(log n), O(n²) — when and why they matter.', 'https://example.com/videos/big-o.mp4', 1, 18),
  ('les-10', 'mod-8', 'course-4', 'Graph Traversal: BFS and DFS', 'text', '## Graph Algorithms\n\nBreadth-first search vs depth-first search with real-world applications.', NULL, 1, 25),
  ('py-found-lesson-01', 'mod-python-foundations-01', 'course-python-foundations-2026', 'Meet Python and Run Your First Program', 'text', 'Create hello.py, print a message, run it with Python 3, and learn to read syntax errors as useful clues.', NULL, 1, 25),
  ('py-found-lesson-02', 'mod-python-foundations-01', 'course-python-foundations-2026', 'Variables, Values, and Basic Types', 'text', 'Store values in descriptive variables. Practice strings, integers, floats, booleans, assignment, and type().', NULL, 2, 30),
  ('py-found-lesson-03', 'mod-python-foundations-01', 'course-python-foundations-2026', 'Numbers, Strings, and User Input', 'text', 'Use arithmetic operators, input(), numeric conversions, f-strings, and common string methods.', NULL, 3, 30),
  ('py-found-lesson-04', 'mod-python-foundations-02', 'course-python-foundations-2026', 'Make Decisions with if, elif, and else', 'text', 'Use comparison operators and branching logic to make a program choose what to do next.', NULL, 1, 30),
  ('py-found-lesson-05', 'mod-python-foundations-02', 'course-python-foundations-2026', 'Repeat Work with for and while Loops', 'text', 'Use for, range, and while loops. Avoid infinite loops and practice break and continue.', NULL, 2, 35),
  ('py-found-lesson-06', 'mod-python-foundations-02', 'course-python-foundations-2026', 'Lists and Working with Collections', 'text', 'Create ordered lists, access items by index, update collections, and process items with loops.', NULL, 3, 35),
  ('py-found-lesson-07', 'mod-python-foundations-02', 'course-python-foundations-2026', 'Dictionaries and Structured Data', 'text', 'Store labeled key/value pairs, update dictionary entries, and handle optional keys safely.', NULL, 4, 35),
  ('py-found-lesson-08', 'mod-python-foundations-03', 'course-python-foundations-2026', 'Functions: Reuse and Name Your Logic', 'text', 'Define focused functions with parameters and return values, then reuse them across a program.', NULL, 1, 40),
  ('py-found-lesson-09', 'mod-python-foundations-03', 'course-python-foundations-2026', 'Modules, Files, and Safe Input', 'text', 'Organize code into modules, read and write files with with blocks, and handle expected conversion errors.', NULL, 2, 40),
  ('py-found-lesson-10', 'mod-python-foundations-04', 'course-python-foundations-2026', 'Classes and Objects: A Gentle Introduction', 'text', 'Model related values and behavior with a simple class, an initializer, instance attributes, and methods.', NULL, 1, 40),
  ('py-found-lesson-11', 'mod-python-foundations-04', 'course-python-foundations-2026', 'Testing, Debugging, and Clear Code', 'text', 'Check normal and edge cases with assertions, read tracebacks, and debug one small change at a time.', NULL, 2, 35),
  ('py-found-lesson-12', 'mod-python-foundations-04', 'course-python-foundations-2026', 'Capstone: Build an Expense Tracker', 'text', 'Build a command-line expense tracker using lists, dictionaries, functions, input validation, and file storage.', NULL, 3, 60);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
INSERT INTO `enrollments` (`id`, `organizationId`, `studentId`, `courseId`, `enrolledAt`, `assignmentSource`) VALUES
  ('enroll-1', 'org-default', 'student-1', 'course-1', @past1, 'self'),
  ('enroll-2', 'org-default', 'student-1', 'course-2', @past2, 'self'),
  ('enroll-3', 'org-default', 'student-2', 'course-1', @past2, 'individual'),
  ('enroll-4', 'org-default', 'student-2', 'course-3', @past3, 'self'),
  ('enroll-5', 'org-default', 'student-3', 'course-2', @past3, 'self'),
  ('enroll-6', 'org-default', 'student-4', 'course-1', @past4, 'bulk'),
  ('enroll-7', 'org-default', 'student-4', 'course-2', @past4, 'bulk'),
  ('enroll-8', 'org-default', 'student-5', 'course-3', @past5, 'self'),
  ('enroll-9', 'org-acme-univ', 'acme-student-1', 'course-4', @past4, 'individual'),
  ('enroll-10', 'org-acme-univ', 'acme-student-2', 'course-4', @past4, 'individual'),
  ('enroll-python-1', 'org-default', 'student-1', 'course-python-foundations-2026', @now, 'individual');

-- ============================================================
-- PROGRESS (some lessons completed)
-- ============================================================
INSERT INTO `progress` (`id`, `studentId`, `courseId`, `lessonId`, `completed`, `completedAt`, `timeSpentSeconds`) VALUES
  ('prog-1', 'student-1', 'course-1', 'les-1', TRUE, '2026-01-12T10:00:00.000Z', 320),
  ('prog-2', 'student-1', 'course-1', 'les-2', TRUE, '2026-01-13T14:30:00.000Z', 650),
  ('prog-3', 'student-1', 'course-1', 'les-3', FALSE, NULL, 180),
  ('prog-4', 'student-2', 'course-1', 'les-1', TRUE, '2026-02-05T09:00:00.000Z', 290),
  ('prog-5', 'student-1', 'course-2', 'les-4', TRUE, '2026-02-10T11:00:00.000Z', 900),
  ('prog-6', 'acme-student-1', 'course-4', 'les-9', TRUE, '2026-06-10T16:00:00.000Z', 1080);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
INSERT INTO `assessments` (`id`, `organizationId`, `courseId`, `moduleId`, `type`, `title`, `description`, `category`, `difficulty`, `durationMinutes`, `passingScore`, `totalPoints`, `questionsCount`, `maxAttempts`, `revealAnswers`, `authorId`, `authorName`, `status`, `createdAt`, `updatedAt`) VALUES
  ('assess-1', 'org-default', 'course-1', 'mod-1', 'course_final', 'Foundational Web and JS Assessment',
   'Test your understanding of HTML, CSS, JavaScript structures, array operations, and functional programming.',
   'Web Development', 'medium', 15, 70, 20, 4, 2, TRUE, 'trainer-1', 'Dr. Sarah Mitchell', 'published', @past1, @now),

  ('assess-2', 'org-default', 'course-2', 'mod-3', 'lesson_practice', 'Python Basics Quiz',
   'Quick quiz covering Python fundamentals: variables, data types, control flow, and functions.',
   'Programming', 'easy', 10, 60, 15, 3, 3, TRUE, 'trainer-1', 'Dr. Sarah Mitchell', 'published', @past2, @now),

  ('assess-3', 'org-default', 'course-3', 'mod-5', 'course_final', 'SQL Mastery Final Exam',
   'Comprehensive test covering SELECT, JOINs, subqueries, normalization, and query optimization.',
   'Database', 'hard', 30, 75, 50, 10, 1, FALSE, 'admin-1', 'System Administrator', 'published', @past3, @now),

  ('assess-4', 'org-default', NULL, NULL, 'standalone', 'General Programming Aptitude Test',
   'Standalone assessment testing general programming knowledge across languages and paradigms.',
   'General', 'medium', 20, 65, 30, 6, 2, TRUE, 'admin-1', 'System Administrator', 'published', @past4, @now),

  ('assess-5', 'org-acme-univ', 'course-4', 'mod-7', 'course_final', 'Algorithms & Complexity Final',
   'Final exam covering Big-O, sorting, graph algorithms, and dynamic programming.',
   'Computer Science', 'hard', 45, 70, 100, 20, 1, FALSE, 'acme-admin-1', 'Prof. Robert Chen', 'published', @past4, @now);

-- ============================================================
-- QUESTIONS (samples for assess-1 and assess-2)
-- ============================================================
INSERT INTO `questions` (`id`, `assessmentId`, `type`, `questionText`, `options`, `correctAnswers`, `explanation`, `points`, `negativePoints`, `difficulty`, `order`) VALUES
  ('q-1', 'assess-1', 'mcq_single', 'Which JavaScript array method creates a new array with elements that pass a test?', '["map()","filter()","reduce()","forEach()"]', '["filter()"]', 'filter() returns a new array containing only the elements for which the callback returns true.', 5, 0, 'easy', 1),
  ('q-2', 'assess-1', 'true_false', 'Arrow functions in JavaScript bind their own "this" value dynamically.', '["True","False"]', '["False"]', 'Arrow functions lexically bind "this" from the enclosing scope, they do not have their own "this".', 5, 0, 'medium', 2),
  ('q-3', 'assess-1', 'mcq_single', 'What does the CSS property "display: flex" do?', '["Creates a grid layout","Enables flexbox layout","Hides the element","Creates a table layout"]', '["Enables flexbox layout"]', 'display: flex creates a flex container, enabling flexible layout of child items.', 5, 1, 'easy', 3),
  ('q-4', 'assess-1', 'mcq_multi', 'Which of the following are valid React hooks? (Select all)', '["useState","useEffect","useQuery","useContext","useDispatch"]', '["useState","useEffect","useContext"]', 'useState, useEffect, and useContext are built-in React hooks. useQuery and useDispatch come from external libraries.', 5, 0, 'medium', 4),

  ('q-5', 'assess-2', 'mcq_single', 'What is the output of: print(type(3.14))?', '["<class ''int''>","<class ''float''>","<class ''str''>","<class ''double''>"]', '["<class ''float''>"]', 'In Python, 3.14 is a floating-point literal of type float.', 5, 0, 'easy', 1),
  ('q-6', 'assess-2', 'true_false', 'Python lists are immutable.', '["True","False"]', '["False"]', 'Python lists are mutable — you can add, remove, and modify elements after creation.', 5, 0, 'easy', 2),
  ('q-7', 'assess-2', 'fill_blanks', 'To define a function in Python, you use the _____ keyword.', NULL, '["def"]', 'The def keyword is used to define functions in Python.', 5, 0, 'easy', 3),

  ('q-8', 'assess-3', 'mcq_single', 'Which SQL clause is used to filter grouped results?', '["WHERE","HAVING","GROUP BY","ORDER BY"]', '["HAVING"]', 'HAVING filters rows after GROUP BY aggregation, while WHERE filters before.', 5, 1, 'medium', 1),

  ('q-9', 'assess-4', 'mcq_single', 'What is the time complexity of binary search?', '["O(n)","O(log n)","O(n²)","O(1)"]', '["O(log n)"]', 'Binary search halves the search space each iteration, giving O(log n) time complexity.', 5, 0, 'medium', 1),

  ('q-10', 'assess-5', 'mcq_single', 'Which algorithm is used to find the shortest path in an unweighted graph?', '["Dijkstra","Bellman-Ford","BFS","DFS"]', '["BFS"]', 'BFS naturally finds shortest paths in unweighted graphs since it explores level by level.', 5, 1, 'medium', 1);

-- ============================================================
-- ASSESSMENT ASSIGNMENTS
-- ============================================================
INSERT INTO `assessment_assignments` (`id`, `organizationId`, `assessmentId`, `studentId`, `assignedBy`, `assignedAt`, `dueDate`, `status`, `createdAt`, `updatedAt`) VALUES
  ('aa-1', 'org-default', 'assess-1', 'student-1', 'admin-1', @past1, '2026-03-01T00:00:00.000Z', 'completed', @past1, @now),
  ('aa-2', 'org-default', 'assess-1', 'student-2', 'admin-1', @past2, '2026-04-01T00:00:00.000Z', 'assigned', @past2, @now),
  ('aa-3', 'org-default', 'assess-2', 'student-1', 'trainer-1', @past2, '2026-04-15T00:00:00.000Z', 'completed', @past2, @now),
  ('aa-4', 'org-default', 'assess-4', 'student-3', 'admin-1', @past4, '2026-08-01T00:00:00.000Z', 'assigned', @past4, @now),
  ('aa-5', 'org-acme-univ', 'assess-5', 'acme-student-1', 'acme-admin-1', @past4, '2026-07-15T00:00:00.000Z', 'assigned', @past4, @now);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
INSERT INTO `submissions` (`id`, `organizationId`, `assessmentId`, `studentId`, `studentName`, `answers`, `score`, `totalPoints`, `passed`, `submittedAt`, `timeTakenSeconds`, `correctCount`, `incorrectCount`, `unansweredCount`, `percentage`) VALUES
  ('sub-1', 'org-default', 'assess-1', 'student-1', 'Alex Johnson', '{"q-1":"filter()","q-2":"False","q-3":"Enables flexbox layout","q-4":["useState","useEffect","useContext"]}', 20, 20, TRUE, '2026-01-25T14:30:00.000Z', 720, 4, 0, 0, 100.00),
  ('sub-2', 'org-default', 'assess-2', 'student-1', 'Alex Johnson', '{"q-5":"<class ''float''>","q-6":"False","q-7":"def"}', 15, 15, TRUE, '2026-02-15T10:00:00.000Z', 420, 3, 0, 0, 100.00);

-- ============================================================
-- LEARNING PATHS
-- ============================================================
INSERT INTO `learning_paths` (`id`, `organizationId`, `title`, `slug`, `shortDescription`, `description`, `category`, `difficulty`, `estimatedDuration`, `requirements`, `learningObjectives`, `status`, `authorId`, `authorName`, `createdAt`, `updatedAt`) VALUES
  ('lp-1', 'org-default', 'Full-Stack Developer Bootcamp', 'full-stack-bootcamp',
   'Become a job-ready full-stack developer in 12 weeks.',
   'A comprehensive learning path taking you from HTML/CSS basics through React and Node.js to building and deploying full production applications.',
   'Web Development', 'Beginner', '12 weeks',
   '["No prior coding experience needed","A laptop with internet access"]',
   '["Build responsive web pages","Create React SPAs","Design REST APIs","Deploy to cloud"]',
   'published', 'admin-1', 'System Administrator', @past2, @now),

  ('lp-2', 'org-default', 'Data Science with Python', 'data-science-python',
   'Master data science fundamentals with Python.',
   'Journey through Python programming, statistical analysis, data visualization with matplotlib, and machine learning basics.',
   'Data Science', 'Intermediate', '8 weeks',
   '["Basic Python knowledge"]',
   '["Data wrangling with Pandas","Statistical analysis","Data visualization","ML fundamentals"]',
   'published', 'trainer-1', 'Dr. Sarah Mitchell', @past3, @now);

INSERT INTO `learning_path_sections` (`id`, `learningPathId`, `title`, `description`, `order`, `createdAt`) VALUES
  ('lps-1', 'lp-1', 'Phase 1: Web Foundations', 'HTML, CSS, and JavaScript basics.', 1, @past2),
  ('lps-2', 'lp-1', 'Phase 2: React & Frontend', 'Build modern UIs with React.', 2, @past2),
  ('lps-3', 'lp-1', 'Phase 3: Backend & Deployment', 'Node.js, Express, and cloud deployment.', 3, @past2),
  ('lps-4', 'lp-2', 'Phase 1: Python Mastery', 'Python fundamentals and advanced features.', 1, @past3),
  ('lps-5', 'lp-2', 'Phase 2: Data Analysis', 'Pandas, NumPy, and visualization.', 2, @past3);

INSERT INTO `learning_path_items` (`id`, `sectionId`, `learningPathId`, `title`, `description`, `type`, `order`, `durationMinutes`, `isRequired`, `content`, `createdAt`, `updatedAt`) VALUES
  ('lpi-1', 'lps-1', 'lp-1', 'HTML & CSS Fundamentals', 'Learn the building blocks of the web.', 'text', 1, 30, TRUE, '## HTML & CSS\n\nLearn semantic HTML5 tags and CSS3 layout techniques.', @past2, @now),
  ('lpi-2', 'lps-1', 'lp-1', 'JavaScript Essentials Video', 'Watch the comprehensive JS overview.', 'video', 2, 45, TRUE, NULL, @past2, @now),
  ('lpi-3', 'lps-2', 'lp-1', 'React Component Architecture', 'Deep dive into components, props, and state.', 'text', 1, 40, TRUE, '## React Architecture\n\nComponents, props, state, hooks, and the virtual DOM.', @past2, @now),
  ('lpi-4', 'lps-4', 'lp-2', 'Python Data Types Deep Dive', 'Lists, tuples, dictionaries, and sets.', 'text', 1, 35, TRUE, '## Python Data Types\n\nExplore mutable and immutable collections.', @past3, @now),
  ('lpi-5', 'lps-5', 'lp-2', 'Pandas Introduction', 'DataFrames, Series, and data manipulation.', 'text', 1, 50, TRUE, '## Pandas\n\nLearn to load, clean, and analyze datasets.', @past3, @now);

INSERT INTO `learning_path_assignments` (`id`, `organizationId`, `learningPathId`, `studentId`, `assignedBy`, `assignedAt`) VALUES
  ('lpa-1', 'org-default', 'lp-1', 'student-1', 'admin-1', @past2),
  ('lpa-2', 'org-default', 'lp-1', 'student-2', 'admin-1', @past3),
  ('lpa-3', 'org-default', 'lp-2', 'student-3', 'trainer-1', @past4);

INSERT INTO `learning_path_progress` (`id`, `learningPathId`, `studentId`, `itemId`, `completed`, `completedAt`, `timeSpentSeconds`) VALUES
  ('lpp-1', 'lp-1', 'student-1', 'lpi-1', TRUE, '2026-02-10T10:00:00.000Z', 1800),
  ('lpp-2', 'lp-1', 'student-1', 'lpi-2', TRUE, '2026-02-12T14:00:00.000Z', 2700),
  ('lpp-3', 'lp-1', 'student-1', 'lpi-3', FALSE, NULL, 600);

-- ============================================================
-- BLOGS
-- ============================================================
INSERT INTO `blogs` (`id`, `organizationId`, `title`, `content`, `summary`, `authorId`, `authorName`, `category`, `tags`, `likesCount`, `bookmarksCount`, `status`, `createdAt`) VALUES
  ('blog-1', 'org-default', 'Getting Started with React 19',
   '## React 19 is Here!\n\nReact 19 brings exciting new features including the use() hook, Server Components stability, and improved automatic batching.\n\n### Key Highlights\n- **use() hook** for reading resources\n- **Server Actions** for form handling\n- **Improved error reporting**\n\nLet\'s dive into each feature...',
   'An overview of the most exciting features in React 19.',
   'trainer-1', 'Dr. Sarah Mitchell', 'Technology', '["react","javascript","frontend","web-development"]', 24, 8, 'published', @past2),

  ('blog-2', 'org-default', 'Why Python Dominates AI/ML in 2026',
   '## Python\'s AI Dominance\n\nPython continues to be the #1 language for AI and machine learning. Here\'s why:\n\n1. **Rich ecosystem** — TensorFlow, PyTorch, scikit-learn\n2. **Simple syntax** — Focus on algorithms, not boilerplate\n3. **Community** — Millions of developers and resources\n4. **Gemini API** — Google\'s latest AI models have first-class Python support',
   'Why Python remains the king of AI and data science.',
   'trainer-1', 'Dr. Sarah Mitchell', 'AI & Machine Learning', '["python","ai","machine-learning","data-science"]', 42, 15, 'published', @past3),

  ('blog-3', 'org-default', 'Tips for Acing Technical Interviews',
   '## Technical Interview Preparation\n\n### Data Structures to Master\n- Arrays and Hash Maps\n- Linked Lists\n- Trees and Graphs\n- Stacks and Queues\n\n### Common Patterns\n1. Two Pointers\n2. Sliding Window\n3. BFS/DFS\n4. Dynamic Programming',
   'Essential tips and patterns for cracking coding interviews.',
   'admin-1', 'System Administrator', 'Career', '["interviews","coding","career","dsa"]', 67, 31, 'published', @past4);

INSERT INTO `comments` (`id`, `blogId`, `authorId`, `authorName`, `authorRole`, `content`, `createdAt`) VALUES
  ('comment-1', 'blog-1', 'student-1', 'Alex Johnson', 'student', 'Great overview! The use() hook looks amazing for data fetching.', '2026-02-05T10:30:00.000Z'),
  ('comment-2', 'blog-1', 'student-2', 'Priya Sharma', 'student', 'Thanks for the clear explanation. Can you write a follow-up on Server Actions?', '2026-02-06T14:15:00.000Z'),
  ('comment-3', 'blog-2', 'student-3', 'James Wilson', 'student', 'Python + Gemini API is a killer combination. Looking forward to the hands-on course!', '2026-03-20T09:00:00.000Z'),
  ('comment-4', 'blog-3', 'student-4', 'Aisha Patel', 'student', 'The two-pointer pattern tip was super helpful for my interview prep!', '2026-06-10T16:45:00.000Z');

-- ============================================================
-- REVIEWS
-- ============================================================
INSERT INTO `reviews` (`id`, `courseId`, `studentId`, `studentName`, `rating`, `comment`, `createdAt`) VALUES
  ('rev-1', 'course-1', 'student-1', 'Alex Johnson', 5, 'Excellent course! Covers everything from basics to advanced React. Highly recommended.', '2026-02-01T12:00:00.000Z'),
  ('rev-2', 'course-1', 'student-2', 'Priya Sharma', 4, 'Very well structured. Could use more hands-on projects.', '2026-03-01T10:00:00.000Z'),
  ('rev-3', 'course-2', 'student-1', 'Alex Johnson', 5, 'The AI integration module was mind-blowing. Best Python course I have taken.', '2026-03-15T08:30:00.000Z'),
  ('rev-4', 'course-4', 'acme-student-1', 'Emily Davis', 5, 'Prof. Chen explains complex algorithms in the simplest way possible.', '2026-07-01T14:00:00.000Z');

-- ============================================================
-- GROUPS
-- ============================================================
INSERT INTO `groups` (`id`, `organizationId`, `name`, `description`, `createdAt`, `updatedAt`) VALUES
  ('grp-1', 'org-default', 'Web Dev Cohort 2026', 'Students enrolled in the web development track.', @past2, @now),
  ('grp-2', 'org-default', 'Python AI Team', 'Students pursuing AI and data science with Python.', @past3, @now);

INSERT INTO `group_members` (`id`, `organizationId`, `groupId`, `userId`, `addedAt`) VALUES
  ('gm-1', 'org-default', 'grp-1', 'student-1', @past2),
  ('gm-2', 'org-default', 'grp-1', 'student-2', @past2),
  ('gm-3', 'org-default', 'grp-1', 'student-4', @past4),
  ('gm-4', 'org-default', 'grp-2', 'student-1', @past3),
  ('gm-5', 'org-default', 'grp-2', 'student-3', @past3);

-- ============================================================
-- DEPARTMENTS
-- ============================================================
INSERT INTO `departments` (`id`, `organizationId`, `name`, `description`, `managerId`, `createdAt`, `updatedAt`) VALUES
  ('dept-1', 'org-default', 'Engineering', 'Software Engineering & Development department.', 'manager-1', @past3, @now),
  ('dept-2', 'org-default', 'Data Science', 'Data Analytics & AI Research department.', 'manager-1', @past3, @now);

INSERT INTO `department_members` (`id`, `organizationId`, `departmentId`, `userId`, `role`, `addedAt`) VALUES
  ('dm-1', 'org-default', 'dept-1', 'trainer-1', 'lead', @past3),
  ('dm-2', 'org-default', 'dept-1', 'student-1', 'member', @past3),
  ('dm-3', 'org-default', 'dept-1', 'student-2', 'member', @past3),
  ('dm-4', 'org-default', 'dept-2', 'student-3', 'member', @past4);

-- ============================================================
-- CERTIFICATE TEMPLATES & CERTIFICATES
-- ============================================================
INSERT INTO `certificate_templates` (`id`, `organizationId`, `name`, `description`, `style`, `primaryColor`, `accentColor`, `isDefault`, `createdAt`, `updatedAt`) VALUES
  ('certpl-1', 'org-default', 'Classic Gold Template', 'Default gold-themed certificate for course completion.', 'classic_gold', '#1e3a8a', '#d97706', 1, @past2, @now),
  ('certpl-2', 'org-default', 'Modern Emerald Template', 'Contemporary green-themed certificate.', 'modern_emerald', '#065f46', '#10b981', 0, @past3, @now);

INSERT INTO `certificates` (`id`, `certificateNumber`, `verificationCode`, `organizationId`, `studentId`, `studentName`, `studentEmail`, `type`, `courseId`, `title`, `certificateTitle`, `templateId`, `templateStyle`, `scorePercentage`, `issuedAt`, `status`, `createdAt`, `updatedAt`) VALUES
  ('cert-1', 'MRTLMS-2026-00001', 'verify-abc123def456', 'org-default', 'student-1', 'Alex Johnson', 'student@lms.com', 'course', 'course-1', 'Introduction to Full-Stack Web Development', 'Certificate of Completion', 'certpl-1', 'classic_gold', 100.00, '2026-02-01T00:00:00.000Z', 'active', @past2, @now);

-- ============================================================
-- CODING CHAPTERS & TOPICS
-- ============================================================
INSERT INTO `coding_chapters` (`id`, `title`, `slug`, `description`, `icon`, `orderIndex`, `createdAt`) VALUES
  ('chapter-dsa', 'Data Structures & Algorithms', 'data-structures-algorithms', 'Master fundamental DSA concepts.', 'code', 1, @now),
  ('chapter-python', 'Python Programming', 'python-programming', 'Practice Python from basics to advanced.', 'terminal', 2, @now),
  ('chapter-sql', 'SQL & Databases', 'sql-databases', 'Write and optimize SQL queries.', 'database', 3, @now),
  ('chapter-web', 'Web Development', 'web-development', 'Build interactive web applications.', 'globe', 4, @now);

INSERT INTO `coding_topics` (`id`, `chapterId`, `title`, `slug`, `description`, `orderIndex`, `createdAt`) VALUES
  ('topic-dsa-arrays', 'chapter-dsa', 'Arrays & Hashing', 'arrays-hashing', 'Array manipulation and hash map techniques.', 1, @now),
  ('topic-dsa-strings', 'chapter-dsa', 'String Problems', 'string-problems', 'String traversal, matching, and manipulation.', 2, @now),
  ('topic-dsa-trees', 'chapter-dsa', 'Trees & Graphs', 'trees-graphs', 'Binary trees, BSTs, and graph algorithms.', 3, @now),
  ('topic-py-basics', 'chapter-python', 'Python Basics', 'python-basics', 'Variables, loops, functions, and classes.', 1, @now),
  ('topic-sql-basics', 'chapter-sql', 'SQL Fundamentals', 'sql-fundamentals', 'SELECT, WHERE, JOINs, and aggregation.', 1, @now),
  ('topic-web-css-layout', 'chapter-web', 'CSS Layout', 'css-layout', 'Flexbox, Grid, and responsive design.', 1, @now),
  ('topic-web-dom', 'chapter-web', 'DOM Manipulation', 'dom-manipulation', 'JavaScript DOM interaction and events.', 2, @now),
  ('topic-web-projects', 'chapter-web', 'Mini Projects', 'mini-projects', 'Build complete small web applications.', 3, @now);

-- ============================================================
-- CODING CHALLENGES (2 sample challenges)
-- ============================================================
INSERT INTO `coding_challenges` (`id`, `chapterId`, `topicId`, `orderIndex`, `title`, `slug`, `description`, `difficulty`, `category`, `challengeType`, `supportedLanguages`, `starterCode`, `publicTestCases`, `privateTestCases`, `hints`, `solutionExplanation`, `timeLimit`, `memoryLimit`, `createdAt`, `updatedAt`) VALUES
  ('challenge-two-sum', 'chapter-dsa', 'topic-dsa-arrays', 1, 'Two Sum', 'two-sum',
   'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.',
   'easy', 'Arrays & Hashing', 'programming',
   '["python","javascript","java"]',
   '{"python":"def two_sum(nums, target):\\n    pass\\n","javascript":"function twoSum(nums, target) {\\n    \\n}\\n"}',
   '[{"id":"tc-1","input":"2 7 11 15\\n9","expectedOutput":"0 1","isPublic":true}]',
   '[{"id":"tc-3","input":"3 3\\n6","expectedOutput":"0 1","isPublic":false}]',
   '["Use a hash map to store seen values and their indices."]',
   'Iterate through array, for each element check if target - element exists in hash map.',
   3000, 256, @now, @now),

  ('challenge-prime', 'chapter-python', 'topic-py-basics', 1, 'Check If Prime Number', 'check-if-prime',
   'Given an integer n, determine whether n is a prime number. Print true or false.',
   'easy', 'Mathematics', 'programming',
   '["python","javascript","java"]',
   '{"python":"def is_prime(n):\\n    pass\\n","javascript":"function isPrime(n) {\\n    \\n}\\n"}',
   '[{"id":"tc-1","input":"5","expectedOutput":"true","isPublic":true},{"id":"tc-2","input":"4","expectedOutput":"false","isPublic":true}]',
   '[{"id":"tc-3","input":"1","expectedOutput":"false","isPublic":false}]',
   '["Numbers <= 1 are not prime.","Only check divisors up to sqrt(n)."]',
   'Check base cases, skip multiples of 2 and 3, loop from 5 to sqrt(n) with step 6.',
   3000, 256, @now, @now);

-- ============================================================
-- INSTITUTIONS & BATCHES
-- ============================================================
INSERT INTO `institutions` (`id`, `organizationId`, `name`, `code`, `contactEmail`, `academicYears`, `status`, `createdAt`, `updatedAt`) VALUES
  ('inst-mrtech-main', 'org-default', 'MR Technologies Academy', 'MRTECH-MAIN', 'admin@mrtechlms.com', '["2024-2025","2025-2026","2026-2027"]', 'active', @past3, @now);

INSERT INTO `batches` (`id`, `organizationId`, `institutionId`, `name`, `code`, `academicYear`, `startDate`, `endDate`, `maxStudents`, `description`, `status`, `createdAt`, `updatedAt`) VALUES
  ('batch-1', 'org-default', 'inst-mrtech-main', 'Full-Stack Batch Alpha', 'FSB-ALPHA-2026', '2025-2026', '2026-01-15T00:00:00.000Z', '2026-06-15T00:00:00.000Z', 30, 'First cohort of full-stack web development students.', 'active', @past1, @now),
  ('batch-2', 'org-default', 'inst-mrtech-main', 'Python AI Batch Beta', 'PAI-BETA-2026', '2025-2026', '2026-03-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z', 25, 'Python and AI/ML training batch.', 'active', @past3, @now);

INSERT INTO `batch_students` (`id`, `organizationId`, `batchId`, `studentId`, `enrolledAt`, `status`, `createdAt`, `updatedAt`) VALUES
  ('bs-1', 'org-default', 'batch-1', 'student-1', @past1, 'active', @past1, @now),
  ('bs-2', 'org-default', 'batch-1', 'student-2', @past2, 'active', @past2, @now),
  ('bs-3', 'org-default', 'batch-1', 'student-4', @past4, 'active', @past4, @now),
  ('bs-4', 'org-default', 'batch-2', 'student-3', @past3, 'active', @past3, @now),
  ('bs-5', 'org-default', 'batch-2', 'student-5', @past5, 'active', @past5, @now);

INSERT INTO `batch_courses` (`id`, `organizationId`, `batchId`, `courseId`, `assignedAt`, `assignedBy`, `status`) VALUES
  ('bc-1', 'org-default', 'batch-1', 'course-1', @past1, 'admin-1', 'active'),
  ('bc-2', 'org-default', 'batch-1', 'course-3', @past3, 'admin-1', 'active'),
  ('bc-3', 'org-default', 'batch-2', 'course-2', @past3, 'admin-1', 'active');

INSERT INTO `batch_assessments` (`id`, `organizationId`, `batchId`, `assessmentId`, `assignedAt`, `assignedBy`, `status`) VALUES
  ('ba-1', 'org-default', 'batch-1', 'assess-1', @past1, 'admin-1', 'active'),
  ('ba-2', 'org-default', 'batch-2', 'assess-2', @past3, 'trainer-1', 'active');

-- ============================================================
-- GAMIFICATION SEED DATA
-- ============================================================
INSERT INTO `gamification_badges` (`id`, `organizationId`, `name`, `description`, `icon`, `category`, `pointsRequired`, `isAutoAwarded`, `status`, `createdAt`, `updatedAt`) VALUES
  ('badge-first-course', 'org-default', 'First Steps', 'Enrolled in your first course.', 'rocket', 'Onboarding', 0, 1, 'active', @now, @now),
  ('badge-quiz-master', 'org-default', 'Quiz Master', 'Scored 100% on any assessment.', 'trophy', 'Assessment', 0, 1, 'active', @now, @now),
  ('badge-streak-7', 'org-default', '7-Day Streak', 'Logged in 7 days in a row.', 'flame', 'Engagement', 0, 1, 'active', @now, @now),
  ('badge-code-warrior', 'org-default', 'Code Warrior', 'Solved 10 coding challenges.', 'sword', 'Coding', 0, 1, 'active', @now, @now);

INSERT INTO `gamification_points` (`id`, `organizationId`, `userId`, `action`, `points`, `entityType`, `entityId`, `description`, `createdAt`) VALUES
  ('gp-1', 'org-default', 'student-1', 'course_enrolled', 10, 'course', 'course-1', 'Enrolled in Full-Stack Web Development', @past1),
  ('gp-2', 'org-default', 'student-1', 'lesson_completed', 5, 'lesson', 'les-1', 'Completed: Welcome to Full-Stack Development', '2026-01-12T10:00:00.000Z'),
  ('gp-3', 'org-default', 'student-1', 'lesson_completed', 5, 'lesson', 'les-2', 'Completed: JavaScript ES6+ Features', '2026-01-13T14:30:00.000Z'),
  ('gp-4', 'org-default', 'student-1', 'assessment_passed', 25, 'assessment', 'assess-1', 'Passed: Foundational Web and JS Assessment (100%)', '2026-01-25T14:30:00.000Z'),
  ('gp-5', 'org-default', 'student-2', 'course_enrolled', 10, 'course', 'course-1', 'Enrolled in Full-Stack Web Development', @past2);

INSERT INTO `gamification_user_badges` (`id`, `organizationId`, `userId`, `badgeId`, `awardedAt`) VALUES
  ('gub-1', 'org-default', 'student-1', 'badge-first-course', @past1),
  ('gub-2', 'org-default', 'student-1', 'badge-quiz-master', '2026-01-25T14:30:00.000Z'),
  ('gub-3', 'org-default', 'student-2', 'badge-first-course', @past2);

INSERT INTO `gamification_streaks` (`id`, `organizationId`, `userId`, `currentStreak`, `longestStreak`, `lastActiveDate`, `updatedAt`) VALUES
  ('gs-1', 'org-default', 'student-1', 5, 12, '2026-11-15T00:00:00.000Z', @now),
  ('gs-2', 'org-default', 'student-2', 2, 7, '2026-11-14T00:00:00.000Z', @now),
  ('gs-3', 'org-default', 'student-3', 0, 4, '2026-10-20T00:00:00.000Z', @now);

-- ============================================================
-- NOTIFICATIONS (samples)
-- ============================================================
INSERT INTO `notifications` (`id`, `organizationId`, `userId`, `type`, `title`, `message`, `read`, `channel`, `deliveryStatus`, `createdAt`, `updatedAt`) VALUES
  ('notif-1', 'org-default', 'student-1', 'course_assigned', 'Course Assigned: Database Design & SQL Mastery', 'You have been enrolled in Database Design & SQL Mastery.', 0, 'in_app', 'delivered', @past3, @past3),
  ('notif-2', 'org-default', 'student-1', 'assessment_result', 'Assessment Result: Foundational Web and JS', 'You scored 100% on the Foundational Web and JS Assessment. Congratulations!', 1, 'in_app', 'delivered', '2026-01-25T14:35:00.000Z', '2026-01-25T15:00:00.000Z'),
  ('notif-3', 'org-default', 'student-2', 'assessment_assigned', 'Assessment Assigned: Foundational Web and JS', 'You have a new assessment to complete. Due: April 1, 2026.', 0, 'in_app', 'delivered', @past2, @past2),
  ('notif-4', 'org-default', 'student-1', 'badge_earned', 'Badge Earned: Quiz Master', 'Congratulations! You earned the Quiz Master badge for scoring 100% on an assessment.', 1, 'in_app', 'delivered', '2026-01-25T14:35:00.000Z', '2026-01-26T08:00:00.000Z');

-- ============================================================
-- USER PREFERENCES
-- ============================================================
INSERT INTO `user_preferences` (`id`, `userId`, `theme`, `mode`, `primaryColor`, `secondaryColor`, `backgroundColor`, `surfaceColor`, `textColor`, `createdAt`, `updatedAt`) VALUES
  ('pref-1', 'student-1', 'default-blue', 'dark', '#2563eb', '#4f46e5', '#0f172a', '#1e293b', '#f8fafc', @past1, @now),
  ('pref-2', 'admin-1', 'default-blue', 'light', '#2563eb', '#4f46e5', '#f8fafc', '#ffffff', '#0f172a', @past6, @now);

-- ============================================================
-- AUDIT LOGS (samples)
-- ============================================================
INSERT INTO `audit_logs` (`id`, `organizationId`, `userId`, `userEmail`, `userRole`, `action`, `resourceType`, `resourceId`, `details`, `ipAddress`, `status`, `createdAt`) VALUES
  ('audit-1', 'org-default', 'admin-1', 'admin@lms.com', 'admin', 'user_login', 'auth', NULL, '{"method":"password"}', '192.168.1.10', 'success', @past1),
  ('audit-2', 'org-default', 'admin-1', 'admin@lms.com', 'admin', 'create_user', 'user', 'student-1', '{"name":"Alex Johnson","role":"student"}', '192.168.1.10', 'success', @past1),
  ('audit-3', 'org-default', 'student-1', 'student@lms.com', 'student', 'user_login', 'auth', NULL, '{"method":"password"}', '10.0.0.50', 'success', @past1),
  ('audit-4', 'org-default', 'trainer-1', 'trainer@lms.com', 'trainer', 'publish_assessment', 'assessment', 'assess-1', '{"title":"Foundational Web and JS Assessment"}', '192.168.1.20', 'success', @past1),
  ('audit-5', 'org-acme-univ', 'acme-admin-1', 'admin@acme-university.edu', 'admin', 'user_login', 'auth', NULL, '{"method":"password"}', '172.16.0.100', 'success', @past3);

-- ============================================================
-- Mark migrations as applied so the app won't re-run them
-- ============================================================
INSERT INTO `schema_migrations` (`version`, `name`, `batch`) VALUES
  ('001_initial_baseline', 'Initial baseline schema', 1),
  ('002_multi_tenancy_organizations', 'Multi-tenancy organizations', 1),
  ('003_soft_deletes_and_roles', 'Soft deletes and role expansion', 1),
  ('004_composite_indexes', 'Composite indexes for performance', 1),
  ('005_core_learning_engine', 'Core learning engine extensions', 1),
  ('006_enrollment_access_control', 'Enrollment access control', 1),
  ('007_assessment_attempts', 'Assessment attempts tracking', 1),
  ('008_certification_system', 'Certification system', 1),
  ('009_organization_management', 'Organization management', 1),
  ('010_notifications_and_reminders', 'Notification and reminder system', 1),
  ('011_analytics_reporting_indexes', 'Analytics reporting indexes', 1),
  ('012_gamification_system', 'Gamification system', 1),
  ('013_enterprise_integrations', 'Enterprise integrations', 1),
  ('014_secure_coding_execution', 'Secure coding execution', 1),
  ('015_ai_learning_layer', 'AI learning layer', 1),
  ('016_batch_management', 'Batch management', 1),
  ('017_user_phone_and_location', 'User phone and location fields', 1),
  ('018_batch_learning_paths_and_denials', 'Batch learning paths and denials', 1),
  ('019_proctoring_and_answer_persistence', 'Proctoring and answer persistence', 1);

-- ============================================================
-- DONE!
-- ============================================================
SELECT 'MRTECHLMS database setup complete!' AS status,
       (SELECT COUNT(*) FROM users) AS users_count,
       (SELECT COUNT(*) FROM courses) AS courses_count,
       (SELECT COUNT(*) FROM assessments) AS assessments_count,
       (SELECT COUNT(*) FROM learning_paths) AS learning_paths_count,
       (SELECT COUNT(*) FROM batches) AS batches_count;
