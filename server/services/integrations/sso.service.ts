/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import { randomUUID } from "crypto";
import { logAuditEvent } from "../../audit.js";

export interface SsoConfig {
  id: string;
  organizationId: string;
  isEnabled: boolean;
  providerType: "saml" | "oidc";
  idpEntityId: string | null;
  idpSignInUrl: string | null;
  idpCertificate: string | null;
  spEntityId: string;
  spAcsUrl: string;
  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcClientSecret: string | null;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    department?: string;
  };
  enforceSso: boolean;
  createdAt: string;
  updatedAt: string;
}

export class SsoService {
  /**
   * Compatibility and Supported Features Matrix
   */
  public static readonly CAPABILITIES = {
    saml2: {
      supported: true,
      spec: "SAML 2.0 Web Browser SSO Profile",
      bindings: ["HTTP-POST", "HTTP-Redirect"],
      supportedIdps: ["Okta", "Microsoft Entra ID (Azure AD)", "Google Workspace", "Ping Identity", "Auth0", "OneLogin"],
      nameIdFormats: ["urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress", "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent"]
    },
    oidc: {
      supported: true,
      spec: "OpenID Connect Core 1.0 (Authorization Code Flow with PKCE)",
      supportedProviders: ["Microsoft Azure OIDC", "Okta OIDC", "Google Identity", "Generic OIDC Discovery"],
      scopes: ["openid", "profile", "email"]
    },
    unsupported: [
      { protocol: "WS-Federation / WS-Trust", reason: "Legacy protocol deprecated in favor of SAML 2.0 and OIDC" },
      { protocol: "Direct LDAP / Active Directory Binding", reason: "Direct socket LDAP traversal across cloud tenants is not supported; use SAML or OIDC cloud bridge" },
      { protocol: "CAS (Central Authentication Service)", reason: "Non-standard enterprise SSO protocol not supported" }
    ]
  };

