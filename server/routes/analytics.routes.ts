/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { AnalyticsService } from "../services/analytics.service.js";
import { OrganizationService } from "../services/organization.service.js";
import { authenticateToken, requireAdmin, requireManager } from "../middleware/auth.js";
import { UserRole } from "../../src/types.js";

export const analyticsRouter = express.Router();

// ==========================================
// 1. ADMIN OVERVIEW ANALYTICS & TRENDS
// ==========================================

// GET /api/analytics/admin/overview
analyticsRouter.get("/analytics/admin/overview", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { startDate, endDate } = req.query;

    const data = await AnalyticsService.getAdminOverviewAnalytics({
      organizationId: orgId,
      startDate: startDate as string,
      endDate: endDate as string
    });

    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/analytics/admin/overview:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve admin overview analytics" });
  }
});

// ==========================================
// 2. COURSE-LEVEL ANALYTICS
// ==========================================

// GET /api/analytics/courses - List courses with aggregate metrics
analyticsRouter.get("/analytics/courses", authenticateToken, requireManager, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { page, limit, search, status } = req.query;

    const data = await AnalyticsService.getCoursesAnalyticsList({
      organizationId: orgId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string,
      status: status as string
    });

    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/analytics/courses:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve courses analytics list" });
  }
});

// GET /api/analytics/courses/:courseId - Detailed course drop-off & learner progress
analyticsRouter.get("/analytics/courses/:courseId", authenticateToken, requireManager, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { courseId } = req.params;
    const { page, limit, search, status } = req.query;

    const data = await AnalyticsService.getCourseAnalytics(courseId, {
      organizationId: orgId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string,
      status: status as string
    });

    res.json(data);
  } catch (err: any) {
    console.error(`Error in GET /api/analytics/courses/${req.params.courseId}:`, err);
    const statusCode = err.message === "Course not found" ? 404 : 500;
    res.status(statusCode).json({ error: err.message || "Failed to retrieve course analytics" });
  }
});

// ==========================================
// 3. ASSESSMENT-LEVEL ANALYTICS
// ==========================================

// GET /api/analytics/assessments - List assessments with aggregate metrics
analyticsRouter.get("/analytics/assessments", authenticateToken, requireManager, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { page, limit, search } = req.query;

    const data = await AnalyticsService.getAssessmentsAnalyticsList({
      organizationId: orgId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string
    });

    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/analytics/assessments:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve assessments analytics list" });
  }
});

// GET /api/analytics/assessments/:assessmentId - Item difficulty, score distribution & submissions
analyticsRouter.get("/analytics/assessments/:assessmentId", authenticateToken, requireManager, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { assessmentId } = req.params;
    const { page, limit, search, status } = req.query;

    const data = await AnalyticsService.getAssessmentAnalytics(assessmentId, {
      organizationId: orgId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search as string,
      status: status as string
    });

    res.json(data);
  } catch (err: any) {
    console.error(`Error in GET /api/analytics/assessments/${req.params.assessmentId}:`, err);
    const statusCode = err.message === "Assessment not found" ? 404 : 500;
    res.status(statusCode).json({ error: err.message || "Failed to retrieve assessment analytics" });
  }
});

// ==========================================
// 4. LEARNER-LEVEL SCORECARD ANALYTICS
// ==========================================

// GET /api/analytics/learners/:learnerId - Comprehensive scorecard
// Enforces strict tenant and manager/student boundaries
analyticsRouter.get("/analytics/learners/:learnerId", authenticateToken, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { learnerId } = req.params;
    const currentUser = req.user!;

    // Authorization checks:
    if (currentUser.role === UserRole.STUDENT) {
      if (currentUser.id !== learnerId) {
        return res.status(403).json({ error: "Access denied: Students can only view their own analytics scorecard" });
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      const managedLearnerIds = await OrganizationService.getManagedLearnerIds(currentUser.id, orgId);
      if (!managedLearnerIds.includes(learnerId)) {
        return res.status(403).json({ error: "Access denied: Learner is not in your authorized department or group" });
      }
    } else if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: "Access denied: Unauthorized role" });
    }

    const data = await AnalyticsService.getLearnerAnalytics(learnerId, {
      organizationId: orgId
    });

    res.json(data);
  } catch (err: any) {
    console.error(`Error in GET /api/analytics/learners/${req.params.learnerId}:`, err);
    const statusCode = err.message === "Learner not found" ? 404 : 500;
    res.status(statusCode).json({ error: err.message || "Failed to retrieve learner analytics" });
  }
});

// ==========================================
// 5. MANAGER-SCOPED TEAM ANALYTICS
// ==========================================

// GET /api/analytics/manager/team - Team performance restricted to authorized reports
analyticsRouter.get("/analytics/manager/team", authenticateToken, requireManager, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const managerId = req.user!.id;

    const data = await AnalyticsService.getManagerTeamAnalytics(managerId, {
      organizationId: orgId
    });

    res.json(data);
  } catch (err: any) {
    console.error("Error in GET /api/analytics/manager/team:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve manager team analytics" });
  }
});

// ==========================================
// 6. ENTERPRISE REPORT EXPORT (CSV / XLSX)
// ==========================================

// GET /api/analytics/export
analyticsRouter.get("/analytics/export", authenticateToken, requireManager, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { type, format = "csv", startDate, endDate } = req.query;

    const validTypes = ["learners", "courses", "assessments", "overdue"];
    const validType = String(type).toLowerCase() as "learners" | "courses" | "assessments" | "overdue";
    if (!validTypes.includes(validType)) {
      return res.status(400).json({ 
        error: `Invalid report type '${type}'. Valid types are: ${validTypes.join(", ")}` 
      });
    }

    const validFormats = ["csv", "xlsx"];
    const validFormat = String(format).toLowerCase() as "csv" | "xlsx";
    if (!validFormats.includes(validFormat)) {
      return res.status(400).json({ 
        error: `Invalid format '${format}'. Valid formats are: ${validFormats.join(", ")}` 
      });
    }

    // Managers are strictly scoped to their managed subordinates
    const isManagerOnly = req.user!.role === UserRole.MANAGER;
    const managerId = isManagerOnly ? req.user!.id : undefined;

    const file = await AnalyticsService.exportReport(validType, validFormat, {
      organizationId: orgId,
      startDate: startDate as string,
      endDate: endDate as string,
      managerId
    });

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.setHeader("Content-Length", file.buffer.length);

    return res.send(file.buffer);
  } catch (err: any) {
    console.error("Error in GET /api/analytics/export:", err);
    res.status(500).json({ error: err.message || "Failed to generate export report" });
  }
});
