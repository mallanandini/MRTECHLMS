/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import { randomUUID } from "crypto";

export interface XapiActor {
  objectType?: "Agent" | "Group";
  name?: string;
  mbox?: string;
  openid?: string;
  account?: {
    homePage: string;
    name: string;
  };
}

export interface XapiVerb {
  id: string;
  display?: Record<string, string>;
}

export interface XapiObject {
  objectType?: "Activity" | "Agent" | "SubStatement";
  id: string;
  definition?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    type?: string;
  };
}

export interface XapiResult {
  score?: {
    scaled?: number;
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;
}

export interface XapiStatement {
  id?: string;
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiObject;
  result?: XapiResult;
  context?: any;
  timestamp?: string;
}

export class XapiService {
  /**
   * Standard ADL xAPI Verbs Registry
   */
  public static readonly VERBS = {
    EXPERIENCED: { id: "http://adlnet.gov/expapi/verbs/experienced", display: { "en-US": "experienced" } },
    ATTEMPTED: { id: "http://adlnet.gov/expapi/verbs/attempted", display: { "en-US": "attempted" } },
    COMPLETED: { id: "http://adlnet.gov/expapi/verbs/completed", display: { "en-US": "completed" } },
    PASSED: { id: "http://adlnet.gov/expapi/verbs/passed", display: { "en-US": "passed" } },
    FAILED: { id: "http://adlnet.gov/expapi/verbs/failed", display: { "en-US": "failed" } },
    ANSWERED: { id: "http://adlnet.gov/expapi/verbs/answered", display: { "en-US": "answered" } },
    INTERACTED: { id: "http://adlnet.gov/expapi/verbs/interacted", display: { "en-US": "interacted" } }
  };

  /**
   * Standard ADL Activity Types
   */
  public static readonly ACTIVITY_TYPES = {
    COURSE: "http://adlnet.gov/expapi/activities/course",
    MODULE: "http://adlnet.gov/expapi/activities/module",
    LESSON: "http://adlnet.gov/expapi/activities/lesson",
    ASSESSMENT: "http://adlnet.gov/expapi/activities/assessment",
    QUESTION: "http://adlnet.gov/expapi/activities/question",
    MEDIA: "http://adlnet.gov/expapi/activities/media"
  };

  /**
   * Store a verified xAPI Statement
   */
  public static async recordStatement(
    organizationId: string,
    statement: XapiStatement
  ): Promise<{ id: string; storedAt: string }> {
    const id = statement.id || randomUUID();
    const timestamp = statement.timestamp || new Date().toISOString();
    const storedAt = new Date().toISOString();

    const actorEmail = statement.actor.mbox ? statement.actor.mbox.replace("mailto:", "") : (statement.actor.account?.name || "unknown@user.com");
    const actorName = statement.actor.name || null;
    const verbId = statement.verb.id;
    const verbDisplay = statement.verb.display?.["en-US"] || statement.verb.display?.["en"] || statement.verb.id.split("/").pop() || "experienced";

    const activityId = statement.object.id;
    const activityName = statement.object.definition?.name?.["en-US"] || statement.object.definition?.name?.["en"] || null;
    const activityType = statement.object.definition?.type || null;

    const scaledScore = statement.result?.score?.scaled !== undefined ? statement.result.score.scaled : null;
    const rawScore = statement.result?.score?.raw !== undefined ? statement.result.score.raw : null;
    const success = statement.result?.success !== undefined ? (statement.result.success ? 1 : 0) : null;
    const completion = statement.result?.completion !== undefined ? (statement.result.completion ? 1 : 0) : null;
    const duration = statement.result?.duration || null;

    await pool.query(
      `INSERT INTO xapi_statements 
       (id, organizationId, actorEmail, actorName, verbId, verbDisplay, activityId, activityName, activityType, scaledScore, rawScore, success, completion, duration, context, statementJson, timestamp, storedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, organizationId, actorEmail, actorName, verbId, verbDisplay,
        activityId, activityName, activityType, scaledScore, rawScore,
        success, completion, duration,
        statement.context ? JSON.stringify(statement.context) : null,
        JSON.stringify(statement), timestamp, storedAt
      ]
    );

    // Forward asynchronously to configured external LRS if any
    this.forwardToExternalLrs(organizationId, statement).catch(err => {
      console.warn("[xAPI LRS Forwarder] Background dispatch warning:", err);
    });

    return { id, storedAt };
  }

  /**
   * High-level Activity Tracking Helper
   */
  public static async trackActivity(params: {
    organizationId: string;
    studentEmail: string;
    studentName: string;
    verb: { id: string; display: Record<string, string> };
    activityId: string;
    activityName: string;
    activityType: string;
    scoreRaw?: number;
    scoreScaled?: number;
    passed?: boolean;
    completed?: boolean;
    durationIso?: string;
  }) {
    const statement: XapiStatement = {
      id: randomUUID(),
      actor: {
        objectType: "Agent",
        name: params.studentName,
        mbox: `mailto:${params.studentEmail}`
      },
      verb: params.verb,
      object: {
        objectType: "Activity",
        id: params.activityId,
        definition: {
          name: { "en-US": params.activityName },
          type: params.activityType
        }
      },
      result: {
        score: params.scoreRaw !== undefined ? { raw: params.scoreRaw, scaled: params.scoreScaled } : undefined,
        success: params.passed,
        completion: params.completed,
        duration: params.durationIso
      },
      timestamp: new Date().toISOString()
    };

    return this.recordStatement(params.organizationId, statement);
  }

  /**
   * Query recorded xAPI statements with standard filters
   */
  public static async queryStatements(params: {
    organizationId: string;
    actorEmail?: string;
    verbId?: string;
    activityId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { organizationId, actorEmail, verbId, activityId, limit = 50, offset = 0 } = params;

    let query = `SELECT * FROM xapi_statements WHERE organizationId = ?`;
    const qParams: any[] = [organizationId];

    if (actorEmail) {
      query += ` AND actorEmail = ?`;
      qParams.push(actorEmail);
    }
    if (verbId) {
      query += ` AND verbId = ?`;
      qParams.push(verbId);
    }
    if (activityId) {
      query += ` AND activityId = ?`;
      qParams.push(activityId);
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    qParams.push(limit, offset);

    const [rows]: any = await pool.query(query, qParams);

    return {
      statements: rows.map((r: any) => typeof r.statementJson === "string" ? JSON.parse(r.statementJson) : r.statementJson),
      totalReturned: rows.length
    };
  }

  /**
   * Extension Point: Forward statements to external LRS (Watershed, Learning Locker, Veracity)
   */
  public static async forwardToExternalLrs(organizationId: string, statement: XapiStatement): Promise<void> {
    const [destRows]: any = await pool.query(
      `SELECT * FROM xapi_lrs_destinations WHERE organizationId = ? AND isEnabled = 1`,
      [organizationId]
    );

    if (!destRows || destRows.length === 0) return;

    for (const dest of destRows) {
      // Extension point for external LRS HTTP Basic authentication dispatch
      // In production, will dispatch: fetch(dest.endpointUrl, { method: "POST", headers: { Authorization: ... }, body: JSON.stringify(statement) })
    }
  }
}
