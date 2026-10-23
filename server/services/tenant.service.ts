/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { organizationsDb } from "../db.js";
import { Organization } from "../../src/types.js";

export class TenantService {
  /**
   * List all active organizations with optional pagination
   */
  static async listOrganizations(query: { status?: "active" | "inactive" | "suspended" } = {}) {
    return organizationsDb.find(query, { sort: { createdAt: "DESC" } });
  }

  /**
   * Get organization by ID or slug
   */
  static async getOrganization(idOrSlug: string): Promise<Organization | null> {
    let org = await organizationsDb.findOne({ id: idOrSlug });
    if (!org) {
      org = await organizationsDb.findOne({ slug: idOrSlug });
    }
    return org;
  }

  /**
   * Create a new organization / college tenant
   */
  static async createOrganization(data: {
    name: string;
    slug: string;
    domain?: string;
    logoUrl?: string;
    settings?: Record<string, any>;
  }): Promise<Organization> {
    const existing = await organizationsDb.findOne({ slug: data.slug });
    if (existing) {
      throw new Error(`An organization with slug '${data.slug}' already exists.`);
    }

    const id = "org-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex");
    return organizationsDb.insert({
      id,
      name: data.name,
      slug: data.slug.toLowerCase().trim(),
      domain: data.domain?.trim(),
      logoUrl: data.logoUrl,
      settings: data.settings || {},
      status: "active",
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Update organization details
   */
  static async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
    const org = await organizationsDb.findOne({ id });
    if (!org) return null;

    if (updates.slug && updates.slug !== org.slug) {
      const existing = await organizationsDb.findOne({ slug: updates.slug });
      if (existing) {
        throw new Error(`An organization with slug '${updates.slug}' already exists.`);
      }
    }

    return organizationsDb.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Soft-delete an organization
   */
  static async softDeleteOrganization(id: string): Promise<boolean> {
    if (id === "org-default" || id === "default") {
      throw new Error("The default system organization cannot be deleted.");
    }
    return organizationsDb.softDelete(id);
  }
}
