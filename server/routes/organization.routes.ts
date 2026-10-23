/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { OrganizationService } from "../services/organization.service.js";
import { authenticateToken, requireAdmin, requireManager } from "../middleware/auth.js";
import { UserRole } from "../../src/types.js";

export const organizationRouter = express.Router();

// ==========================================
// 1. ADMIN: DEPARTMENTS ROUTES
// ==========================================

// GET /api/admin/departments
organizationRouter.get("/admin/departments", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const departments = await OrganizationService.getDepartments(orgId);
    res.json(departments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/departments
organizationRouter.post("/admin/departments", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, description, managerId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Department name is required" });
    if (!code || !code.trim()) return res.status(400).json({ error: "Department code is required" });

    const department = await OrganizationService.createDepartment({
      name,
      code,
      description,
      managerId,
      organizationId: req.user!.organizationId
    }, req.user!);

    res.status(201).json(department);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/departments/:id
organizationRouter.get("/admin/departments/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const department = await OrganizationService.getDepartmentById(req.params.id);
    if (!department) return res.status(404).json({ error: "Department not found" });
    res.json(department);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/departments/:id
organizationRouter.put("/admin/departments/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await OrganizationService.updateDepartment(req.params.id, req.body, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/departments/:id (archive)
organizationRouter.delete("/admin/departments/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await OrganizationService.archiveDepartment(req.params.id, req.user!);
    res.json({ success: true, message: "Department archived successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/departments/:id/members
organizationRouter.post("/admin/departments/:id/members", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, role } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required" });
    }
    const result = await OrganizationService.addDepartmentMembers(req.params.id, userIds, req.user!, role);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/departments/:id/members/:userId
organizationRouter.delete("/admin/departments/:id/members/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await OrganizationService.removeDepartmentMember(req.params.id, req.params.userId, req.user!);
    res.json({ success: true, message: "Member removed from department" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/departments/:id/assign-course
organizationRouter.post("/admin/departments/:id/assign-course", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId, dueDate, isMandatory } = req.body;
    if (!courseId) return res.status(400).json({ error: "courseId is required" });
    const result = await OrganizationService.assignCourseToDepartment(req.params.id, courseId, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/departments/:id/assign-learning-path
organizationRouter.post("/admin/departments/:id/assign-learning-path", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { learningPathId, dueDate, isMandatory } = req.body;
    if (!learningPathId) return res.status(400).json({ error: "learningPathId is required" });
    const result = await OrganizationService.assignLearningPathToDepartment(req.params.id, learningPathId, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/departments/:id/assign-assessment
organizationRouter.post("/admin/departments/:id/assign-assessment", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { assessmentId, dueDate, isMandatory, maxAttempts } = req.body;
    if (!assessmentId) return res.status(400).json({ error: "assessmentId is required" });
    const result = await OrganizationService.assignAssessmentToDepartment(req.params.id, assessmentId, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// 2. ADMIN: COHORTS & BATCHES ROUTES
// ==========================================

// GET /api/admin/cohorts
organizationRouter.get("/admin/cohorts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const cohorts = await OrganizationService.getCohorts(orgId);
    res.json(cohorts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/cohorts
organizationRouter.post("/admin/cohorts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, code, description, startDate, endDate, managerId, status } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Cohort name is required" });
    if (!code || !code.trim()) return res.status(400).json({ error: "Cohort code is required" });

    const cohort = await OrganizationService.createCohort({
      name,
      code,
      description,
      startDate,
      endDate,
      managerId,
      status,
      organizationId: req.user!.organizationId
    }, req.user!);

    res.status(201).json(cohort);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/cohorts/:id
organizationRouter.get("/admin/cohorts/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cohort = await OrganizationService.getCohortById(req.params.id);
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });
    res.json(cohort);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/cohorts/:id
organizationRouter.put("/admin/cohorts/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updated = await OrganizationService.updateCohort(req.params.id, req.body, req.user!);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/cohorts/:id (archive)
organizationRouter.delete("/admin/cohorts/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await OrganizationService.archiveCohort(req.params.id, req.user!);
    res.json({ success: true, message: "Cohort archived successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/cohorts/:id/members
organizationRouter.post("/admin/cohorts/:id/members", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds array is required" });
    }
    const result = await OrganizationService.addCohortMembers(req.params.id, userIds, req.user!);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/cohorts/:id/members/:userId
organizationRouter.delete("/admin/cohorts/:id/members/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await OrganizationService.removeCohortMember(req.params.id, req.params.userId, req.user!);
    res.json({ success: true, message: "Member removed from cohort" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/cohorts/:id/assign-course
organizationRouter.post("/admin/cohorts/:id/assign-course", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId, dueDate, isMandatory } = req.body;
    if (!courseId) return res.status(400).json({ error: "courseId is required" });
    const result = await OrganizationService.assignCourseToCohort(req.params.id, courseId, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/cohorts/:id/assign-learning-path
organizationRouter.post("/admin/cohorts/:id/assign-learning-path", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { learningPathId, dueDate, isMandatory } = req.body;
    if (!learningPathId) return res.status(400).json({ error: "learningPathId is required" });
    const result = await OrganizationService.assignLearningPathToCohort(req.params.id, learningPathId, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/cohorts/:id/assign-assessment
organizationRouter.post("/admin/cohorts/:id/assign-assessment", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { assessmentId, dueDate, isMandatory, maxAttempts } = req.body;
    if (!assessmentId) return res.status(400).json({ error: "assessmentId is required" });
    const result = await OrganizationService.assignAssessmentToCohort(req.params.id, assessmentId, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// 3. ADMIN: ENHANCED GROUPS ROUTES
// ==========================================

// GET /api/admin/groups (enhanced with type, parent entity, and status)
organizationRouter.get("/admin/groups-enhanced", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const groups = await OrganizationService.getEnhancedGroups(orgId);
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/groups-enhanced
organizationRouter.post("/admin/groups-enhanced", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, type, departmentId, cohortId, managerId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Group name is required" });

    const group = await OrganizationService.createEnhancedGroup({
      name,
      description,
      type,
      departmentId,
      cohortId,
      managerId,
      organizationId: req.user!.organizationId
    }, req.user!);

    res.status(201).json(group);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/groups/:id/assign-course
organizationRouter.post("/admin/groups/:id/assign-course", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId, dueDate, isMandatory } = req.body;
    if (!courseId) return res.status(400).json({ error: "courseId is required" });
    const { AccessControlService } = await import("../services/access-control.service.js");
    const result = await AccessControlService.assignCourseToGroup(courseId, req.params.id, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/groups/:id/assign-learning-path
organizationRouter.post("/admin/groups/:id/assign-learning-path", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { learningPathId, dueDate, isMandatory } = req.body;
    if (!learningPathId) return res.status(400).json({ error: "learningPathId is required" });
    const { AccessControlService } = await import("../services/access-control.service.js");
    const result = await AccessControlService.assignLearningPathToGroup(learningPathId, req.params.id, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/groups/:id/assign-assessment
organizationRouter.post("/admin/groups/:id/assign-assessment", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { assessmentId, dueDate, isMandatory } = req.body;
    if (!assessmentId) return res.status(400).json({ error: "assessmentId is required" });
    const { AccessControlService } = await import("../services/access-control.service.js");
    const result = await AccessControlService.assignAssessmentToGroup(assessmentId, req.params.id, req.user!, {
      dueDate,
      isMandatory: Boolean(isMandatory)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// ==========================================
// 4. ADMIN: USER ORG ASSIGNMENTS & MANAGERS
// ==========================================

// PUT /api/admin/users/:userId/organization
organizationRouter.put("/admin/users/:userId/organization", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { departmentId, managerId, jobTitle } = req.body;
    await OrganizationService.updateUserOrganization(req.params.userId, {
      departmentId,
      managerId,
      jobTitle
    }, req.user!);
    res.json({ success: true, message: "User organizational affiliation updated" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/managers
organizationRouter.get("/admin/managers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const managers = await OrganizationService.getEligibleManagers(orgId);
    res.json(managers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 5. MANAGER PORTAL ROUTES (Strictly Scoped)
// ==========================================

// GET /api/manager/team/learners
organizationRouter.get("/manager/team/learners", authenticateToken, requireManager, async (req, res) => {
  try {
    const learners = await OrganizationService.getManagerLearnerList(req.user!.id, req.user!.organizationId);
    res.json(learners);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/team/learners/:learnerId (Checks manager boundary!)
organizationRouter.get("/manager/team/learners/:learnerId", authenticateToken, requireManager, async (req, res) => {
  try {
    await OrganizationService.assertManagerLearnerAccess(req.user!.id, req.params.learnerId, req.user!.organizationId);
    const learners = await OrganizationService.getManagerLearnerList(req.user!.id, req.user!.organizationId);
    const learner = learners.find(l => l.id === req.params.learnerId);
    if (!learner) return res.status(404).json({ error: "Learner not found" });
    res.json(learner);
  } catch (err: any) {
    const status = err.message?.includes("Access denied") ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/manager/team/progress
organizationRouter.get("/manager/team/progress", authenticateToken, requireManager, async (req, res) => {
  try {
    const learnerId = req.query.learnerId as string | undefined;
    const progress = await OrganizationService.getManagerTeamCourseProgress(req.user!.id, learnerId, req.user!.organizationId);
    res.json(progress);
  } catch (err: any) {
    const status = err.message?.includes("Access denied") ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/manager/team/assessments
organizationRouter.get("/manager/team/assessments", authenticateToken, requireManager, async (req, res) => {
  try {
    const learnerId = req.query.learnerId as string | undefined;
    const assessments = await OrganizationService.getManagerTeamAssessmentResults(req.user!.id, learnerId, req.user!.organizationId);
    res.json(assessments);
  } catch (err: any) {
    const status = err.message?.includes("Access denied") ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/manager/team/overdue
organizationRouter.get("/manager/team/overdue", authenticateToken, requireManager, async (req, res) => {
  try {
    const overdue = await OrganizationService.getManagerOverdueLearning(req.user!.id, req.user!.organizationId);
    res.json(overdue);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/team/stats
organizationRouter.get("/manager/team/stats", authenticateToken, requireManager, async (req, res) => {
  try {
    const stats = await OrganizationService.getManagerTeamStats(req.user!.id, req.user!.organizationId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/team/assigned-learning
organizationRouter.get("/manager/team/assigned-learning", authenticateToken, requireManager, async (req, res) => {
  try {
    const assigned = await OrganizationService.getManagerAssignedLearning(req.user!.id, req.user!.organizationId);
    res.json(assigned);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/team/certificates
organizationRouter.get("/manager/team/certificates", authenticateToken, requireManager, async (req, res) => {
  try {
    const certificates = await OrganizationService.getManagerTeamCertificates(req.user!.id, req.user!.organizationId);
    res.json(certificates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 6. STUDENT PORTAL ROUTES
// ==========================================

// GET /api/student/organization
organizationRouter.get("/student/organization", authenticateToken, async (req, res) => {
  try {
    const details = await OrganizationService.getStudentOrganizationDetails(req.user!.id);
    res.json(details);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
