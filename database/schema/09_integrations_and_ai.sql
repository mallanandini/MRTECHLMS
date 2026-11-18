-- =====================================================================
-- MRTECHLMS Database Schema: 09_integrations_and_ai.sql
-- Tables: blogs, comments, sso_configs, api_keys, webhook_subscriptions, webhook_deliveries, user_mfa_settings, scorm_packages, scorm_registrations, xapi_lrs_destinations, xapi_statements, lti_registrations, integration_jobs, ai_organization_settings, ai_interaction_logs, ai_generated_courses, ai_generated_quizzes
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Table structure for `blogs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `blogs`;
CREATE TABLE `blogs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `summary` text NOT NULL,
  `coverImage` text,
  `authorId` varchar(36) NOT NULL,
  `authorName` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `tags` json DEFAULT NULL,
  `likesCount` int DEFAULT '0',
  `bookmarksCount` int DEFAULT '0',
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `authorId` (`authorId`),
  KEY `idx_blogs_org` (`organizationId`),
  CONSTRAINT `blogs_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `comments`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` varchar(36) NOT NULL,
  `blogId` varchar(36) NOT NULL,
  `authorId` varchar(36) NOT NULL,
  `authorName` varchar(255) NOT NULL,
  `authorRole` enum('student','trainer','admin') NOT NULL,
  `content` text NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `blogId` (`blogId`),
  KEY `authorId` (`authorId`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`blogId`) REFERENCES `blogs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`authorId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `sso_configs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sso_configs`;
CREATE TABLE `sso_configs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `providerType` enum('saml','oidc') NOT NULL DEFAULT 'saml',
  `idpEntityId` varchar(255) DEFAULT NULL,
  `idpSignInUrl` varchar(500) DEFAULT NULL,
  `idpCertificate` text,
  `spEntityId` varchar(255) NOT NULL,
  `spAcsUrl` varchar(500) NOT NULL,
  `oidcIssuer` varchar(500) DEFAULT NULL,
  `oidcClientId` varchar(255) DEFAULT NULL,
  `oidcClientSecret` varchar(500) DEFAULT NULL,
  `attributeMapping` json DEFAULT NULL,
  `enforceSso` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizationId` (`organizationId`),
  KEY `idx_sso_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `api_keys`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `api_keys`;
CREATE TABLE `api_keys` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `keyPrefix` varchar(20) NOT NULL,
  `keyHash` varchar(255) NOT NULL,
  `scopes` json NOT NULL,
  `rateLimitPerMin` int NOT NULL DEFAULT '60',
  `status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
  `expiresAt` varchar(50) DEFAULT NULL,
  `lastUsedAt` varchar(50) DEFAULT NULL,
  `createdBy` varchar(36) NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_api_keys_org` (`organizationId`),
  KEY `idx_api_keys_hash` (`keyHash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `webhook_subscriptions`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `webhook_subscriptions`;
CREATE TABLE `webhook_subscriptions` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `targetUrl` varchar(500) NOT NULL,
  `secretKey` varchar(255) NOT NULL,
  `subscribedEvents` json NOT NULL,
  `status` enum('active','disabled') NOT NULL DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_webhook_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `webhook_deliveries`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `webhook_deliveries`;
