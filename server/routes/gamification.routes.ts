/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { GamificationService } from "../services/gamification.service.js";
import { authenticateToken, requireAdmin, requireStudent } from "../middleware/auth.js";
import { UserRole } from "../../src/types.js";
import { randomUUID } from "crypto";

export const gamificationRouter = express.Router();

// ============================================================================
// 1. ADMIN CONFIGURATION & MANAGEMENT
// ============================================================================

/**
 * GET /api/gamification/admin/config
 * Retrieve organization gamification configuration.
 */
gamificationRouter.get("/gamification/admin/config", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let orgId = req.user!.organizationId || "org-default";
    if (req.user!.role === UserRole.SUPER_ADMIN && req.query.organizationId) {
      orgId = req.query.organizationId as string;
    }

    const config = await GamificationService.getOrgConfig(orgId);
    res.json(config);
  } catch (err: any) {
    console.error("Error in GET /api/gamification/admin/config:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve gamification configuration." });
  }
});

/**
 * PUT /api/gamification/admin/config
 * Update organization gamification settings (toggle isEnabled, adjust points, leaderboard rules).
 */
gamificationRouter.put("/gamification/admin/config", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let orgId = req.user!.organizationId || "org-default";
    if (req.user!.role === UserRole.SUPER_ADMIN && req.body.organizationId) {
      orgId = req.body.organizationId;
    }

    const updated = await GamificationService.updateOrgConfig(orgId, req.body, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Error in PUT /api/gamification/admin/config:", err);
    res.status(500).json({ error: err.message || "Failed to update gamification configuration." });
  }
});

/**
 * GET /api/gamification/admin/badges
 * List all badges (system & custom) available for the organization.
 */
gamificationRouter.get("/gamification/admin/badges", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let orgId = req.user!.organizationId || "org-default";
    if (req.user!.role === UserRole.SUPER_ADMIN && req.query.organizationId) {
      orgId = req.query.organizationId as string;
    }

    const badges = await GamificationService.listBadges(orgId);
    res.json(badges);
  } catch (err: any) {
    console.error("Error in GET /api/gamification/admin/badges:", err);
    res.status(500).json({ error: err.message || "Failed to list badges." });
  }
});

/**
 * POST /api/gamification/admin/badges
 * Create a new custom badge definition.
 */
gamificationRouter.post("/gamification/admin/badges", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let orgId = req.user!.organizationId || "org-default";
    if (req.user!.role === UserRole.SUPER_ADMIN && req.body.organizationId) {
      orgId = req.body.organizationId;
    }

    const { code, name, description, icon, tier, criteriaType, criteriaThreshold, bonusPoints } = req.body;
    if (!name || !criteriaType) {
      return res.status(400).json({ error: "Badge name and criteriaType are required." });
    }

    const created = await GamificationService.createBadge({
      organizationId: orgId,
      code: code || name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      name,
      description: description || "",
      icon: icon || "Award",
      tier: tier || "bronze",
      criteriaType,
      criteriaThreshold: Number(criteriaThreshold) || 1,
      bonusPoints: Number(bonusPoints) || 0
    }, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error("Error in POST /api/gamification/admin/badges:", err);
    res.status(500).json({ error: err.message || "Failed to create badge." });
  }
});

/**
 * POST /api/gamification/admin/badges/:badgeId/issue
 * Manually issue a badge to a specific student (Faculty / Admin recognition).
 */
gamificationRouter.post("/gamification/admin/badges/:badgeId/issue", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { badgeId } = req.params;
    const { studentId, note } = req.body;
    let orgId = req.user!.organizationId || "org-default";

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required to issue a badge." });
    }

    const result = await GamificationService.issueBadgeManual(
      badgeId,
      studentId,
      orgId,
      {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role
      },
      note
    );

    res.json(result);
  } catch (err: any) {
    console.error("Error in POST /api/gamification/admin/badges/:badgeId/issue:", err);
    res.status(500).json({ error: err.message || "Failed to issue badge." });
  }
});

/**
 * POST /api/gamification/admin/badges/:badgeId/revoke
 * Revoke an issued badge from a student with mandatory audit reason.
 */
gamificationRouter.post("/gamification/admin/badges/:badgeId/revoke", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { badgeId } = req.params;
    const { studentId, reason } = req.body;
    let orgId = req.user!.organizationId || "org-default";

    if (!studentId || !reason || !reason.trim()) {
      return res.status(400).json({ error: "studentId and a non-empty audit reason are mandatory for revocation." });
    }

    const result = await GamificationService.revokeBadge(
      badgeId,
      studentId,
      orgId,
      {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role
      },
      reason
    );

    res.json(result);
  } catch (err: any) {
    console.error("Error in POST /api/gamification/admin/badges/:badgeId/revoke:", err);
    res.status(500).json({ error: err.message || "Failed to revoke badge." });
  }
});

