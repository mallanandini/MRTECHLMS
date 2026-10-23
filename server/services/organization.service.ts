/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { pool } from "../mysql.js";
import { 
  departmentsDb, departmentMembersDb, cohortsDb, cohortMembersDb, 
  groupsDb, groupMembersDb, usersDb, coursesDb, assessmentsDb, 
  learningPathsDb, enrollmentsDb, assessmentAssignmentsDb, learningPathAssignmentsDb,
  certificatesDb
} from "../db.js";
import { 
  Department, DepartmentMember, Cohort, CohortMember, Group, GroupMember,
  User, UserRole, TeamLearnerSummary, TeamCourseProgressItem, 
  TeamAssessmentResultItem, TeamOverdueItem, TeamStatsSummary, 
  StudentOrganizationAffiliation, GroupType, OrganizationEntityStatus, CohortStatus, AccessStatus
} from "../../src/types.js";
import { logAuditEvent } from "../audit.js";
import { AccessControlService } from "./access-control.service.js";

export interface ActorContext {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export class OrganizationService {
  // ==========================================
  // 1. DEPARTMENTS MANAGEMENT
  // ==========================================

  /**
   * Create a new Department
   */
  static async createDepartment(data: {
    name: string;
    code: string;
    description?: string;
    managerId?: string | null;
    organizationId?: string;
  }, actor: ActorContext): Promise<Department> {
    const orgId = data.organizationId || actor.organizationId || "org-default";
    const code = data.code.trim().toUpperCase();

    // Check duplicate code within organization
    const existing = await departmentsDb.findOne({ organizationId: orgId, code, deletedAt: null as any });
    if (existing) {
      throw new Error(`Department with code '${code}' already exists in this organization.`);
    }

    if (data.managerId) {
      const manager = await usersDb.findOne({ id: data.managerId });
      if (!manager) {
        throw new Error("Designated manager not found.");
      }
    }

    const id = "dept-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const now = new Date().toISOString();

    const department: Department = {
      id,
      organizationId: orgId,
      name: data.name.trim(),
      code,
      description: data.description ? data.description.trim() : undefined,
      managerId: data.managerId || null,
      status: "active",
      createdAt: now,
      updatedAt: now
    };

    await departmentsDb.insert(department);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: orgId,
      action: "department_create",
      resourceType: "department",
      resourceId: id,
      details: { name: department.name, code: department.code, managerId: department.managerId }
    });

