-- =====================================================================
-- MRTECHLMS Database Schema: 07_organization_and_batches.sql
-- Tables: institutions, batches, batch_students, batch_courses, batch_assessments, batch_learning_paths, departments, department_members, cohorts, cohort_members, groups, group_members
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `institutions`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `institutions`;
CREATE TABLE `institutions` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `contactEmail` varchar(255) DEFAULT NULL,
  `contactPhone` varchar(50) DEFAULT NULL,
  `address` text,
  `academicYears` json DEFAULT NULL,
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inst_code_uniq` (`organizationId`,`code`),
  KEY `idx_inst_org` (`organizationId`),
  KEY `idx_inst_code` (`code`),
  KEY `idx_inst_status` (`status`),
  KEY `idx_inst_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `batches`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `batches`;
CREATE TABLE `batches` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `institutionId` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `academicYear` varchar(50) NOT NULL,
  `courseId` varchar(36) DEFAULT NULL,
  `startDate` varchar(50) DEFAULT NULL,
  `endDate` varchar(50) DEFAULT NULL,
  `maxStudents` int DEFAULT NULL,
  `description` text,
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_inst_code_uniq` (`institutionId`,`code`),
  KEY `idx_batches_org` (`organizationId`),
  KEY `idx_batches_inst` (`institutionId`),
  KEY `idx_batches_year` (`academicYear`),
  KEY `idx_batches_course` (`courseId`),
  KEY `idx_batches_status` (`status`),
  KEY `idx_batches_code` (`code`),
  KEY `idx_batches_deleted` (`deletedAt`),
  CONSTRAINT `batches_ibfk_1` FOREIGN KEY (`institutionId`) REFERENCES `institutions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `batch_students`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `batch_students`;
CREATE TABLE `batch_students` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `batchId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `enrolledAt` varchar(50) NOT NULL,
  `status` enum('active','inactive','completed','dropped') NOT NULL DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_student_uniq` (`batchId`,`studentId`),
  KEY `idx_bs_batch` (`batchId`),
  KEY `idx_bs_student` (`studentId`),
  KEY `idx_bs_status` (`status`),
  CONSTRAINT `batch_students_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_students_ibfk_2` FOREIGN KEY (`studentId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `batch_courses`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `batch_courses`;
CREATE TABLE `batch_courses` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `batchId` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `assignedAt` varchar(50) NOT NULL,
  `assignedBy` varchar(36) DEFAULT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_course_uniq` (`batchId`,`courseId`),
  KEY `idx_bc_batch` (`batchId`),
  KEY `idx_bc_course` (`courseId`),
  KEY `idx_bc_status` (`status`),
  CONSTRAINT `batch_courses_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_courses_ibfk_2` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `batch_assessments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `batch_assessments`;
CREATE TABLE `batch_assessments` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `batchId` varchar(36) NOT NULL,
  `assessmentId` varchar(36) NOT NULL,
  `assignedAt` varchar(50) NOT NULL,
  `assignedBy` varchar(36) DEFAULT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_ass_uniq` (`batchId`,`assessmentId`),
  KEY `idx_ba_batch` (`batchId`),
  KEY `idx_ba_ass` (`assessmentId`),
  KEY `idx_ba_status` (`status`),
  CONSTRAINT `batch_assessments_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_assessments_ibfk_2` FOREIGN KEY (`assessmentId`) REFERENCES `assessments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `batch_learning_paths`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `batch_learning_paths`;
CREATE TABLE `batch_learning_paths` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `batchId` varchar(36) NOT NULL,
  `learningPathId` varchar(36) NOT NULL,
  `assignedAt` varchar(50) NOT NULL,
  `assignedBy` varchar(36) DEFAULT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_lp_uniq` (`batchId`,`learningPathId`),
  KEY `idx_blp_batch` (`batchId`),
  KEY `idx_blp_path` (`learningPathId`),
  KEY `idx_blp_status` (`status`),
  CONSTRAINT `batch_learning_paths_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `batch_learning_paths_ibfk_2` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `departments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `managerId` varchar(36) DEFAULT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dept_org` (`organizationId`),
  KEY `idx_dept_manager` (`managerId`),
  KEY `idx_dept_code` (`code`),
  KEY `idx_dept_status` (`status`),
  KEY `idx_dept_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `department_members`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `department_members`;
CREATE TABLE `department_members` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `departmentId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'member',
  `joinedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dept_user_uniq` (`departmentId`,`userId`),
  KEY `idx_dept_mem_dept` (`departmentId`),
  KEY `idx_dept_mem_user` (`userId`),
  CONSTRAINT `department_members_ibfk_1` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `department_members_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `cohorts`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `cohorts`;
CREATE TABLE `cohorts` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text,
  `startDate` varchar(50) DEFAULT NULL,
  `endDate` varchar(50) DEFAULT NULL,
  `status` enum('upcoming','active','completed','archived') NOT NULL DEFAULT 'active',
  `managerId` varchar(36) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cohorts_org` (`organizationId`),
  KEY `idx_cohorts_manager` (`managerId`),
  KEY `idx_cohorts_status` (`status`),
  KEY `idx_cohorts_code` (`code`),
  KEY `idx_cohorts_deleted` (`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `cohort_members`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `cohort_members`;
CREATE TABLE `cohort_members` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `cohortId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `status` enum('active','completed','dropped') NOT NULL DEFAULT 'active',
  `joinedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cohort_user_uniq` (`cohortId`,`userId`),
  KEY `idx_cohort_mem_cohort` (`cohortId`),
  KEY `idx_cohort_mem_user` (`userId`),
  KEY `idx_cohort_mem_status` (`status`),
  CONSTRAINT `cohort_members_ibfk_1` FOREIGN KEY (`cohortId`) REFERENCES `cohorts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cohort_members_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `groups`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `name` varchar(255) NOT NULL,
  `description` text,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  `deletedAt` varchar(50) DEFAULT NULL,
  `type` enum('general','department','cohort','team','track') NOT NULL DEFAULT 'general',
  `departmentId` varchar(36) DEFAULT NULL,
  `cohortId` varchar(36) DEFAULT NULL,
  `managerId` varchar(36) DEFAULT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `idx_groups_org` (`organizationId`),
  KEY `idx_groups_deleted` (`deletedAt`),
  KEY `idx_groups_type` (`type`),
  KEY `idx_groups_manager` (`managerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `group_members`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `group_members`;
CREATE TABLE `group_members` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL DEFAULT 'org-default',
  `groupId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `addedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_user_uniq` (`groupId`,`userId`),
  KEY `idx_group_members_group` (`groupId`),
  KEY `idx_group_members_user` (`userId`),
  CONSTRAINT `group_members_ibfk_1` FOREIGN KEY (`groupId`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_members_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
