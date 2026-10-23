/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pool } from "../../mysql.js";
import { randomUUID } from "crypto";
import { logAuditEvent } from "../../audit.js";

export interface ScormPackage {
  id: string;
  organizationId: string;
  courseId: string | null;
  title: string;
  version: "SCORM_12" | "SCORM_2004";
  manifestData: any;
  entryPoint: string;
  storageDir: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ScormRegistration {
  id: string;
  scormPackageId: string;
  studentId: string;
  organizationId: string;
  lessonStatus: string;
  rawScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  lessonLocation: string | null;
  suspendData: string | null;
  totalTimeSeconds: number;
  sessionTimeSeconds: number;
  completedAt: string | null;
  lastAccessedAt: string;
}

export class ScormService {
  public static readonly SPECIFICATIONS = {
    supported: [
      { standard: "SCORM 1.2", status: "Supported", cmiModel: "cmi.core.*", description: "ADL SCORM 1.2 Runtime Environment & Data Model" },
      { standard: "SCORM 2004 (3rd & 4th Ed.)", status: "Supported", cmiModel: "cmi.*", description: "ADL SCORM 2004 Sequencing and Navigation RTE" }
    ],
    unsupported: [
      { standard: "AICC (CMI001)", reason: "Legacy 1993 standard replaced by SCORM and xAPI" },
      { standard: "SCORM 1.0 & 1.1", reason: "Deprecated pre-release specifications with known security flaws" }
    ]
  };

  /**
   * List packages for an organization
   */
  public static async listPackages(organizationId: string, courseId?: string): Promise<ScormPackage[]> {
    let query = `SELECT * FROM scorm_packages WHERE organizationId = ? AND status = 'active'`;
    const params: any[] = [organizationId];

    if (courseId) {
      query += ` AND courseId = ?`;
      params.push(courseId);
    }

    query += ` ORDER BY createdAt DESC`;
    const [rows]: any = await pool.query(query, params);

    return rows.map((r: any) => ({
      id: r.id,
      organizationId: r.organizationId,
      courseId: r.courseId,
      title: r.title,
      version: r.version,
      manifestData: typeof r.manifestData === "string" ? JSON.parse(r.manifestData) : r.manifestData,
      entryPoint: r.entryPoint,
      storageDir: r.storageDir,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  /**
   * Register a new SCORM package
   */
  public static async createPackage(data: {
    organizationId: string;
    courseId?: string;
    title: string;
    version: "SCORM_12" | "SCORM_2004";
    entryPoint: string;
    storageDir: string;
    manifestData?: any;
  }, actor: { id: string; email: string; role: string }): Promise<ScormPackage> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO scorm_packages 
       (id, organizationId, courseId, title, version, manifestData, entryPoint, storageDir, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        id, data.organizationId, data.courseId || null, data.title, data.version,
        data.manifestData ? JSON.stringify(data.manifestData) : null,
        data.entryPoint, data.storageDir, now, now
      ]
    );

    await logAuditEvent({
      organizationId: data.organizationId,
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      action: "scorm_package_uploaded",
      resourceType: "scorm_package",
      resourceId: id,
      details: { title: data.title, version: data.version }
    });

    return {
      id,
      organizationId: data.organizationId,
      courseId: data.courseId || null,
      title: data.title,
      version: data.version,
      manifestData: data.manifestData || null,
      entryPoint: data.entryPoint,
      storageDir: data.storageDir,
      status: "active",
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Get or initialize learner SCORM registration
   */
  public static async getOrCreateRegistration(
    scormPackageId: string,
    studentId: string,
    organizationId: string
  ): Promise<ScormRegistration> {
    const [rows]: any = await pool.query(
      `SELECT * FROM scorm_registrations WHERE scormPackageId = ? AND studentId = ?`,
      [scormPackageId, studentId]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        scormPackageId: r.scormPackageId,
        studentId: r.studentId,
        organizationId: r.organizationId,
        lessonStatus: r.lessonStatus,
        rawScore: r.rawScore !== null ? Number(r.rawScore) : null,
        minScore: r.minScore !== null ? Number(r.minScore) : null,
        maxScore: r.maxScore !== null ? Number(r.maxScore) : null,
        lessonLocation: r.lessonLocation,
        suspendData: r.suspendData,
        totalTimeSeconds: Number(r.totalTimeSeconds) || 0,
        sessionTimeSeconds: Number(r.sessionTimeSeconds) || 0,
        completedAt: r.completedAt,
        lastAccessedAt: r.lastAccessedAt
      };
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO scorm_registrations 
       (id, scormPackageId, studentId, organizationId, lessonStatus, rawScore, minScore, maxScore, lessonLocation, suspendData, totalTimeSeconds, sessionTimeSeconds, completedAt, lastAccessedAt)
       VALUES (?, ?, ?, ?, 'not attempted', NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, ?)`,
      [id, scormPackageId, studentId, organizationId, now]
    );

    return {
      id,
      scormPackageId,
      studentId,
      organizationId,
      lessonStatus: "not attempted",
      rawScore: null,
      minScore: null,
      maxScore: null,
      lessonLocation: null,
      suspendData: null,
      totalTimeSeconds: 0,
      sessionTimeSeconds: 0,
      completedAt: null,
      lastAccessedAt: now
    };
  }

  /**
   * Commit SCORM RTE values sent from client iframe bridge
   */
  public static async commitRteValues(
    scormPackageId: string,
    studentId: string,
    values: {
      lessonStatus?: string;
      rawScore?: number;
      minScore?: number;
      maxScore?: number;
      lessonLocation?: string;
      suspendData?: string;
      sessionTimeSeconds?: number;
    }
  ): Promise<ScormRegistration> {
    const reg = await this.getOrCreateRegistration(scormPackageId, studentId, "org-default");
    const now = new Date().toISOString();

    const newStatus = values.lessonStatus || reg.lessonStatus;
    const isCompleted = ["passed", "completed"].includes(newStatus.toLowerCase());
    const rawScore = values.rawScore !== undefined ? values.rawScore : reg.rawScore;
    const minScore = values.minScore !== undefined ? values.minScore : reg.minScore;
    const maxScore = values.maxScore !== undefined ? values.maxScore : reg.maxScore;
    const lessonLocation = values.lessonLocation !== undefined ? values.lessonLocation : reg.lessonLocation;
    const suspendData = values.suspendData !== undefined ? values.suspendData : reg.suspendData;
    const sessionTime = values.sessionTimeSeconds || 0;
    const totalTime = reg.totalTimeSeconds + sessionTime;
    const completedAt = isCompleted ? (reg.completedAt || now) : reg.completedAt;

    await pool.query(
      `UPDATE scorm_registrations SET
        lessonStatus = ?,
        rawScore = ?,
        minScore = ?,
        maxScore = ?,
        lessonLocation = ?,
        suspendData = ?,
        totalTimeSeconds = ?,
        sessionTimeSeconds = ?,
        completedAt = ?,
        lastAccessedAt = ?
       WHERE id = ?`,
      [
        newStatus, rawScore, minScore, maxScore, lessonLocation,
        suspendData, totalTime, sessionTime, completedAt, now, reg.id
      ]
    );

    return this.getOrCreateRegistration(scormPackageId, studentId, reg.organizationId);
  }

  /**
   * Finish SCORM RTE session
   */
  public static async finishRte(
    scormPackageId: string,
    studentId: string
  ): Promise<{ finished: boolean; registration: ScormRegistration }> {
    const reg = await this.commitRteValues(scormPackageId, studentId, {});
    return { finished: true, registration: reg };
  }
}
