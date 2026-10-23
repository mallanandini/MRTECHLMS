/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pool } from "mysql2/promise";
import { Migration } from "./types.js";
import { tableExists, indexExists } from "./utils.js";

export const migration012: Migration = {
  id: "012_gamification_system",
  name: "Gamification System Points Ledger Badges Streaks and Leaderboards",
  up: async (pool: Pool) => {
    console.log("[Migration 012] Creating Gamification System tables...");

    // 1. Organization Gamification Configurations
    if (!(await tableExists(pool, "gamification_configs"))) {
      console.log("[Migration 012] Creating gamification_configs table...");
      await pool.query(`
        CREATE TABLE \`gamification_configs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) UNIQUE NOT NULL,
          \`isEnabled\` TINYINT(1) NOT NULL DEFAULT 0,
          \`pointsLessonComplete\` INT NOT NULL DEFAULT 10,
          \`pointsCourseComplete\` INT NOT NULL DEFAULT 100,
          \`pointsAssessmentPass\` INT NOT NULL DEFAULT 50,
          \`pointsLearningPathComplete\` INT NOT NULL DEFAULT 200,
          \`pointsCodingChallengeSolve\` INT NOT NULL DEFAULT 30,
          \`pointsDailyStreakBonus\` INT NOT NULL DEFAULT 15,
          \`leaderboardEnabled\` TINYINT(1) NOT NULL DEFAULT 1,
          \`leaderboardScope\` ENUM('organization', 'department', 'cohort', 'group') NOT NULL DEFAULT 'organization',
          \`leaderboardAnonymity\` ENUM('real_name', 'partial_name', 'optional_anonymous') NOT NULL DEFAULT 'optional_anonymous',
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_gamif_cfg_org\` (\`organizationId\`, \`isEnabled\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed default config for default organization
      const now = new Date().toISOString();
      await pool.query(`
        INSERT IGNORE INTO \`gamification_configs\` 
        (\`id\`, \`organizationId\`, \`isEnabled\`, \`pointsLessonComplete\`, \`pointsCourseComplete\`, \`pointsAssessmentPass\`, \`pointsLearningPathComplete\`, \`pointsCodingChallengeSolve\`, \`pointsDailyStreakBonus\`, \`leaderboardEnabled\`, \`leaderboardScope\`, \`leaderboardAnonymity\`, \`createdAt\`, \`updatedAt\`)
        VALUES 
        ('cfg-gamif-default', 'org-default', 1, 10, 100, 50, 200, 30, 15, 1, 'organization', 'optional_anonymous', ?, ?);
      `, [now, now]);
    }

    // 2. Student Gamification Profiles
    if (!(await tableExists(pool, "gamification_profiles"))) {
      console.log("[Migration 012] Creating gamification_profiles table...");
      await pool.query(`
        CREATE TABLE \`gamification_profiles\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`totalPoints\` INT NOT NULL DEFAULT 0,
          \`currentStreakDays\` INT NOT NULL DEFAULT 0,
          \`longestStreakDays\` INT NOT NULL DEFAULT 0,
          \`lastActiveDate\` VARCHAR(10) NULL,
          \`tier\` ENUM('novice', 'apprentice', 'scholar', 'master', 'grandmaster', 'legend') NOT NULL DEFAULT 'novice',
          \`leaderboardAnonymous\` TINYINT(1) NOT NULL DEFAULT 0,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          UNIQUE KEY \`uk_gamif_student_org\` (\`studentId\`, \`organizationId\`),
          INDEX \`idx_gamif_org_points\` (\`organizationId\`, \`totalPoints\` DESC),
          INDEX \`idx_gamif_org_streak\` (\`organizationId\`, \`currentStreakDays\` DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 3. Points Ledger (Audit Trail of all points transactions)
    if (!(await tableExists(pool, "gamification_points_ledger"))) {
      console.log("[Migration 012] Creating gamification_points_ledger table...");
      await pool.query(`
        CREATE TABLE \`gamification_points_ledger\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`eventType\` ENUM('lesson_completed', 'course_completed', 'assessment_passed', 'learning_path_completed', 'coding_solved', 'streak_bonus', 'manual_adjustment', 'badge_unlocked') NOT NULL,
          \`eventReferenceId\` VARCHAR(100) NULL,
          \`points\` INT NOT NULL,
          \`balanceAfter\` INT NOT NULL,
          \`description\` VARCHAR(255) NOT NULL,
          \`metadata\` JSON NULL,
          \`awardedBy\` VARCHAR(36) NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          INDEX \`idx_ledger_student_created\` (\`studentId\`, \`organizationId\`, \`createdAt\` DESC),
          INDEX \`idx_ledger_event_ref\` (\`studentId\`, \`eventType\`, \`eventReferenceId\`),
          INDEX \`idx_ledger_org_created\` (\`organizationId\`, \`createdAt\` DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 4. Badges Definition Table
    if (!(await tableExists(pool, "gamification_badges"))) {
      console.log("[Migration 012] Creating gamification_badges table...");
      await pool.query(`
        CREATE TABLE \`gamification_badges\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`code\` VARCHAR(50) NOT NULL,
          \`name\` VARCHAR(100) NOT NULL,
          \`description\` TEXT NOT NULL,
          \`icon\` VARCHAR(50) NOT NULL DEFAULT 'Award',
          \`tier\` ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') NOT NULL DEFAULT 'bronze',
          \`criteriaType\` ENUM('lessons_completed', 'courses_completed', 'assessments_passed', 'streak_days', 'points_earned', 'coding_solved', 'manual') NOT NULL,
          \`criteriaThreshold\` INT NOT NULL DEFAULT 1,
          \`bonusPoints\` INT NOT NULL DEFAULT 0,
          \`status\` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
          \`isSystem\` TINYINT(1) NOT NULL DEFAULT 0,
          \`createdAt\` VARCHAR(50) NOT NULL,
          \`updatedAt\` VARCHAR(50) NOT NULL,
          UNIQUE KEY \`uk_gamif_badge_code_org\` (\`code\`, \`organizationId\`),
          INDEX \`idx_badge_org_status\` (\`organizationId\`, \`status\`, \`criteriaType\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed Standard System Badges
      const now = new Date().toISOString();
      const systemBadges = [
        ['badge-first-lesson', 'org-default', 'first_lesson', 'First Step', 'Completed your very first learning lesson', 'Footprints', 'bronze', 'lessons_completed', 1, 10, 'active', 1, now, now],
        ['badge-curious-mind', 'org-default', 'curious_mind_10', 'Curious Mind', 'Mastered 10 individual curriculum lessons', 'BookOpen', 'silver', 'lessons_completed', 10, 25, 'active', 1, now, now],
        ['badge-knowledge-sponge', 'org-default', 'knowledge_sponge_50', 'Knowledge Sponge', 'Mastered 50 comprehensive course topics', 'GraduationCap', 'gold', 'lessons_completed', 50, 100, 'active', 1, now, now],
        ['badge-course-finisher', 'org-default', 'course_finisher_1', 'Course Champion', 'Graduated from your first complete course', 'Trophy', 'bronze', 'courses_completed', 1, 50, 'active', 1, now, now],
        ['badge-triple-threat', 'org-default', 'triple_threat_3', 'Triple Threat', 'Successfully completed 3 full courses', 'Crown', 'silver', 'courses_completed', 3, 150, 'active', 1, now, now],
        ['badge-quiz-ace', 'org-default', 'quiz_ace_1', 'Quiz Ace', 'Successfully passed a formal evaluation assessment', 'Award', 'bronze', 'assessments_passed', 1, 25, 'active', 1, now, now],
        ['badge-assessment-master', 'org-default', 'assessment_master_5', 'Assessment Master', 'Passed 5 formal evaluation assessments', 'ShieldCheck', 'gold', 'assessments_passed', 5, 100, 'active', 1, now, now],
        ['badge-streak-3', 'org-default', 'streak_starter_3', 'Momentum Starter', 'Maintained a 3-day continuous learning streak', 'Flame', 'bronze', 'streak_days', 3, 20, 'active', 1, now, now],
        ['badge-streak-7', 'org-default', 'streak_fire_7', 'Week of Fire', 'Maintained a 7-day daily learning streak', 'Flame', 'silver', 'streak_days', 7, 50, 'active', 1, now, now],
        ['badge-streak-30', 'org-default', 'streak_unstoppable_30', 'Unstoppable Habit', 'Achieved an extraordinary 30-day streak', 'Zap', 'platinum', 'streak_days', 30, 250, 'active', 1, now, now],
        ['badge-code-first', 'org-default', 'code_warrior_1', 'Code Warrior', 'Solved and passed an interactive coding challenge', 'Code', 'bronze', 'coding_solved', 1, 25, 'active', 1, now, now],
        ['badge-point-pioneer', 'org-default', 'point_pioneer_500', 'Point Pioneer', 'Accumulated 500 total mastery points', 'Target', 'silver', 'points_earned', 500, 50, 'active', 1, now, now]
      ];

      for (const b of systemBadges) {
        await pool.query(`
          INSERT IGNORE INTO \`gamification_badges\`
          (\`id\`, \`organizationId\`, \`code\`, \`name\`, \`description\`, \`icon\`, \`tier\`, \`criteriaType\`, \`criteriaThreshold\`, \`bonusPoints\`, \`status\`, \`isSystem\`, \`createdAt\`, \`updatedAt\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `, b);
      }
    }

    // 5. Student Earned & Revoked Badges
    if (!(await tableExists(pool, "gamification_student_badges"))) {
      console.log("[Migration 012] Creating gamification_student_badges table...");
      await pool.query(`
        CREATE TABLE \`gamification_student_badges\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`badgeId\` VARCHAR(36) NOT NULL,
          \`awardedAt\` VARCHAR(50) NOT NULL,
          \`awardedBy\` VARCHAR(36) NULL,
          \`isRevoked\` TINYINT(1) NOT NULL DEFAULT 0,
          \`revokedAt\` VARCHAR(50) NULL,
          \`revokedBy\` VARCHAR(36) NULL,
          \`revocationReason\` TEXT NULL,
          UNIQUE KEY \`uk_gamif_student_badge\` (\`studentId\`, \`badgeId\`, \`organizationId\`),
          INDEX \`idx_student_badge_active\` (\`studentId\`, \`organizationId\`, \`isRevoked\`),
          INDEX \`idx_badge_awards\` (\`badgeId\`, \`isRevoked\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    // 6. Streak Activity Logs (Prevents Duplicate Daily Credit & Handles Timezones)
    if (!(await tableExists(pool, "gamification_streak_logs"))) {
      console.log("[Migration 012] Creating gamification_streak_logs table...");
      await pool.query(`
        CREATE TABLE \`gamification_streak_logs\` (
          \`id\` VARCHAR(36) PRIMARY KEY,
          \`organizationId\` VARCHAR(36) NOT NULL,
          \`studentId\` VARCHAR(36) NOT NULL,
          \`activityDate\` VARCHAR(10) NOT NULL,
          \`activityType\` VARCHAR(50) NOT NULL,
          \`activityRefId\` VARCHAR(100) NOT NULL,
          \`createdAt\` VARCHAR(50) NOT NULL,
          UNIQUE KEY \`uk_gamif_student_date\` (\`studentId\`, \`activityDate\`),
          INDEX \`idx_streak_org_date\` (\`organizationId\`, \`activityDate\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    console.log("[Migration 012] Gamification System tables successfully created.");
  },
  down: async (pool: Pool) => {
    console.log("[Migration 012] Rolling back Gamification System tables...");
    await pool.query("DROP TABLE IF EXISTS `gamification_streak_logs`;");
    await pool.query("DROP TABLE IF EXISTS `gamification_student_badges`;");
    await pool.query("DROP TABLE IF EXISTS `gamification_badges`;");
    await pool.query("DROP TABLE IF EXISTS `gamification_points_ledger`;");
    await pool.query("DROP TABLE IF EXISTS `gamification_profiles`;");
    await pool.query("DROP TABLE IF EXISTS `gamification_configs`;");
  }
};