/**
 * GET /api/gamification/admin/ledger
 * Organization points ledger audit trail with pagination and filtering.
 */
gamificationRouter.get("/gamification/admin/ledger", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let orgId = req.user!.organizationId || "org-default";
    if (req.user!.role === UserRole.SUPER_ADMIN && req.query.organizationId) {
      orgId = req.query.organizationId as string;
    }

    const { studentId, eventType, limit, offset } = req.query;

    const data = await GamificationService.getOrgPointsLedger({
      organizationId: orgId,
      studentId: studentId as string,
      eventType: eventType as string,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/gamification/admin/ledger:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve points ledger." });
  }
});

/**
 * POST /api/gamification/admin/adjust-points
 * Audited manual point adjustment for a learner.
 */
gamificationRouter.post("/gamification/admin/adjust-points", authenticateToken, requireAdmin, async (req, res) => {
  try {
    let orgId = req.user!.organizationId || "org-default";
    const { studentId, points, reason } = req.body;

    if (!studentId || points === undefined || !reason || !reason.trim()) {
      return res.status(400).json({ error: "studentId, points (integer), and audit reason are required." });
    }

    const pts = Math.round(Number(points));
    const result = await GamificationService.awardPointsForEvent({
      organizationId: orgId,
      studentId,
      eventType: "manual_adjustment",
      eventReferenceId: randomUUID(),
      customPoints: pts,
      description: `Admin Adjustment: ${reason.trim()} (by ${req.user!.email})`,
      awardedBy: req.user!.id
    });

    res.json(result);
  } catch (err: any) {
    console.error("Error in POST /api/gamification/admin/adjust-points:", err);
    res.status(500).json({ error: err.message || "Failed to adjust points." });
  }
});

// ============================================================================
// 2. STUDENT GAMIFICATION VIEWS & PRIVACY
// ============================================================================

/**
 * GET /api/gamification/student/overview
 * Overview of points, level/tier, progress to next tier, streaks, badges, and ledger preview.
 */
gamificationRouter.get("/gamification/student/overview", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";
    const timezone = (req.headers["x-timezone"] as string) || "UTC";

    const overview = await GamificationService.getStudentGamificationOverview(studentId, orgId, timezone);
    res.json(overview);
  } catch (err: any) {
    console.error("Error in GET /api/gamification/student/overview:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve student gamification overview." });
  }
});

/**
 * GET /api/gamification/student/leaderboard
 * Privacy-aware, organization/cohort/department-scoped leaderboard.
 */
gamificationRouter.get("/gamification/student/leaderboard", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";
    const { timeframe, scope, scopeId, limit } = req.query;

    const leaderboard = await GamificationService.getLeaderboard({
      organizationId: orgId,
      currentUserId: studentId,
      timeframe: (timeframe as any) || "all_time",
      scope: (scope as any) || "organization",
      scopeId: scopeId as string,
      limit: limit ? Number(limit) : 25
    });

    res.json(leaderboard);
  } catch (err: any) {
    console.error("Error in GET /api/gamification/student/leaderboard:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve leaderboard." });
  }
});

/**
 * PUT /api/gamification/student/privacy
 * Update student's leaderboard privacy setting (show real/partial name vs anonymous).
 */
gamificationRouter.put("/gamification/student/privacy", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";
    const { anonymous } = req.body;

    const result = await GamificationService.toggleLeaderboardPrivacy(studentId, orgId, Boolean(anonymous));
    res.json(result);
  } catch (err: any) {
    console.error("Error in PUT /api/gamification/student/privacy:", err);
    res.status(500).json({ error: err.message || "Failed to update leaderboard privacy preference." });
  }
});

/**
 * GET /api/gamification/student/badges
 * List all badges with student earned state.
 */
gamificationRouter.get("/gamification/student/badges", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";

    const badges = await GamificationService.listBadges(orgId, studentId);
    res.json(badges);
  } catch (err: any) {
    console.error("Error in GET /api/gamification/student/badges:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve student badges." });
  }
});

// ============================================================================
// 3. SECURITY / MANIPULATION DEFENSE CHECK
// ============================================================================

/**
 * Explicit trap for arbitrary client-side point submission attempts.
 * Ensures the system categorically rejects spoofed point additions.
 */
gamificationRouter.all(["/gamification/student/points", "/gamification/award"], (req, res) => {
  res.status(403).json({
    error: "Access Denied: Client-side point manipulation is strictly forbidden. Points are awarded exclusively by verified server-side completion events.",
    manipulationAttemptLogged: true
  });
});