CREATE TABLE `webhook_deliveries` (
  `id` varchar(36) NOT NULL,
  `subscriptionId` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `payload` json NOT NULL,
  `statusCode` int DEFAULT NULL,
  `responseBody` text,
  `attemptCount` int NOT NULL DEFAULT '1',
  `status` enum('success','failed','retrying') NOT NULL,
  `durationMs` int DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_webhook_deliv_sub` (`subscriptionId`),
  KEY `idx_webhook_deliv_org` (`organizationId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `user_mfa_settings`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `user_mfa_settings`;
CREATE TABLE `user_mfa_settings` (
  `userId` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `totpSecret` varchar(255) DEFAULT NULL,
  `recoveryCodesHash` json DEFAULT NULL,
  `enrolledAt` varchar(50) DEFAULT NULL,
  `lastVerifiedAt` varchar(50) DEFAULT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`userId`),
  KEY `idx_mfa_org_user` (`organizationId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `scorm_packages`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `scorm_packages`;
CREATE TABLE `scorm_packages` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `courseId` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `version` enum('SCORM_12','SCORM_2004') NOT NULL DEFAULT 'SCORM_12',
  `manifestData` json DEFAULT NULL,
  `entryPoint` varchar(500) NOT NULL,
  `storageDir` varchar(500) NOT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_scorm_org_course` (`organizationId`,`courseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `scorm_registrations`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `scorm_registrations`;
CREATE TABLE `scorm_registrations` (
  `id` varchar(36) NOT NULL,
  `scormPackageId` varchar(36) NOT NULL,
  `studentId` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `lessonStatus` varchar(50) NOT NULL DEFAULT 'not attempted',
  `rawScore` decimal(5,2) DEFAULT NULL,
  `minScore` decimal(5,2) DEFAULT NULL,
  `maxScore` decimal(5,2) DEFAULT NULL,
  `lessonLocation` varchar(255) DEFAULT NULL,
  `suspendData` text,
  `totalTimeSeconds` int NOT NULL DEFAULT '0',
  `sessionTimeSeconds` int NOT NULL DEFAULT '0',
  `completedAt` varchar(50) DEFAULT NULL,
  `lastAccessedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scorm_reg` (`scormPackageId`,`studentId`),
  KEY `idx_scorm_org_student` (`organizationId`,`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `xapi_lrs_destinations`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `xapi_lrs_destinations`;
CREATE TABLE `xapi_lrs_destinations` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `endpointUrl` varchar(500) NOT NULL,
  `authKey` varchar(255) NOT NULL,
  `authSecret` varchar(255) NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lrs_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `xapi_statements`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `xapi_statements`;
CREATE TABLE `xapi_statements` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `actorEmail` varchar(255) NOT NULL,
  `actorName` varchar(255) DEFAULT NULL,
  `verbId` varchar(255) NOT NULL,
  `verbDisplay` varchar(100) NOT NULL,
  `activityId` varchar(500) NOT NULL,
  `activityName` varchar(255) DEFAULT NULL,
  `activityType` varchar(255) DEFAULT NULL,
  `scaledScore` decimal(4,3) DEFAULT NULL,
  `rawScore` decimal(6,2) DEFAULT NULL,
  `success` tinyint(1) DEFAULT NULL,
  `completion` tinyint(1) DEFAULT NULL,
  `duration` varchar(50) DEFAULT NULL,
  `context` json DEFAULT NULL,
  `statementJson` json NOT NULL,
  `timestamp` varchar(50) NOT NULL,
  `storedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_xapi_org_actor` (`organizationId`,`actorEmail`),
  KEY `idx_xapi_verb` (`verbId`),
  KEY `idx_xapi_activity` (`activityId`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `lti_registrations`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `lti_registrations`;
CREATE TABLE `lti_registrations` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `version` enum('LTI_13') NOT NULL DEFAULT 'LTI_13',
  `issuer` varchar(500) NOT NULL,
  `clientId` varchar(255) NOT NULL,
  `deploymentId` varchar(255) NOT NULL,
  `authLoginUrl` varchar(500) NOT NULL,
  `authTokensUrl` varchar(500) NOT NULL,
  `keyJwksUrl` varchar(500) NOT NULL,
  `status` enum('active','inactive','pending_configuration') NOT NULL DEFAULT 'pending_configuration',
  `createdAt` varchar(50) NOT NULL,
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_lti_org` (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `integration_jobs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `integration_jobs`;
CREATE TABLE `integration_jobs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `jobType` enum('import','export') NOT NULL,
  `entityType` enum('users','courses','groups','enrollments','assessments','results') NOT NULL,
  `status` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  `totalRecords` int NOT NULL DEFAULT '0',
  `processedRecords` int NOT NULL DEFAULT '0',
  `successRecords` int NOT NULL DEFAULT '0',
  `failedRecords` int NOT NULL DEFAULT '0',
  `errorsLog` json DEFAULT NULL,
  `fileUrl` varchar(500) DEFAULT NULL,
  `createdBy` varchar(36) NOT NULL,
  `createdAt` varchar(50) NOT NULL,
  `completedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_int_jobs_org` (`organizationId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `ai_organization_settings`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `ai_organization_settings`;
CREATE TABLE `ai_organization_settings` (
  `organizationId` varchar(36) NOT NULL,
  `aiEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `courseGeneratorEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `quizGeneratorEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `lessonTutorEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `codingHintsEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `assessmentExplanationsEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `skillGapAnalysisEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `monthlyTokenQuota` int NOT NULL DEFAULT '500000',
  `monthlyTokensUsed` int NOT NULL DEFAULT '0',
  `dailyUserRequestLimit` int NOT NULL DEFAULT '50',
  `quotaResetMonth` varchar(7) NOT NULL DEFAULT '2026-10',
  `updatedAt` varchar(50) NOT NULL,
  PRIMARY KEY (`organizationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `ai_interaction_logs`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `ai_interaction_logs`;
CREATE TABLE `ai_interaction_logs` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `feature` varchar(50) NOT NULL,
  `contextType` varchar(50) DEFAULT NULL,
  `contextId` varchar(100) DEFAULT NULL,
  `promptTokensEstimate` int NOT NULL DEFAULT '0',
  `completionTokensEstimate` int NOT NULL DEFAULT '0',
  `totalTokens` int NOT NULL DEFAULT '0',
  `latencyMs` int NOT NULL DEFAULT '0',
  `safetyPassed` tinyint(1) NOT NULL DEFAULT '1',
  `safetyNotes` text,
  `createdAt` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ai_log_org_created` (`organizationId`,`createdAt`),
  KEY `idx_ai_log_user_created` (`userId`,`createdAt`),
  KEY `idx_ai_log_feature` (`feature`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `ai_generated_courses`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `ai_generated_courses`;
CREATE TABLE `ai_generated_courses` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `adminUserId` varchar(36) NOT NULL,
  `topic` varchar(255) NOT NULL,
  `targetAudience` varchar(255) NOT NULL,
  `difficulty` varchar(50) NOT NULL,
  `durationHours` int NOT NULL DEFAULT '10',
  `learningObjectives` json NOT NULL,
  `generatedStructure` json NOT NULL,
  `reviewStatus` enum('draft','reviewed','published','rejected') NOT NULL DEFAULT 'draft',
  `publishedCourseId` varchar(36) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `reviewedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ai_course_org_status` (`organizationId`,`reviewStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table structure for `ai_generated_quizzes`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `ai_generated_quizzes`;
CREATE TABLE `ai_generated_quizzes` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(36) NOT NULL,
  `adminUserId` varchar(36) NOT NULL,
  `courseId` varchar(36) NOT NULL,
  `lessonId` varchar(36) DEFAULT NULL,
  `questionsCount` int NOT NULL DEFAULT '5',
  `difficulty` varchar(50) NOT NULL DEFAULT 'intermediate',
  `generatedQuestions` json NOT NULL,
  `reviewStatus` enum('draft','reviewed','published','rejected') NOT NULL DEFAULT 'draft',
  `publishedAssessmentId` varchar(36) DEFAULT NULL,
  `createdAt` varchar(50) NOT NULL,
  `reviewedAt` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ai_quiz_org_status` (`organizationId`,`reviewStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
