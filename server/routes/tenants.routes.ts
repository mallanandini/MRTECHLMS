/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { resolveTenant, requireSuperAdmin } from "../middleware/tenant.js";
import { TenantService } from "../services/tenant.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sendInternalError } from "../errorHandler.js";
import { logAuditEvent } from "../audit.js";
import { UserRole } from "../../src/types.js";

export const tenantsRouter = express.Router();

/**
 * GET /api/tenants - List organizations
 * Super Admin sees all organizations; Org Admin sees their own organization.
 */
tenantsRouter.get("/", authenticateToken, resolveTenant, async (req, res) => {
  try {
    const user = req.user!;
    if (user.role === UserRole.SUPER_ADMIN) {
      const orgs = await TenantService.listOrganizations();
      return sendSuccess(res, orgs);
    } else {
      // Return only user's own organization
      const org = await TenantService.getOrganization(req.tenantId || "org-default");
      return sendSuccess(res, org ? [org] : []);
    }
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve organizations", err);
  }
});

/**
 * GET /api/tenants/:id - Get specific organization
 */
tenantsRouter.get("/:id", authenticateToken, resolveTenant, async (req, res) => {
  try {
    const user = req.user!;
    const targetId = req.params.id;

    if (user.role !== UserRole.SUPER_ADMIN && req.tenantId !== targetId) {
      return sendError(res, "Access denied: cannot inspect another organization", 403);
    }

    const org = await TenantService.getOrganization(targetId);
    if (!org) {
      return sendError(res, "Organization not found", 404);
    }
    return sendSuccess(res, org);
  } catch (err: any) {
    sendInternalError(res, "Failed to retrieve organization", err);
  }
});

/**
 * POST /api/tenants - Create new organization (Super Admin only)
 */
tenantsRouter.post("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, domain, logoUrl, settings } = req.body;
    if (!name || !slug) {
      return sendError(res, "Organization name and slug are required", 400);
    }

    const org = await TenantService.createOrganization({ name, slug, domain, logoUrl, settings });

    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "create_organization",
      resourceType: "organization",
      resourceId: org.id,
      details: { name: org.name, slug: org.slug }
    });

    return sendSuccess(res, org, 201);
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      return sendError(res, err.message, 400);
    }
    sendInternalError(res, "Failed to create organization", err);
  }
});

/**
 * PUT /api/tenants/:id - Update organization
 */
tenantsRouter.put("/:id", authenticateToken, resolveTenant, async (req, res) => {
  try {
    const user = req.user!;
    const targetId = req.params.id;

    if (user.role !== UserRole.SUPER_ADMIN && req.tenantId !== targetId) {
      return sendError(res, "Access denied: cannot modify another organization", 403);
    }

    const updated = await TenantService.updateOrganization(targetId, req.body);
    if (!updated) {
      return sendError(res, "Organization not found", 404);
    }

    logAuditEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: "update_organization",
      resourceType: "organization",
      resourceId: targetId,
      details: req.body
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    sendInternalError(res, "Failed to update organization", err);
  }
});

/**
 * DELETE /api/tenants/:id - Soft-delete organization (Super Admin only)
 */
tenantsRouter.delete("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    await TenantService.softDeleteOrganization(targetId);

    logAuditEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: "delete_organization",
      resourceType: "organization",
      resourceId: targetId
    });

    return sendSuccess(res, { deleted: true, id: targetId });
  } catch (err: any) {
    sendInternalError(res, err.message || "Failed to delete organization", err);
  }
});
