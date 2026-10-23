/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { authenticateToken, requireRole, requireAdmin } from "../middleware/auth.js";
import { CertificationService } from "../services/certification.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sendInternalError } from "../errorHandler.js";
import { logAuditEvent } from "../audit.js";
import { UserRole } from "../../src/types.js";
import { usersDb } from "../db.js";

export const certificatesRouter = express.Router();

// ==========================================
// 1. PUBLIC CERTIFICATE VERIFICATION ENDPOINTS (NO AUTH REQUIRED)
// ==========================================

/**
 * GET /api/certificates/verify/:code
 * Public verification endpoint using non-guessable verification identifier or certificate number.
 * STRICT SECURITY: Never leaks student email, user ID, internal tenant ID or sensitive metadata.
 */
certificatesRouter.get(["/certificates/verify/:code", "/verify/:code"], async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || !code.trim()) {
      return sendError(res, "Verification code or certificate ID is required.", 400);
    }

    const result = await CertificationService.getPublicCertificate(code.trim());
    if (!result.found) {
      return res.status(404).json({
        valid: false,
        error: result.error || "Certificate could not be found or verified."
      });
    }

    return res.json({
      valid: result.verification.valid,
      status: result.verification.status,
      verification: result.verification
    });
  } catch (err: any) {
    sendInternalError(res, "Failed to verify certificate.", err);
  }
});

/**
 * GET /api/certificates/verify/:code/pdf or /api/verify/:code/pdf
 * Public verified certificate PDF download/preview.
 */
certificatesRouter.get(["/certificates/verify/:code/pdf", "/verify/:code/pdf"], async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || !code.trim()) {
      return sendError(res, "Verification code or certificate ID is required.", 400);
    }

    const cert = await CertificationService.getCertificateByCode(code.trim());
    if (!cert) {
      return sendError(res, "Certificate not found.", 404);
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const pdfBuffer = await CertificationService.generatePdfBuffer(cert, baseUrl);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="certificate-${cert.certificateNumber}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    sendInternalError(res, "Failed to generate certificate PDF.", err);
  }
});

// ==========================================
// 2. STUDENT CERTIFICATE ENDPOINTS (STUDENT / SELF ACCESS ONLY)
// ==========================================

/**
 * GET /api/student/certificates
 * Retrieve all certificates earned by the authenticated student.
 */
certificatesRouter.get("/student/certificates", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const certs = await CertificationService.getStudentCertificates(studentId);
    return sendSuccess(res, certs);
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve student certificates.", err);
  }
});

/**
 * GET /api/student/certificates/eligibility
 * Check if the student is currently eligible to claim a certificate for a course or path.
 */
certificatesRouter.get("/student/certificates/eligibility", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { type, id } = req.query as { type?: string; id?: string };

    if (!type || !id) {
      return sendError(res, "Both type ('course' | 'learning_path') and target ID are required.", 400);
    }

    if (type === "course") {
      const check = await CertificationService.verifyCourseEligibility(studentId, id);
      return sendSuccess(res, {
        eligible: check.eligible,
        reason: check.reason,
        completedLessonsCount: check.completedLessonsCount,
        totalLessonsCount: check.totalLessonsCount,
        courseTitle: check.course?.title
      });
    } else if (type === "learning_path") {
      const check = await CertificationService.verifyLearningPathEligibility(studentId, id);
      return sendSuccess(res, {
        eligible: check.eligible,
        reason: check.reason,
        completedItemsCount: check.completedItemsCount,
        totalRequiredItemsCount: check.totalRequiredItemsCount,
        pathTitle: check.path?.title
      });
    } else {
      return sendError(res, "Invalid type. Must be 'course' or 'learning_path'.", 400);
    }
  } catch (err: any) {
    sendInternalError(res, "Failed to verify certificate eligibility.", err);
  }
});

/**
 * POST /api/student/certificates/claim
 * Claim an official certificate for a course or learning path upon satisfying genuine requirements.
 */
certificatesRouter.post("/student/certificates/claim", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const { type, courseId, learningPathId } = req.body;

    if (!type || (type !== "course" && type !== "learning_path")) {
      return sendError(res, "Valid type ('course' or 'learning_path') is required.", 400);
    }

    if (type === "course") {
      if (!courseId) {
        return sendError(res, "courseId is required to claim a course certificate.", 400);
      }
      const result = await CertificationService.issueCourseCertificate(
        studentId, 
        courseId, 
        req.user!.organizationId || "org-default"
      );
      return sendSuccess(res, {
        message: result.isNew ? "Certificate successfully issued!" : "Certificate already issued.",
        certificate: result.certificate,
        isNew: result.isNew
      }, result.isNew ? 201 : 200);
    } else {
      if (!learningPathId) {
        return sendError(res, "learningPathId is required to claim a learning path certificate.", 400);
      }
      const result = await CertificationService.issueLearningPathCertificate(
        studentId, 
        learningPathId, 
        req.user!.organizationId || "org-default"
      );
      return sendSuccess(res, {
        message: result.isNew ? "Certificate successfully issued!" : "Certificate already issued.",
        certificate: result.certificate,
        isNew: result.isNew
      }, result.isNew ? 201 : 200);
    }
  } catch (err: any) {
    // If business requirement check failed, return clean 400 with explanation
    return sendError(res, err.message || "Failed to issue certificate.", 400);
  }
});

/**
 * GET /api/student/certificates/:id
 * Retrieve a specific certificate. Students can only retrieve their own certificates.
 */
