/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../mysql.js";
import { randomUUID } from "crypto";
import { logAuditEvent } from "../audit.js";

export interface GamificationConfig {
  id: string;
  organizationId: string;
  isEnabled: boolean;
  pointsLessonComplete: number;
  pointsCourseComplete: number;
  pointsAssessmentPass: number;
  pointsLearningPathComplete: number;
  pointsCodingChallengeSolve: number;
  pointsDailyStreakBonus: number;
  leaderboardEnabled: boolean;
  leaderboardScope: "organization" | "department" | "cohort" | "group";
  leaderboardAnonymity: "real_name" | "partial_name" | "optional_anonymous";
  createdAt: string;
  updatedAt: string;
}

export type GamificationEventType = 
  | "lesson_completed" 
  | "course_completed" 
  | "assessment_passed" 
  | "learning_path_completed" 
  | "coding_solved" 
  | "streak_bonus" 
  | "manual_adjustment" 
  | "badge_unlocked";

export type GamificationTier = 
  | "novice" 
  | "apprentice" 
  | "scholar" 
  | "master" 
  | "grandmaster" 
  | "legend";

export class GamificationService {

  // =========================================================================
  // 1. CONFIGURATION & ENABLEMENT
  // =========================================================================

  /**
   * Fetch organization gamification configuration.
   * If none exists, creates default configuration.
   */
  public static async getOrgConfig(organizationId: string): Promise<GamificationConfig> {
    const [rows]: any = await pool.query(
      `SELECT * FROM gamification_configs WHERE organizationId = ?`,
      [organizationId]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        organizationId: r.organizationId,
        isEnabled: Boolean(r.isEnabled),
        pointsLessonComplete: Number(r.pointsLessonComplete) || 10,
        pointsCourseComplete: Number(r.pointsCourseComplete) || 100,
        pointsAssessmentPass: Number(r.pointsAssessmentPass) || 50,
        pointsLearningPathComplete: Number(r.pointsLearningPathComplete) || 200,
        pointsCodingChallengeSolve: Number(r.pointsCodingChallengeSolve) || 30,
        pointsDailyStreakBonus: Number(r.pointsDailyStreakBonus) || 15,
        leaderboardEnabled: Boolean(r.leaderboardEnabled),
        leaderboardScope: r.leaderboardScope || "organization",
        leaderboardAnonymity: r.leaderboardAnonymity || "optional_anonymous",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    }

    // Create default config for this organization (disabled by default for new orgs)
    const newId = randomUUID();
    const now = new Date().toISOString();
    const isDefaultOrg = organizationId === "org-default";
    const initialEnabled = isDefaultOrg ? 1 : 0;

    await pool.query(
      `INSERT INTO gamification_configs 
       (id, organizationId, isEnabled, pointsLessonComplete, pointsCourseComplete, pointsAssessmentPass, pointsLearningPathComplete, pointsCodingChallengeSolve, pointsDailyStreakBonus, leaderboardEnabled, leaderboardScope, leaderboardAnonymity, createdAt, updatedAt)
       VALUES (?, ?, ?, 10, 100, 50, 200, 30, 15, 1, 'organization', 'optional_anonymous', ?, ?)`,
      [newId, organizationId, initialEnabled, now, now]
    );

    return {
      id: newId,
      organizationId,
      isEnabled: Boolean(initialEnabled),
      pointsLessonComplete: 10,
      pointsCourseComplete: 100,
      pointsAssessmentPass: 50,
      pointsLearningPathComplete: 200,
      pointsCodingChallengeSolve: 30,
      pointsDailyStreakBonus: 15,
      leaderboardEnabled: true,
      leaderboardScope: "organization",
      leaderboardAnonymity: "optional_anonymous",
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update organization gamification configuration (Admin only)
   */
  public static async updateOrgConfig(
    organizationId: string,
    updates: Partial<GamificationConfig>,
    actor: { id: string; email: string; role: string }
  ): Promise<GamificationConfig> {
    const current = await this.getOrgConfig(organizationId);
    const now = new Date().toISOString();

    const newEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (current.isEnabled ? 1 : 0);
    const newLessonPts = updates.pointsLessonComplete !== undefined ? Math.max(0, updates.pointsLessonComplete) : current.pointsLessonComplete;
    const newCoursePts = updates.pointsCourseComplete !== undefined ? Math.max(0, updates.pointsCourseComplete) : current.pointsCourseComplete;
    const newAssPts = updates.pointsAssessmentPass !== undefined ? Math.max(0, updates.pointsAssessmentPass) : current.pointsAssessmentPass;
    const newLpPts = updates.pointsLearningPathComplete !== undefined ? Math.max(0, updates.pointsLearningPathComplete) : current.pointsLearningPathComplete;
    const newCodePts = updates.pointsCodingChallengeSolve !== undefined ? Math.max(0, updates.pointsCodingChallengeSolve) : current.pointsCodingChallengeSolve;
    const newStreakPts = updates.pointsDailyStreakBonus !== undefined ? Math.max(0, updates.pointsDailyStreakBonus) : current.pointsDailyStreakBonus;
    const newLbEnabled = updates.leaderboardEnabled !== undefined ? (updates.leaderboardEnabled ? 1 : 0) : (current.leaderboardEnabled ? 1 : 0);
    const newLbScope = updates.leaderboardScope || current.leaderboardScope;
    const newLbAnonymity = updates.leaderboardAnonymity || current.leaderboardAnonymity;

    await pool.query(
      `UPDATE gamification_configs SET
        isEnabled = ?,
        pointsLessonComplete = ?,
        pointsCourseComplete = ?,
        pointsAssessmentPass = ?,
        pointsLearningPathComplete = ?,
        pointsCodingChallengeSolve = ?,
        pointsDailyStreakBonus = ?,
        leaderboardEnabled = ?,
        leaderboardScope = ?,
        leaderboardAnonymity = ?,
        updatedAt = ?
       WHERE organizationId = ?`,
      [
        newEnabled, newLessonPts, newCoursePts, newAssPts, newLpPts, newCodePts, newStreakPts,
        newLbEnabled, newLbScope, newLbAnonymity, now, organizationId
      ]
    );

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "gamification_config_updated",
      resourceType: "gamification_config",
      resourceId: current.id,
      details: { updates, previous: current }
    });

    return this.getOrgConfig(organizationId);
  }

