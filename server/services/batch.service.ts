/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import * as XLSX from "xlsx";
import { pool } from "../mysql.js";
import { 
  institutionsDb, batchesDb, batchStudentsDb, batchCoursesDb, 
  batchAssessmentsDb, batchLearningPathsDb, usersDb, coursesDb, assessmentsDb, enrollmentsDb, learningPathsDb 
} from "../db.js";
import { 
  Institution, Batch, BatchStudent, BatchCourse, BatchAssessment, BatchLearningPath,
  BatchExcelPreviewRow, BatchStudentAssignPreviewRow, UserRole, Enrollment
} from "../../src/types.js";
import { logAuditEvent } from "../audit.js";

export interface ActorContext {
  id: string;
  email: string;
  role: UserRole | string;
  organizationId?: string;
}

export class BatchService {

  // =========================================================================
  // 1. INSTITUTIONS MANAGEMENT
  // =========================================================================

  /**
   * List all institutions for an organization with batch and student counts
   */
  static async getInstitutions(orgId: string = "org-default"): Promise<Institution[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        i.*,
        COUNT(DISTINCT b.id) AS batchCount,
        COUNT(DISTINCT bs.studentId) AS studentCount
      FROM institutions i
      LEFT JOIN batches b ON b.institutionId = i.id AND b.deletedAt IS NULL
      LEFT JOIN batch_students bs ON bs.batchId = b.id AND bs.status = 'active'
      WHERE i.organizationId = ? AND i.deletedAt IS NULL
      GROUP BY i.id
      ORDER BY i.name ASC
    `, [orgId]);

    return rows.map((r: any) => ({
      ...r,
      academicYears: typeof r.academicYears === "string" ? JSON.parse(r.academicYears || "[]") : (r.academicYears || []),
      batchCount: Number(r.batchCount) || 0,
      studentCount: Number(r.studentCount) || 0
    }));
  }

  /**
   * Get an institution by ID
   */
  static async getInstitutionById(id: string): Promise<Institution | null> {
    const inst = await institutionsDb.findOne({ id, deletedAt: null as any });
    if (!inst) return null;

    const [countRows]: any = await pool.query(`
      SELECT 
        COUNT(DISTINCT b.id) AS batchCount,
        COUNT(DISTINCT bs.studentId) AS studentCount
      FROM batches b
      LEFT JOIN batch_students bs ON bs.batchId = b.id AND bs.status = 'active'
      WHERE b.institutionId = ? AND b.deletedAt IS NULL
    `, [id]);

    return {
      ...inst,
      academicYears: typeof inst.academicYears === "string" ? JSON.parse(inst.academicYears as any) : (inst.academicYears || []),
      batchCount: Number(countRows[0]?.batchCount) || 0,
      studentCount: Number(countRows[0]?.studentCount) || 0
    };
  }

  /**
   * Helper to resolve an institution reference by ID, Code, or Name (case-insensitive).
   */
  static async resolveInstitution(ref?: string | null, orgId: string = "org-default"): Promise<Institution | null> {
    const trimmed = (ref || "").trim();
    if (!trimmed) {
      const institutions = await this.getInstitutions(orgId);
      return institutions[0] || null;
    }

    const [rows]: any = await pool.query(
      `SELECT * FROM institutions 
       WHERE organizationId = ? AND deletedAt IS NULL 
         AND (id = ? OR UPPER(code) = UPPER(?) OR UPPER(name) = UPPER(?) OR name LIKE ?) 
       LIMIT 1`,
      [orgId, trimmed, trimmed, trimmed, `%${trimmed}%`]
    );

    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        ...r,
        academicYears: typeof r.academicYears === "string" ? JSON.parse(r.academicYears || "[]") : (r.academicYears || [])
      };
    }

    // Fallback: check if any institution exists
    const [allInst]: any = await pool.query("SELECT * FROM institutions WHERE organizationId = ? AND deletedAt IS NULL LIMIT 1", [orgId]);
    if (allInst && allInst.length > 0) {
      return {
        ...allInst[0],
        academicYears: typeof allInst[0].academicYears === "string" ? JSON.parse(allInst[0].academicYears || "[]") : (allInst[0].academicYears || [])
      };
    }
    return null;
  }

  /**
   * Create a new institution
   */
  static async createInstitution(data: {
    name: string;
    code: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    academicYears?: string[];
    organizationId?: string;
  }, actor: ActorContext): Promise<Institution> {
    const orgId = data.organizationId || actor.organizationId || "org-default";
    const code = data.code.trim().toUpperCase();

    // Check duplicate code within organization
    const existing = await institutionsDb.findOne({ organizationId: orgId, code, deletedAt: null as any });
    if (existing) {
      throw new Error(`Institution with code '${code}' already exists.`);
    }

    const id = "inst-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const now = new Date().toISOString();
    const academicYears = data.academicYears && data.academicYears.length > 0 
      ? data.academicYears 
      : ["2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"];

    const institution: Institution = {
      id,
      organizationId: orgId,
      name: data.name.trim(),
      code,
      contactEmail: data.contactEmail?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,
      address: data.address?.trim() || null,
      academicYears,
      status: "active",
      createdAt: now,
      updatedAt: now
    };

    await institutionsDb.insert(institution);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "INSTITUTION_CREATED",
      resourceType: "institutions",
      resourceId: id,
      details: { name: institution.name, code: institution.code }
    });

    return institution;
  }

  /**
   * Update an institution
   */
  static async updateInstitution(id: string, data: Partial<Institution>, actor: ActorContext): Promise<Institution> {
    const existing = await institutionsDb.findOne({ id, deletedAt: null as any });
    if (!existing) {
      throw new Error("Institution not found.");
    }

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const code = data.code.trim().toUpperCase();
      const duplicate = await institutionsDb.findOne({ organizationId: existing.organizationId, code, deletedAt: null as any });
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Institution with code '${code}' already exists.`);
      }
      data.code = code;
    }

    const now = new Date().toISOString();
    const updatePayload: any = {
      ...data,
      updatedAt: now
    };

    if (data.academicYears) {
      updatePayload.academicYears = data.academicYears;
    }

    const updated = await institutionsDb.update(id, updatePayload);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "INSTITUTION_UPDATED",
      resourceType: "institutions",
      resourceId: id,
      details: { changes: Object.keys(data) }
    });

    return (updated || await this.getInstitutionById(id)) as Institution;
  }

  /**
   * Soft delete an institution (verifying no active batches exist)
   */
  static async deleteInstitution(id: string, actor: ActorContext): Promise<void> {
    const existing = await institutionsDb.findOne({ id, deletedAt: null as any });
    if (!existing) {
      throw new Error("Institution not found.");
    }

    const [activeBatches]: any = await pool.query(
      "SELECT id FROM batches WHERE institutionId = ? AND deletedAt IS NULL LIMIT 1",
      [id]
    );
    if (activeBatches.length > 0) {
      throw new Error("Cannot delete institution with active batches. Please archive or reassign batches first.");
    }

    const now = new Date().toISOString();
    await institutionsDb.update(id, {
      deletedAt: now,
      status: "archived",
      updatedAt: now
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "INSTITUTION_DELETED",
      resourceType: "institutions",
      resourceId: id,
      details: { name: existing.name, code: existing.code }
    });
  }

  // =========================================================================
  // 2. BATCHES MANAGEMENT
  // =========================================================================

  /**
   * Query batches with filter by institution, academic year, status, and search keyword
   */
  static async getBatches(query: {
    orgId?: string;
    institutionId?: string;
    academicYear?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ batches: Batch[]; total: number }> {
    const orgId = query.orgId || "org-default";
    const params: any[] = [orgId];
    let whereClause = "b.organizationId = ? AND b.deletedAt IS NULL";

    if (query.institutionId) {
      whereClause += " AND b.institutionId = ?";
      params.push(query.institutionId);
    }

    if (query.academicYear && query.academicYear !== "all") {
      whereClause += " AND b.academicYear = ?";
      params.push(query.academicYear);
    }

    if (query.status && query.status !== "all") {
      whereClause += " AND b.status = ?";
      params.push(query.status);
    }

    if (query.search && query.search.trim()) {
      whereClause += " AND (b.name LIKE ? OR b.code LIKE ? OR i.name LIKE ?)";
      const pattern = `%${query.search.trim()}%`;
      params.push(pattern, pattern, pattern);
    }

    // Get count
    const [countRows]: any = await pool.query(`
      SELECT COUNT(DISTINCT b.id) AS total
      FROM batches b
      JOIN institutions i ON b.institutionId = i.id
      WHERE ${whereClause}
    `, params);
    const total = Number(countRows[0]?.total) || 0;

    // Get rows with aggregated metrics
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    params.push(limit, offset);

    const [rows]: any = await pool.query(`
      SELECT 
        b.*,
        i.name AS institutionName,
        i.code AS institutionCode,
        c.title AS courseName,
        COUNT(DISTINCT bs.studentId) AS studentCount,
        COUNT(DISTINCT bc.courseId) AS courseCount,
        COUNT(DISTINCT ba.assessmentId) AS assessmentCount
      FROM batches b
      JOIN institutions i ON b.institutionId = i.id
      LEFT JOIN courses c ON b.courseId = c.id
      LEFT JOIN batch_students bs ON bs.batchId = b.id AND bs.status = 'active'
      LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
      LEFT JOIN batch_assessments ba ON ba.batchId = b.id AND ba.status = 'active'
      WHERE ${whereClause}
      GROUP BY b.id
      ORDER BY b.createdAt DESC
      LIMIT ? OFFSET ?
    `, params);

    const batches = rows.map((r: any) => ({
      ...r,
      studentCount: Number(r.studentCount) || 0,
      courseCount: Number(r.courseCount) || 0,
      assessmentCount: Number(r.assessmentCount) || 0
    }));

    return { batches, total };
  }

  /**
   * Academic Hierarchical Batch Structure:
   * Institution
   *  ├── Batch Year (e.g. 2026)
   *  │    ├── Batch (e.g. Python Batch A)
   *  │    │    ├── Students
   *  │    │    └── Courses
   */
  static async getBatchesHierarchy(orgId: string = "org-default"): Promise<any[]> {
    const institutions = await this.getInstitutions(orgId);
    const { batches } = await this.getBatches({ orgId, limit: 1000 });

    // Fetch students and courses for all batches to embed in the tree
    const [allStudentsRows]: any = await pool.query(`
      SELECT bs.batchId, u.id, u.name, u.email, u.role
      FROM batch_students bs
      JOIN users u ON bs.studentId = u.id
      WHERE bs.status = 'active' AND u.deletedAt IS NULL
    `);
    const batchStudentsMap = new Map<string, any[]>();
    for (const s of allStudentsRows) {
      if (!batchStudentsMap.has(s.batchId)) batchStudentsMap.set(s.batchId, []);
      batchStudentsMap.get(s.batchId)!.push({ id: s.id, name: s.name, email: s.email, role: s.role });
    }

    const [allCoursesRows]: any = await pool.query(`
      SELECT bc.batchId, c.id, c.title, c.category, c.thumbnail, c.instructorName
      FROM batch_courses bc
      JOIN courses c ON bc.courseId = c.id
      WHERE bc.status = 'active' AND c.deletedAt IS NULL
    `);
    const batchCoursesMap = new Map<string, any[]>();
    for (const c of allCoursesRows) {
      if (!batchCoursesMap.has(c.batchId)) batchCoursesMap.set(c.batchId, []);
      batchCoursesMap.get(c.batchId)!.push({ 
        id: c.id, 
        title: c.title, 
        category: c.category, 
        thumbnail: c.thumbnail, 
        instructorName: c.instructorName 
      });
    }

    const hierarchy = institutions.map(inst => {
      const instBatches = batches.filter(b => b.institutionId === inst.id);
      
      // Group batches by academic year (e.g. 2026, 2027)
      const yearsMap = new Map<string, any[]>();
      
      for (const batch of instBatches) {
        const year = batch.academicYear || "Unassigned Year";
        if (!yearsMap.has(year)) {
          yearsMap.set(year, []);
        }
        yearsMap.get(year)!.push({
          ...batch,
          students: batchStudentsMap.get(batch.id) || [],
          courses: batchCoursesMap.get(batch.id) || []
        });
      }

      // Convert years map to sorted array
      const years = Array.from(yearsMap.entries()).map(([year, batchList]) => ({
        year,
        batchesCount: batchList.length,
        totalStudentsCount: batchList.reduce((acc, b) => acc + (b.studentCount || 0), 0),
        totalCoursesCount: batchList.reduce((acc, b) => acc + (b.courseCount || 0), 0),
        batches: batchList
      })).sort((a, b) => b.year.localeCompare(a.year));

      return {
        id: inst.id,
        name: inst.name,
        code: inst.code,
        years,
        totalBatches: instBatches.length
      };
    });

    return hierarchy;
  }

  /**
   * Get single batch by ID with joined institution and course info
   */
  static async getBatchById(id: string): Promise<Batch | null> {
    const [rows]: any = await pool.query(`
      SELECT 
        b.*,
        i.name AS institutionName,
        i.code AS institutionCode,
        c.title AS courseName,
        COUNT(DISTINCT bs.studentId) AS studentCount,
        COUNT(DISTINCT bc.courseId) AS courseCount,
        COUNT(DISTINCT ba.assessmentId) AS assessmentCount
      FROM batches b
      JOIN institutions i ON b.institutionId = i.id
      LEFT JOIN courses c ON b.courseId = c.id
      LEFT JOIN batch_students bs ON bs.batchId = b.id AND bs.status = 'active'
      LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
      LEFT JOIN batch_assessments ba ON ba.batchId = b.id AND ba.status = 'active'
      WHERE b.id = ? AND b.deletedAt IS NULL
      GROUP BY b.id
    `, [id]);

    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    return {
      ...r,
      studentCount: Number(r.studentCount) || 0,
      courseCount: Number(r.courseCount) || 0,
      assessmentCount: Number(r.assessmentCount) || 0
    };
  }

  /**
   * Create a new batch
   */
  static async createBatch(data: {
    name?: string;
    batch_name?: string;
    code?: string;
    institutionId?: string;
    institution?: string;
    academicYear?: string;
    year?: string;
    courseId?: string | null;
    courseIds?: string[];
    studentIds?: string[];
    startDate?: string | null;
    endDate?: string | null;
    maxStudents?: number | null;
    description?: string | null;
    organizationId?: string;
  }, actor: ActorContext): Promise<Batch> {
    const orgId = data.organizationId || actor.organizationId || "org-default";
    const name = (data.name || data.batch_name || "").trim();
    if (!name) {
      throw new Error("Batch name is required.");
    }

    const rawYear = (data.academicYear || data.year || "2026").trim();
    if (!rawYear) {
      throw new Error("Batch year (academicYear) is required.");
    }
    const yearPattern = /^\d{4}(-\d{4})?$/;
    if (!yearPattern.test(rawYear)) {
      throw new Error(`Invalid batch year format '${rawYear}'. Please specify a 4-digit year (e.g. 2026) or year span (e.g. 2026-2027).`);
    }
    const academicYear = rawYear;

    // Resolve institution
    let institutionId = data.institutionId;
    if (!institutionId && data.institution) {
      const inst = await this.resolveInstitution(data.institution, orgId);
      if (inst) institutionId = inst.id;
    }
    if (!institutionId) {
      const inst = await this.resolveInstitution("", orgId);
      if (inst) institutionId = inst.id;
    }
    if (!institutionId) {
      throw new Error("Institution not found. Please specify an institution.");
    }

    // Verify institution exists
    const inst = await institutionsDb.findOne({ id: institutionId, deletedAt: null as any });
    if (!inst) {
      throw new Error("Institution not found.");
    }

    // Check duplicate batch name + year within this institution / organization
    const [dupBatchRows]: any = await pool.query(
      "SELECT id, name, code, academicYear FROM batches WHERE institutionId = ? AND UPPER(name) = UPPER(?) AND academicYear = ? AND deletedAt IS NULL LIMIT 1",
      [institutionId, name, academicYear]
    );
    if (dupBatchRows.length > 0) {
      throw new Error(`A batch named '${name}' for academic year '${academicYear}' already exists in this institution (Code: ${dupBatchRows[0].code}).`);
    }

    // Auto-generate unique batch code if not provided
    let code = (data.code || "").trim().toUpperCase();
    if (!code) {
      const cleanName = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
      const cleanYear = academicYear.replace(/[^0-9]/g, "").slice(0, 4) || "2026";
      const baseCode = `${cleanName}-${cleanYear}`.slice(0, 40);
      code = baseCode;
      let counter = 1;
      while (await batchesDb.findOne({ institutionId, code, deletedAt: null as any })) {
        code = `${baseCode}-${counter}`.slice(0, 50);
        counter++;
      }
    } else {
      // Check duplicate code within this institution
      const existing = await batchesDb.findOne({ institutionId, code, deletedAt: null as any });
      if (existing) {
        throw new Error(`Batch with code '${code}' already exists for this institution.`);
      }
    }

    // If initial course is provided, verify it exists
    if (data.courseId) {
      const course = await coursesDb.findOne({ id: data.courseId, deletedAt: null as any });
      if (!course) {
        throw new Error("Designated primary course not found.");
      }
    }

    const id = "batch-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const now = new Date().toISOString();

    const batch: Batch = {
      id,
      organizationId: orgId,
      institutionId,
      name,
      code,
      academicYear,
      courseId: data.courseId || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      maxStudents: data.maxStudents ? Number(data.maxStudents) : null,
      description: data.description?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now
    };

    await batchesDb.insert(batch);

    // If courseId was provided, also record it in batch_courses automatically
    if (data.courseId) {
      await this.assignCourseToBatch(id, data.courseId, actor);
    }
    // If courseIds array was provided, record each in batch_courses
    if (data.courseIds && Array.isArray(data.courseIds)) {
      for (const cid of data.courseIds) {
        if (cid && cid !== data.courseId) {
          try {
            await this.assignCourseToBatch(id, cid, actor);
          } catch (e) {
            // Ignore duplicate
          }
        }
      }
    }

    // If studentIds array was provided, enroll each student in the batch
    if (data.studentIds && Array.isArray(data.studentIds)) {
      for (const sid of data.studentIds) {
        if (sid) {
          try {
            await this.addStudentToBatch(id, sid, actor);
          } catch (e: any) {
            console.warn(`[BatchService] Note enrolling student ${sid}: ${e.message}`);
          }
        }
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_CREATED",
      resourceType: "batches",
      resourceId: id,
      details: { name: batch.name, code: batch.code, institutionId: batch.institutionId }
    });

    return (await this.getBatchById(id))!;
  }

  /**
   * Update a batch
   */
  static async updateBatch(id: string, data: Partial<Batch>, actor: ActorContext): Promise<Batch> {
    const existing = await batchesDb.findOne({ id, deletedAt: null as any });
    if (!existing) {
      throw new Error("Batch not found.");
    }

    const institutionId = data.institutionId || existing.institutionId;

    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const code = data.code.trim().toUpperCase();
      const duplicate = await batchesDb.findOne({ institutionId, code, deletedAt: null as any });
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Batch with code '${code}' already exists for this institution.`);
      }
      data.code = code;
    }

    const now = new Date().toISOString();
    await batchesDb.update(id, {
      ...data,
      updatedAt: now
    });

    // If courseId changed and is not null, ensure it's in batch_courses
    if (data.courseId && data.courseId !== existing.courseId) {
      await this.assignCourseToBatch(id, data.courseId, actor);
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_UPDATED",
      resourceType: "batches",
      resourceId: id,
      details: { changes: Object.keys(data) }
    });

    return (await this.getBatchById(id))!;
  }

  /**
   * Soft delete a batch
   */
  static async deleteBatch(id: string, actor: ActorContext): Promise<void> {
    const existing = await batchesDb.findOne({ id, deletedAt: null as any });
    if (!existing) {
      throw new Error("Batch not found.");
    }

    // Safety check: Prevent deletion of batch with active student memberships
    const [activeMembers]: any = await pool.query(
      "SELECT COUNT(*) AS cnt FROM batch_students WHERE batchId = ? AND status = 'active'",
      [id]
    );
    const memberCount = Number(activeMembers[0]?.cnt) || 0;
    if (memberCount > 0) {
      throw new Error(`Cannot delete batch '${existing.name}' because it contains ${memberCount} active enrolled member(s). Please reassign or remove all members first.`);
    }

    const now = new Date().toISOString();
    await batchesDb.update(id, {
      deletedAt: now,
      status: "archived",
      updatedAt: now
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_DELETED",
      resourceType: "batches",
      resourceId: id,
      details: { name: existing.name, code: existing.code }
    });
  }

  // =========================================================================
  // 3. MULTI-BATCH STUDENT MEMBERSHIP
  // =========================================================================

  /**
   * Get all students in a batch.
   * For each student, include all active batches they belong to (multi-batch badge support).
   */
  static async getBatchStudents(batchId: string): Promise<BatchStudent[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        bs.id,
        bs.batchId,
        bs.studentId,
        bs.enrolledAt,
        bs.status,
        bs.createdAt,
        bs.updatedAt,
        u.name AS studentName,
        u.email AS studentEmail,
        b.name AS batchName,
        b.code AS batchCode
      FROM batch_students bs
      JOIN users u ON bs.studentId = u.id
      JOIN batches b ON bs.batchId = b.id
      WHERE bs.batchId = ? AND u.deletedAt IS NULL
      ORDER BY bs.enrolledAt DESC
    `, [batchId]);

    if (rows.length === 0) return [];

    // Query multi-batch memberships for these students
    const studentIds = rows.map((r: any) => r.studentId);
    const ph = studentIds.map(() => "?").join(",");

    const [allMemberships]: any = await pool.query(`
      SELECT 
        bs.studentId,
        b.id AS batchId,
        b.name AS batchName,
        b.code AS batchCode,
        bs.status
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      WHERE bs.studentId IN (${ph}) AND b.deletedAt IS NULL AND bs.status = 'active'
    `, studentIds);

    const studentBatchesMap = new Map<string, { id: string; name: string; code: string; status: string }[]>();
    for (const mem of allMemberships) {
      const list = studentBatchesMap.get(mem.studentId) || [];
      list.push({
        id: mem.batchId,
        name: mem.batchName,
        code: mem.batchCode,
        status: mem.status
      });
      studentBatchesMap.set(mem.studentId, list);
    }

    return rows.map((r: any) => ({
      ...r,
      batches: studentBatchesMap.get(r.studentId) || []
    }));
  }

  /**
   * Add a student to a batch.
   * A student can belong to multiple batches.
   * Enforces (batchId, studentId) uniqueness.
   * Synchronizes course access for all courses assigned to this batch.
   */
  static async addStudentToBatch(batchId: string, studentId: string, actor: ActorContext): Promise<BatchStudent> {
    const batch = await batchesDb.findOne({ id: batchId, deletedAt: null as any });
    if (!batch) {
      throw new Error("Batch not found.");
    }

    if (batch.status !== "active") {
      throw new Error(`Cannot add members to batch '${batch.name}' because its status is '${batch.status}'. Only active batches allow membership.`);
    }

    // Check capacity if maxStudents is set
    if (batch.maxStudents && batch.maxStudents > 0) {
      const [countRow]: any = await pool.query(
        "SELECT COUNT(*) AS cnt FROM batch_students WHERE batchId = ? AND status = 'active'",
        [batchId]
      );
      const currentCount = Number(countRow[0]?.cnt) || 0;
      if (currentCount >= batch.maxStudents) {
        throw new Error(`Batch has reached its maximum capacity of ${batch.maxStudents} students.`);
      }
    }

    // Check user exists
    const user = await usersDb.findOne({ id: studentId, deletedAt: null as any });
    if (!user) {
      throw new Error("User/Student not found.");
    }

    // Check if already in this batch
    const existing = await batchStudentsDb.findOne({ batchId, studentId });
    const now = new Date().toISOString();

    if (existing) {
      if (existing.status === "active") {
        throw new Error(`Student '${user.email}' is already an active member of this batch.`);
      } else {
        // Reactivate
        await batchStudentsDb.update(existing.id, {
          status: "active",
          updatedAt: now
        });
      }
    } else {
      const id = "bs-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      const membership: BatchStudent = {
        id,
        organizationId: batch.organizationId || "org-default",
        batchId,
        studentId,
        enrolledAt: now,
        status: "active",
        createdAt: now,
        updatedAt: now
      };
      await batchStudentsDb.insert(membership);
    }

    // Synchronize course access for this student for all active courses assigned to this batch
    await this.syncStudentBatchCourseAccess(studentId, batchId, actor);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_STUDENT_ADDED",
      resourceType: "batch_students",
      resourceId: batchId,
      details: { studentId, studentEmail: user.email, batchName: batch.name }
    });

    const studentList = await this.getBatchStudents(batchId);
    return studentList.find(s => s.studentId === studentId)!;
  }

  /**
   * Bulk assign students to a batch:
   * Enforces: One student can belong to multiple batches, one batch can contain multiple students.
   * Automatically synchronizes course access for all batch courses.
   */
  static async assignStudentsBulk(params: {
    batchId?: string;
    batch_id?: string;
    batchCode?: string;
    batch_code?: string;
    studentIds?: string[];
    student_ids?: string[];
    studentEmails?: string[];
    student_emails?: string[];
    assignments?: Array<{ batchId?: string; batch_id?: string; studentId?: string; student_id?: string }>;
  }, actor: ActorContext): Promise<{ assignedCount: number; batchId?: string; results: Array<{ studentId: string; email?: string; success: boolean; error?: string }> }> {
    let targetBatchId = params.batchId || params.batch_id;
    const batchCode = params.batchCode || params.batch_code;

    if (!targetBatchId && batchCode) {
      const batch = await batchesDb.findOne({ code: batchCode.trim().toUpperCase(), deletedAt: null as any });
      if (!batch) throw new Error(`Batch with code '${batchCode}' not found`);
      targetBatchId = batch.id;
    }

    const assignmentsToProcess: Array<{ batchId: string; studentId: string }> = [];

    if (params.assignments && Array.isArray(params.assignments)) {
      for (const a of params.assignments) {
        const bId = a.batchId || a.batch_id || targetBatchId;
        const sId = a.studentId || a.student_id;
        if (bId && sId) {
          assignmentsToProcess.push({ batchId: bId, studentId: sId });
        }
      }
    } else if (targetBatchId) {
      const studentIds = params.studentIds || params.student_ids;
      if (studentIds && Array.isArray(studentIds)) {
        for (const sid of studentIds) {
          if (sid) assignmentsToProcess.push({ batchId: targetBatchId, studentId: sid });
        }
      }

      const studentEmails = params.studentEmails || params.student_emails;
      if (studentEmails && Array.isArray(studentEmails)) {
        for (const email of studentEmails) {
          if (!email) continue;
          const user = await usersDb.findOne({ email: email.trim().toLowerCase(), deletedAt: null as any });
          if (user) {
            assignmentsToProcess.push({ batchId: targetBatchId, studentId: user.id });
          }
        }
      }
    }

    if (assignmentsToProcess.length === 0) {
      throw new Error("No student assignments provided. Specify batchId/batch_id and studentIds/student_ids.");
    }

    let assignedCount = 0;
    const results: Array<{ studentId: string; email?: string; success: boolean; error?: string }> = [];

    for (const { batchId, studentId } of assignmentsToProcess) {
      try {
        await this.addStudentToBatch(batchId, studentId, actor);
        assignedCount++;
        results.push({ studentId, success: true });
      } catch (err: any) {
        results.push({ studentId, success: false, error: err.message });
      }
    }

    return { assignedCount, batchId: targetBatchId, results };
  }

  /**
   * Remove a student from a batch.
   * Multi-Source Preservation:
   * Only revokes course enrollment if the student has NO other active batch granting that course,
   * AND does not possess an individual direct enrollment grant.
   */
  static async removeStudentFromBatch(
    batchId: string, 
    studentId: string, 
    actor: ActorContext,
    options: { allowLastBatch?: boolean } = {}
  ): Promise<void> {
    const membership = await batchStudentsDb.findOne({ batchId, studentId });
    if (!membership) {
      return; // Already not a member
    }

    // Safety check: Prevent removal of the user's last remaining batch membership
    if (!options.allowLastBatch) {
      const [activeBatchRows]: any = await pool.query(`
        SELECT COUNT(*) AS cnt 
        FROM batch_students bs
        JOIN batches b ON bs.batchId = b.id AND b.deletedAt IS NULL
        WHERE bs.studentId = ? AND bs.status = 'active'
      `, [studentId]);
      const activeCount = Number(activeBatchRows[0]?.cnt) || 0;
      if (activeCount <= 1) {
        throw new Error("Cannot remove the user's last remaining batch membership. Every user must belong to at least one active batch. Please assign another batch first before removing this one, or suspend the user account.");
      }
    }

    const batch = await batchesDb.findOne({ id: batchId });

    // Delete or update membership
    await pool.query("DELETE FROM batch_students WHERE batchId = ? AND studentId = ?", [batchId, studentId]);

    // Check courses assigned to this batch
    const [assignedCourses]: any = await pool.query(
      "SELECT courseId FROM batch_courses WHERE batchId = ? AND status = 'active'",
      [batchId]
    );

    // If batch had a primary courseId, check that too
    const courseIds = new Set<string>();
    if (batch?.courseId) courseIds.add(batch.courseId);
    assignedCourses.forEach((c: any) => courseIds.add(c.courseId));

    // For each course, check if student retains access from another source
    for (const cId of courseIds) {
      // Check if student belongs to ANOTHER active batch that also offers this course
      const [otherBatches]: any = await pool.query(`
        SELECT b.id
        FROM batch_students bs
        JOIN batches b ON bs.batchId = b.id
        LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.courseId = ? AND bc.status = 'active'
        WHERE bs.studentId = ? 
          AND bs.batchId != ? 
          AND bs.status = 'active' 
          AND b.status = 'active' 
          AND b.deletedAt IS NULL
          AND (b.courseId = ? OR bc.courseId = ?)
        LIMIT 1
      `, [cId, studentId, batchId, cId, cId]);

      if (otherBatches.length > 0) {
        // Preserved! Student is still enrolled in another active batch providing this course.
        continue;
      }

      // Check if student has a direct individual enrollment
      const enrollment = await enrollmentsDb.findOne({ studentId, courseId: cId, deletedAt: null as any });
      if (enrollment) {
        if (enrollment.assignmentSource && enrollment.assignmentSource !== "batch") {
          // Preserved! Student has a direct, non-batch enrollment grant (e.g. 'individual', 'self')
          continue;
        }

        // Student's enrollment came strictly from batch and they have no other batch covering it.
        // Update enrollment status to revoked
        await pool.query(
          "UPDATE enrollments SET status = 'revoked', revocationReason = 'Removed from batch', revokedAt = ?, revokedBy = ? WHERE id = ?",
          [new Date().toISOString(), actor.id, enrollment.id]
        );
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_STUDENT_REMOVED",
      resourceType: "batch_students",
      resourceId: batchId,
      details: { studentId, batchName: batch?.name }
    });
  }

  /**
   * Get all active batches assigned to a specific user with full details.
   */
  static async getUserBatches(userId: string): Promise<any[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        b.id,
        b.id as batchId,
        b.name,
        b.name as batchName,
        b.code,
        b.code as batchCode,
        b.academicYear,
        b.description,
        b.status as batchStatus,
        b.institutionId,
        i.name as institutionName,
        i.code as institutionCode,
        bs.id as membershipId,
        bs.status as membershipStatus,
        bs.enrolledAt,
        bs.createdAt as membershipCreatedAt
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id AND b.deletedAt IS NULL
      LEFT JOIN institutions i ON b.institutionId = i.id
      WHERE bs.studentId = ? AND bs.status = 'active'
      ORDER BY b.academicYear DESC, b.name ASC
    `, [userId]);

    return rows;
  }

  /**
   * Replace or synchronize a user's batch memberships.
   * Ensures the user always retains at least one valid batch membership.
   */
  static async replaceUserBatches(userId: string, newBatchIds: string[], actor: ActorContext): Promise<any[]> {
    if (!Array.isArray(newBatchIds) || newBatchIds.length === 0) {
      throw new Error("At least one batch must be selected. Batch membership is mandatory for every user.");
    }

    const uniqueBatchIds = Array.from(new Set(newBatchIds.filter(Boolean)));
    if (uniqueBatchIds.length === 0) {
      throw new Error("At least one valid batch must be selected.");
    }

    // Verify all requested batches exist and are active
    const [validBatches]: any = await pool.query(`
      SELECT id, name, code, academicYear, status 
      FROM batches 
      WHERE id IN (${uniqueBatchIds.map(() => "?").join(",")}) AND deletedAt IS NULL
    `, uniqueBatchIds);

    if (validBatches.length !== uniqueBatchIds.length) {
      const foundIds = new Set(validBatches.map((b: any) => b.id));
      const missing = uniqueBatchIds.filter(id => !foundIds.has(id));
      throw new Error(`Batch ID(s) not found or deleted: ${missing.join(", ")}`);
    }

    for (const b of validBatches) {
      if (b.status !== "active") {
        throw new Error(`Cannot assign inactive batch '${b.name}' (${b.code}). Only active batches are permitted.`);
      }
    }

    // Verify target user exists
    const user = await usersDb.findOne({ id: userId, deletedAt: null as any });
    if (!user) {
      throw new Error("User not found.");
    }

    // Current active batches
    const currentBatches = await this.getUserBatches(userId);
    const currentBatchIds = new Set(currentBatches.map((b: any) => b.id));
    const targetBatchIds = new Set(uniqueBatchIds);

    const toRemove = currentBatches.filter((b: any) => !targetBatchIds.has(b.id));
    const toAdd = uniqueBatchIds.filter(id => !currentBatchIds.has(id));

    // Add new batch memberships first
    for (const bId of toAdd) {
      await this.addStudentToBatch(bId, userId, actor);
    }

    // Remove old memberships (allowLastBatch is permitted since we ensured >= 1 target batch exists)
    for (const b of toRemove) {
      await this.removeStudentFromBatch(b.id, userId, actor, { allowLastBatch: true });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "USER_BATCHES_REPLACED",
      resourceType: "users",
      resourceId: userId,
      details: {
        userEmail: user.email,
        previousBatches: Array.from(currentBatchIds),
        newBatches: uniqueBatchIds
      }
    });

    return this.getUserBatches(userId);
  }

  /**
   * Explicit Move Operation: Move user from one batch to another.
   */
  static async moveUserBatch(userId: string, fromBatchId: string, toBatchId: string, actor: ActorContext): Promise<any[]> {
    if (!fromBatchId || !toBatchId) {
      throw new Error("Both source batch and destination batch must be specified.");
    }
    if (fromBatchId === toBatchId) {
      throw new Error("Source batch and destination batch cannot be identical.");
    }

    // Enroll in destination first
    await this.addStudentToBatch(toBatchId, userId, actor);

    // Remove from source batch
    await this.removeStudentFromBatch(fromBatchId, userId, actor, { allowLastBatch: false });

    return this.getUserBatches(userId);
  }

  /**
   * Get all active batches for a given student with assigned courses
   */
  static async getStudentBatches(studentId: string): Promise<any[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.code,
        b.academicYear,
        b.startDate,
        b.endDate,
        b.description,
        b.status,
        i.name AS institutionName,
        i.code AS institutionCode,
        bs.enrolledAt,
        COUNT(DISTINCT bc.courseId) AS assignedCourseCount,
        COUNT(DISTINCT ba.assessmentId) AS assignedAssessmentCount
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      JOIN institutions i ON b.institutionId = i.id
      LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
      LEFT JOIN batch_assessments ba ON ba.batchId = b.id AND ba.status = 'active'
      WHERE bs.studentId = ? AND bs.status = 'active' AND b.deletedAt IS NULL
      GROUP BY 
        b.id,
        b.name,
        b.code,
        b.academicYear,
        b.startDate,
        b.endDate,
        b.description,
        b.status,
        i.name,
        i.code,
        bs.enrolledAt
      ORDER BY bs.enrolledAt DESC
    `, [studentId]);

    const result = [];
    for (const r of rows) {
      const [courses]: any = await pool.query(`
        SELECT c.id, c.title, c.thumbnail, c.difficulty AS level, c.category, bc.assignedAt
        FROM batch_courses bc
        JOIN courses c ON bc.courseId = c.id
        WHERE bc.batchId = ? AND bc.status = 'active' AND c.deletedAt IS NULL
        ORDER BY c.title ASC
      `, [r.id]);

      result.push({
        ...r,
        assignedCourseCount: Number(r.assignedCourseCount) || 0,
        assignedAssessmentCount: Number(r.assignedAssessmentCount) || 0,
        courses: courses || []
      });
    }

    return result;
  }

  /**
   * Get all courses granted across all active batches for a student
   */
  static async getStudentBatchCourses(studentId: string): Promise<any[]> {
    const [courses]: any = await pool.query(`
      SELECT DISTINCT
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        c.difficulty AS level,
        c.category,
        b.id AS batchId,
        b.name AS batchName,
        b.code AS batchCode,
        b.academicYear AS batchYear,
        i.name AS institutionName,
        e.progressPercentage,
        e.status AS enrollmentStatus
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      JOIN institutions i ON b.institutionId = i.id
      JOIN batch_courses bc ON bc.batchId = b.id AND bc.status = 'active'
      JOIN courses c ON bc.courseId = c.id AND c.deletedAt IS NULL
      LEFT JOIN enrollments e ON e.studentId = bs.studentId AND e.courseId = c.id AND e.deletedAt IS NULL
      WHERE bs.studentId = ? AND bs.status = 'active' AND b.status = 'active' AND b.deletedAt IS NULL
      ORDER BY c.title ASC
    `, [studentId]);

    return courses;
  }

  // =========================================================================
  // 4. BATCH COURSES & ASSESSMENTS ASSIGNMENT
  // =========================================================================

  /**
   * Get all courses assigned to a batch
   */
  static async getBatchCourses(batchId: string): Promise<BatchCourse[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        bc.*,
        c.title AS courseTitle,
        c.thumbnail AS courseThumbnail
      FROM batch_courses bc
      JOIN courses c ON bc.courseId = c.id
      WHERE bc.batchId = ? AND bc.status = 'active' AND c.deletedAt IS NULL
      ORDER BY bc.assignedAt DESC
    `, [batchId]);

    return rows;
  }

  /**
   * Assign a course to a batch.
   * Enrolls all active students in the batch with assignmentSource = 'batch' (if not already enrolled).
   */
  static async assignCourseToBatch(batchId: string, courseId: string, actor: ActorContext): Promise<BatchCourse> {
    const batch = await batchesDb.findOne({ id: batchId, deletedAt: null as any });
    if (!batch) throw new Error("Batch not found.");

    const course = await coursesDb.findOne({ id: courseId, deletedAt: null as any });
    if (!course) throw new Error("Course not found.");

    const now = new Date().toISOString();
    const existing = await batchCoursesDb.findOne({ batchId, courseId });

    let record: BatchCourse;
    if (existing) {
      if (existing.status === "active") {
        return existing;
      }
      await batchCoursesDb.update(existing.id, { status: "active", assignedAt: now, assignedBy: actor.id });
      record = { ...existing, status: "active", assignedAt: now, assignedBy: actor.id };
    } else {
      const id = "bc-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      record = {
        id,
        organizationId: batch.organizationId || "org-default",
        batchId,
        courseId,
        assignedAt: now,
        assignedBy: actor.id,
        status: "active"
      };
      await batchCoursesDb.insert(record);
    }

    // Auto-enroll all active students of this batch
    const [batchStudents]: any = await pool.query(
      "SELECT studentId FROM batch_students WHERE batchId = ? AND status = 'active'",
      [batchId]
    );

    for (const bs of batchStudents) {
      await this.ensureStudentCourseEnrollment(bs.studentId, courseId, batch.organizationId || "org-default", "batch");
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_COURSE_ASSIGNED",
      resourceType: "batch_courses",
      resourceId: batchId,
      details: { courseId, courseTitle: course.title, batchName: batch.name }
    });

    return record;
  }

  /**
   * Bulk assign courses to a batch:
   * Enforces: One batch can have multiple courses.
   * Synchronizes course access for all active students in the batch.
   */
  static async assignCoursesBulk(params: {
    batchId?: string;
    batch_id?: string;
    batchCode?: string;
    batch_code?: string;
    courseIds?: string[];
    course_ids?: string[];
    courseTitles?: string[];
    course_titles?: string[];
    assignments?: Array<{ batchId?: string; batch_id?: string; courseId?: string; course_id?: string }>;
  }, actor: ActorContext): Promise<{ assignedCount: number; batchId?: string; results: Array<{ courseId: string; title?: string; success: boolean; error?: string }> }> {
    let targetBatchId = params.batchId || params.batch_id;
    const batchCode = params.batchCode || params.batch_code;

    if (!targetBatchId && batchCode) {
      const batch = await batchesDb.findOne({ code: batchCode.trim().toUpperCase(), deletedAt: null as any });
      if (!batch) throw new Error(`Batch with code '${batchCode}' not found`);
      targetBatchId = batch.id;
    }

    const assignmentsToProcess: Array<{ batchId: string; courseId: string }> = [];

    if (params.assignments && Array.isArray(params.assignments)) {
      for (const a of params.assignments) {
        const bId = a.batchId || a.batch_id || targetBatchId;
        const cId = a.courseId || a.course_id;
        if (bId && cId) {
          assignmentsToProcess.push({ batchId: bId, courseId: cId });
        }
      }
    } else if (targetBatchId) {
      const courseIds = params.courseIds || params.course_ids;
      if (courseIds && Array.isArray(courseIds)) {
        for (const cid of courseIds) {
          if (cid) assignmentsToProcess.push({ batchId: targetBatchId, courseId: cid });
        }
      }

      const courseTitles = params.courseTitles || params.course_titles;
      if (courseTitles && Array.isArray(courseTitles)) {
        for (const title of courseTitles) {
          if (!title) continue;
          const course = await coursesDb.findOne({ title: title.trim(), deletedAt: null as any });
          if (course) {
            assignmentsToProcess.push({ batchId: targetBatchId, courseId: course.id });
          }
        }
      }
    }

    if (assignmentsToProcess.length === 0) {
      throw new Error("No course assignments provided. Specify batchId/batch_id and courseIds/course_ids.");
    }

    let assignedCount = 0;
    const results: Array<{ courseId: string; title?: string; success: boolean; error?: string }> = [];

    for (const { batchId, courseId } of assignmentsToProcess) {
      try {
        const record = await this.assignCourseToBatch(batchId, courseId, actor);
        assignedCount++;
        results.push({ courseId, success: true });
      } catch (err: any) {
        results.push({ courseId, success: false, error: err.message });
      }
    }

    return { assignedCount, batchId: targetBatchId, results };
  }

  /**
   * Revoke course from a batch.
   * Multi-Source Preservation:
   * Only revokes the student's enrollment if they have no other batch granting it and no direct grant.
   */
  static async revokeCourseFromBatch(batchId: string, courseId: string, actor: ActorContext): Promise<void> {
    await pool.query(
      "UPDATE batch_courses SET status = 'revoked' WHERE batchId = ? AND courseId = ?",
      [batchId, courseId]
    );

    // Get all students in this batch
    const [batchStudents]: any = await pool.query(
      "SELECT studentId FROM batch_students WHERE batchId = ? AND status = 'active'",
      [batchId]
    );

    for (const bs of batchStudents) {
      const studentId = bs.studentId;

      // Check if student belongs to ANOTHER active batch providing this course
      const [otherBatches]: any = await pool.query(`
        SELECT b.id
        FROM batch_students s
        JOIN batches b ON s.batchId = b.id
        LEFT JOIN batch_courses bc ON bc.batchId = b.id AND bc.courseId = ? AND bc.status = 'active'
        WHERE s.studentId = ? 
          AND s.batchId != ? 
          AND s.status = 'active' 
          AND b.status = 'active' 
          AND b.deletedAt IS NULL
          AND (b.courseId = ? OR bc.courseId = ?)
        LIMIT 1
      `, [courseId, studentId, batchId, courseId, courseId]);

      if (otherBatches.length > 0) {
        continue; // Keep enrollment active
      }

      // Check direct grant
      const enrollment = await enrollmentsDb.findOne({ studentId, courseId, deletedAt: null as any });
      if (enrollment && enrollment.assignmentSource && enrollment.assignmentSource !== "batch") {
        continue; // Direct grant preserved
      }

      if (enrollment) {
        await pool.query(
          "UPDATE enrollments SET status = 'revoked', revocationReason = 'Course removed from batch', revokedAt = ?, revokedBy = ? WHERE id = ?",
          [new Date().toISOString(), actor.id, enrollment.id]
        );
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_COURSE_REVOKED",
      resourceType: "batch_courses",
      resourceId: batchId,
      details: { courseId, batchId }
    });
  }

  /**
   * Get all assessments assigned to a batch
   */
  static async getBatchAssessments(batchId: string): Promise<BatchAssessment[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        ba.*,
        a.title AS assessmentTitle
      FROM batch_assessments ba
      JOIN assessments a ON ba.assessmentId = a.id
      WHERE ba.batchId = ? AND ba.status = 'active' AND a.deletedAt IS NULL
      ORDER BY ba.assignedAt DESC
    `, [batchId]);

    return rows;
  }

  /**
   * Assign an assessment to a batch
   */
  static async assignAssessmentToBatch(batchId: string, assessmentId: string, actor: ActorContext): Promise<BatchAssessment> {
    const batch = await batchesDb.findOne({ id: batchId, deletedAt: null as any });
    if (!batch) throw new Error("Batch not found.");

    const assessment = await assessmentsDb.findOne({ id: assessmentId, deletedAt: null as any });
    if (!assessment) throw new Error("Assessment not found.");

    const now = new Date().toISOString();
    const existing = await batchAssessmentsDb.findOne({ batchId, assessmentId });

    let record: BatchAssessment;
    if (existing) {
      if (existing.status === "active") return existing;
      await batchAssessmentsDb.update(existing.id, { status: "active", assignedAt: now, assignedBy: actor.id });
      record = { ...existing, status: "active", assignedAt: now, assignedBy: actor.id };
    } else {
      const id = "ba-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      record = {
        id,
        organizationId: batch.organizationId || "org-default",
        batchId,
        assessmentId,
        assignedAt: now,
        assignedBy: actor.id,
        status: "active"
      };
      await batchAssessmentsDb.insert(record);
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_ASSESSMENT_ASSIGNED",
      resourceType: "batch_assessments",
      resourceId: batchId,
      details: { assessmentId, assessmentTitle: assessment.title, batchName: batch.name }
    });

    return record;
  }

  /**
   * Revoke assessment from a batch
   */
  static async revokeAssessmentFromBatch(batchId: string, assessmentId: string, actor: ActorContext): Promise<void> {
    await pool.query(
      "UPDATE batch_assessments SET status = 'revoked' WHERE batchId = ? AND assessmentId = ?",
      [batchId, assessmentId]
    );

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_ASSESSMENT_REVOKED",
      resourceType: "batch_assessments",
      resourceId: batchId,
      details: { assessmentId, batchId }
    });
  }

  /**
   * Get all learning paths assigned to a batch
   */
  static async getBatchLearningPaths(batchId: string): Promise<BatchLearningPath[]> {
    const [rows]: any = await pool.query(`
      SELECT 
        blp.*,
        lp.title AS learningPathTitle,
        lp.thumbnail AS learningPathThumbnail,
        lp.category AS category
      FROM batch_learning_paths blp
      JOIN learning_paths lp ON blp.learningPathId = lp.id
      WHERE blp.batchId = ? AND blp.status = 'active' AND lp.deletedAt IS NULL
      ORDER BY blp.assignedAt DESC
    `, [batchId]);

    return rows;
  }

  /**
   * Assign a learning path to a batch
   */
  static async assignLearningPathToBatch(batchId: string, learningPathId: string, actor: ActorContext): Promise<BatchLearningPath> {
    const batch = await batchesDb.findOne({ id: batchId, deletedAt: null as any });
    if (!batch) throw new Error("Batch not found.");

    const path = await learningPathsDb.findOne({ id: learningPathId, deletedAt: null as any });
    if (!path) throw new Error("Learning Path not found.");

    const now = new Date().toISOString();
    const existing = await batchLearningPathsDb.findOne({ batchId, learningPathId });

    let record: BatchLearningPath;
    if (existing) {
      if (existing.status === "active") return existing;
      await batchLearningPathsDb.update(existing.id, { status: "active", assignedAt: now, assignedBy: actor.id });
      record = { ...existing, status: "active", assignedAt: now, assignedBy: actor.id };
    } else {
      const id = "blp-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      record = {
        id,
        organizationId: batch.organizationId || "org-default",
        batchId,
        learningPathId,
        assignedAt: now,
        assignedBy: actor.id,
        status: "active"
      };
      await batchLearningPathsDb.insert(record);
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_LEARNING_PATH_ASSIGNED",
      resourceType: "batch_learning_paths",
      resourceId: batchId,
      details: { learningPathId, learningPathTitle: path.title, batchName: batch.name }
    });

    return record;
  }

  /**
   * Revoke learning path from a batch
   */
  static async revokeLearningPathFromBatch(batchId: string, learningPathId: string, actor: ActorContext): Promise<void> {
    await pool.query(
      "UPDATE batch_learning_paths SET status = 'revoked' WHERE batchId = ? AND learningPathId = ?",
      [batchId, learningPathId]
    );

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_LEARNING_PATH_REVOKED",
      resourceType: "batch_learning_paths",
      resourceId: batchId,
      details: { learningPathId, batchId }
    });
  }

  // =========================================================================
  // 5. HELPER: SYNC STUDENT BATCH COURSE ACCESS
  // =========================================================================

  public static async syncStudentBatchCourseAccess(studentId: string, batchId: string, actor: ActorContext): Promise<void> {
    const batch = await batchesDb.findOne({ id: batchId });
    if (!batch) return;

    const courseIds = new Set<string>();
    if (batch.courseId) courseIds.add(batch.courseId);

    const [batchCourses]: any = await pool.query(
      "SELECT courseId FROM batch_courses WHERE batchId = ? AND status = 'active'",
      [batchId]
    );
    batchCourses.forEach((c: any) => courseIds.add(c.courseId));

    for (const cId of courseIds) {
      await this.ensureStudentCourseEnrollment(studentId, cId, batch.organizationId || "org-default", "batch");
    }
  }

  private static async ensureStudentCourseEnrollment(
    studentId: string, 
    courseId: string, 
    orgId: string, 
    source: "batch" | "individual" = "batch"
  ): Promise<void> {
    const existing = await enrollmentsDb.findOne({ studentId, courseId });
    const now = new Date().toISOString();

    if (existing) {
      if (existing.status === "revoked" || existing.deletedAt) {
        // Reactivate enrollment
        await pool.query(`
          UPDATE enrollments 
          SET status = 'assigned', revocationReason = NULL, revokedAt = NULL, revokedBy = NULL, deletedAt = NULL
          WHERE id = ?
        `, [existing.id]);
      }
      // If already active, DO NOT change assignmentSource to batch if it was direct individual!
    } else {
      const id = "enr-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      const newEnrollment: Enrollment = {
        id,
        organizationId: orgId,
        studentId,
        courseId,
        progressPercentage: 0,
        status: "assigned",
        assignmentSource: source,
        enrolledAt: now,
        assignedAt: now
      };
      await enrollmentsDb.insert(newEnrollment);
    }
  }

  // =========================================================================
  // 6. EXCEL BULK BATCH UPLOAD
  // =========================================================================

  /**
   * Generate downloadable Excel template for bulk batches
   * Supports standard 4-column format:
   * batch_name | institution | year | description
   */
  static async generateBatchTemplate(orgId: string = "org-default"): Promise<Buffer> {
    const institutions = await this.getInstitutions(orgId);
    const primaryInst = institutions[0]?.name || "MR TECHNOLOGIES";
    const instList = institutions.map(i => `${i.name} (Code: ${i.code})`).join("; ");

    // Sheet 1: 4-Column Format directly aligning with requirements
    const sampleRows = [
      {
        "batch_name": "Python Batch A",
        "institution": primaryInst,
        "year": "2026",
        "description": "Comprehensive Python Programming and Software Engineering"
      },
      {
        "batch_name": "Full Stack Batch B",
        "institution": primaryInst,
        "year": "2026",
        "description": "Full Stack Web Development with React and Node.js"
      },
      {
        "batch_name": "SQL Batch",
        "institution": primaryInst,
        "year": "2027",
        "description": "Relational Databases, SQL Mastery & Architecture"
      }
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Batches
    const wsBatches = XLSX.utils.json_to_sheet(sampleRows);
    wsBatches["!cols"] = [
      { wch: 30 }, // batch_name
      { wch: 25 }, // institution
      { wch: 15 }, // year
      { wch: 55 }  // description
    ];
    XLSX.utils.book_append_sheet(wb, wsBatches, "Batches");

    // Sheet 2: Instructions & Optional Fields
    const instructions = [
      { "Column": "batch_name *", "Required": "Yes", "Description": "Human-readable name of the batch (e.g. Python Batch A)." },
      { "Column": "institution *", "Required": "Yes", "Description": `Name or Code of the institution. Available: ${instList}` },
      { "Column": "year *", "Required": "Yes", "Description": "Academic / Batch year (e.g. 2026, 2027, or 2026-2027)." },
      { "Column": "description", "Required": "No", "Description": "Brief description of the batch learning track." },
      { "Column": "[Optional] batch_code", "Required": "No", "Description": "Custom unique code. If omitted, will be auto-generated from batch_name and year." },
      { "Column": "[Optional] start_date", "Required": "No", "Description": "Format: YYYY-MM-DD (e.g. 2026-01-15)." },
      { "Column": "[Optional] end_date", "Required": "No", "Description": "Format: YYYY-MM-DD (e.g. 2026-12-31)." },
      { "Column": "[Optional] max_students", "Required": "No", "Description": "Maximum student capacity number." }
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * Validate uploaded Batch Excel file and return row-by-row preview with errors.
   * Supports:
   * 1. 4-column format: batch_name, institution, year, description
   * 2. Traditional headers: Batch Name, Institution Code, Academic Year, etc.
   */
  static async validateBatchExcel(buffer: Buffer, orgId: string = "org-default"): Promise<{
    isValid: boolean;
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: BatchExcelPreviewRow[];
  }> {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rawData.length === 0) {
      throw new Error("Uploaded Excel file contains no data rows.");
    }

    // Preload institutions for lookup
    const institutions = await this.getInstitutions(orgId);
    const instMap = new Map<string, any>();
    institutions.forEach(i => {
      instMap.set(i.code.toUpperCase().trim(), i);
      instMap.set(i.id.toUpperCase().trim(), i);
      instMap.set(i.name.toUpperCase().trim(), i);
    });

    // Preload existing batch codes by institution
    const [existingBatches]: any = await pool.query(
      "SELECT b.code, b.institutionId FROM batches b WHERE b.organizationId = ? AND b.deletedAt IS NULL",
      [orgId]
    );
    const existingCodeSet = new Set<string>();
    existingBatches.forEach((b: any) => existingCodeSet.add(`${b.institutionId}:${b.code.toUpperCase()}`));

    const seenInFile = new Set<string>();
    const previewRows: BatchExcelPreviewRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 2; // Excel 1-based header is row 1
      const errors: string[] = [];

      const name = String(row["batch_name"] || row["Batch Name *"] || row["Batch Name"] || row["name"] || "").trim();
      const rawInst = String(row["institution"] || row["Institution"] || row["Institution Code *"] || row["Institution Code"] || row["institutionCode"] || "").trim();
      const academicYear = String(row["year"] || row["Year"] || row["Academic Year *"] || row["Academic Year"] || row["academicYear"] || "").trim();
      const description = String(row["description"] || row["Description"] || "").trim();
      const rawCode = String(row["batch_code"] || row["code"] || row["Batch Code *"] || row["Batch Code"] || "").trim().toUpperCase();
      const startDate = String(row["start_date"] || row["Start Date (YYYY-MM-DD)"] || row["Start Date"] || row["startDate"] || "").trim();
      const endDate = String(row["end_date"] || row["End Date (YYYY-MM-DD)"] || row["End Date"] || row["endDate"] || "").trim();
      const maxStudentsRaw = row["max_students"] || row["Max Students"] || row["maxStudents"];

      // Required field validations
      if (!name) errors.push("Batch Name is required.");
      if (!rawInst) errors.push("Institution is required.");
      if (!academicYear) errors.push("Year / Academic Year is required.");

      // Flexible Institution Resolution (by Code, ID, or Name)
      let matchedInst = instMap.get(rawInst.toUpperCase());
      if (!matchedInst && rawInst) {
        matchedInst = await this.resolveInstitution(rawInst, orgId);
      }
      if (!matchedInst && rawInst) {
        errors.push(`Institution '${rawInst}' could not be found.`);
      }

      const institutionId = matchedInst?.id || "";
      const instCode = matchedInst?.code || rawInst;

      // Auto-generate unique batch code if not provided
      let code = rawCode;
      if (!code && name && academicYear) {
        const baseSlug = `${name}-${academicYear}`.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        code = baseSlug || `BATCH-${Date.now().toString(36).toUpperCase()}`;
      } else if (!code && name) {
        code = name.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      }

      if (!code) {
        errors.push("Batch Code is required or could not be generated.");
      }

      // Handle duplicate code checks
      if (code && institutionId) {
        let candidateCode = code;
        let counter = 2;
        if (!rawCode) {
          // If code was auto-generated, resolve duplicates by appending suffix
          while (existingCodeSet.has(`${institutionId}:${candidateCode}`) || seenInFile.has(`${institutionId}:${candidateCode}`)) {
            candidateCode = `${code}-${counter++}`;
          }
          code = candidateCode;
        }

        const key = `${institutionId}:${code}`;
        if (existingCodeSet.has(key)) {
          errors.push(`Batch Code '${code}' already exists in this institution.`);
        } else if (seenInFile.has(key)) {
          errors.push(`Duplicate Batch Code '${code}' found multiple times in this Excel file.`);
        } else {
          seenInFile.add(key);
        }
      }

      // Date validations
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        errors.push("Start Date must be in YYYY-MM-DD format.");
      }
      if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        errors.push("End Date must be in YYYY-MM-DD format.");
      }
      if (startDate && endDate && startDate > endDate) {
        errors.push("Start Date cannot be later than End Date.");
      }

      // Max students validation
      let maxStudents: number | undefined;
      if (maxStudentsRaw !== undefined && maxStudentsRaw !== "") {
        const parsed = Number(maxStudentsRaw);
        if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
          errors.push("Max Students must be a positive integer.");
        } else {
          maxStudents = parsed;
        }
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else errorCount++;

      previewRows.push({
        rowNumber,
        name,
        code,
        institutionCode: instCode,
        academicYear,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        maxStudents,
        description: description || undefined,
        isValid,
        errors
      });
    }

    return {
      isValid: errorCount === 0,
      totalRows: previewRows.length,
      validCount,
      errorCount,
      rows: previewRows
    };
  }

  /**
   * Import validated batch rows
   */
  static async importBatches(rows: BatchExcelPreviewRow[], actor: ActorContext): Promise<{
    importedCount: number;
    batches: Batch[];
  }> {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      throw new Error("No valid rows to import.");
    }

    const orgId = actor.organizationId || "org-default";
    const institutions = await this.getInstitutions(orgId);
    const instCodeMap = new Map<string, string>();
    institutions.forEach(i => {
      instCodeMap.set(i.code.toUpperCase(), i.id);
      instCodeMap.set(i.name.toUpperCase(), i.id);
    });

    const createdBatches: Batch[] = [];

    for (const r of validRows) {
      let institutionId = instCodeMap.get(r.institutionCode.toUpperCase());
      if (!institutionId) {
        const inst = await this.resolveInstitution(r.institutionCode, orgId);
        institutionId = inst?.id;
      }
      if (!institutionId) continue;

      const batch = await this.createBatch({
        name: r.name,
        code: r.code,
        institutionId,
        academicYear: r.academicYear,
        startDate: r.startDate || null,
        endDate: r.endDate || null,
        maxStudents: r.maxStudents || null,
        description: r.description || null,
        organizationId: orgId
      }, actor);

      createdBatches.push(batch);
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCHES_BULK_IMPORTED",
      resourceType: "batches",
      resourceId: orgId,
      details: { count: createdBatches.length }
    });

    return {
      importedCount: createdBatches.length,
      batches: createdBatches
    };
  }

  // =========================================================================
  // 7. EXCEL BULK STUDENT ASSIGNMENT TO BATCHES
  // =========================================================================

  /**
   * Generate downloadable Excel template for bulk student batch assignment
   */
  static async generateStudentAssignTemplate(orgId: string = "org-default"): Promise<Buffer> {
    const { batches } = await this.getBatches({ orgId, limit: 100 });
    const availableBatchesList = batches.map(b => `${b.code} (${b.name})`).join(", ");

    const sampleRows = [
      {
        "Student Email *": "student1@example.com",
        "Batch Code *": batches[0]?.code || "FS-JAVA-2025A"
      },
      {
        "Student Email *": "student1@example.com",
        "Batch Code *": batches[1]?.code || "PY-DS-2025"
      },
      {
        "Student Email *": "student2@example.com",
        "Batch Code *": batches[0]?.code || "FS-JAVA-2025A"
      }
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Assignments
    const wsAssignments = XLSX.utils.json_to_sheet(sampleRows);
    wsAssignments["!cols"] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsAssignments, "Student Assignments");

    // Sheet 2: Instructions
    const instructions = [
      { "Column": "Student Email *", "Required": "Yes", "Description": "Email of existing student in the system." },
      { "Column": "Batch Code *", "Required": "Yes", "Description": `Code of the batch. Available: ${availableBatchesList}` },
      { "Column": "Multi-Batch Support", "Required": "Info", "Description": "The same student email can appear on multiple rows with different batch codes to enroll them in multiple batches simultaneously!" }
    ];
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * Validate uploaded Student Assignment Excel file and return row-by-row preview with errors
   */
  static async validateStudentAssignExcel(buffer: Buffer, orgId: string = "org-default"): Promise<{
    isValid: boolean;
    totalRows: number;
    validCount: number;
    errorCount: number;
    rows: BatchStudentAssignPreviewRow[];
  }> {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rawData.length === 0) {
      throw new Error("Uploaded Excel file contains no data rows.");
    }

    // Preload users map by email
    const [userRows]: any = await pool.query(
      "SELECT id, email, name, role FROM users WHERE deletedAt IS NULL"
    );
    const userMap = new Map<string, { id: string; email: string; name: string }>();
    userRows.forEach((u: any) => userMap.set(u.email.toLowerCase().trim(), { id: u.id, email: u.email, name: u.name }));

    // Preload batches by code
    const [batchRows]: any = await pool.query(
      "SELECT id, code, name, maxStudents, status FROM batches WHERE organizationId = ? AND deletedAt IS NULL",
      [orgId]
    );
    const batchMap = new Map<string, { id: string; code: string; name: string; maxStudents: number | null; status: string }>();
    batchRows.forEach((b: any) => batchMap.set(b.code.toUpperCase().trim(), b));

    // Preload current batch enrollments
    const [currentMemberships]: any = await pool.query(`
      SELECT bs.batchId, bs.studentId, bs.status
      FROM batch_students bs
      JOIN batches b ON bs.batchId = b.id
      WHERE b.organizationId = ?
    `, [orgId]);
    const currentMemberSet = new Set<string>();
    currentMemberships.forEach((m: any) => {
      if (m.status === "active") currentMemberSet.add(`${m.batchId}:${m.studentId}`);
    });

    const seenInFile = new Set<string>();
    const previewRows: BatchStudentAssignPreviewRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 2;
      const errors: string[] = [];

      const studentEmail = String(row["Student Email *"] || row["Student Email"] || row["email"] || "").trim().toLowerCase();
      const batchCode = String(row["Batch Code *"] || row["Batch Code"] || row["batchCode"] || "").trim().toUpperCase();

      if (!studentEmail) errors.push("Student Email is required.");
      if (!batchCode) errors.push("Batch Code is required.");

      const user = userMap.get(studentEmail);
      if (studentEmail && !user) {
        errors.push(`Student with email '${studentEmail}' not found in the system.`);
      }

      const batch = batchMap.get(batchCode);
      if (batchCode && !batch) {
        errors.push(`Batch Code '${batchCode}' not found.`);
      } else if (batch && batch.status === "archived") {
        errors.push(`Batch '${batchCode}' is archived.`);
      }

      if (user && batch) {
        const key = `${batch.id}:${user.id}`;
        if (currentMemberSet.has(key)) {
          errors.push(`Student '${studentEmail}' is already enrolled in batch '${batchCode}'.`);
        } else if (seenInFile.has(key)) {
          errors.push(`Duplicate entry for student '${studentEmail}' in batch '${batchCode}' in this file.`);
        } else {
          seenInFile.add(key);
        }
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else errorCount++;

      previewRows.push({
        rowNumber,
        studentEmail,
        batchCode,
        studentName: user?.name,
        batchName: batch?.name,
        isValid,
        errors
      });
    }

    return {
      isValid: errorCount === 0,
      totalRows: previewRows.length,
      validCount,
      errorCount,
      rows: previewRows
    };
  }

  /**
   * Import student assignments
   */
  static async importStudentAssignments(rows: BatchStudentAssignPreviewRow[], actor: ActorContext): Promise<{
    assignedCount: number;
  }> {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      throw new Error("No valid rows to assign.");
    }

    const orgId = actor.organizationId || "org-default";
    const [userRows]: any = await pool.query("SELECT id, email FROM users WHERE deletedAt IS NULL");
    const userMap = new Map<string, string>();
    userRows.forEach((u: any) => userMap.set(u.email.toLowerCase().trim(), u.id));

    const [batchRows]: any = await pool.query(
      "SELECT id, code FROM batches WHERE organizationId = ? AND deletedAt IS NULL",
      [orgId]
    );
    const batchMap = new Map<string, string>();
    batchRows.forEach((b: any) => batchMap.set(b.code.toUpperCase().trim(), b.id));

    let assignedCount = 0;

    for (const r of validRows) {
      const studentId = userMap.get(r.studentEmail.toLowerCase().trim());
      const batchId = batchMap.get(r.batchCode.toUpperCase().trim());
      if (!studentId || !batchId) continue;

      try {
        await this.addStudentToBatch(batchId, studentId, actor);
        assignedCount++;
      } catch (err: any) {
        console.warn(`[BatchService] Note during bulk assign: ${err.message}`);
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      action: "BATCH_STUDENTS_BULK_ASSIGNED",
      resourceType: "batch_students",
      resourceId: orgId,
      details: { count: assignedCount }
    });

    return { assignedCount };
  }
}
