/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { tableExists } from "./utils.js";

export const migration013: Migration = {
  id: "013_enterprise_integrations",
  name: "Enterprise Integrations Foundation (SSO, MFA, SCORM, xAPI, LTI, Webhooks, Public API, Import/Export)",

  async up(pool: Pool): Promise<void> {
    // 1. SSO Configurations (SAML 2.0 & OIDC)
    if (!(await tableExists(pool, "sso_configs"))) {
      console.log("[Migration 013] Creating sso_configs table...");
      await pool.query(`
        CREATE TABLE \`sso_configs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL UNIQUE,
          \`isEnabled\` TINYINT(1) NOT NULL DEFAULT 0,
          \`providerType\` ENUM('saml', 'oidc') NOT NULL DEFAULT 'saml',
          \`idpEntityId\` VARCHAR(255) NULL,
          \`idpSignInUrl\` VARCHAR(500) NULL,
          \`idpCertificate\` TEXT NULL,
          \`spEntityId\` VARCHAR(255) NOT NULL,
          \`spAcsUrl\` VARCHAR(500) NOT NULL,
          \`oidcIssuer\` VARCHAR(500) NULL,
          \`oidcClientId\` VARCHAR(255) NULL,
          \`oidcClientSecret\` VARCHAR(500) NULL,
          \`attributeMapping\` JSON NULL,
          \`enforceSso\` TINYINT(1) NOT NULL DEFAULT 0,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_sso_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 2. User MFA Settings (TOTP & Recovery Codes)
    if (!(await tableExists(pool, "user_mfa_settings"))) {
      console.log("[Migration 013] Creating user_mfa_settings table...");
      await pool.query(`
        CREATE TABLE \`user_mfa_settings\` (
          \`userId\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`isEnabled\` TINYINT(1) NOT NULL DEFAULT 0,
          \`totpSecret\` VARCHAR(255) NULL,
          \`recoveryCodesHash\` JSON NULL,
          \`enrolledAt\` VARCHAR(50) NULL,
          \`lastVerifiedAt\` VARCHAR(50) NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_mfa_org_user\` (\`organizationId\`, \`userId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. SCORM Packages (SCORM 1.2 & 2004)
    if (!(await tableExists(pool, "scorm_packages"))) {
      console.log("[Migration 013] Creating scorm_packages table...");
      await pool.query(`
        CREATE TABLE \`scorm_packages\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`courseId\` VARCHAR(36) NULL,
          \`title\` VARCHAR(255) NOT NULL,
          \`version\` ENUM('SCORM_12', 'SCORM_2004') NOT NULL DEFAULT 'SCORM_12',
          \`manifestData\` JSON NULL,
          \`entryPoint\` VARCHAR(500) NOT NULL,
          \`storageDir\` VARCHAR(500) NOT NULL,
          \`status\` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_scorm_org_course\` (\`organizationId\`, \`courseId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 4. SCORM Tracking & Runtime Environment Registrations
    if (!(await tableExists(pool, "scorm_registrations"))) {
      console.log("[Migration 013] Creating scorm_registrations table...");
      await pool.query(`
        CREATE TABLE \`scorm_registrations\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`scormPackageId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`lessonStatus\` VARCHAR(50) NOT NULL DEFAULT 'not attempted',
          \`rawScore\` DECIMAL(5,2) NULL,
          \`minScore\` DECIMAL(5,2) NULL,
          \`maxScore\` DECIMAL(5,2) NULL,
          \`lessonLocation\` VARCHAR(255) NULL,
          \`suspendData\` TEXT NULL,
          \`totalTimeSeconds\` INT NOT NULL DEFAULT 0,
          \`sessionTimeSeconds\` INT NOT NULL DEFAULT 0,
          \`completedAt\` VARCHAR(50) NULL,
          \`lastAccessedAt\` VARCHAR(50) NOT NULL,
          UNIQUE KEY \`uk_scorm_reg\` (\`scormPackageId\`, \`studentId\`),
          INDEX \`idx_scorm_org_student\` (\`organizationId\`, \`studentId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 5. xAPI Statements (Experience API / Tin Can)
    if (!(await tableExists(pool, "xapi_statements"))) {
      console.log("[Migration 013] Creating xapi_statements table...");
      await pool.query(`
        CREATE TABLE \`xapi_statements\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`actorEmail\` VARCHAR(255) NOT NULL,
          \`actorName\` VARCHAR(255) NULL,
          \`verbId\` VARCHAR(255) NOT NULL,
          \`verbDisplay\` VARCHAR(100) NOT NULL,
          \`activityId\` VARCHAR(500) NOT NULL,
          \`activityName\` VARCHAR(255) NULL,
          \`activityType\` VARCHAR(255) NULL,
          \`scaledScore\` DECIMAL(4,3) NULL,
          \`rawScore\` DECIMAL(6,2) NULL,
          \`success\` TINYINT(1) NULL,
          \`completion\` TINYINT(1) NULL,
          \`duration\` VARCHAR(50) NULL,
          \`context\` JSON NULL,
          \`statementJson\` JSON NOT NULL,
          \`timestamp\` VARCHAR(50) NOT NULL,
          \`storedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_xapi_org_actor\` (\`organizationId\`, \`actorEmail\`),
          INDEX \`idx_xapi_verb\` (\`verbId\`),
          INDEX \`idx_xapi_activity\` (\`activityId\`(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 6. xAPI External LRS Forwarder Destinations
    if (!(await tableExists(pool, "xapi_lrs_destinations"))) {
      console.log("[Migration 013] Creating xapi_lrs_destinations table...");
      await pool.query(`
        CREATE TABLE \`xapi_lrs_destinations\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`endpointUrl\` VARCHAR(500) NOT NULL,
          \`authKey\` VARCHAR(255) NOT NULL,
          \`authSecret\` VARCHAR(255) NOT NULL,
          \`isEnabled\` TINYINT(1) NOT NULL DEFAULT 1,
          \`createdAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_lrs_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 7. LTI Registrations (LTI 1.3 / Advantage)
    if (!(await tableExists(pool, "lti_registrations"))) {
      console.log("[Migration 013] Creating lti_registrations table...");
      await pool.query(`
        CREATE TABLE \`lti_registrations\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`version\` ENUM('LTI_13') NOT NULL DEFAULT 'LTI_13',
          \`issuer\` VARCHAR(500) NOT NULL,
          \`clientId\` VARCHAR(255) NOT NULL,
          \`deploymentId\` VARCHAR(255) NOT NULL,
          \`authLoginUrl\` VARCHAR(500) NOT NULL,
          \`authTokensUrl\` VARCHAR(500) NOT NULL,
          \`keyJwksUrl\` VARCHAR(500) NOT NULL,
          \`status\` ENUM('active', 'inactive', 'pending_configuration') NOT NULL DEFAULT 'pending_configuration',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_lti_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 8. Webhook Subscriptions
    if (!(await tableExists(pool, "webhook_subscriptions"))) {
      console.log("[Migration 013] Creating webhook_subscriptions table...");
      await pool.query(`
        CREATE TABLE \`webhook_subscriptions\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`targetUrl\` VARCHAR(500) NOT NULL,
          \`secretKey\` VARCHAR(255) NOT NULL,
          \`subscribedEvents\` JSON NOT NULL,
          \`status\` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_webhook_org\` (\`organizationId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 9. Webhook Deliveries Log
    if (!(await tableExists(pool, "webhook_deliveries"))) {
      console.log("[Migration 013] Creating webhook_deliveries table...");
      await pool.query(`
        CREATE TABLE \`webhook_deliveries\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`subscriptionId\` VARCHAR(36) NOT NULL,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`eventType\` VARCHAR(100) NOT NULL,
          \`payload\` JSON NOT NULL,
          \`statusCode\` INT NULL,
          \`responseBody\` TEXT NULL,
          \`attemptCount\` INT NOT NULL DEFAULT 1,
          \`status\` ENUM('success', 'failed', 'retrying') NOT NULL,
          \`durationMs\` INT NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_webhook_deliv_sub\` (\`subscriptionId\`),
          INDEX \`idx_webhook_deliv_org\` (\`organizationId\`, \`createdAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 10. Public API Keys
    if (!(await tableExists(pool, "api_keys"))) {
      console.log("[Migration 013] Creating api_keys table...");
      await pool.query(`
        CREATE TABLE \`api_keys\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`name\` VARCHAR(255) NOT NULL,
          \`keyPrefix\` VARCHAR(20) NOT NULL,
          \`keyHash\` VARCHAR(255) NOT NULL,
          \`scopes\` JSON NOT NULL,
          \`rateLimitPerMin\` INT NOT NULL DEFAULT 60,
          \`status\` ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
          \`expiresAt\` VARCHAR(50) NULL,
          \`lastUsedAt\` VARCHAR(50) NULL,
          \`createdBy\` VARCHAR(36) NOT NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_api_keys_org\` (\`organizationId\`),
          INDEX \`idx_api_keys_hash\` (\`keyHash\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 11. Bulk Integration Jobs (Import / Export)
    if (!(await tableExists(pool, "integration_jobs"))) {
      console.log("[Migration 013] Creating integration_jobs table...");
      await pool.query(`
        CREATE TABLE \`integration_jobs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`jobType\` ENUM('import', 'export') NOT NULL,
          \`entityType\` ENUM('users', 'courses', 'groups', 'enrollments', 'assessments', 'results') NOT NULL,
          \`status\` ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
          \`totalRecords\` INT NOT NULL DEFAULT 0,
          \`processedRecords\` INT NOT NULL DEFAULT 0,
          \`successRecords\` INT NOT NULL DEFAULT 0,
          \`failedRecords\` INT NOT NULL DEFAULT 0,
          \`errorsLog\` JSON NULL,
          \`fileUrl\` VARCHAR(500) NULL,
          \`createdBy\` VARCHAR(36) NOT NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`completedAt\` VARCHAR(50) NULL,
          INDEX \`idx_int_jobs_org\` (\`organizationId\`, \`createdAt\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    console.log("[Migration 013] Enterprise Integration Foundation tables successfully created.");
  },

  async down(pool: Pool): Promise<void> {
    console.log("[Migration 013] Dropping Enterprise Integration Foundation tables...");
    await pool.query("DROP TABLE IF EXISTS `integration_jobs`");
    await pool.query("DROP TABLE IF EXISTS `api_keys`");
    await pool.query("DROP TABLE IF EXISTS `webhook_deliveries`");
    await pool.query("DROP TABLE IF EXISTS `webhook_subscriptions`");
    await pool.query("DROP TABLE IF EXISTS `lti_registrations`");
    await pool.query("DROP TABLE IF EXISTS `xapi_lrs_destinations`");
    await pool.query("DROP TABLE IF EXISTS `xapi_statements`");
    await pool.query("DROP TABLE IF EXISTS `scorm_registrations`");
    await pool.query("DROP TABLE IF EXISTS `scorm_packages`");
    await pool.query("DROP TABLE IF EXISTS `user_mfa_settings`");
    await pool.query("DROP TABLE IF EXISTS `sso_configs`");
    console.log("[Migration 013] Rollback completed.");
  }
};
