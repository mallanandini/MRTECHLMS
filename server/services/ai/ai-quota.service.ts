/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../../mysql.js";
import { AiFeatureType, AiOrganizationSettings, AiInteractionLog } from "./types.js";

export class AiQuotaService {
  /**
   * Retrieve organization AI configuration and token limits
   */
  public static async getSettings(organizationId: string): Promise<AiOrganizationSettings> {
    const orgId = organizationId || "org-default";
    const [rows]: any = await pool.query(
      "SELECT * FROM `ai_organization_settings` WHERE `organizationId` = ? LIMIT 1",
      [orgId]
    );

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (!rows || rows.length === 0) {
      const defaultSettings: AiOrganizationSettings = {
        organizationId: orgId,
        aiEnabled: true,
        courseGeneratorEnabled: true,
        quizGeneratorEnabled: true,
        lessonTutorEnabled: true,
        codingHintsEnabled: true,
        assessmentExplanationsEnabled: true,
        skillGapAnalysisEnabled: true,
        monthlyTokenQuota: 1000000,
        monthlyTokensUsed: 0,
        dailyUserRequestLimit: 60,
        quotaResetMonth: currentMonth,
        updatedAt: now.toISOString()
      };

      await pool.query(
        `INSERT IGNORE INTO \`ai_organization_settings\`
        (\`organizationId\`, \`aiEnabled\`, \`courseGeneratorEnabled\`, \`quizGeneratorEnabled\`, \`lessonTutorEnabled\`, \`codingHintsEnabled\`, \`assessmentExplanationsEnabled\`, \`skillGapAnalysisEnabled\`, \`monthlyTokenQuota\`, \`monthlyTokensUsed\`, \`dailyUserRequestLimit\`, \`quotaResetMonth\`, \`updatedAt\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orgId,
          defaultSettings.aiEnabled ? 1 : 0,
          defaultSettings.courseGeneratorEnabled ? 1 : 0,
          defaultSettings.quizGeneratorEnabled ? 1 : 0,
          defaultSettings.lessonTutorEnabled ? 1 : 0,
          defaultSettings.codingHintsEnabled ? 1 : 0,
          defaultSettings.assessmentExplanationsEnabled ? 1 : 0,
          defaultSettings.skillGapAnalysisEnabled ? 1 : 0,
          defaultSettings.monthlyTokenQuota,
          defaultSettings.monthlyTokensUsed,
          defaultSettings.dailyUserRequestLimit,
          defaultSettings.quotaResetMonth,
          defaultSettings.updatedAt
        ]
      );
      return defaultSettings;
    }

    const settings: AiOrganizationSettings = {
      ...rows[0],
      aiEnabled: Boolean(rows[0].aiEnabled),
      courseGeneratorEnabled: Boolean(rows[0].courseGeneratorEnabled),
      quizGeneratorEnabled: Boolean(rows[0].quizGeneratorEnabled),
      lessonTutorEnabled: Boolean(rows[0].lessonTutorEnabled),
      codingHintsEnabled: Boolean(rows[0].codingHintsEnabled),
      assessmentExplanationsEnabled: Boolean(rows[0].assessmentExplanationsEnabled),
      skillGapAnalysisEnabled: Boolean(rows[0].skillGapAnalysisEnabled)
    };

    // Monthly quota rollover check
    if (settings.quotaResetMonth !== currentMonth) {
      await pool.query(
        "UPDATE `ai_organization_settings` SET `monthlyTokensUsed` = 0, `quotaResetMonth` = ? WHERE `organizationId` = ?",
        [currentMonth, orgId]
      );
      settings.monthlyTokensUsed = 0;
      settings.quotaResetMonth = currentMonth;
    }

    return settings;
  }

  /**
   * Update organization AI settings
   */
  public static async updateSettings(
    organizationId: string,
    updates: Partial<AiOrganizationSettings>
  ): Promise<AiOrganizationSettings> {
    const current = await this.getSettings(organizationId);
    const updated: AiOrganizationSettings = {
      ...current,
      ...updates,
      organizationId,
      updatedAt: new Date().toISOString()
    };

    await pool.query(
      `UPDATE \`ai_organization_settings\`
       SET \`aiEnabled\` = ?,
           \`courseGeneratorEnabled\` = ?,
           \`quizGeneratorEnabled\` = ?,
           \`lessonTutorEnabled\` = ?,
           \`codingHintsEnabled\` = ?,
           \`assessmentExplanationsEnabled\` = ?,
           \`skillGapAnalysisEnabled\` = ?,
           \`monthlyTokenQuota\` = ?,
           \`dailyUserRequestLimit\` = ?,
           \`updatedAt\` = ?
       WHERE \`organizationId\` = ?`,
      [
        updated.aiEnabled ? 1 : 0,
        updated.courseGeneratorEnabled ? 1 : 0,
        updated.quizGeneratorEnabled ? 1 : 0,
        updated.lessonTutorEnabled ? 1 : 0,
        updated.codingHintsEnabled ? 1 : 0,
        updated.assessmentExplanationsEnabled ? 1 : 0,
        updated.skillGapAnalysisEnabled ? 1 : 0,
        updated.monthlyTokenQuota,
        updated.dailyUserRequestLimit,
        updated.updatedAt,
        organizationId
      ]
    );

    return updated;
  }

  /**
   * Verify if organization and user are permitted to invoke the given AI feature
   */
  public static async verifyPermissionAndQuota(params: {
    organizationId: string;
    userId: string;
    feature: AiFeatureType;
  }): Promise<{ allowed: boolean; error?: string }> {
    const settings = await this.getSettings(params.organizationId);

    // 1. Global AI Toggle
    if (!settings.aiEnabled) {
      return { allowed: false, error: "AI features have been disabled by your organization administrator." };
    }

    // 2. Granular Feature Toggle
    const featureMap: Record<AiFeatureType, boolean> = {
      course_generator: settings.courseGeneratorEnabled,
      quiz_generator: settings.quizGeneratorEnabled,
      lesson_tutor: settings.lessonTutorEnabled,
      coding_hints: settings.codingHintsEnabled,
      assessment_explanation: settings.assessmentExplanationsEnabled,
      skill_gap_analysis: settings.skillGapAnalysisEnabled
    };

    if (!featureMap[params.feature]) {
      return {
        allowed: false,
        error: `The requested AI capability (${params.feature.replace(/_/g, " ")}) is currently disabled for your organization.`
      };
    }

    // 3. Organization Monthly Token Quota
    if (settings.monthlyTokensUsed >= settings.monthlyTokenQuota) {
      return {
        allowed: false,
        error: `Your organization has reached its monthly AI token budget limit (${settings.monthlyTokensUsed.toLocaleString()} / ${settings.monthlyTokenQuota.toLocaleString()} tokens). Please contact your administrator.`
      };
    }

    // 4. Per-User Daily Request Limit
    const today = new Date().toISOString().substring(0, 10);
    const [userRows]: any = await pool.query(
      `SELECT COUNT(*) as requestCount 
       FROM \`ai_interaction_logs\` 
       WHERE \`userId\` = ? AND \`createdAt\` LIKE CONCAT(?, '%')`,
      [params.userId, today]
    );

    const userCount = Number(userRows?.[0]?.requestCount || 0);
    if (userCount >= settings.dailyUserRequestLimit) {
      return {
        allowed: false,
        error: `Daily AI interaction quota reached for your user account (${userCount}/${settings.dailyUserRequestLimit} requests used today). Please try again tomorrow.`
      };
    }

    return { allowed: true };
  }

  /**
   * Log AI interaction for auditability, telemetry, and quota billing
   */
  public static async recordInteraction(params: {
    organizationId: string;
    userId: string;
    feature: AiFeatureType;
    contextType?: string;
    contextId?: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
    safetyPassed: boolean;
    safetyNotes?: string;
  }): Promise<void> {
    const id = `ailog_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO \`ai_interaction_logs\`
       (\`id\`, \`organizationId\`, \`userId\`, \`feature\`, \`contextType\`, \`contextId\`, \`promptTokensEstimate\`, \`completionTokensEstimate\`, \`totalTokens\`, \`latencyMs\`, \`safetyPassed\`, \`safetyNotes\`, \`createdAt\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.organizationId || "org-default",
        params.userId,
        params.feature,
        params.contextType || null,
        params.contextId || null,
        params.promptTokens,
        params.completionTokens,
        params.totalTokens,
        params.latencyMs,
        params.safetyPassed ? 1 : 0,
        params.safetyNotes || null,
        now
      ]
    );

    // Increment organization token tally
    await pool.query(
      `UPDATE \`ai_organization_settings\`
       SET \`monthlyTokensUsed\` = \`monthlyTokensUsed\` + ?
       WHERE \`organizationId\` = ?`,
      [params.totalTokens, params.organizationId || "org-default"]
    );
  }