  /**
   * Helper to check if gamification is enabled for an organization
   */
  public static async isGamificationEnabled(organizationId: string): Promise<boolean> {
    const config = await this.getOrgConfig(organizationId);
    return config.isEnabled;
  }

  // =========================================================================
  // 2. STUDENT GAMIFICATION PROFILE & TIER CALCULATION
  // =========================================================================

  public static calculateTier(points: number): GamificationTier {
    if (points >= 5000) return "legend";
    if (points >= 3000) return "grandmaster";
    if (points >= 1500) return "master";
    if (points >= 500) return "scholar";
    if (points >= 100) return "apprentice";
    return "novice";
  }

  /**
   * Retrieve or create student gamification profile
   */
  public static async getOrCreateProfile(studentId: string, organizationId: string) {
    const [rows]: any = await pool.query(
      `SELECT * FROM gamification_profiles WHERE studentId = ? AND organizationId = ?`,
      [studentId, organizationId]
    );

    if (rows && rows.length > 0) {
      return rows[0];
    }

    const newId = randomUUID();
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO gamification_profiles 
       (id, organizationId, studentId, totalPoints, currentStreakDays, longestStreakDays, lastActiveDate, tier, leaderboardAnonymous, createdAt, updatedAt)
       VALUES (?, ?, ?, 0, 0, 0, NULL, 'novice', 0, ?, ?)
       ON DUPLICATE KEY UPDATE updatedAt = VALUES(updatedAt)`,
      [newId, organizationId, studentId, now, now]
    );

    const [created]: any = await pool.query(
      `SELECT * FROM gamification_profiles WHERE studentId = ? AND organizationId = ?`,
      [studentId, organizationId]
    );
    return created[0];
  }

  // =========================================================================
  // 3. CONTROLLED SERVER-SIDE POINTS AWARDING & LEDGER
  // =========================================================================

  /**
   * Server-side controlled points award.
   * Idempotent: will NOT award duplicate points for the same reference event.
   */
  public static async awardPointsForEvent(params: {
    organizationId: string;
    studentId: string;
    eventType: GamificationEventType;
    eventReferenceId?: string;
    description?: string;
    metadata?: any;
    customPoints?: number;
    awardedBy?: string;
    timezone?: string;
  }): Promise<{
    awarded: boolean;
    reason?: string;
    pointsAwarded: number;
    totalBalance: number;
    streak?: { currentStreak: number; longestStreak: number; isDailyFirst: boolean };
    unlockedBadges?: any[];
  }> {
    const { organizationId, studentId, eventType, eventReferenceId, metadata, customPoints, awardedBy, timezone } = params;

    // Check if gamification is enabled for this organization
    const config = await this.getOrgConfig(organizationId);
    if (!config.isEnabled) {
      return { awarded: false, reason: "Gamification disabled for organization", pointsAwarded: 0, totalBalance: 0 };
    }

    // Idempotency check: prevent duplicate credit for the same reference event
    if (eventReferenceId && eventType !== "manual_adjustment") {
      const [existing]: any = await pool.query(
        `SELECT id, points, balanceAfter FROM gamification_points_ledger 
         WHERE studentId = ? AND eventType = ? AND eventReferenceId = ?`,
        [studentId, eventType, eventReferenceId]
      );
      if (existing && existing.length > 0) {
        const profile = await this.getOrCreateProfile(studentId, organizationId);
        return {
          awarded: false,
          reason: "Points already awarded for this activity",
          pointsAwarded: 0,
          totalBalance: profile.totalPoints
        };
      }
    }

    // Determine points to award
    let points = 0;
    if (customPoints !== undefined) {
      points = customPoints;
    } else {
      switch (eventType) {
        case "lesson_completed":
          points = config.pointsLessonComplete;
          break;
        case "course_completed":
          points = config.pointsCourseComplete;
          break;
        case "assessment_passed":
          points = config.pointsAssessmentPass;
          break;
        case "learning_path_completed":
          points = config.pointsLearningPathComplete;
          break;
        case "coding_solved":
          points = config.pointsCodingChallengeSolve;
          break;
        case "streak_bonus":
          points = config.pointsDailyStreakBonus;
          break;
        case "badge_unlocked":
          points = metadata?.bonusPoints || 0;
          break;
        default:
          points = 0;
      }
    }

    if (points === 0 && eventType !== "badge_unlocked") {
      const profile = await this.getOrCreateProfile(studentId, organizationId);
      return { awarded: false, reason: "Configured points for event is 0", pointsAwarded: 0, totalBalance: profile.totalPoints };
    }

    const now = new Date().toISOString();

    // Get current profile and calculate new balance
    const profile = await this.getOrCreateProfile(studentId, organizationId);
    const newBalance = Math.max(0, Number(profile.totalPoints) + points);
    const newTier = this.calculateTier(newBalance);

    // Update profile
    await pool.query(
      `UPDATE gamification_profiles 
       SET totalPoints = ?, tier = ?, updatedAt = ?
       WHERE studentId = ? AND organizationId = ?`,
      [newBalance, newTier, now, studentId, organizationId]
    );

    // Default descriptions if omitted
    let desc = params.description;
    if (!desc) {
      switch (eventType) {
        case "lesson_completed": desc = `Completed lesson "${metadata?.title || 'Topic'}"`; break;
        case "course_completed": desc = `Completed course "${metadata?.title || 'Course'}"`; break;
        case "assessment_passed": desc = `Passed assessment "${metadata?.title || 'Exam'}" (${metadata?.percentage || 100}%)`; break;
        case "learning_path_completed": desc = `Completed learning path "${metadata?.title || 'Curriculum'}"`; break;
        case "coding_solved": desc = `Solved coding problem "${metadata?.title || 'Challenge'}"`; break;
        case "streak_bonus": desc = `Daily learning momentum streak bonus`; break;
        case "badge_unlocked": desc = `Earned badge: ${metadata?.badgeName || 'Achievement'}`; break;
        case "manual_adjustment": desc = `Administrator manual adjustment`; break;
        default: desc = `Gamification points award`;
      }
    }

    // Insert into points ledger
    const ledgerId = randomUUID();
    await pool.query(
      `INSERT INTO gamification_points_ledger 
       (id, organizationId, studentId, eventType, eventReferenceId, points, balanceAfter, description, metadata, awardedBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ledgerId, organizationId, studentId, eventType,
        eventReferenceId || null, points, newBalance, desc,
        metadata ? JSON.stringify(metadata) : null,
        awardedBy || null, now
      ]
    );