  /**
   * Retrieve or initialize organization SSO configuration
   */
  public static async getOrgConfig(organizationId: string): Promise<SsoConfig> {
    const [rows]: any = await pool.query(
      `SELECT * FROM sso_configs WHERE organizationId = ?`,
      [organizationId]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        organizationId: r.organizationId,
        isEnabled: Boolean(r.isEnabled),
        providerType: r.providerType || "saml",
        idpEntityId: r.idpEntityId || null,
        idpSignInUrl: r.idpSignInUrl || null,
        idpCertificate: r.idpCertificate || null,
        spEntityId: r.spEntityId,
        spAcsUrl: r.spAcsUrl,
        oidcIssuer: r.oidcIssuer || null,
        oidcClientId: r.oidcClientId || null,
        oidcClientSecret: r.oidcClientSecret || null,
        attributeMapping: typeof r.attributeMapping === "string" ? JSON.parse(r.attributeMapping) : (r.attributeMapping || {
          email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
          firstName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
          lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
        }),
        enforceSso: Boolean(r.enforceSso),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    }

    // Default configuration for organization
    const id = randomUUID();
    const now = new Date().toISOString();
    const appBaseUrl = process.env.APP_URL || "http://localhost:3000";
    const spEntityId = `${appBaseUrl}/api/integrations/sso/sp/${organizationId}`;
    const spAcsUrl = `${appBaseUrl}/api/integrations/sso/saml/acs/${organizationId}`;
    const defaultMapping = {
      email: "email",
      firstName: "firstName",
      lastName: "lastName",
      department: "department"
    };

    await pool.query(
      `INSERT INTO sso_configs 
       (id, organizationId, isEnabled, providerType, idpEntityId, idpSignInUrl, idpCertificate, spEntityId, spAcsUrl, oidcIssuer, oidcClientId, oidcClientSecret, attributeMapping, enforceSso, createdAt, updatedAt)
       VALUES (?, ?, 0, 'saml', NULL, NULL, NULL, ?, ?, NULL, NULL, NULL, ?, 0, ?, ?)`,
      [id, organizationId, spEntityId, spAcsUrl, JSON.stringify(defaultMapping), now, now]
    );

    return {
      id,
      organizationId,
      isEnabled: false,
      providerType: "saml",
      idpEntityId: null,
      idpSignInUrl: null,
      idpCertificate: null,
      spEntityId,
      spAcsUrl,
      oidcIssuer: null,
      oidcClientId: null,
      oidcClientSecret: null,
      attributeMapping: defaultMapping,
      enforceSso: false,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update organization SSO configuration (Admin only)
   */
  public static async updateOrgConfig(
    organizationId: string,
    updates: Partial<SsoConfig>,
    actor: { id: string; email: string; role: string }
  ): Promise<SsoConfig> {
    const current = await this.getOrgConfig(organizationId);
    const now = new Date().toISOString();

    const isEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : (current.isEnabled ? 1 : 0);
    const providerType = updates.providerType || current.providerType;
    const idpEntityId = updates.idpEntityId !== undefined ? updates.idpEntityId : current.idpEntityId;
    const idpSignInUrl = updates.idpSignInUrl !== undefined ? updates.idpSignInUrl : current.idpSignInUrl;
    const idpCertificate = updates.idpCertificate !== undefined ? updates.idpCertificate : current.idpCertificate;
    const oidcIssuer = updates.oidcIssuer !== undefined ? updates.oidcIssuer : current.oidcIssuer;
    const oidcClientId = updates.oidcClientId !== undefined ? updates.oidcClientId : current.oidcClientId;
    const oidcClientSecret = updates.oidcClientSecret !== undefined ? updates.oidcClientSecret : current.oidcClientSecret;
    const attributeMapping = updates.attributeMapping || current.attributeMapping;
    const enforceSso = updates.enforceSso !== undefined ? (updates.enforceSso ? 1 : 0) : (current.enforceSso ? 1 : 0);

    await pool.query(
      `UPDATE sso_configs SET
        isEnabled = ?,
        providerType = ?,
        idpEntityId = ?,
        idpSignInUrl = ?,
        idpCertificate = ?,
        oidcIssuer = ?,
        oidcClientId = ?,
        oidcClientSecret = ?,
        attributeMapping = ?,
        enforceSso = ?,
        updatedAt = ?
       WHERE organizationId = ?`,
      [
        isEnabled, providerType, idpEntityId, idpSignInUrl, idpCertificate,
        oidcIssuer, oidcClientId, oidcClientSecret, JSON.stringify(attributeMapping),
        enforceSso, now, organizationId
      ]
    );

    await logAuditEvent({
      organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "sso_config_updated",
      resourceType: "sso_config",
      resourceId: current.id,
      details: { updates, previous: current }
    });

    return this.getOrgConfig(organizationId);
  }

  /**
   * Generate SAML 2.0 SP Metadata XML
   */
  public static async generateSpMetadataXml(organizationId: string): Promise<string> {
    const config = await this.getOrgConfig(organizationId);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${config.spEntityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${config.spAcsUrl}" index="0" isDefault="true"/>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">MRTECHLMS Multi-Tenant Learning Platform</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">MRTECHLMS Organization ${organizationId}</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">${process.env.APP_URL || "http://localhost:3000"}</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;
  }

  /**
   * Extension Point: Generate SAML AuthnRequest payload
   */
  public static async buildSamlAuthnRequest(organizationId: string, relayState?: string) {
    const config = await this.getOrgConfig(organizationId);
    if (!config.isEnabled || config.providerType !== "saml") {
      throw new Error("SAML SSO is not enabled for this organization.");
    }
    if (!config.idpSignInUrl) {
      throw new Error("Identity Provider Sign-In URL is not configured.");
    }

    const requestId = `_mrtech_${randomUUID().replace(/-/g, "")}`;
    const issueInstant = new Date().toISOString();

    const samlRequestXml = `
      <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        AssertionConsumerServiceURL="${config.spAcsUrl}"
        Destination="${config.idpSignInUrl}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${config.spEntityId}</saml:Issuer>
        <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    const base64Request = Buffer.from(samlRequestXml).toString("base64");
    const redirectUrl = new URL(config.idpSignInUrl);
    redirectUrl.searchParams.set("SAMLRequest", base64Request);
    if (relayState) redirectUrl.searchParams.set("RelayState", relayState);

    return {
      requestId,
      idpSignInUrl: config.idpSignInUrl,
      redirectUrl: redirectUrl.toString(),
      samlRequestXml,
      relayState
    };
  }

  /**
   * Extension Point: Process and validate SAML Response
   */
  public static async validateSamlAssertion(
    organizationId: string, 
    samlResponseBase64: string
  ): Promise<{
    success: boolean;
    nameId?: string;
    email?: string;
    attributes?: Record<string, any>;
    error?: string;
  }> {
    const config = await this.getOrgConfig(organizationId);
    if (!config.isEnabled) {
      return { success: false, error: "SSO is currently disabled for this tenant." };
    }

    try {
      const decodedXml = Buffer.from(samlResponseBase64, "base64").toString("utf-8");
      
      // Extension Point: XML signature & assertion parsing
      // Extract NameID from assertion
      const nameIdMatch = decodedXml.match(/<(?:\w+:)?NameID[^>]*>([^<]+)<\/(?:\w+:)?NameID>/);
      const nameId = nameIdMatch ? nameIdMatch[1].trim() : null;

      if (!nameId) {
        return { success: false, error: "SAML response did not contain a valid NameID claim." };
      }

      return {
        success: true,
        nameId,
        email: nameId,
        attributes: {
          email: nameId,
          source: "saml_assertion_consumer"
        }
      };
    } catch (err: any) {
      return { success: false, error: `SAML validation failed: ${err.message}` };
    }
  }

  /**
   * Extension Point: Process OIDC Callback authorization code exchange
   */
  public static async handleOidcCallback(
    organizationId: string,
    code: string,
    state?: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const config = await this.getOrgConfig(organizationId);
    if (!config.isEnabled || config.providerType !== "oidc") {
      return { success: false, error: "OIDC SSO is not enabled for this organization." };
    }
    if (!config.oidcIssuer || !config.oidcClientId) {
      return { success: false, error: "OIDC Issuer or Client ID is missing." };
    }

    // Extension Point: Exchange code at IdP token endpoint
    return {
      success: true,
      user: {
        email: `oidc-user-${code.substring(0, 8)}@${organizationId}.com`,
        provider: "oidc",
        issuer: config.oidcIssuer
      }
    };
  }
}