certificatesRouter.get("/student/certificates/:id", authenticateToken, async (req, res) => {
  try {
    const cert = await CertificationService.getCertificateById(req.params.id);
    if (!cert) {
      return sendError(res, "Certificate not found.", 404);
    }

    // Strict student data isolation
    const isOwner = cert.studentId === req.user!.id;
    const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      return sendError(res, "Access denied: you may only view your own certificates.", 403);
    }

    return sendSuccess(res, cert);
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve certificate.", err);
  }
});

/**
 * GET /api/student/certificates/:id/pdf
 * Download PDF for a student's certificate.
 */
certificatesRouter.get("/student/certificates/:id/pdf", authenticateToken, async (req, res) => {
  try {
    const cert = await CertificationService.getCertificateById(req.params.id);
    if (!cert) {
      return sendError(res, "Certificate not found.", 404);
    }

    const isOwner = cert.studentId === req.user!.id;
    const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      return sendError(res, "Access denied: you may only download your own certificates.", 403);
    }

    if (cert.status === "revoked" && !isAdmin) {
      return sendError(res, "This certificate has been revoked and cannot be downloaded.", 403);
    }

    // Tenant / organization boundary isolation
    if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.organizationId && cert.organizationId && req.user!.organizationId !== cert.organizationId) {
      return sendError(res, "Access denied: organization boundary mismatch.", 403);
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const pdfBuffer = await CertificationService.generatePdfBuffer(cert, baseUrl);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${cert.certificateNumber}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    sendInternalError(res, "Failed to generate certificate PDF.", err);
  }
});

// ==========================================
// 3. ADMIN CERTIFICATE MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/admin/certificates
 * List all certificates with search, status filtering, and aggregate statistics.
 */
certificatesRouter.get("/admin/certificates", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, status, type, courseId, learningPathId } = req.query as Record<string, string>;
    const orgId = req.user!.role === UserRole.SUPER_ADMIN ? undefined : req.user!.organizationId;

    const data = await CertificationService.getAdminCertificates({
      search,
      status,
      type,
      courseId,
      learningPathId,
      organizationId: orgId
    });

    return sendSuccess(res, data);
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve certificates.", err);
  }
});

/**
 * GET /api/admin/certificates/:id
 * Admin details view of a single certificate.
 */
certificatesRouter.get("/admin/certificates/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cert = await CertificationService.getCertificateById(req.params.id);
    if (!cert) {
      return sendError(res, "Certificate not found.", 404);
    }
    return sendSuccess(res, cert);
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve certificate.", err);
  }
});

/**
 * GET /api/admin/certificates/:id/pdf
 * Admin download/preview of any certificate.
 */
certificatesRouter.get("/admin/certificates/:id/pdf", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cert = await CertificationService.getCertificateById(req.params.id);
    if (!cert) {
      return sendError(res, "Certificate not found.", 404);
    }

    // Organization boundary check for multi-tenancy
    if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.organizationId && cert.organizationId && req.user!.organizationId !== cert.organizationId) {
      return sendError(res, "Access denied: organization boundary mismatch.", 403);
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const pdfBuffer = await CertificationService.generatePdfBuffer(cert, baseUrl);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${cert.certificateNumber}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    sendInternalError(res, "Failed to generate certificate PDF.", err);
  }
});

/**
 * POST /api/admin/certificates/:id/revoke
 * Revoke a certificate with a mandatory reason and audit trail.
 */
certificatesRouter.post("/admin/certificates/:id/revoke", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return sendError(res, "A revocation reason is required.", 400);
    }

    const adminUser = await usersDb.findOne({ id: req.user!.id });
    if (!adminUser) {
      return sendError(res, "Admin user not found.", 404);
    }

    const updated = await CertificationService.revokeCertificate(req.params.id, adminUser, reason.trim());

    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "certificate.revoke",
      resourceType: "certificate",
      resourceId: updated.id,
      organizationId: req.user!.organizationId,
      details: {
        certificateNumber: updated.certificateNumber,
        studentId: updated.studentId,
        studentName: updated.studentName,
        reason: reason.trim()
      }
    });

    return sendSuccess(res, {
      message: "Certificate has been revoked.",
      certificate: updated
    });
  } catch (err: any) {
    return sendError(res, err.message || "Failed to revoke certificate.", 400);
  }
});

/**
 * POST /api/admin/certificates/:id/reissue
 * Reissue / restore an active status to a certificate.
 */
certificatesRouter.post("/admin/certificates/:id/reissue", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { validityMonths, reason } = req.body;
    const adminUser = await usersDb.findOne({ id: req.user!.id });
    if (!adminUser) {
      return sendError(res, "Admin user not found.", 404);
    }

    const updated = await CertificationService.reissueCertificate(req.params.id, adminUser, {
      validityMonths: validityMonths ? Number(validityMonths) : undefined,
      reason
    });

    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "certificate.reissue",
      resourceType: "certificate",
      resourceId: updated.id,
      organizationId: req.user!.organizationId,
      details: {
        certificateNumber: updated.certificateNumber,
        studentId: updated.studentId,
        studentName: updated.studentName,
        reason
      }
    });

    return sendSuccess(res, {
      message: "Certificate has been reissued and reactivated.",
      certificate: updated
    });
  } catch (err: any) {
    return sendError(res, err.message || "Failed to reissue certificate.", 400);
  }
});

/**
 * GET /api/admin/certificate-templates
 * List available certificate design templates.
 */
certificatesRouter.get("/admin/certificate-templates", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await CertificationService.getTemplates(req.user!.organizationId || "org-default");
    return sendSuccess(res, templates);
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve certificate templates.", err);
  }
});
