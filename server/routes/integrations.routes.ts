/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { randomUUID } from "crypto";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { SsoService } from "../services/integrations/sso.service.js";
import { MfaService } from "../services/integrations/mfa.service.js";
import { ScormService } from "../services/integrations/scorm.service.js";
import { XapiService } from "../services/integrations/xapi.service.js";
import { LtiService } from "../services/integrations/lti.service.js";
import { WebhookService } from "../services/integrations/webhook.service.js";
import { PublicApiService } from "../services/integrations/public-api.service.js";
import { ImportExportService, ImportExportEntity } from "../services/integrations/import-export.service.js";
import { UserRole } from "../../src/types.js";

export const integrationsRouter = express.Router();

// ============================================================================
// 1. SSO ROUTES (SAML 2.0 & OIDC)
// ============================================================================

// GET /api/integrations/sso/config
integrationsRouter.get("/integrations/sso/config", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const config = await SsoService.getOrgConfig(orgId);
    res.json({
      config,
      capabilities: SsoService.CAPABILITIES
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/integrations/sso/config
integrationsRouter.put("/integrations/sso/config", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const updated = await SsoService.updateOrgConfig(orgId, req.body, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/sso/metadata/:orgId.xml (Public SP Metadata download for IdP)
integrationsRouter.get("/integrations/sso/metadata/:orgId.xml", async (req, res) => {
  try {
    const xml = await SsoService.generateSpMetadataXml(req.params.orgId);
    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  } catch (err: any) {
    res.status(404).send(err.message);
  }
});

// GET /api/integrations/sso/login/:orgId (Initiate SAML AuthN Request redirect)
integrationsRouter.get("/integrations/sso/login/:orgId", async (req, res) => {
  try {
    const authn = await SsoService.buildSamlAuthnRequest(req.params.orgId, req.query.relayState as string);
    res.redirect(authn.redirectUrl);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/integrations/sso/saml/acs/:orgId (Assertion Consumer Service endpoint)
integrationsRouter.post("/integrations/sso/saml/acs/:orgId", express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const samlResponse = req.body.SAMLResponse;
    if (!samlResponse) return res.status(400).send("Missing SAMLResponse in body.");

    const result = await SsoService.validateSamlAssertion(req.params.orgId, samlResponse);
    if (!result.success) return res.status(401).json({ error: result.error });

    // Extension point: in production, this redirects with session token or sets secure cookie
    res.json({ message: "SAML Assertion verified successfully.", email: result.email, attributes: result.attributes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. MFA ROUTES (TOTP & RECOVERY CODES)
// ============================================================================

// GET /api/integrations/mfa/settings
integrationsRouter.get("/integrations/mfa/settings", authenticateToken, async (req, res) => {
  try {
    const settings = await MfaService.getMfaSettings(req.user!.id, req.user!.organizationId || "org-default");
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/mfa/enroll (Step 1: Get Secret & Recovery Codes)
integrationsRouter.post("/integrations/mfa/enroll", authenticateToken, async (req, res) => {
  try {
    const result = await MfaService.startEnrollment(req.user!.id, req.user!.organizationId || "org-default", req.user!.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/mfa/confirm (Step 2: Verify TOTP and Save)
integrationsRouter.post("/integrations/mfa/confirm", authenticateToken, async (req, res) => {
  try {
    const { totpCode, recoveryCodes } = req.body;
    if (!totpCode || !recoveryCodes) {
      return res.status(400).json({ error: "totpCode and recoveryCodes are required." });
    }

    const result = await MfaService.confirmEnrollment(req.user!.id, req.user!.organizationId || "org-default", totpCode, recoveryCodes);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: "MFA enabled successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/mfa/verify (Challenge Verification with TOTP or Recovery Code)
integrationsRouter.post("/integrations/mfa/verify", async (req, res) => {
  try {
    const { userId, organizationId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: "userId and code are required." });

    const result = await MfaService.verifyTotpOrRecovery(userId, organizationId || "org-default", code);
    if (!result.verified) return res.status(401).json({ error: result.error || "Verification failed." });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/mfa/disable
integrationsRouter.post("/integrations/mfa/disable", authenticateToken, async (req, res) => {
  try {
    const { totpCode } = req.body;
    if (!totpCode) return res.status(400).json({ error: "totpCode is required to disable MFA." });

    const result = await MfaService.disableMfa(req.user!.id, req.user!.organizationId || "org-default", totpCode);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: "MFA disabled." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. SCORM ROUTES (PACKAGE STORAGE & RUNTIME ADAPTER)
// ============================================================================

// GET /api/integrations/scorm/packages
integrationsRouter.get("/integrations/scorm/packages", authenticateToken, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const packages = await ScormService.listPackages(orgId, req.query.courseId as string);
    res.json({
      packages,
      specifications: ScormService.SPECIFICATIONS
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/scorm/packages
integrationsRouter.post("/integrations/scorm/packages", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { title, version, entryPoint, storageDir, courseId, manifestData } = req.body;

    if (!title || !entryPoint) {
      return res.status(400).json({ error: "title and entryPoint are required." });
    }

    const pkg = await ScormService.createPackage({
      organizationId: orgId,
      courseId,
      title,
      version: version || "SCORM_12",
      entryPoint,
      storageDir: storageDir || `/scorm-storage/${randomUUID()}`,
      manifestData
    }, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });

    res.status(201).json(pkg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/scorm/packages/:id/rte (Initialize / Load Runtime State)
integrationsRouter.get("/integrations/scorm/packages/:id/rte", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const orgId = req.user!.organizationId || "org-default";
    const reg = await ScormService.getOrCreateRegistration(req.params.id, studentId, orgId);
    res.json(reg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/scorm/packages/:id/rte/commit (RTE Commit)
integrationsRouter.post("/integrations/scorm/packages/:id/rte/commit", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const updated = await ScormService.commitRteValues(req.params.id, studentId, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/scorm/packages/:id/rte/finish (RTE Finish)
integrationsRouter.post("/integrations/scorm/packages/:id/rte/finish", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user!.id;
    const finished = await ScormService.finishRte(req.params.id, studentId);
    res.json(finished);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. xAPI ROUTES (STATEMENTS & ACTIVITY TRACKING)
// ============================================================================

// POST /api/integrations/xapi/statements
integrationsRouter.post("/integrations/xapi/statements", authenticateToken, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const result = await XapiService.recordStatement(orgId, req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/xapi/statements
integrationsRouter.get("/integrations/xapi/statements", authenticateToken, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { actorEmail, verbId, activityId, limit, offset } = req.query;

    const data = await XapiService.queryStatements({
      organizationId: orgId,
      actorEmail: actorEmail as string,
      verbId: verbId as string,
      activityId: activityId as string,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    res.json({
      ...data,
      verbsRegistry: XapiService.VERBS,
      activityTypes: XapiService.ACTIVITY_TYPES
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5. LTI 1.3 ADVANTAGE ROUTES
// ============================================================================

// GET /api/integrations/lti/registrations
integrationsRouter.get("/integrations/lti/registrations", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const registrations = await LtiService.listRegistrations(orgId);
    res.json({
      registrations,
      architecture: LtiService.ARCHITECTURE
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/lti/registrations
integrationsRouter.post("/integrations/lti/registrations", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const created = await LtiService.createRegistration({
      organizationId: orgId,
      ...req.body
    }, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/lti/jwks.json (Public JWKS Endpoint for Tool Verification)
integrationsRouter.get("/integrations/lti/jwks.json", (req, res) => {
  res.json({
    keys: [
      {
        kty: "RSA",
        alg: "RS256",
        use: "sig",
        kid: "mrtechlms-lti-key-1",
        n: "sXz_example_modulus_string_for_jwks_verification",
        e: "AQAB"
      }
    ]
  });
});

// ============================================================================
// 6. WEBHOOK ROUTES
// ============================================================================

// GET /api/integrations/webhooks/subscriptions
integrationsRouter.get("/integrations/webhooks/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const subs = await WebhookService.listSubscriptions(orgId);
    res.json({
      subscriptions: subs,
      availableEvents: WebhookService.EVENT_DEFINITIONS
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/webhooks/subscriptions
integrationsRouter.post("/integrations/webhooks/subscriptions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { name, targetUrl, subscribedEvents } = req.body;

    if (!name || !targetUrl || !subscribedEvents) {
      return res.status(400).json({ error: "name, targetUrl, and subscribedEvents are required." });
    }

    const created = await WebhookService.createSubscription(orgId, {
      name,
      targetUrl,
      subscribedEvents
    }, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/integrations/webhooks/subscriptions/:id
integrationsRouter.delete("/integrations/webhooks/subscriptions/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    await WebhookService.deleteSubscription(req.params.id, orgId, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/webhooks/subscriptions/:id/test
integrationsRouter.post("/integrations/webhooks/subscriptions/:id/test", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const result = await WebhookService.sendTestPing(req.params.id, orgId, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/webhooks/deliveries
integrationsRouter.get("/integrations/webhooks/deliveries", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { subscriptionId, limit, offset } = req.query;

    const data = await WebhookService.getDeliveryLogs({
      organizationId: orgId,
      subscriptionId: subscriptionId as string,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 7. PUBLIC API KEY MANAGEMENT ROUTES
// ============================================================================

// GET /api/integrations/api-keys
integrationsRouter.get("/integrations/api-keys", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const keys = await PublicApiService.listApiKeys(orgId);
    res.json({
      keys,
      availableScopes: PublicApiService.AVAILABLE_SCOPES
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/api-keys
integrationsRouter.post("/integrations/api-keys", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const { name, scopes, rateLimitPerMin, expiresInDays } = req.body;

    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({ error: "name and at least one scope are required." });
    }

    const result = await PublicApiService.createApiKey({
      organizationId: orgId,
      name,
      scopes,
      rateLimitPerMin: rateLimitPerMin ? Number(rateLimitPerMin) : 60,
      expiresInDays: expiresInDays ? Number(expiresInDays) : 365
    }, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/api-keys/:id/revoke
integrationsRouter.post("/integrations/api-keys/:id/revoke", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    await PublicApiService.revokeApiKey(req.params.id, orgId, {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role
    });
    res.json({ success: true, message: "API Key revoked." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 8. IMPORT / EXPORT ROUTES
// ============================================================================

// GET /api/integrations/import-export/schemas
integrationsRouter.get("/integrations/import-export/schemas", authenticateToken, requireAdmin, (req, res) => {
  res.json(ImportExportService.SCHEMAS);
});

// GET /api/integrations/import-export/templates/:entity
integrationsRouter.get("/integrations/import-export/templates/:entity", authenticateToken, requireAdmin, (req, res) => {
  try {
    const csv = ImportExportService.getCsvTemplate(req.params.entity as ImportExportEntity);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.entity}_template.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/integrations/import-export/export/:entity
integrationsRouter.get("/integrations/import-export/export/:entity", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const entity = req.params.entity as ImportExportEntity;
    let csv = "";

    switch (entity) {
      case "users":
        csv = await ImportExportService.exportUsers(orgId);
        break;
      case "courses":
        csv = await ImportExportService.exportCourses(orgId);
        break;
      case "groups":
        csv = await ImportExportService.exportGroups(orgId);
        break;
      case "enrollments":
        csv = await ImportExportService.exportEnrollments(orgId);
        break;
      case "results":
        csv = await ImportExportService.exportResults(orgId);
        break;
      default:
        return res.status(400).json({ error: `Export for '${entity}' is not supported.` });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${entity}_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/import-export/import/:entity
integrationsRouter.post("/integrations/import-export/import/:entity", authenticateToken, requireAdmin, express.text({ type: ["text/csv", "text/plain"], limit: "10mb" }), async (req, res) => {
  try {
    const orgId = req.user!.organizationId || "org-default";
    const entity = req.params.entity as ImportExportEntity;
    const csvContent = typeof req.body === "string" ? req.body : req.body.csv;

    if (!csvContent || typeof csvContent !== "string") {
      return res.status(400).json({ error: "CSV string content required in request body." });
    }

    let result: any;
    if (entity === "users") {
      result = await ImportExportService.importUsersFromCsv(orgId, csvContent, {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role
      });
    } else if (entity === "enrollments") {
      result = await ImportExportService.importEnrollmentsFromCsv(orgId, csvContent, {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role
      });
    } else {
      return res.status(400).json({ error: `Bulk import for '${entity}' is not supported.` });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
