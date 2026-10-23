/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";
import { organizationsDb } from "../db.js";
import { UserRole, Organization } from "../../src/types.js";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      organization?: Organization;
    }
  }
}

/**
 * Middleware to resolve and enforce tenant / organization context.
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Check custom headers
    let tenantHeader = (req.headers["x-tenant-id"] || req.headers["x-organization-id"]) as string;
    
    // 2. Authenticated user's assigned organization
    const userOrgId = (req as any).user?.organizationId;

    // 3. Fallback to default organization
    let targetOrgId = tenantHeader || userOrgId || "org-default";

    // 4. Cross-tenant isolation check:
    // If user is authenticated, not a SUPER_ADMIN, and attempts to target an org different from their own:
    if ((req as any).user && (req as any).user.role !== UserRole.SUPER_ADMIN && userOrgId) {
      if (tenantHeader && tenantHeader !== userOrgId) {
        return res.status(403).json({
          error: "Cross-tenant access denied: you cannot access resources from another organization."
        });
      }
      targetOrgId = userOrgId;
    }

    // 5. Verify organization exists and is not suspended
    let org = await organizationsDb.findOne({ id: targetOrgId });
    if (!org) {
      // Fallback check by slug
      org = await organizationsDb.findOne({ slug: targetOrgId });
    }

    if (!org) {
      // If default org doesn't exist, create it on the fly
      if (targetOrgId === "org-default" || targetOrgId === "default") {
        org = await organizationsDb.insert({
          id: "org-default",
          name: "Default Institution",
          slug: "default",
          status: "active",
          createdAt: new Date().toISOString()
        });
      } else {
        return res.status(404).json({ error: `Organization '${targetOrgId}' not found.` });
      }
    }

    if (org.status === "suspended") {
      return res.status(403).json({ error: "This organization account is currently suspended. Please contact administrator." });
    }

    req.tenantId = org.id;
    req.organization = org;
    next();
  } catch (err: any) {
    console.error("[TenantMiddleware Error]", err);
    res.status(500).json({ error: "Failed to resolve organization context" });
  }
}

/**
 * Middleware requiring SUPER_ADMIN role for multi-tenant administrative actions
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: "Super Administrator access required" });
  }
  next();
}