    return department;
  }

  /**
   * List all departments for an organization
   */
  static async getDepartments(orgId: string = "org-default"): Promise<Department[]> {
    const sql = `
      SELECT 
        d.*,
        u.name AS managerName,
        u.email AS managerEmail,
        COUNT(DISTINCT dm.userId) AS memberCount
      FROM departments d
      LEFT JOIN users u ON d.managerId = u.id
      LEFT JOIN department_members dm ON d.id = dm.departmentId
      WHERE d.organizationId = ? AND d.deletedAt IS NULL
      GROUP BY d.id
      ORDER BY d.name ASC
    `;
    const [rows]: any = await pool.query(sql, [orgId]);
    return rows.map((r: any) => ({
      ...r,
      memberCount: Number(r.memberCount) || 0
    }));
  }

  /**
   * Get single department by ID with members list
   */
  static async getDepartmentById(id: string): Promise<(Department & { members: any[] }) | null> {
    const sql = `
      SELECT 
        d.*,
        u.name AS managerName,
        u.email AS managerEmail
      FROM departments d
      LEFT JOIN users u ON d.managerId = u.id
      WHERE d.id = ? AND d.deletedAt IS NULL
    `;
    const [rows]: any = await pool.query(sql, [id]);
    if (rows.length === 0) return null;
    const dept = rows[0];

    // Fetch members
    const membersSql = `
      SELECT 
        dm.id as membershipId,
        dm.role as departmentRole,
        dm.joinedAt,
        u.id,
        u.name,
        u.email,
        u.role,
        u.jobTitle,
        u.status,
        u.profilePhoto
      FROM department_members dm
      JOIN users u ON dm.userId = u.id
      WHERE dm.departmentId = ? AND u.deletedAt IS NULL
      ORDER BY u.name ASC
    `;
    const [members]: any = await pool.query(membersSql, [id]);

    return {
      ...dept,
      memberCount: members.length,
      members
    };
  }

  /**
   * Update department
   */
  static async updateDepartment(id: string, data: Partial<{
    name: string;
    code: string;
    description: string;
    managerId: string | null;
    status: OrganizationEntityStatus;
  }>, actor: ActorContext): Promise<Department> {
    const dept = await departmentsDb.findOne({ id });
    if (!dept) throw new Error("Department not found");

    const updates: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description.trim();
    if (data.status !== undefined) updates.status = data.status;
    if (data.managerId !== undefined) {
      if (data.managerId) {
        const mgr = await usersDb.findOne({ id: data.managerId });
        if (!mgr) throw new Error("Specified manager does not exist");
      }
      updates.managerId = data.managerId;
    }
    if (data.code !== undefined && data.code.trim().toUpperCase() !== dept.code) {
      const newCode = data.code.trim().toUpperCase();
      const existing = await departmentsDb.findOne({ organizationId: dept.organizationId, code: newCode, deletedAt: null as any });
      if (existing && existing.id !== id) {
        throw new Error(`Department code '${newCode}' is already in use.`);
      }
      updates.code = newCode;
    }

    await departmentsDb.update(id, updates);
    const updated = await departmentsDb.findOne({ id });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_update",
      resourceType: "department",
      resourceId: id,
      details: { updates }
    });

    return updated!;
  }

  /**
   * Archive / Delete department
   */
  static async archiveDepartment(id: string, actor: ActorContext): Promise<void> {
    const dept = await departmentsDb.findOne({ id });
    if (!dept) throw new Error("Department not found");

    const now = new Date().toISOString();
    await departmentsDb.update(id, { deletedAt: now, status: "archived" });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_archive",
      resourceType: "department",
      resourceId: id,
      details: { departmentName: dept.name }
    });
  }

  /**
   * Add members to department
   */
  static async addDepartmentMembers(departmentId: string, userIds: string[], actor: ActorContext, memberRole: string = "member"): Promise<{ addedCount: number }> {
    const dept = await departmentsDb.findOne({ id: departmentId });
    if (!dept) throw new Error("Department not found");

    let addedCount = 0;
    const now = new Date().toISOString();

    for (const userId of userIds) {
      const user = await usersDb.findOne({ id: userId });
      if (!user) continue;

      // Check if already in department
      const existing = await departmentMembersDb.findOne({ departmentId, userId });
      if (!existing) {
        await departmentMembersDb.insert({
          id: "dmem-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex"),
          organizationId: dept.organizationId,
          departmentId,
          userId,
          role: memberRole,
          joinedAt: now
        });
        addedCount++;
      }

      // Also ensure user's departmentId is updated
      await usersDb.update(userId, { departmentId });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_member_add",
      resourceType: "department",
      resourceId: departmentId,
      details: { addedCount, userIds }
    });

    return { addedCount };
  }

  /**
   * Remove member from department
   */
  static async removeDepartmentMember(departmentId: string, userId: string, actor: ActorContext): Promise<void> {
    const dept = await departmentsDb.findOne({ id: departmentId });
    if (!dept) throw new Error("Department not found");

    await pool.query("DELETE FROM department_members WHERE departmentId = ? AND userId = ?", [departmentId, userId]);

    // If user's primary departmentId was this one, clear it
    const user = await usersDb.findOne({ id: userId });
    if (user && user.departmentId === departmentId) {
      await usersDb.update(userId, { departmentId: null });
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_member_remove",
      resourceType: "department",
      resourceId: departmentId,
      details: { userId }
    });
  }

  /**
   * Assign course to all department members
   */
  static async assignCourseToDepartment(departmentId: string, courseId: string, actor: ActorContext, options: { dueDate?: string | null; isMandatory?: boolean } = {}): Promise<{ assignedCount: number; departmentName: string }> {
    const dept = await departmentsDb.findOne({ id: departmentId });
    if (!dept) throw new Error("Department not found");

    const [members]: any = await pool.query("SELECT DISTINCT userId FROM department_members WHERE departmentId = ?", [departmentId]);
    const userIds = members.map((m: any) => m.userId);

    const { assignedCount } = await AccessControlService.assignCourseBulk(courseId, userIds, actor, {
      ...options,
      source: "group",
      sourceId: departmentId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_assign_course",
      resourceType: "department",
      resourceId: departmentId,
      details: { courseId, assignedCount, options }
    });

    return { assignedCount, departmentName: dept.name };
  }

  /**
   * Assign learning path to all department members
   */
  static async assignLearningPathToDepartment(departmentId: string, learningPathId: string, actor: ActorContext, options: { dueDate?: string | null; isMandatory?: boolean } = {}): Promise<{ assignedCount: number; departmentName: string }> {
    const dept = await departmentsDb.findOne({ id: departmentId });
    if (!dept) throw new Error("Department not found");

    const [members]: any = await pool.query("SELECT DISTINCT userId FROM department_members WHERE departmentId = ?", [departmentId]);
    const userIds = members.map((m: any) => m.userId);

    const { assignedCount } = await AccessControlService.assignLearningPathBulk(learningPathId, userIds, actor, {
      ...options,
      source: "group",
      sourceId: departmentId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_assign_learning_path",
      resourceType: "department",
      resourceId: departmentId,
      details: { learningPathId, assignedCount, options }
    });

    return { assignedCount, departmentName: dept.name };
  }

  /**
   * Assign assessment to all department members
   */
  static async assignAssessmentToDepartment(departmentId: string, assessmentId: string, actor: ActorContext, options: { dueDate?: string | null; isMandatory?: boolean } = {}): Promise<{ assignedCount: number; departmentName: string }> {
    const dept = await departmentsDb.findOne({ id: departmentId });
    if (!dept) throw new Error("Department not found");

    const [members]: any = await pool.query("SELECT DISTINCT userId FROM department_members WHERE departmentId = ?", [departmentId]);
    const userIds = members.map((m: any) => m.userId);

    const { assignedCount } = await AccessControlService.assignAssessmentBulk(assessmentId, userIds, actor, {
      ...options,
      source: "group",
      sourceId: departmentId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: dept.organizationId,
      action: "department_assign_assessment",
      resourceType: "department",
      resourceId: departmentId,
      details: { assessmentId, assignedCount, options }
    });

    return { assignedCount, departmentName: dept.name };
  }


  // ==========================================
  // 2. COHORTS & BATCHES MANAGEMENT
  // ==========================================

  /**
   * Create a new Cohort / Batch
   */
  static async createCohort(data: {
    name: string;
    code: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    managerId?: string | null;
    status?: CohortStatus;
    organizationId?: string;
  }, actor: ActorContext): Promise<Cohort> {
    const orgId = data.organizationId || actor.organizationId || "org-default";
    const code = data.code.trim().toUpperCase();

    const existing = await cohortsDb.findOne({ organizationId: orgId, code, deletedAt: null as any });
    if (existing) {
      throw new Error(`Cohort with code '${code}' already exists in this organization.`);
    }

    if (data.managerId) {
      const manager = await usersDb.findOne({ id: data.managerId });
      if (!manager) throw new Error("Designated cohort manager not found.");
    }

    const id = "cohort-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const now = new Date().toISOString();

    const cohort: Cohort = {
      id,
      organizationId: orgId,
      name: data.name.trim(),
      code,
      description: data.description ? data.description.trim() : undefined,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status || "active",
      managerId: data.managerId || null,
      createdAt: now,
      updatedAt: now
    };

    await cohortsDb.insert(cohort);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: orgId,
      action: "cohort_create",
      resourceType: "cohort",
      resourceId: id,
      details: { name: cohort.name, code: cohort.code, status: cohort.status, managerId: cohort.managerId }
    });

    return cohort;
  }

  /**
   * List all cohorts for an organization
   */
  static async getCohorts(orgId: string = "org-default"): Promise<Cohort[]> {
    const sql = `
      SELECT 
        c.*,
        u.name AS managerName,
        u.email AS managerEmail,
        COUNT(DISTINCT cm.userId) AS memberCount
      FROM cohorts c
      LEFT JOIN users u ON c.managerId = u.id
      LEFT JOIN cohort_members cm ON c.id = cm.cohortId
      WHERE c.organizationId = ? AND c.deletedAt IS NULL
      GROUP BY c.id
      ORDER BY c.createdAt DESC
    `;
    const [rows]: any = await pool.query(sql, [orgId]);
    return rows.map((r: any) => ({
      ...r,
      memberCount: Number(r.memberCount) || 0
    }));
  }

  /**
   * Get single cohort with members list
   */
  static async getCohortById(id: string): Promise<(Cohort & { members: any[] }) | null> {
    const sql = `
      SELECT 
        c.*,
        u.name AS managerName,
        u.email AS managerEmail
      FROM cohorts c
      LEFT JOIN users u ON c.managerId = u.id
      WHERE c.id = ? AND c.deletedAt IS NULL
    `;
    const [rows]: any = await pool.query(sql, [id]);
    if (rows.length === 0) return null;
    const cohort = rows[0];

    const membersSql = `
      SELECT 
        cm.id as membershipId,
        cm.status as memberStatus,
        cm.joinedAt,
        u.id,
        u.name,
        u.email,
        u.role,
        u.jobTitle,
        u.status,
        u.profilePhoto
      FROM cohort_members cm
      JOIN users u ON cm.userId = u.id
      WHERE cm.cohortId = ? AND u.deletedAt IS NULL
      ORDER BY u.name ASC
    `;
    const [members]: any = await pool.query(membersSql, [id]);

    return {
      ...cohort,
      memberCount: members.length,
      members
    };
  }

  /**
   * Update cohort
   */
  static async updateCohort(id: string, data: Partial<{
    name: string;
    code: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
    managerId: string | null;
    status: CohortStatus;
  }>, actor: ActorContext): Promise<Cohort> {
    const cohort = await cohortsDb.findOne({ id });
    if (!cohort) throw new Error("Cohort not found");

    const updates: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description.trim();
    if (data.startDate !== undefined) updates.startDate = data.startDate;
    if (data.endDate !== undefined) updates.endDate = data.endDate;
    if (data.status !== undefined) updates.status = data.status;
    if (data.managerId !== undefined) {
      if (data.managerId) {
        const mgr = await usersDb.findOne({ id: data.managerId });
        if (!mgr) throw new Error("Specified manager does not exist");
      }
      updates.managerId = data.managerId;
    }
    if (data.code !== undefined && data.code.trim().toUpperCase() !== cohort.code) {
      const newCode = data.code.trim().toUpperCase();
      const existing = await cohortsDb.findOne({ organizationId: cohort.organizationId, code: newCode, deletedAt: null as any });
      if (existing && existing.id !== id) {
        throw new Error(`Cohort code '${newCode}' is already in use.`);
      }
      updates.code = newCode;
    }

    await cohortsDb.update(id, updates);
    const updated = await cohortsDb.findOne({ id });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_update",
      resourceType: "cohort",
      resourceId: id,
      details: { updates }
    });

    return updated!;
  }

  /**
   * Archive cohort
   */
  static async archiveCohort(id: string, actor: ActorContext): Promise<void> {
    const cohort = await cohortsDb.findOne({ id });
    if (!cohort) throw new Error("Cohort not found");

    const now = new Date().toISOString();
    await cohortsDb.update(id, { deletedAt: now, status: "archived" });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_archive",
      resourceType: "cohort",
      resourceId: id,
      details: { cohortName: cohort.name }
    });
  }

  /**
   * Add members to cohort
   */
  static async addCohortMembers(cohortId: string, userIds: string[], actor: ActorContext): Promise<{ addedCount: number }> {
    const cohort = await cohortsDb.findOne({ id: cohortId });
    if (!cohort) throw new Error("Cohort not found");

    let addedCount = 0;
    const now = new Date().toISOString();

    for (const userId of userIds) {
      const user = await usersDb.findOne({ id: userId });
      if (!user) continue;

      const existing = await cohortMembersDb.findOne({ cohortId, userId });
      if (!existing) {
        await cohortMembersDb.insert({
          id: "cmem-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex"),
          organizationId: cohort.organizationId,
          cohortId,
          userId,
          status: "active",
          joinedAt: now
        });
        addedCount++;
      }
    }

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_member_add",
      resourceType: "cohort",
      resourceId: cohortId,
      details: { addedCount, userIds }
    });

    return { addedCount };
  }

  /**
   * Remove member from cohort
   */
  static async removeCohortMember(cohortId: string, userId: string, actor: ActorContext): Promise<void> {
    const cohort = await cohortsDb.findOne({ id: cohortId });
    if (!cohort) throw new Error("Cohort not found");

    await pool.query("DELETE FROM cohort_members WHERE cohortId = ? AND userId = ?", [cohortId, userId]);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_member_remove",
      resourceType: "cohort",
      resourceId: cohortId,
      details: { userId }
    });
  }

  /**
   * Assign course to cohort members
   */
  static async assignCourseToCohort(cohortId: string, courseId: string, actor: ActorContext, options: { dueDate?: string | null; isMandatory?: boolean } = {}): Promise<{ assignedCount: number; cohortName: string }> {
    const cohort = await cohortsDb.findOne({ id: cohortId });
    if (!cohort) throw new Error("Cohort not found");

    const [members]: any = await pool.query("SELECT DISTINCT userId FROM cohort_members WHERE cohortId = ? AND status = 'active'", [cohortId]);
    const userIds = members.map((m: any) => m.userId);

    const { assignedCount } = await AccessControlService.assignCourseBulk(courseId, userIds, actor, {
      ...options,
      source: "group",
      sourceId: cohortId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_assign_course",
      resourceType: "cohort",
      resourceId: cohortId,
      details: { courseId, assignedCount, options }
    });

    return { assignedCount, cohortName: cohort.name };
  }

  /**
   * Assign learning path to cohort members
   */
  static async assignLearningPathToCohort(cohortId: string, learningPathId: string, actor: ActorContext, options: { dueDate?: string | null; isMandatory?: boolean } = {}): Promise<{ assignedCount: number; cohortName: string }> {
    const cohort = await cohortsDb.findOne({ id: cohortId });
    if (!cohort) throw new Error("Cohort not found");

    const [members]: any = await pool.query("SELECT DISTINCT userId FROM cohort_members WHERE cohortId = ? AND status = 'active'", [cohortId]);
    const userIds = members.map((m: any) => m.userId);

    const { assignedCount } = await AccessControlService.assignLearningPathBulk(learningPathId, userIds, actor, {
      ...options,
      source: "group",
      sourceId: cohortId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_assign_learning_path",
      resourceType: "cohort",
      resourceId: cohortId,
      details: { learningPathId, assignedCount, options }
    });

    return { assignedCount, cohortName: cohort.name };
  }

  /**
   * Assign assessment to cohort members
   */
  static async assignAssessmentToCohort(cohortId: string, assessmentId: string, actor: ActorContext, options: { dueDate?: string | null; isMandatory?: boolean } = {}): Promise<{ assignedCount: number; cohortName: string }> {
    const cohort = await cohortsDb.findOne({ id: cohortId });
    if (!cohort) throw new Error("Cohort not found");

    const [members]: any = await pool.query("SELECT DISTINCT userId FROM cohort_members WHERE cohortId = ? AND status = 'active'", [cohortId]);
    const userIds = members.map((m: any) => m.userId);

    const { assignedCount } = await AccessControlService.assignAssessmentBulk(assessmentId, userIds, actor, {
      ...options,
      source: "group",
      sourceId: cohortId
    });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: cohort.organizationId,
      action: "cohort_assign_assessment",
      resourceType: "cohort",
      resourceId: cohortId,
      details: { assessmentId, assignedCount, options }
    });

    return { assignedCount, cohortName: cohort.name };
  }


  // ==========================================
  // 3. ENHANCED GROUPS MANAGEMENT
  // ==========================================

  /**
   * Create an Enhanced Group
   */
  static async createEnhancedGroup(data: {
    name: string;
    description?: string;
    type?: GroupType;
    departmentId?: string | null;
    cohortId?: string | null;
    managerId?: string | null;
    organizationId?: string;
  }, actor: ActorContext): Promise<Group> {
    const orgId = data.organizationId || actor.organizationId || "org-default";
    const id = "grp-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
    const now = new Date().toISOString();

    const group: Group = {
      id,
      organizationId: orgId,
      name: data.name.trim(),
      description: data.description ? data.description.trim() : undefined,
      type: data.type || "general",
      departmentId: data.departmentId || null,
      cohortId: data.cohortId || null,
      managerId: data.managerId || null,
      status: "active",
      createdAt: now,
      updatedAt: now
    };

    await groupsDb.insert(group);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: orgId,
      action: "group_create",
      resourceType: "group",
      resourceId: id,
      details: { name: group.name, type: group.type, departmentId: group.departmentId, cohortId: group.cohortId, managerId: group.managerId }
    });

    return group;
  }

  /**
   * List all groups with member counts and parent entity names
   */
  static async getEnhancedGroups(orgId: string = "org-default"): Promise<Group[]> {
    const sql = `
      SELECT 
        g.*,
        d.name AS departmentName,
        c.name AS cohortName,
        u.name AS managerName,
        COUNT(DISTINCT gm.userId) AS memberCount
      FROM \`groups\` g
      LEFT JOIN departments d ON g.departmentId = d.id
      LEFT JOIN cohorts c ON g.cohortId = c.id
      LEFT JOIN users u ON g.managerId = u.id
      LEFT JOIN group_members gm ON g.id = gm.groupId
      WHERE g.organizationId = ? AND g.deletedAt IS NULL
      GROUP BY g.id
      ORDER BY g.createdAt DESC
    `;
    const [rows]: any = await pool.query(sql, [orgId]);
    return rows.map((r: any) => ({
      ...r,
      memberCount: Number(r.memberCount) || 0
    }));
  }

  /**
   * Get single group with member details
   */
  static async getEnhancedGroupById(id: string): Promise<(Group & { members: any[] }) | null> {
    const sql = `
      SELECT 
        g.*,
        d.name AS departmentName,
        c.name AS cohortName,
        u.name AS managerName
      FROM \`groups\` g
      LEFT JOIN departments d ON g.departmentId = d.id
      LEFT JOIN cohorts c ON g.cohortId = c.id
      LEFT JOIN users u ON g.managerId = u.id
      WHERE g.id = ? AND g.deletedAt IS NULL
    `;
    const [rows]: any = await pool.query(sql, [id]);
    if (rows.length === 0) return null;
    const group = rows[0];

    const membersSql = `
      SELECT 
        gm.id as membershipId,
        gm.addedAt,
        u.id,
        u.name,
        u.email,
        u.role,
        u.jobTitle,
        u.status,
        u.profilePhoto
      FROM group_members gm
      JOIN users u ON gm.userId = u.id
      WHERE gm.groupId = ? AND u.deletedAt IS NULL
      ORDER BY u.name ASC
    `;
    const [members]: any = await pool.query(membersSql, [id]);

    return {
      ...group,
      memberCount: members.length,
      members
    };
  }

  /**
   * Update enhanced group
   */
  static async updateEnhancedGroup(id: string, data: Partial<{
    name: string;
    description: string;
    type: GroupType;
    departmentId: string | null;
    cohortId: string | null;
    managerId: string | null;
    status: OrganizationEntityStatus;
  }>, actor: ActorContext): Promise<Group> {
    const group = await groupsDb.findOne({ id });
    if (!group) throw new Error("Group not found");

    const updates: any = { updatedAt: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description.trim();
    if (data.type !== undefined) updates.type = data.type;
    if (data.departmentId !== undefined) updates.departmentId = data.departmentId;
    if (data.cohortId !== undefined) updates.cohortId = data.cohortId;
    if (data.managerId !== undefined) updates.managerId = data.managerId;
    if (data.status !== undefined) updates.status = data.status;

    await groupsDb.update(id, updates);
    const updated = await groupsDb.findOne({ id });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: group.organizationId,
      action: "group_update",
      resourceType: "group",
      resourceId: id,
      details: { updates }
    });

    return updated!;
  }

  /**
   * Archive group
   */
  static async archiveGroup(id: string, actor: ActorContext): Promise<void> {
    const group = await groupsDb.findOne({ id });
    if (!group) throw new Error("Group not found");

    const now = new Date().toISOString();
    await groupsDb.update(id, { deletedAt: now, status: "archived" });

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: group.organizationId,
      action: "group_archive",
      resourceType: "group",
      resourceId: id,
      details: { groupName: group.name }
    });
  }


  // ==========================================
  // 4. USER ORGANIZATIONAL ASSIGNMENTS
  // ==========================================

  /**
   * Update a user's department, manager, and job title
   */
  static async updateUserOrganization(userId: string, data: {
    departmentId?: string | null;
    managerId?: string | null;
    jobTitle?: string | null;
  }, actor: ActorContext): Promise<void> {
    const user = await usersDb.findOne({ id: userId });
    if (!user) throw new Error("User not found");

    const updates: any = {};
    if (data.jobTitle !== undefined) updates.jobTitle = data.jobTitle ? data.jobTitle.trim() : null;

    if (data.managerId !== undefined) {
      if (data.managerId) {
        if (data.managerId === userId) throw new Error("User cannot be their own manager");
        const manager = await usersDb.findOne({ id: data.managerId });
        if (!manager) throw new Error("Specified manager not found");
      }
      updates.managerId = data.managerId;
    }

    if (data.departmentId !== undefined) {
      if (data.departmentId) {
        const dept = await departmentsDb.findOne({ id: data.departmentId });
        if (!dept) throw new Error("Specified department not found");

        // Sync department_members
        const existingMem = await departmentMembersDb.findOne({ departmentId: data.departmentId, userId });
        if (!existingMem) {
          await departmentMembersDb.insert({
            id: "dmem-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex"),
            organizationId: dept.organizationId,
            departmentId: data.departmentId,
            userId,
            role: "member",
            joinedAt: new Date().toISOString()
          });
        }
      }
      updates.departmentId = data.departmentId;
    }

    await usersDb.update(userId, updates);

    await logAuditEvent({
      userId: actor.id,
      userEmail: actor.email,
      userRole: actor.role,
      organizationId: user.organizationId || "org-default",
      action: "user_org_update",
      resourceType: "user",
      resourceId: userId,
      details: { updates }
    });
  }

  /**
   * Get all users eligible to be managers (roles: manager, admin, super_admin)
   */
  static async getEligibleManagers(orgId: string = "org-default"): Promise<Array<{ id: string; name: string; email: string; role: string; jobTitle?: string | null }>> {
    const sql = `
      SELECT id, name, email, role, jobTitle
      FROM users
      WHERE organizationId = ? AND deletedAt IS NULL AND status = 'active'
        AND role IN ('manager', 'admin', 'super_admin')
      ORDER BY name ASC
    `;
    const [rows]: any = await pool.query(sql, [orgId]);
    return rows;
  }


  // ==========================================
  // 5. MANAGER SCOPING & AUTHORIZATION ENGINE
  // ==========================================

  /**
   * Resolve all student / learner IDs authorized for a given manager.
   * STRICT BOUNDARY: Returns ONLY IDs of students who report directly,
   * belong to the manager's department, or are enrolled in a cohort/group managed by this manager.
   */
  static async getManagedLearnerIds(managerId: string, orgId: string = "org-default"): Promise<string[]> {
    const manager = await usersDb.findOne({ id: managerId });
    if (!manager) return [];

    // Admins and Super Admins have organization-wide visibility
    if (manager.role === UserRole.ADMIN || manager.role === UserRole.SUPER_ADMIN) {
      const [allStudents]: any = await pool.query(
        "SELECT id FROM users WHERE organizationId = ? AND role = 'student' AND deletedAt IS NULL",
        [orgId]
      );
      return allStudents.map((s: any) => s.id);
    }

    // Role must be MANAGER
    if (manager.role !== UserRole.MANAGER) {
      return [];
    }

    // Scoped resolution:
    // 1. Direct reports: users.managerId = managerId
    // 2. Department reports: users.departmentId IN (departments where managerId = managerId)
    // 3. Department members: department_members where departmentId IN (departments where managerId = managerId)
    // 4. Cohort members: cohort_members where cohortId IN (cohorts where managerId = managerId)
    // 5. Group members: group_members where groupId IN (groups where managerId = managerId)
    const sql = `
      SELECT DISTINCT u.id
      FROM users u
      WHERE u.organizationId = ? 
        AND u.role = 'student'
        AND u.deletedAt IS NULL
        AND u.id != ?
        AND (
          u.managerId = ?
          OR u.departmentId IN (
            SELECT id FROM departments WHERE managerId = ? AND deletedAt IS NULL
          )
          OR u.id IN (
            SELECT dm.userId FROM department_members dm 
            JOIN departments d ON dm.departmentId = d.id 
            WHERE d.managerId = ? AND d.deletedAt IS NULL
          )
          OR u.id IN (
            SELECT cm.userId FROM cohort_members cm 
            JOIN cohorts c ON cm.cohortId = c.id 
            WHERE c.managerId = ? AND c.deletedAt IS NULL
          )
          OR u.id IN (
            SELECT gm.userId FROM group_members gm 
            JOIN \`groups\` g ON gm.groupId = g.id 
            WHERE g.managerId = ? AND g.deletedAt IS NULL
          )
        )
    `;

    const [rows]: any = await pool.query(sql, [orgId, managerId, managerId, managerId, managerId, managerId, managerId]);
    return rows.map((r: any) => r.id);
  }

  /**
   * Assert manager has authorized access to a specific learner.
   * Throws 403 Forbidden if unauthorized.
   */
  static async assertManagerLearnerAccess(managerId: string, learnerId: string, orgId: string = "org-default"): Promise<void> {
    const authorizedIds = await this.getManagedLearnerIds(managerId, orgId);
    if (!authorizedIds.includes(learnerId)) {
      throw new Error("Access denied: You are not authorized to view or manage this learner's data.");
    }
  }


  // ==========================================
  // 6. MANAGER CAPABILITIES & REPORTING
  // ==========================================

  /**
   * Manager Team Learner List
   */
  static async getManagerLearnerList(managerId: string, orgId: string = "org-default"): Promise<TeamLearnerSummary[]> {
    const learnerIds = await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) return [];

    const placeholders = learnerIds.map(() => "?").join(",");
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.jobTitle,
        u.status,
        u.profilePhoto,
        u.departmentId,
        d.name AS departmentName,
        d.code AS departmentCode,
        u.managerId,
        m.name AS managerName,
        m.email AS managerEmail
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      LEFT JOIN users m ON u.managerId = m.id
      WHERE u.id IN (${placeholders})
      ORDER BY u.name ASC
    `;
    const [learners]: any = await pool.query(sql, learnerIds);

    // Fetch batch cohort and group affiliations
    const [cohortRows]: any = await pool.query(`
      SELECT cm.userId, c.id, c.name, c.code
      FROM cohort_members cm
      JOIN cohorts c ON cm.cohortId = c.id
      WHERE cm.userId IN (${placeholders}) AND c.deletedAt IS NULL
    `, learnerIds);

    const [groupRows]: any = await pool.query(`
      SELECT gm.userId, g.id, g.name, g.type
      FROM group_members gm
      JOIN \`groups\` g ON gm.groupId = g.id
      WHERE gm.userId IN (${placeholders}) AND g.deletedAt IS NULL
    `, learnerIds);

    // Fetch counts: courses assigned/completed, assessments assigned/completed, overdue count, certificates
    const [enrollmentCounts]: any = await pool.query(`
      SELECT 
        studentId,
        COUNT(id) AS assignedCount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN dueDate IS NOT NULL AND dueDate < NOW() AND status != 'completed' AND status != 'revoked' THEN 1 ELSE 0 END) AS overdueCount
      FROM enrollments
      WHERE studentId IN (${placeholders}) AND deletedAt IS NULL
      GROUP BY studentId
    `, learnerIds);

    const [assessmentCounts]: any = await pool.query(`
      SELECT 
        studentId,
        COUNT(id) AS assignedCount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN dueDate IS NOT NULL AND dueDate < NOW() AND status != 'completed' AND status != 'revoked' THEN 1 ELSE 0 END) AS overdueCount
      FROM assessment_assignments
      WHERE studentId IN (${placeholders}) AND deletedAt IS NULL
      GROUP BY studentId
    `, learnerIds);

    const [certCounts]: any = await pool.query(`
      SELECT studentId, COUNT(id) AS count
      FROM certificates
      WHERE studentId IN (${placeholders}) AND status = 'active' AND deletedAt IS NULL
      GROUP BY studentId
    `, learnerIds);

    // Build lookup maps
    const cohortsMap = new Map<string, any[]>();
    cohortRows.forEach((r: any) => {
      if (!cohortsMap.has(r.userId)) cohortsMap.set(r.userId, []);
      cohortsMap.get(r.userId)!.push({ id: r.id, name: r.name, code: r.code });
    });

    const groupsMap = new Map<string, any[]>();
    groupRows.forEach((r: any) => {
      if (!groupsMap.has(r.userId)) groupsMap.set(r.userId, []);
      groupsMap.get(r.userId)!.push({ id: r.id, name: r.name, type: r.type });
    });

    const enrollMap = new Map(enrollmentCounts.map((e: any) => [e.studentId, e]));
    const assessMap = new Map(assessmentCounts.map((a: any) => [a.studentId, a]));
    const certMap = new Map(certCounts.map((c: any) => [c.studentId, Number(c.count) || 0]));

    return learners.map((l: any): TeamLearnerSummary => {
      const eInfo: any = enrollMap.get(l.id) || { assignedCount: 0, completedCount: 0, overdueCount: 0 };
      const aInfo: any = assessMap.get(l.id) || { assignedCount: 0, completedCount: 0, overdueCount: 0 };
      const totalOverdue = (Number(eInfo.overdueCount) || 0) + (Number(aInfo.overdueCount) || 0);

      return {
        id: l.id,
        name: l.name,
        email: l.email,
        jobTitle: l.jobTitle,
        status: l.status,
        profilePhoto: l.profilePhoto,
        department: l.departmentId ? { id: l.departmentId, name: l.departmentName, code: l.departmentCode } : null,
        manager: l.managerId ? { id: l.managerId, name: l.managerName, email: l.managerEmail } : null,
        cohorts: cohortsMap.get(l.id) || [],
        groups: groupsMap.get(l.id) || [],
        assignedCoursesCount: Number(eInfo.assignedCount) || 0,
        completedCoursesCount: Number(eInfo.completedCount) || 0,
        assignedAssessmentsCount: Number(aInfo.assignedCount) || 0,
        completedAssessmentsCount: Number(aInfo.completedCount) || 0,
        overdueCount: totalOverdue,
        certificatesCount: Number(certMap.get(l.id)) || 0
      };
    });
  }

  /**
   * Manager Team Course Progress
   */
  static async getManagerTeamCourseProgress(managerId: string, learnerIdFilter?: string, orgId: string = "org-default"): Promise<TeamCourseProgressItem[]> {
    if (learnerIdFilter) {
      await this.assertManagerLearnerAccess(managerId, learnerIdFilter, orgId);
    }

    const learnerIds = learnerIdFilter ? [learnerIdFilter] : await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) return [];

    const placeholders = learnerIds.map(() => "?").join(",");
    const sql = `
      SELECT 
        e.id AS enrollmentId,
        e.studentId,
        u.name AS studentName,
        u.email AS studentEmail,
        d.name AS departmentName,
        e.courseId,
        c.title AS courseTitle,
        c.category AS courseCategory,
        c.thumbnail AS courseThumbnail,
        COALESCE(e.progressPercentage, 0) AS progressPercent,
        e.status,
        e.assignedAt,
        e.dueDate,
        e.completedAt,
        e.lastLessonId AS lastAccessedLessonId,
        CASE 
          WHEN e.dueDate IS NOT NULL AND e.dueDate < NOW() AND e.status != 'completed' AND e.status != 'revoked' THEN 1 
          ELSE 0 
        END AS isOverdue
      FROM enrollments e
      JOIN users u ON e.studentId = u.id
      JOIN courses c ON e.courseId = c.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE e.studentId IN (${placeholders}) AND e.deletedAt IS NULL
      ORDER BY isOverdue DESC, e.assignedAt DESC
    `;
    const [rows]: any = await pool.query(sql, learnerIds);
    return rows.map((r: any) => ({
      ...r,
      progressPercent: Number(r.progressPercent) || 0,
      isOverdue: Boolean(r.isOverdue)
    }));
  }

  /**
   * Manager Team Assessment Results
   */
  static async getManagerTeamAssessmentResults(managerId: string, learnerIdFilter?: string, orgId: string = "org-default"): Promise<TeamAssessmentResultItem[]> {
    if (learnerIdFilter) {
      await this.assertManagerLearnerAccess(managerId, learnerIdFilter, orgId);
    }

    const learnerIds = learnerIdFilter ? [learnerIdFilter] : await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) return [];

    const placeholders = learnerIds.map(() => "?").join(",");
    const sql = `
      SELECT 
        s.id,
        s.assessmentId,
        a.title AS assessmentTitle,
        s.studentId,
        u.name AS studentName,
        u.email AS studentEmail,
        d.name AS departmentName,
        s.score,
        s.totalPoints,
        s.percentage,
        s.passed,
        a.passingScore,
        s.submittedAt,
        s.attemptNumber
      FROM submissions s
      JOIN users u ON s.studentId = u.id
      JOIN assessments a ON s.assessmentId = a.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE s.studentId IN (${placeholders})
      ORDER BY s.submittedAt DESC
    `;
    const [rows]: any = await pool.query(sql, learnerIds);
    return rows.map((r: any) => ({
      ...r,
      score: Number(r.score) || 0,
      totalPoints: Number(r.totalPoints) || 0,
      percentage: Number(r.percentage) || 0,
      passingScore: Number(r.passingScore) || 70,
      passed: Boolean(r.passed)
    }));
  }

  /**
   * Manager Overdue Learning Items
   */
  static async getManagerOverdueLearning(managerId: string, orgId: string = "org-default"): Promise<TeamOverdueItem[]> {
    const learnerIds = await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) return [];

    const placeholders = learnerIds.map(() => "?").join(",");
    const overdueItems: TeamOverdueItem[] = [];

    // Overdue Courses
    const courseSql = `
      SELECT 
        e.id,
        'course' AS type,
        e.courseId AS itemId,
        c.title AS itemTitle,
        e.studentId,
        u.name AS studentName,
        u.email AS studentEmail,
        d.name AS departmentName,
        e.assignedAt,
        e.dueDate,
        e.isMandatory,
        TIMESTAMPDIFF(DAY, e.dueDate, NOW()) AS daysOverdue
      FROM enrollments e
      JOIN users u ON e.studentId = u.id
      JOIN courses c ON e.courseId = c.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE e.studentId IN (${placeholders})
        AND e.dueDate IS NOT NULL 
        AND e.dueDate < NOW() 
        AND e.status NOT IN ('completed', 'revoked')
        AND e.deletedAt IS NULL
      ORDER BY daysOverdue DESC
    `;
    const [courseRows]: any = await pool.query(courseSql, learnerIds);
    courseRows.forEach((r: any) => {
      overdueItems.push({
        id: r.id,
        type: "course",
        itemId: r.itemId,
        itemTitle: r.itemTitle,
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        departmentName: r.departmentName,
        assignedAt: r.assignedAt,
        dueDate: r.dueDate,
        daysOverdue: Math.max(1, Number(r.daysOverdue) || 1),
        isMandatory: Boolean(r.isMandatory)
      });
    });

    // Overdue Assessments
    const assessSql = `
      SELECT 
        aa.id,
        'assessment' AS type,
        aa.assessmentId AS itemId,
        a.title AS itemTitle,
        aa.studentId,
        u.name AS studentName,
        u.email AS studentEmail,
        d.name AS departmentName,
        aa.assignedAt,
        aa.dueDate,
        aa.isMandatory,
        TIMESTAMPDIFF(DAY, aa.dueDate, NOW()) AS daysOverdue
      FROM assessment_assignments aa
      JOIN users u ON aa.studentId = u.id
      JOIN assessments a ON aa.assessmentId = a.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE aa.studentId IN (${placeholders})
        AND aa.dueDate IS NOT NULL 
        AND aa.dueDate < NOW() 
        AND aa.status NOT IN ('completed', 'revoked')
        AND aa.deletedAt IS NULL
      ORDER BY daysOverdue DESC
    `;
    const [assessRows]: any = await pool.query(assessSql, learnerIds);
    assessRows.forEach((r: any) => {
      overdueItems.push({
        id: r.id,
        type: "assessment",
        itemId: r.itemId,
        itemTitle: r.itemTitle,
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        departmentName: r.departmentName,
        assignedAt: r.assignedAt,
        dueDate: r.dueDate,
        daysOverdue: Math.max(1, Number(r.daysOverdue) || 1),
        isMandatory: Boolean(r.isMandatory)
      });
    });

    // Overdue Learning Paths
    const pathSql = `
      SELECT 
        lpa.id,
        'learning_path' AS type,
        lpa.learningPathId AS itemId,
        lp.title AS itemTitle,
        lpa.studentId,
        u.name AS studentName,
        u.email AS studentEmail,
        d.name AS departmentName,
        lpa.assignedAt,
        lpa.dueDate,
        lpa.isMandatory,
        TIMESTAMPDIFF(DAY, lpa.dueDate, NOW()) AS daysOverdue
      FROM learning_path_assignments lpa
      JOIN users u ON lpa.studentId = u.id
      JOIN learning_paths lp ON lpa.learningPathId = lp.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE lpa.studentId IN (${placeholders})
        AND lpa.dueDate IS NOT NULL 
        AND lpa.dueDate < NOW() 
        AND lpa.status NOT IN ('completed', 'revoked')
        AND lpa.deletedAt IS NULL
      ORDER BY daysOverdue DESC
    `;
    const [pathRows]: any = await pool.query(pathSql, learnerIds);
    pathRows.forEach((r: any) => {
      overdueItems.push({
        id: r.id,
        type: "learning_path",
        itemId: r.itemId,
        itemTitle: r.itemTitle,
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        departmentName: r.departmentName,
        assignedAt: r.assignedAt,
        dueDate: r.dueDate,
        daysOverdue: Math.max(1, Number(r.daysOverdue) || 1),
        isMandatory: Boolean(r.isMandatory)
      });
    });

    return overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /**
   * Manager Team Statistics Summary
   */
  static async getManagerTeamStats(managerId: string, orgId: string = "org-default"): Promise<TeamStatsSummary> {
    const learnerIds = await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) {
      return {
        totalLearners: 0,
        totalAssignedCourses: 0,
        totalCompletedCourses: 0,
        courseCompletionRate: 0,
        totalAssignedAssessments: 0,
        totalPassedAssessments: 0,
        assessmentPassRate: 0,
        totalOverdueItems: 0,
        totalCertificatesEarned: 0,
        departmentBreakdown: []
      };
    }

    const placeholders = learnerIds.map(() => "?").join(",");

    // Course stats
    const [cStats]: any = await pool.query(`
      SELECT 
        COUNT(id) AS totalAssigned,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS totalCompleted
      FROM enrollments
      WHERE studentId IN (${placeholders}) AND deletedAt IS NULL
    `, learnerIds);

    // Assessment stats
    const [aStats]: any = await pool.query(`
      SELECT 
        COUNT(id) AS totalAssigned
      FROM assessment_assignments
      WHERE studentId IN (${placeholders}) AND deletedAt IS NULL
    `, learnerIds);

    const [subStats]: any = await pool.query(`
      SELECT 
        COUNT(id) AS totalSubmissions,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS totalPassed
      FROM submissions
      WHERE studentId IN (${placeholders})
    `, learnerIds);

    // Overdue count
    const [overdueC]: any = await pool.query(`
      SELECT COUNT(id) AS count FROM enrollments
      WHERE studentId IN (${placeholders}) AND dueDate IS NOT NULL AND dueDate < NOW() AND status NOT IN ('completed', 'revoked') AND deletedAt IS NULL
    `, learnerIds);

    const [overdueA]: any = await pool.query(`
      SELECT COUNT(id) AS count FROM assessment_assignments
      WHERE studentId IN (${placeholders}) AND dueDate IS NOT NULL AND dueDate < NOW() AND status NOT IN ('completed', 'revoked') AND deletedAt IS NULL
    `, learnerIds);

    // Certificates count
    const [certStats]: any = await pool.query(`
      SELECT COUNT(id) AS count FROM certificates
      WHERE studentId IN (${placeholders}) AND status = 'active' AND deletedAt IS NULL
    `, learnerIds);

    // Department breakdown
    const [deptBreakdown]: any = await pool.query(`
      SELECT 
        COALESCE(d.name, 'Unassigned') AS name,
        COUNT(u.id) AS count
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE u.id IN (${placeholders})
      GROUP BY d.name
      ORDER BY count DESC
    `, learnerIds);

    const totalAssignedCourses = Number(cStats[0].totalAssigned) || 0;
    const totalCompletedCourses = Number(cStats[0].totalCompleted) || 0;
    const courseCompletionRate = totalAssignedCourses > 0 ? Math.round((totalCompletedCourses / totalAssignedCourses) * 100) : 0;

    const totalSubmissions = Number(subStats[0]?.totalSubmissions) || 0;
    const totalPassed = Number(subStats[0]?.totalPassed) || 0;
    const assessmentPassRate = totalSubmissions > 0 ? Math.round((totalPassed / totalSubmissions) * 100) : 0;

    const totalOverdueItems = (Number(overdueC[0]?.count) || 0) + (Number(overdueA[0]?.count) || 0);
    const totalCertificatesEarned = Number(certStats[0]?.count) || 0;

    return {
      totalLearners: learnerIds.length,
      totalAssignedCourses,
      totalCompletedCourses,
      courseCompletionRate,
      totalAssignedAssessments: Number(aStats[0]?.totalAssigned) || 0,
      totalPassedAssessments: totalPassed,
      assessmentPassRate,
      totalOverdueItems,
      totalCertificatesEarned,
      departmentBreakdown: deptBreakdown.map((r: any) => ({ name: r.name, count: Number(r.count) }))
    };
  }

  /**
   * Manager Team Assigned Learning (Overview of learning objects distributed to team)
   */
  static async getManagerAssignedLearning(managerId: string, orgId: string = "org-default"): Promise<{
    courses: any[];
    assessments: any[];
    learningPaths: any[];
  }> {
    const learnerIds = await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) return { courses: [], assessments: [], learningPaths: [] };

    const placeholders = learnerIds.map(() => "?").join(",");

    const [courses]: any = await pool.query(`
      SELECT 
        c.id, c.title, c.category, c.thumbnail,
        COUNT(e.id) AS enrolledCount,
        SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END) AS completedCount,
        ROUND(AVG(COALESCE(e.progressPercentage, 0)), 1) AS averageProgress
      FROM courses c
      JOIN enrollments e ON c.id = e.courseId
      WHERE e.studentId IN (${placeholders}) AND e.deletedAt IS NULL
      GROUP BY c.id
      ORDER BY enrolledCount DESC
    `, learnerIds);

    const [assessments]: any = await pool.query(`
      SELECT 
        a.id, a.title, a.category, a.passingScore,
        COUNT(aa.id) AS assignedCount,
        SUM(CASE WHEN aa.status = 'completed' THEN 1 ELSE 0 END) AS completedCount
      FROM assessments a
      JOIN assessment_assignments aa ON a.id = aa.assessmentId
      WHERE aa.studentId IN (${placeholders}) AND aa.deletedAt IS NULL
      GROUP BY a.id
      ORDER BY assignedCount DESC
    `, learnerIds);

    const [learningPaths]: any = await pool.query(`
      SELECT 
        lp.id, lp.title, lp.category,
        COUNT(lpa.id) AS assignedCount,
        SUM(CASE WHEN lpa.status = 'completed' THEN 1 ELSE 0 END) AS completedCount
      FROM learning_paths lp
      JOIN learning_path_assignments lpa ON lp.id = lpa.learningPathId
      WHERE lpa.studentId IN (${placeholders}) AND lpa.deletedAt IS NULL
      GROUP BY lp.id
      ORDER BY assignedCount DESC
    `, learnerIds);

    return { courses, assessments, learningPaths };
  }

  /**
   * Manager Team Certificates
   */
  static async getManagerTeamCertificates(managerId: string, orgId: string = "org-default"): Promise<any[]> {
    const learnerIds = await this.getManagedLearnerIds(managerId, orgId);
    if (learnerIds.length === 0) return [];

    const placeholders = learnerIds.map(() => "?").join(",");
    const sql = `
      SELECT 
        c.*,
        u.name AS studentName,
        u.email AS studentEmail,
        d.name AS departmentName
      FROM certificates c
      JOIN users u ON c.studentId = u.id
      LEFT JOIN departments d ON u.departmentId = d.id
      WHERE c.studentId IN (${placeholders}) AND c.deletedAt IS NULL
      ORDER BY c.issuedAt DESC
    `;
    const [rows]: any = await pool.query(sql, learnerIds);
    return rows;
  }


  // ==========================================
  // 7. STUDENT CAPABILITIES
  // ==========================================

  /**
   * Get Student's Organization Affiliations
   */
  static async getStudentOrganizationDetails(studentId: string): Promise<StudentOrganizationAffiliation> {
    const student = await usersDb.findOne({ id: studentId });
    if (!student) throw new Error("Student not found");

    // Department
    let department = null;
    if (student.departmentId) {
      const [deptRows]: any = await pool.query(`
        SELECT d.id, d.name, d.code, u.name AS managerName
        FROM departments d
        LEFT JOIN users u ON d.managerId = u.id
        WHERE d.id = ? AND d.deletedAt IS NULL
      `, [student.departmentId]);
      if (deptRows.length > 0) {
        department = deptRows[0];
      }
    }

    // Direct Reporting Manager
    let manager = null;
    if (student.managerId) {
      const mgr = await usersDb.findOne({ id: student.managerId });
      if (mgr) {
        manager = { id: mgr.id, name: mgr.name, email: mgr.email };
      }
    }

    // Cohorts
    const [cohortRows]: any = await pool.query(`
      SELECT c.id, c.name, c.code, cm.status, c.startDate, c.endDate
      FROM cohort_members cm
      JOIN cohorts c ON cm.cohortId = c.id
      WHERE cm.userId = ? AND c.deletedAt IS NULL
      ORDER BY c.createdAt DESC
    `, [studentId]);

    // Groups
    const [groupRows]: any = await pool.query(`
      SELECT g.id, g.name, g.type, g.description
      FROM group_members gm
      JOIN \`groups\` g ON gm.groupId = g.id
      WHERE gm.userId = ? AND g.deletedAt IS NULL
      ORDER BY g.createdAt DESC
    `, [studentId]);

    return {
      department,
      manager,
      cohorts: cohortRows,
      groups: groupRows
    };
  }
}