    // Update daily streak
    let streakResult: any = null;
    if (eventType !== "manual_adjustment" && eventType !== "badge_unlocked") {
      streakResult = await this.recordDailyStreak(studentId, organizationId, eventType, eventReferenceId || "general", timezone);
    }

    // Evaluate badge criteria
    const unlockedBadges = await this.evaluateBadgeCriteria(studentId, organizationId);

    return {
      awarded: true,
      pointsAwarded: points,
      totalBalance: newBalance,
      streak: streakResult,
      unlockedBadges
    };
  }

  // =========================================================================
  // 4. STREAK ENGINE (TIMEZONE-AWARE & DUPLICATE PREVENTION)
  // =========================================================================

  /**
   * Record daily activity for streak credit.
   * Uses student's local timezone to determine the calendar day (YYYY-MM-DD).
   * Strictly prevents duplicate credit on the same day.
   */
  public static async recordDailyStreak(
    studentId: string,
    organizationId: string,
    activityType: string = "general_activity",
    activityRefId: string = "activity_ref",
    timezone: string = "UTC"
  ): Promise<{ currentStreak: number; longestStreak: number; isDailyFirst: boolean }> {
    // Determine student date in specified timezone
    let dateStr: string;
    let yesterdayStr: string;
    try {
      const now = new Date();
      dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "UTC" }).format(now);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      yesterdayStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "UTC" }).format(yesterday);
    } catch (e) {
      // Fallback to UTC if timezone string is invalid
      dateStr = new Date().toISOString().substring(0, 10);
      yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    }

    const profile = await this.getOrCreateProfile(studentId, organizationId);
    let currentStreak = Number(profile.currentStreakDays) || 0;
    let longestStreak = Number(profile.longestStreakDays) || 0;
    const lastActive = profile.lastActiveDate;

    // Check if activity was already recorded today
    const nowIso = new Date().toISOString();
    const safeType = activityType || "general_activity";
    const safeRef = activityRefId || "activity_ref";
    try {
      await pool.query(
        `INSERT INTO gamification_streak_logs 
         (id, organizationId, studentId, activityDate, activityType, activityRefId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), organizationId, studentId, dateStr, safeType, safeRef, nowIso]
      );
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY" || err.message?.includes("Duplicate entry")) {
        // Activity already credited for today! Return without incrementing streak.
        return {
          currentStreak,
          longestStreak,
          isDailyFirst: false
        };
      }
      throw err;
    }

    // First activity of today!
    if (!lastActive) {
      // First ever activity
      currentStreak = 1;
    } else if (lastActive === dateStr) {
      // Same day, streak already maintained
    } else if (lastActive === yesterdayStr) {
      // Yesterday was active: increment consecutive streak!
      currentStreak += 1;
    } else {
      // More than 1 day elapsed: streak broke and resets to 1
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    await pool.query(
      `UPDATE gamification_profiles 
       SET currentStreakDays = ?, longestStreakDays = ?, lastActiveDate = ?, updatedAt = ?
       WHERE studentId = ? AND organizationId = ?`,
      [currentStreak, longestStreak, dateStr, nowIso, studentId, organizationId]
    );

    return {
      currentStreak,
      longestStreak,
      isDailyFirst: true
    };
  }

  // =========================================================================
  // 5. BADGES MANAGEMENT & AUTOMATIC CRITERIA EVALUATION
  // =========================================================================

  /**
   * Evaluates all active badges for the organization and awards eligible badges.
   */
  public static async evaluateBadgeCriteria(studentId: string, organizationId: string): Promise<any[]> {
    // 1. Gather learner performance stats
    const [progRows]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM progress WHERE studentId = ? AND completed = 1`,
      [studentId]
    );
    const lessonsCompleted = Number(progRows[0]?.cnt) || 0;

    const [enrRows]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM enrollments WHERE studentId = ? AND (status = 'completed' OR progressPercentage >= 100) AND deletedAt IS NULL`,
      [studentId]
    );
    const coursesCompleted = Number(enrRows[0]?.cnt) || 0;

    const [subRows]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM submissions WHERE studentId = ? AND passed = 1`,
      [studentId]
    );
    const assessmentsPassed = Number(subRows[0]?.cnt) || 0;

    const [codeRows]: any = await pool.query(
      `SELECT COUNT(id) AS cnt FROM coding_submissions WHERE studentId = ? AND status = 'passed'`,
      [studentId]
    );
    const codingSolved = Number(codeRows[0]?.cnt) || 0;

    const profile = await this.getOrCreateProfile(studentId, organizationId);
    const streakDays = Number(profile.currentStreakDays) || 0;
    const totalPoints = Number(profile.totalPoints) || 0;

    // 2. Fetch badges not yet awarded to student
    const [eligibleBadges]: any = await pool.query(
      `SELECT b.* 
       FROM gamification_badges b
       LEFT JOIN gamification_student_badges sb 
         ON b.id = sb.badgeId AND sb.studentId = ? AND sb.organizationId = ? AND sb.isRevoked = 0
       WHERE (b.organizationId = ? OR b.organizationId = 'org-default')
         AND b.status = 'active'
         AND b.criteriaType != 'manual'
         AND sb.id IS NULL`,
      [studentId, organizationId, organizationId]
    );

    const newlyAwarded: any[] = [];
    const now = new Date().toISOString();

    for (const badge of eligibleBadges) {
      let meetsCriteria = false;
      const threshold = Number(badge.criteriaThreshold);

      switch (badge.criteriaType) {
        case "lessons_completed":
          meetsCriteria = lessonsCompleted >= threshold;
          break;
        case "courses_completed":
          meetsCriteria = coursesCompleted >= threshold;
          break;
        case "assessments_passed":
          meetsCriteria = assessmentsPassed >= threshold;
          break;
        case "coding_solved":
          meetsCriteria = codingSolved >= threshold;
          break;
        case "streak_days":
          meetsCriteria = streakDays >= threshold;
          break;
        case "points_earned":
          meetsCriteria = totalPoints >= threshold;
          break;
      }

      if (meetsCriteria) {
        const studentBadgeId = randomUUID();
        await pool.query(
          `INSERT INTO gamification_student_badges 
           (id, organizationId, studentId, badgeId, awardedAt, awardedBy, isRevoked)
           VALUES (?, ?, ?, ?, ?, 'system', 0)
           ON DUPLICATE KEY UPDATE isRevoked = 0, revokedAt = NULL`,
          [studentBadgeId, organizationId, studentId, badge.id, now]
        );

        // Award badge bonus points if configured
        const bonusPts = Number(badge.bonusPoints) || 0;
        if (bonusPts > 0) {
          const ledgerId = randomUUID();
          const newBal = totalPoints + bonusPts;
          await pool.query(
            `UPDATE gamification_profiles SET totalPoints = totalPoints + ?, updatedAt = ? WHERE studentId = ? AND organizationId = ?`,
            [bonusPts, now, studentId, organizationId]
          );
          await pool.query(
            `INSERT INTO gamification_points_ledger 
             (id, organizationId, studentId, eventType, eventReferenceId, points, balanceAfter, description, metadata, awardedBy, createdAt)
             VALUES (?, ?, ?, 'badge_unlocked', ?, ?, ?, ?, ?, 'system', ?)`,
            [
              ledgerId, organizationId, studentId, badge.id, bonusPts, newBal,
              `Unlocked Achievement: "${badge.name}"`, JSON.stringify({ badgeId: badge.id, badgeCode: badge.code }),
              now
            ]
          );
        }

        newlyAwarded.push({
          id: badge.id,
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          tier: badge.tier,
          bonusPoints: bonusPts
        });
      }
    }

    return newlyAwarded;
  }

  /**
   * List all badges for an organization, indicating whether a given student has earned them.
   */
  public static async listBadges(organizationId: string, studentId?: string) {
    const [badges]: any = await pool.query(
      `SELECT b.*,
        (SELECT COUNT(id) FROM gamification_student_badges sb WHERE sb.badgeId = b.id AND sb.isRevoked = 0) AS totalIssued
       FROM gamification_badges b
       WHERE (b.organizationId = ? OR b.organizationId = 'org-default')
       ORDER BY b.tier ASC, b.criteriaThreshold ASC`,
      [organizationId]
    );

    let studentAwardsMap = new Map<string, any>();
    if (studentId) {
      const [awards]: any = await pool.query(
        `SELECT sb.*, u.name AS awardedByName 
         FROM gamification_student_badges sb
         LEFT JOIN users u ON sb.awardedBy = u.id
         WHERE sb.studentId = ? AND sb.organizationId = ?`,
        [studentId, organizationId]
      );
      awards.forEach((a: any) => studentAwardsMap.set(a.badgeId, a));
    }

    return badges.map((b: any) => {
      const studentAward = studentAwardsMap.get(b.id);
      return {
        id: b.id,
        code: b.code,
        name: b.name,
        description: b.description,
        icon: b.icon,
        tier: b.tier,
        criteriaType: b.criteriaType,
        criteriaThreshold: Number(b.criteriaThreshold),
        bonusPoints: Number(b.bonusPoints),
        status: b.status,
        isSystem: Boolean(b.isSystem),
        totalIssued: Number(b.totalIssued) || 0,
        isEarned: studentAward ? !studentAward.isRevoked : false,
        earnedAt: studentAward && !studentAward.isRevoked ? studentAward.awardedAt : null,
        isRevoked: studentAward ? Boolean(studentAward.isRevoked) : false,
        revocationReason: studentAward?.revocationReason || null
      };
    });
  }

  /**
   * Define a new custom badge (Admin)
   */
  public static async createBadge(data: {
    organizationId: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
    criteriaType: string;
    criteriaThreshold: number;
    bonusPoints: number;
  }, actor: { id: string; email: string; role: string }) {
    const id = randomUUID();
    const code = data.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO gamification_badges 
       (id, organizationId, code, name, description, icon, tier, criteriaType, criteriaThreshold, bonusPoints, status, isSystem, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?)`,
      [
        id, data.organizationId, code, data.name, data.description,
        data.icon || "Award", data.tier || "bronze", data.criteriaType,
        data.criteriaThreshold || 1, data.bonusPoints || 0, now, now
      ]
    );

    await logAuditEvent({
      organizationId: data.organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "gamification_badge_created",
      resourceType: "gamification_badge",
      resourceId: id,
      details: { code, name: data.name, criteriaType: data.criteriaType }
    });

    return { id, code, ...data, status: "active", isSystem: false, createdAt: now, updatedAt: now };
  }

  /**
   * Manually issue a badge to a student (Admin)
   */
  public static async issueBadgeManual(
    badgeId: string,
    studentId: string,
    organizationId: string,
    actor: { id: string; email: string; role: string },
    note?: string
  ) {
    const [badgeRows]: any = await pool.query(`SELECT * FROM gamification_badges WHERE id = ?`, [badgeId]);
    if (!badgeRows || badgeRows.length === 0) throw new Error("Badge not found");
    const badge = badgeRows[0];

    const now = new Date().toISOString();
    const id = randomUUID();

    await pool.query(
      `INSERT INTO gamification_student_badges 
       (id, organizationId, studentId, badgeId, awardedAt, awardedBy, isRevoked)
       VALUES (?, ?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE isRevoked = 0, revokedAt = NULL, revokedBy = NULL, revocationReason = NULL, awardedAt = VALUES(awardedAt)`,
      [id, organizationId, studentId, badgeId, now, actor.id]
    );

    // Award bonus points if any
    const bonus = Number(badge.bonusPoints) || 0;
    if (bonus > 0) {
      await this.awardPointsForEvent({
        organizationId,
        studentId,
        eventType: "badge_unlocked",
        eventReferenceId: badgeId,
        description: `Manually awarded badge: "${badge.name}" (${note || 'Faculty Recognition'})`,
        customPoints: bonus,
        awardedBy: actor.id
      });
    }

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "gamification_badge_issued_manual",
      resourceType: "gamification_student_badge",
      resourceId: id,
      details: { badgeId, badgeName: badge.name, studentId, note }
    });

    return { success: true, badgeId, studentId, badgeName: badge.name, awardedAt: now };
  }

  /**
   * Revoke an issued badge from a student with audit reason (Admin)
   */
  public static async revokeBadge(
    badgeId: string,
    studentId: string,
    organizationId: string,
    actor: { id: string; email: string; role: string },
    reason: string
  ) {
    if (!reason || !reason.trim()) {
      throw new Error("A revocation reason is mandatory for audit compliance.");
    }

    const now = new Date().toISOString();
    const [res]: any = await pool.query(
      `UPDATE gamification_student_badges 
       SET isRevoked = 1, revokedAt = ?, revokedBy = ?, revocationReason = ?
       WHERE badgeId = ? AND studentId = ? AND organizationId = ?`,
      [now, actor.id, reason.trim(), badgeId, studentId, organizationId]
    );

    if (res.affectedRows === 0) {
      throw new Error("Badge assignment not found or already revoked.");
    }

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "gamification_badge_revoked",
      resourceType: "gamification_student_badge",
      resourceId: badgeId,
      details: { badgeId, studentId, reason: reason.trim() }
    });

    return { success: true, badgeId, studentId, revokedAt: now, reason: reason.trim() };
  }

  // =========================================================================
  // 6. PRIVACY-AWARE, SCOPED LEADERBOARDS
  // =========================================================================

  /**
   * Fetch scoped and privacy-aware leaderboard.
   * Never leaks users across organizations.
   */
  public static async getLeaderboard(params: {
    organizationId: string;
    currentUserId: string;
    timeframe?: "all_time" | "this_month" | "this_week";
    scope?: "organization" | "department" | "cohort" | "group";
    scopeId?: string;
    limit?: number;
  }) {
    const { organizationId, currentUserId, timeframe = "all_time", scope = "organization", scopeId, limit = 25 } = params;

    const config = await this.getOrgConfig(organizationId);
    if (!config.isEnabled || !config.leaderboardEnabled) {
      return {
        enabled: false,
        message: "Leaderboard is disabled by your LMS administrator.",
        timeframe,
        scope,
        items: []
      };
    }

    // Build query based on timeframe
    let query: string;
    let queryParams: any[] = [];

    if (timeframe === "all_time") {
      query = `
        SELECT 
          gp.studentId,
          gp.totalPoints AS points,
          gp.currentStreakDays,
          gp.longestStreakDays,
          gp.tier,
          gp.leaderboardAnonymous,
          u.name AS studentName,
          u.email AS studentEmail,
          u.profilePhoto,
          u.departmentId,
          d.name AS departmentName,
          (SELECT COUNT(sb.id) FROM gamification_student_badges sb WHERE sb.studentId = gp.studentId AND sb.organizationId = gp.organizationId AND sb.isRevoked = 0) AS badgesCount
        FROM gamification_profiles gp
        JOIN users u ON gp.studentId = u.id AND u.deletedAt IS NULL
        LEFT JOIN departments d ON u.departmentId = d.id
        WHERE gp.organizationId = ?
      `;
      queryParams.push(organizationId);
    } else {
      // Periodic timeframes based on points ledger
      const dateFilter = timeframe === "this_month"
        ? `pl.createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')`
        : `pl.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;

      query = `
        SELECT 
          gp.studentId,
          COALESCE(SUM(pl.points), 0) AS points,
          gp.currentStreakDays,
          gp.longestStreakDays,
          gp.tier,
          gp.leaderboardAnonymous,
          u.name AS studentName,
          u.email AS studentEmail,
          u.profilePhoto,
          u.departmentId,
          d.name AS departmentName,
          (SELECT COUNT(sb.id) FROM gamification_student_badges sb WHERE sb.studentId = gp.studentId AND sb.organizationId = gp.organizationId AND sb.isRevoked = 0) AS badgesCount
        FROM gamification_profiles gp
        JOIN users u ON gp.studentId = u.id AND u.deletedAt IS NULL
        LEFT JOIN departments d ON u.departmentId = d.id
        JOIN gamification_points_ledger pl ON pl.studentId = gp.studentId AND pl.organizationId = gp.organizationId AND ${dateFilter}
        WHERE gp.organizationId = ?
        GROUP BY gp.studentId
      `;
      queryParams.push(organizationId);
    }

    // Optional scope filters
    if (scope === "department" && scopeId) {
      query += ` AND u.departmentId = ?`;
      queryParams.push(scopeId);
    } else if (scope === "cohort" && scopeId) {
      query += ` AND u.id IN (SELECT studentId FROM cohort_members WHERE cohortId = ? AND deletedAt IS NULL)`;
      queryParams.push(scopeId);
    } else if (scope === "group" && scopeId) {
      query += ` AND u.id IN (SELECT studentId FROM group_members WHERE groupId = ? AND deletedAt IS NULL)`;
      queryParams.push(scopeId);
    }

    query += ` ORDER BY points DESC, gp.currentStreakDays DESC LIMIT ?`;
    queryParams.push(Math.min(100, Math.max(5, limit)));

    const [rows]: any = await pool.query(query, queryParams);

    // Apply privacy masking
    const formatted = rows.map((r: any, idx: number) => {
      const isCurrentUser = r.studentId === currentUserId;
      let displayName = r.studentName;
      let isAnonymous = false;

      // Anonymity rule: student preference OR organization anonymity rule
      if (Boolean(r.leaderboardAnonymous) || config.leaderboardAnonymity === "optional_anonymous" && Boolean(r.leaderboardAnonymous)) {
        isAnonymous = true;
        displayName = isCurrentUser ? `${r.studentName} (You)` : `Anonymous Scholar #${idx + 1}`;
      } else if (config.leaderboardAnonymity === "partial_name") {
        // Partial name: e.g. "Alex J."
        const parts = r.studentName.split(" ");
        const first = parts[0] || "Learner";
        const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1].charAt(0)}.` : "";
        displayName = isCurrentUser ? `${first}${lastInitial} (You)` : `${first}${lastInitial}`;
      } else {
        displayName = isCurrentUser ? `${r.studentName} (You)` : r.studentName;
      }

      return {
        rank: idx + 1,
        studentId: r.studentId,
        displayName,
        isCurrentUser,
        isAnonymous,
        profilePhoto: isAnonymous && !isCurrentUser ? null : r.profilePhoto,
        points: Number(r.points) || 0,
        currentStreak: Number(r.currentStreakDays) || 0,
        longestStreak: Number(r.longestStreakDays) || 0,
        tier: r.tier,
        departmentName: isAnonymous && !isCurrentUser ? null : r.departmentName,
        badgesCount: Number(r.badgesCount) || 0
      };
    });

    // Find current user rank
    const currentUserItem = formatted.find((i: any) => i.studentId === currentUserId);
    const currentUserRank = currentUserItem ? currentUserItem.rank : null;

    return {
      enabled: true,
      timeframe,
      scope,
      anonymityMode: config.leaderboardAnonymity,
      currentUserRank,
      totalParticipants: formatted.length,
      items: formatted
    };
  }

  // =========================================================================
  // 7. STUDENT GAMIFICATION OVERVIEW & POINTS LEDGER
  // =========================================================================

  /**
   * Complete student gamification dashboard overview
   */
  public static async getStudentGamificationOverview(
    studentId: string,
    organizationId: string,
    timezone: string = "UTC"
  ) {
    const config = await this.getOrgConfig(organizationId);
    const profile = await this.getOrCreateProfile(studentId, organizationId);

    // Points ledger transactions (last 20)
    const [ledger]: any = await pool.query(
      `SELECT id, eventType, points, balanceAfter, description, createdAt
       FROM gamification_points_ledger
       WHERE studentId = ? AND organizationId = ?
       ORDER BY createdAt DESC
       LIMIT 25`,
      [studentId, organizationId]
    );

    // Badges (earned & locked)
    const badges = await this.listBadges(organizationId, studentId);
    const earnedBadges = badges.filter((b: any) => b.isEarned);
    const lockedBadges = badges.filter((b: any) => !b.isEarned);

    // Calculate progress towards next tier
    const points = Number(profile.totalPoints) || 0;
    let nextTier: GamificationTier | null = null;
    let pointsNeededForNext = 0;
    let tierProgressPct = 100;

    if (points < 100) {
      nextTier = "apprentice";
      pointsNeededForNext = 100 - points;
      tierProgressPct = Math.round((points / 100) * 100);
    } else if (points < 500) {
      nextTier = "scholar";
      pointsNeededForNext = 500 - points;
      tierProgressPct = Math.round(((points - 100) / 400) * 100);
    } else if (points < 1500) {
      nextTier = "master";
      pointsNeededForNext = 1500 - points;
      tierProgressPct = Math.round(((points - 500) / 1000) * 100);
    } else if (points < 3000) {
      nextTier = "grandmaster";
      pointsNeededForNext = 3000 - points;
      tierProgressPct = Math.round(((points - 1500) / 1500) * 100);
    } else if (points < 5000) {
      nextTier = "legend";
      pointsNeededForNext = 5000 - points;
      tierProgressPct = Math.round(((points - 3000) / 2000) * 100);
    } else {
      nextTier = null;
      pointsNeededForNext = 0;
      tierProgressPct = 100;
    }

    // Leaderboard preview (top 5)
    let leaderboardPreview = null;
    if (config.leaderboardEnabled) {
      leaderboardPreview = await this.getLeaderboard({
        organizationId,
        currentUserId: studentId,
        timeframe: "all_time",
        limit: 5
      });
    }

    // Active calendar dates for streak in last 14 days
    const [streakDates]: any = await pool.query(
      `SELECT activityDate, COUNT(id) AS eventCount 
       FROM gamification_streak_logs 
       WHERE studentId = ? AND organizationId = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       GROUP BY activityDate
       ORDER BY activityDate DESC`,
      [studentId, organizationId]
    );

    return {
      isEnabled: config.isEnabled,
      profile: {
        totalPoints: points,
        currentStreakDays: Number(profile.currentStreakDays) || 0,
        longestStreakDays: Number(profile.longestStreakDays) || 0,
        lastActiveDate: profile.lastActiveDate,
        tier: profile.tier,
        nextTier,
        pointsNeededForNext,
        tierProgressPct,
        leaderboardAnonymous: Boolean(profile.leaderboardAnonymous)
      },
      config: {
        pointsLessonComplete: config.pointsLessonComplete,
        pointsCourseComplete: config.pointsCourseComplete,
        pointsAssessmentPass: config.pointsAssessmentPass,
        pointsLearningPathComplete: config.pointsLearningPathComplete,
        pointsCodingChallengeSolve: config.pointsCodingChallengeSolve,
        pointsDailyStreakBonus: config.pointsDailyStreakBonus,
        leaderboardEnabled: config.leaderboardEnabled
      },
      earnedBadges,
      lockedBadges,
      recentLedger: ledger,
      streakHistory: streakDates,
      leaderboardPreview
    };
  }

  /**
   * Toggle student's privacy setting for the leaderboard
   */
  public static async toggleLeaderboardPrivacy(studentId: string, organizationId: string, anonymous: boolean) {
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE gamification_profiles 
       SET leaderboardAnonymous = ?, updatedAt = ?
       WHERE studentId = ? AND organizationId = ?`,
      [anonymous ? 1 : 0, now, studentId, organizationId]
    );
    return { studentId, anonymous };
  }

  /**
   * Admin points ledger query with tenant safety and pagination
   */
  public static async getOrgPointsLedger(params: {
    organizationId: string;
    studentId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }) {
    const { organizationId, studentId, eventType, limit = 50, offset = 0 } = params;

    let query = `
      SELECT pl.*, u.name AS studentName, u.email AS studentEmail
      FROM gamification_points_ledger pl
      JOIN users u ON pl.studentId = u.id
      WHERE pl.organizationId = ?
    `;
    const qParams: any[] = [organizationId];

    if (studentId) {
      query += ` AND pl.studentId = ?`;
      qParams.push(studentId);
    }
    if (eventType) {
      query += ` AND pl.eventType = ?`;
      qParams.push(eventType);
    }

    query += ` ORDER BY pl.createdAt DESC LIMIT ? OFFSET ?`;
    qParams.push(limit, offset);

    const [rows]: any = await pool.query(query, qParams);

    const [countRows]: any = await pool.query(
      `SELECT COUNT(pl.id) AS total
       FROM gamification_points_ledger pl
       WHERE pl.organizationId = ?` + 
       (studentId ? ` AND pl.studentId = ?` : "") + 
       (eventType ? ` AND pl.eventType = ?` : ""),
      [organizationId, ...(studentId ? [studentId] : []), ...(eventType ? [eventType] : [])]
    );

    return {
      total: Number(countRows[0]?.total) || 0,
      limit,
      offset,
      items: rows
    };
  }
}