  /**
   * Get organization aggregate usage metrics for admin dashboard
   */
  public static async getUsageMetrics(organizationId: string) {
    const orgId = organizationId || "org-default";
    const settings = await this.getSettings(orgId);

    const [totalCalls]: any = await pool.query(
      "SELECT COUNT(*) as count, AVG(latencyMs) as avgLatency FROM `ai_interaction_logs` WHERE `organizationId` = ?",
      [orgId]
    );

    const [byFeature]: any = await pool.query(
      `SELECT feature, COUNT(*) as count, SUM(totalTokens) as tokens 
       FROM \`ai_interaction_logs\` 
       WHERE \`organizationId\` = ? 
       GROUP BY feature`,
      [orgId]
    );

    const [recentLogs]: any = await pool.query(
      `SELECT id, userId, feature, contextType, totalTokens, latencyMs, safetyPassed, createdAt 
       FROM \`ai_interaction_logs\` 
       WHERE \`organizationId\` = ? 
       ORDER BY createdAt DESC LIMIT 20`,
      [orgId]
    );

    return {
      settings,
      totalInteractions: Number(totalCalls?.[0]?.count || 0),
      averageLatencyMs: Math.round(Number(totalCalls?.[0]?.avgLatency || 0)),
      usageByFeature: byFeature || [],
      recentLogs: recentLogs || []
    };
  }
}
